/**
 * UAP Agent - Server that provides capabilities/tools
 */

import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import * as os from 'os';
import {
  AgentConfig,
  AgentRegistration,
  UACPMessage,
  Tool,
  ExecutionContext,
} from '../core/types';
import { MessageBuilder } from '../core/message';
import { MDNSDiscovery } from '../discovery/mdns';
import { ToolNotFoundError } from '../core/errors';

export class UAPAgent extends EventEmitter {
  private agentId: string;
  private config: AgentConfig;
  private server: WebSocketServer | null = null;
  private mdns: MDNSDiscovery;
  private clients: Set<WebSocket> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private load: number = 0;
  private taskQueue: Map<string, any> = new Map();

  constructor(config: AgentConfig) {
    super();
    this.agentId = config.agentId || `agent-${uuidv4().slice(0, 8)}`;
    this.config = {
      ...config,
      agentId: this.agentId,
      host: config.host || this.getLocalIP(),
      port: config.port || 0, // Will be assigned when server starts
    };
    this.mdns = new MDNSDiscovery();
  }

  /**
   * Start the agent server
   */
  async start(): Promise<void> {
    // Start WebSocket server
    this.server = new WebSocketServer({
      port: this.config.port || 0, // 0 = auto-assign port
    });

    this.server.on('listening', () => {
      const address = this.server!.address();
      if (typeof address === 'object' && address !== null) {
        this.config.port = address.port;
      }
      console.log(`[Agent] ${this.config.name} listening on port ${this.config.port}`);

      // Publish on mDNS
      this.publishOnMDNS();

      // Start heartbeat
      this.startHeartbeat();
    });

    this.server.on('connection', (ws) => {
      console.log('[Agent] Client connected');
      this.clients.add(ws);

      ws.on('message', async (data) => {
        try {
          const message: UACPMessage = JSON.parse(data.toString());
          await this.handleMessage(message, ws);
        } catch (error) {
          console.error('[Agent] Error handling message:', error);
          this.sendError(ws, undefined, {
            code: 'MESSAGE_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      ws.on('close', () => {
        console.log('[Agent] Client disconnected');
        this.clients.delete(ws);
      });
    });

    this.emit('started', this.getRegistration());
  }

  /**
   * Stop the agent server
   */
  async stop(): Promise<void> {
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Unpublish from mDNS
    this.mdns.unpublish();
    this.mdns.shutdown();

    // Close all client connections
    this.clients.forEach((client) => client.close());
    this.clients.clear();

    // Close server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
    }

    console.log(`[Agent] ${this.config.name} stopped`);
    this.emit('stopped');
  }

  /**
   * Handle incoming UACP message
   */
  private async handleMessage(message: UACPMessage, ws: WebSocket): Promise<void> {
    const { header, payload } = message;

    switch (payload.action) {
      case 'ping':
        this.sendResponse(ws, header.correlationId!, 'pong', { timestamp: Date.now() });
        break;

      case 'getCapabilities':
        this.sendResponse(ws, header.correlationId!, 'capabilities', {
          capabilities: this.config.capabilities,
          tools: Object.keys(this.config.tools),
        });
        break;

      case 'executeTool':
        await this.handleToolExecution(payload.data, header, ws);
        break;

      case 'getStatus':
        this.sendResponse(ws, header.correlationId!, 'status', {
          agentId: this.agentId,
          status: 'Online',
          load: this.load,
          queueDepth: this.taskQueue.size,
        });
        break;

      default:
        this.sendError(ws, header.correlationId, {
          code: 'UNKNOWN_ACTION',
          message: `Unknown action: ${payload.action}`,
        });
    }
  }

  /**
   * Handle tool execution
   */
  private async handleToolExecution(
    data: { tool: string; params: any },
    header: UACPMessage['header'],
    ws: WebSocket
  ): Promise<void> {
    const { tool, params } = data;

    const toolDef = this.config.tools[tool];
    if (!toolDef) {
      this.sendError(ws, header.correlationId, {
        code: 'TOOL_NOT_FOUND',
        message: `Tool not found: ${tool}`,
      });
      return;
    }

    try {
      // If async tool, execute in background
      if (toolDef.async) {
        const taskId = uuidv4();
        this.taskQueue.set(taskId, { status: 'running', progress: 0 });

        // Send immediate response with task ID
        this.sendResponse(ws, header.correlationId!, 'taskStarted', {
          taskId,
          tool,
        });

        // Execute in background
        const context: ExecutionContext = {
          contextId: taskId,
          taskList: [tool],
          currentState: {},
          dataStore: {},
          updateProgress: (progress: number) => {
            const task = this.taskQueue.get(taskId);
            if (task) {
              task.progress = progress;
            }
            // Send progress notification
            this.sendNotification(ws, 'taskProgress', { taskId, progress });
          },
          notifyComplete: (result: any) => {
            this.taskQueue.delete(taskId);
            // Send completion notification
            this.sendNotification(ws, 'taskComplete', { taskId, result });
          },
        };

        toolDef
          .handler(params, context)
          .then((result) => {
            context.notifyComplete!(result);
          })
          .catch((error) => {
            this.taskQueue.delete(taskId);
            this.sendNotification(ws, 'taskError', {
              taskId,
              error: error.message,
            });
          });
      } else {
        // Synchronous execution
        const result = await toolDef.handler(params);
        this.sendResponse(ws, header.correlationId!, 'toolResult', {
          tool,
          result,
        });
      }
    } catch (error) {
      this.sendError(ws, header.correlationId, {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      });
    }
  }

  /**
   * Send response message
   */
  private sendResponse(ws: WebSocket, correlationId: string, action: string, data: any): void {
    const message = MessageBuilder.response(
      this.agentId,
      'client',
      correlationId,
      action,
      data
    );
    ws.send(JSON.stringify(message));
  }

  /**
   * Send notification message
   */
  private sendNotification(ws: WebSocket, action: string, data: any): void {
    const message = MessageBuilder.notification(this.agentId, 'client', action, data);
    ws.send(JSON.stringify(message));
  }

  /**
   * Send error message
   */
  private sendError(
    ws: WebSocket,
    correlationId: string | undefined,
    error: { code: string; message: string; details?: any }
  ): void {
    const message = MessageBuilder.error(this.agentId, 'client', correlationId, error);
    ws.send(JSON.stringify(message));
  }

  /**
   * Publish agent on mDNS
   */
  private publishOnMDNS(): void {
    const registration = this.getRegistration();
    this.mdns.publish(registration);
  }

  /**
   * Start heartbeat to update load metrics
   * Note: mDNS is published once on start. Load updates are served
   * via the getStatus WebSocket action, not by re-publishing mDNS.
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.updateLoad();
    }, 5000); // Every 5 seconds
  }

  /**
   * Update current load
   */
  private updateLoad(): void {
    // Simple load calculation based on queue depth
    // In production, could use CPU/memory metrics
    this.load = Math.min(100, this.taskQueue.size * 10);
  }

  /**
   * Get agent registration info
   */
  getRegistration(): AgentRegistration {
    return {
      agentId: this.agentId,
      name: this.config.name,
      description: this.config.description,
      icon: this.config.icon,
      host: this.config.host!,
      port: this.config.port!,
      capabilities: this.config.capabilities,
      status: 'Online',
      load: this.load,
      metadata: {
        version: this.config.metadata?.version || '1.0.0',
        tags: this.config.metadata?.tags || [],
        customProperties: this.config.metadata?.customProperties,
      },
      timestamp: new Date().toISOString(),
      auth: this.config.auth,
      provider: this.config.provider,
      website: this.config.website,
      pricing: this.config.pricing,
    };
  }

  /**
   * Get local IP address
   */
  private getLocalIP(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  /**
   * Add a tool dynamically
   */
  addTool(name: string, tool: Tool): void {
    this.config.tools[name] = tool;
    console.log(`[Agent] Added tool: ${name}`);
  }

  /**
   * Remove a tool
   */
  removeTool(name: string): void {
    delete this.config.tools[name];
    console.log(`[Agent] Removed tool: ${name}`);
  }
}
