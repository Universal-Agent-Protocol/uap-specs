/**
 * MCP Adapter - Wraps MCP servers as UAP agents
 * Allows UAP clients to discover and use MCP servers
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { MCPServerConfig, Tool, AgentConfig, MCPTool } from '../core/types.js';
import { UAPAgent } from '../server/uap-agent.js';

interface MCPMessage {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP Server Adapter
 * Bridges MCP protocol to UAP
 */
export class MCPAdapter extends EventEmitter {
  private process: ChildProcess | null = null;
  private messageBuffer: string = '';
  private nextId: number = 1;
  private pendingRequests: Map<
    number,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  > = new Map();
  private tools: MCPTool[] = [];
  private initialized: boolean = false;

  constructor(private config: MCPServerConfig, private serverName: string) {
    super();
  }

  /**
   * Start the MCP server process
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.config.command, this.config.args, {
        env: { ...process.env, ...this.config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.process.stdout || !this.process.stdin) {
        reject(new Error('Failed to create stdio pipes'));
        return;
      }

      // Handle stdout (MCP responses)
      this.process.stdout.on('data', (data) => {
        this.handleData(data);
      });

      this.process.stderr?.on('data', (data) => {
        console.error(`[MCP ${this.serverName}] stderr:`, data.toString());
      });

      this.process.on('error', (error) => {
        console.error(`[MCP ${this.serverName}] Process error:`, error);
        this.emit('error', error);
      });

      this.process.on('exit', (code) => {
        console.log(`[MCP ${this.serverName}] Process exited with code ${code}`);
        this.emit('exit', code);
      });

      // Initialize MCP connection
      this.initialize()
        .then(() => {
          this.initialized = true;
          console.log(`[MCP ${this.serverName}] Initialized`);
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Stop the MCP server process
   */
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  /**
   * Handle data from MCP server
   */
  private handleData(data: Buffer): void {
    this.messageBuffer += data.toString();

    // MCP uses JSON-RPC over stdio, one message per line
    const lines = this.messageBuffer.split('\n');
    this.messageBuffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message: MCPMessage = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          console.error(`[MCP ${this.serverName}] Failed to parse message:`, line);
        }
      }
    }
  }

  /**
   * Handle MCP message
   */
  private handleMessage(message: MCPMessage): void {
    if (message.id !== undefined) {
      // Response to our request
      const pending = this.pendingRequests.get(message.id as number);
      if (pending) {
        this.pendingRequests.delete(message.id as number);

        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    } else if (message.method) {
      // Notification from server
      this.emit('notification', message);
    }
  }

  /**
   * Send request to MCP server
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.process?.stdin) {
      throw new Error('MCP server not running');
    }

    const id = this.nextId++;
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.process!.stdin!.write(JSON.stringify(message) + '\n');

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  /**
   * Initialize MCP connection
   */
  private async initialize(): Promise<void> {
    // Initialize handshake
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'uap-mcp-adapter',
        version: '1.0.0',
      },
    });

    // Get list of tools
    const toolsResult = await this.sendRequest('tools/list');
    this.tools = toolsResult.tools || [];

    console.log(`[MCP ${this.serverName}] Discovered ${this.tools.length} tools`);
  }

  /**
   * Call an MCP tool
   */
  async callTool(name: string, args: any): Promise<any> {
    if (!this.initialized) {
      throw new Error('MCP server not initialized');
    }

    const result = await this.sendRequest('tools/call', {
      name,
      arguments: args,
    });

    return result;
  }

  /**
   * Get list of MCP tools
   */
  getTools(): MCPTool[] {
    return this.tools;
  }

  /**
   * Convert MCP tools to UAP tools
   */
  toUAPTools(): Record<string, Tool> {
    const uapTools: Record<string, Tool> = {};

    for (const mcpTool of this.tools) {
      uapTools[mcpTool.name] = {
        name: mcpTool.name,
        description: mcpTool.description,
        parameters: this.convertMCPSchemaToUAP(mcpTool.inputSchema),
        handler: async (params: any) => {
          return await this.callTool(mcpTool.name, params);
        },
      };
    }

    return uapTools;
  }

  /**
   * Convert MCP JSON schema to UAP parameters
   */
  private convertMCPSchemaToUAP(schema: MCPTool['inputSchema']): Tool['parameters'] {
    const params: Tool['parameters'] = [];

    if (schema.properties) {
      for (const [name, prop] of Object.entries(schema.properties)) {
        const propDef = prop as any;
        params.push({
          name,
          type: propDef.type || 'string',
          description: propDef.description,
          required: schema.required?.includes(name),
        });
      }
    }

    return params;
  }
}

/**
 * Create UAP Agent from MCP Server
 */
export async function createUAPAgentFromMCP(
  mcpConfig: MCPServerConfig,
  serverName: string,
  agentConfig?: Partial<AgentConfig>
): Promise<UAPAgent> {
  const adapter = new MCPAdapter(mcpConfig, serverName);

  // Start MCP server
  await adapter.start();

  // Get tools
  const tools = adapter.toUAPTools();

  // Create UAP agent
  const agent = new UAPAgent({
    name: agentConfig?.name || `MCP: ${serverName}`,
    description: agentConfig?.description || `MCP server: ${serverName}`,
    capabilities: ['MCP', ...(agentConfig?.capabilities || [])],
    tools,
    ...agentConfig,
  });

  // Forward adapter events
  adapter.on('error', (error) => {
    console.error(`[MCP ${serverName}] Error:`, error);
  });

  adapter.on('exit', (code) => {
    console.log(`[MCP ${serverName}] Exited with code ${code}`);
    agent.stop();
  });

  return agent;
}
