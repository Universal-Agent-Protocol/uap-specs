/**
 * UAP Client - Discovers and interacts with agents
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  ClientConfig,
  AgentRegistration,
  DiscoveryRequest,
  UACPMessage,
} from '../core/types';
import { MessageBuilder } from '../core/message';
import { AgentRegistry } from '../discovery/registry';
import { MDNSDiscovery } from '../discovery/mdns';
import { AgentNotFoundError, AgentUnavailableError, TimeoutError } from '../core/errors';

export class UAPClient extends EventEmitter {
  private clientId: string;
  private config: ClientConfig;
  private registry: AgentRegistry;
  private mdns: MDNSDiscovery;
  private connections: Map<string, WebSocket> = new Map();
  private pendingRequests: Map<
    string,
    { resolve: (value: any) => void; reject: (error: Error) => void; timeout: NodeJS.Timeout }
  > = new Map();

  constructor(config: ClientConfig = {}) {
    super();
    this.clientId = config.clientId || `client-${uuidv4().slice(0, 8)}`;
    this.config = {
      discoveryInterval: 10000, // 10 seconds
      enableMDNS: true,
      ...config,
    };

    this.registry = new AgentRegistry();
    this.mdns = new MDNSDiscovery();

    // Forward registry events
    this.registry.on('agent-discovered', (agent) => {
      this.emit('agent-discovered', agent);
      console.log(`[Client] Discovered: ${agent.name} (${agent.agentId})`);
    });

    this.registry.on('agent-lost', (agent) => {
      this.emit('agent-lost', agent);
      console.log(`[Client] Lost: ${agent.name} (${agent.agentId})`);
      // Close connection if exists
      this.closeConnection(agent.agentId);
    });

    this.registry.on('agent-updated', (agent) => {
      this.emit('agent-updated', agent);
    });
  }

  /**
   * Start discovery
   */
  async start(): Promise<void> {
    if (this.config.enableMDNS) {
      // Set up mDNS discovery
      this.mdns.on('agent-discovered', (agent: AgentRegistration) => {
        this.registry.register(agent);
      });

      this.mdns.on('agent-lost', (agentId: string) => {
        this.registry.unregister(agentId);
      });

      this.mdns.startBrowsing();
      console.log('[Client] Started mDNS discovery');
    }

    this.emit('started');
  }

  /**
   * Stop discovery and close all connections
   */
  async stop(): Promise<void> {
    this.mdns.stopBrowsing();
    this.mdns.shutdown();

    // Close all connections
    for (const [agentId, ws] of this.connections.entries()) {
      ws.close();
    }
    this.connections.clear();

    // Reject all pending requests
    for (const [correlationId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Client stopped'));
    }
    this.pendingRequests.clear();

    console.log('[Client] Stopped');
    this.emit('stopped');
  }

  /**
   * Discover agents by criteria
   */
  discover(criteria: DiscoveryRequest['criteria']): AgentRegistration[] {
    const request: DiscoveryRequest = {
      senderId: this.clientId,
      criteria,
      timestamp: new Date().toISOString(),
    };

    const response = this.registry.discover(request);
    return response.agents;
  }

  /**
   * Get all discovered agents
   */
  getAgents(): AgentRegistration[] {
    return this.registry.getAll();
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentRegistration | undefined {
    return this.registry.get(agentId);
  }

  /**
   * Connect to an agent
   */
  private async connectToAgent(agent: AgentRegistration): Promise<WebSocket> {
    const existing = this.connections.get(agent.agentId);
    if (existing && existing.readyState === WebSocket.OPEN) {
      return existing;
    }

    return new Promise((resolve, reject) => {
      const url = `ws://${agent.host}:${agent.port}`;
      const ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new TimeoutError(`Connection to ${agent.name}`));
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        this.connections.set(agent.agentId, ws);
        console.log(`[Client] Connected to ${agent.name}`);

        // Set up message handler
        ws.on('message', (data) => {
          try {
            const message: UACPMessage = JSON.parse(data.toString());
            this.handleMessage(message, agent.agentId);
          } catch (error) {
            console.error('[Client] Error handling message:', error);
          }
        });

        ws.on('close', () => {
          console.log(`[Client] Disconnected from ${agent.name}`);
          this.connections.delete(agent.agentId);
        });

        resolve(ws);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Close connection to agent
   */
  private closeConnection(agentId: string): void {
    const ws = this.connections.get(agentId);
    if (ws) {
      ws.close();
      this.connections.delete(agentId);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: UACPMessage, agentId: string): void {
    const { header, payload } = message;

    // Handle responses
    if (header.messageType === 'Response' && header.correlationId) {
      const pending = this.pendingRequests.get(header.correlationId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(header.correlationId);
        pending.resolve(payload.data);
      }
    }

    // Handle notifications
    if (header.messageType === 'Notification') {
      this.emit('notification', {
        agentId,
        action: payload.action,
        data: payload.data,
      });
    }

    // Handle errors
    if (header.messageType === 'Error') {
      if (header.correlationId) {
        const pending = this.pendingRequests.get(header.correlationId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(header.correlationId);
          pending.reject(
            new Error(`Agent error: ${payload.data.message || 'Unknown error'}`)
          );
        }
      }
    }
  }

  /**
   * Send request to agent and wait for response
   */
  private async sendRequest(
    agentId: string,
    action: string,
    data: any,
    timeout: number = 30000
  ): Promise<any> {
    const agent = this.registry.get(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }

    const ws = await this.connectToAgent(agent);

    const message = MessageBuilder.request(this.clientId, agentId, action, data);
    const correlationId = message.header.correlationId!;

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new TimeoutError(action));
      }, timeout);

      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      ws.send(JSON.stringify(message));
    });
  }

  /**
   * Call a tool on an agent
   */
  async callTool(agentId: string, toolName: string, params: any): Promise<any> {
    const response = await this.sendRequest(agentId, 'executeTool', {
      tool: toolName,
      params,
    });

    return response.result;
  }

  /**
   * Call a tool with automatic agent selection
   */
  async callToolAuto(
    capability: string,
    toolName: string,
    params: any,
    options: {
      maxLoad?: number;
      retries?: number;
    } = {}
  ): Promise<any> {
    const retries = options.retries || 3;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Discover agents with the capability
        const agents = this.discover({
          capabilities: [capability],
          status: 'Online',
          maxLoad: options.maxLoad,
        });

        if (agents.length === 0) {
          throw new AgentNotFoundError(`No agents found with capability: ${capability}`);
        }

        // Pick the least loaded agent
        const agent = agents[0]; // Already sorted by load in discover()

        // Call the tool
        return await this.callTool(agent.agentId, toolName, params);
      } catch (error) {
        if (attempt === retries - 1) {
          throw error;
        }
        // Wait a bit before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Get capabilities of an agent
   */
  async getCapabilities(agentId: string): Promise<{ capabilities: string[]; tools: string[] }> {
    return await this.sendRequest(agentId, 'getCapabilities', {});
  }

  /**
   * Get status of an agent
   */
  async getStatus(
    agentId: string
  ): Promise<{ agentId: string; status: string; load: number; queueDepth: number }> {
    return await this.sendRequest(agentId, 'getStatus', {});
  }

  /**
   * Ping an agent
   */
  async ping(agentId: string): Promise<number> {
    const start = Date.now();
    await this.sendRequest(agentId, 'ping', {});
    return Date.now() - start;
  }
}
