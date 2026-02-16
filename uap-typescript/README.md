# Universal Agent Protocol (UAP) - TypeScript Implementation

A complete TypeScript implementation of the Universal Agent Protocol, featuring auto-discovery, MCP compatibility, and a simple, developer-friendly API.

## Features

- ✅ **Auto-Discovery**: Agents automatically discover each other via mDNS (Bonjour/Zeroconf)
- ✅ **MCP Compatible**: Bridge existing MCP servers as UAP agents
- ✅ **Async Operations**: Support for long-running tasks with progress updates
- ✅ **Load Balancing**: Automatic routing to least-loaded agents
- ✅ **Type-Safe**: Full TypeScript support with comprehensive types
- ✅ **Simple API**: Easy to create agents and clients
- ✅ **WebSocket Communication**: Efficient bidirectional communication
- ✅ **Zero Configuration**: No config files needed for basic usage

## Installation

```bash
npm install @uap/protocol
```

Or clone and build from source:

```bash
git clone https://github.com/your-org/uap-typescript
cd uap-typescript
npm install
npm run build
```

## Quick Start

### Creating an Agent

```typescript
import { UAPAgent } from '@uap/protocol';

const agent = new UAPAgent({
  name: 'My Calculator',
  description: 'Simple calculator service',
  capabilities: ['Calculator', 'Math'],

  tools: {
    add: {
      name: 'add',
      description: 'Add two numbers',
      parameters: [
        { name: 'a', type: 'number', required: true },
        { name: 'b', type: 'number', required: true },
      ],
      handler: async (params) => {
        return { result: params.a + params.b };
      },
    },
  },
});

await agent.start();
console.log('Agent started and discoverable!');
```

### Using a Client

```typescript
import { UAPClient } from '@uap/protocol';

const client = new UAPClient({ enableMDNS: true });

// Listen for discovered agents
client.on('agent-discovered', (agent) => {
  console.log(`Found: ${agent.name}`);
});

await client.start();

// Discover calculator agents
const calculators = client.discover({
  capabilities: ['Calculator'],
  status: 'Online',
});

// Call a tool
const result = await client.callTool(calculators[0].agentId, 'add', {
  a: 5,
  b: 3,
});
console.log(`Result: ${result.result}`); // 8

// Or use auto-selection (finds best agent automatically)
const autoResult = await client.callToolAuto('Calculator', 'add', {
  a: 10,
  b: 20,
});
```

### Bridging MCP Servers

```typescript
import { createUAPAgentFromMCP } from '@uap/protocol';

// Wrap an existing MCP server as a UAP agent
const agent = await createUAPAgentFromMCP(
  {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    env: {
      DATABASE_URL: 'postgresql://localhost/mydb',
    },
  },
  'postgres',
  {
    name: 'PostgreSQL (via MCP)',
    capabilities: ['Database', 'SQL'],
  }
);

await agent.start();
// Now discoverable as UAP agent!
```

## Architecture

### Components

```
┌─────────────────────────────────────────────────────┐
│ UAP Client                                          │
│ - Discovers agents via mDNS                         │
│ - Maintains agent registry                          │
│ - Routes requests to best agent                     │
└─────────────────────────────────────────────────────┘
           ↓ Auto-discovers via mDNS
┌─────────────────────────────────────────────────────┐
│ Local Network                                       │
│ - Agent A: Calculator (load: 20%)                   │
│ - Agent B: Database (load: 45%)                     │
│ - Agent C: PDF Generator (load: 10%)                │
└─────────────────────────────────────────────────────┘
           ↓ WebSocket connections
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  UAP Agent   │ │  UAP Agent   │ │  MCP Bridge  │
│  (Native)    │ │  (Native)    │ │  (MCP→UAP)   │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Protocols Implemented

#### UACP (Universal Agent Communication Protocol)
- Standard message format (header + payload)
- Request/Response pattern
- Notifications
- Error handling
- Correlation IDs for tracking

#### UADP (Universal Agent Discovery Protocol)
- mDNS-based discovery
- Capability-based search
- Load-aware selection
- Real-time status updates
- Agent registry

#### MCP Compatibility
- Wraps MCP servers as UAP agents
- JSON-RPC to UAP translation
- Auto-discovery of MCP tools
- Transparent integration

## How It Works

### Auto-Discovery

1. **Agent starts** and publishes itself via mDNS
2. **Clients listen** for mDNS announcements
3. **Registry updates** when agents appear/disappear
4. **Clients query** registry by capabilities
5. **Smart selection** based on load and requirements

### Communication Flow

```
Client                    Agent
  |                         |
  |-- Discovery Request --->|
  |<-- Agent Info ----------|
  |                         |
  |-- Connect (WebSocket)-->|
  |                         |
  |-- Call Tool ----------->|
  |                         |
  |<-- Tool Result ---------|
  |                         |
  |<-- Progress Update -----|  (for async operations)
  |<-- Completion Notify ---|
```

### Load Balancing

Agents report their load every 5 seconds. Clients automatically select the least-loaded agent when multiple agents provide the same capability.

```typescript
// Finds all Calculator agents and picks least loaded
const result = await client.callToolAuto('Calculator', 'add', params);
```

## API Reference

### UAPAgent

```typescript
class UAPAgent {
  constructor(config: AgentConfig);

  async start(): Promise<void>;
  async stop(): Promise<void>;

  addTool(name: string, tool: Tool): void;
  removeTool(name: string): void;

  getRegistration(): AgentRegistration;
}
```

### UAPClient

```typescript
class UAPClient {
  constructor(config?: ClientConfig);

  async start(): Promise<void>;
  async stop(): Promise<void>;

  discover(criteria: DiscoveryCriteria): AgentRegistration[];
  getAgents(): AgentRegistration[];
  getAgent(agentId: string): AgentRegistration | undefined;

  async callTool(agentId: string, toolName: string, params: any): Promise<any>;
  async callToolAuto(capability: string, toolName: string, params: any): Promise<any>;

  async getStatus(agentId: string): Promise<AgentStatus>;
  async ping(agentId: string): Promise<number>;

  // Events
  on('agent-discovered', (agent: AgentRegistration) => void);
  on('agent-lost', (agent: AgentRegistration) => void);
  on('notification', (data: any) => void);
}
```

### MCP Bridge

```typescript
async function createUAPAgentFromMCP(
  mcpConfig: MCPServerConfig,
  serverName: string,
  agentConfig?: Partial<AgentConfig>
): Promise<UAPAgent>;
```

## Examples

Run the examples:

```bash
# Terminal 1: Start an agent
npm run example:agent

# Terminal 2: Start a client
npm run example:client

# Terminal 3: Bridge an MCP server
npm run example:mcp-bridge
```

## Comparison: UAP vs MCP

| Feature | MCP | UAP |
|---------|-----|-----|
| **Discovery** | Manual config | Auto-discovery |
| **Config files** | Required | Optional |
| **Restart needed** | Yes | No |
| **Multiple providers** | Manual setup | Auto-selected |
| **Load balancing** | Not built-in | Automatic |
| **Failover** | Manual | Automatic |
| **Async operations** | Limited | Native support |
| **UX** | Developer-focused | Consumer-friendly |

## Use Cases

### 1. Zero-Config Company AI

```typescript
// IT runs central UAP services
await postgresAgent.start();
await salesforceAgent.start();
await docAgent.start();

// Employees just install client
// Services auto-discovered, no config needed
```

### 2. Service Marketplace

```typescript
// Provider offers GPU service
const gpuAgent = new UAPAgent({
  name: 'High-Power GPU',
  capabilities: ['ImageGeneration', 'ModelTraining'],
  pricing: '$0.10/minute',
  // ... tools
});

// Anyone's client can discover and use it
const result = await client.callToolAuto('ImageGeneration', 'generate', {
  prompt: 'sunset over mountains'
});
```

### 3. Multi-Location Resilience

```typescript
// At office: uses local high-speed DB
// At home: automatically switches to cloud replica
// No configuration changes needed
const result = await client.callToolAuto('Database', 'query', sql);
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run examples
npm run example:agent
npm run example:client
npm run example:mcp-bridge
```

## Roadmap

- [x] Core UACP protocol
- [x] mDNS discovery
- [x] WebSocket transport
- [x] MCP compatibility
- [x] Async operations
- [x] Load balancing
- [ ] UACO (Coordination/Negotiation)
- [ ] Cloud registry (for WAN discovery)
- [ ] Authentication/Authorization
- [ ] End-to-end encryption
- [ ] Web UI dashboard
- [ ] Agent marketplace

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT

## Links

- [UAP Specification](../README.md)
- [MCP Specification](https://modelcontextprotocol.io)
- [Issues](https://github.com/your-org/uap-specs/issues)
