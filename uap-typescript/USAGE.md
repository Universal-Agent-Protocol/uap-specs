# UAP Usage Guide

Complete guide to using the Universal Agent Protocol TypeScript implementation.

## Table of Contents

1. [Installation](#installation)
2. [Creating Your First Agent](#creating-your-first-agent)
3. [Creating a Client](#creating-a-client)
4. [Discovery](#discovery)
5. [Calling Tools](#calling-tools)
6. [Async Operations](#async-operations)
7. [MCP Compatibility](#mcp-compatibility)
8. [Best Practices](#best-practices)

## Installation

```bash
npm install @uap/protocol

# Or from source
git clone https://github.com/your-org/uap-typescript
cd uap-typescript
npm install
npm run build
```

## Creating Your First Agent

An agent provides capabilities (tools) that clients can discover and use.

### Basic Agent

```typescript
import { UAPAgent } from '@uap/protocol';

const agent = new UAPAgent({
  name: 'Weather Service',
  description: 'Provides weather information',
  capabilities: ['Weather', 'Temperature'],

  tools: {
    getTemperature: {
      name: 'getTemperature',
      description: 'Get current temperature for a city',
      parameters: [
        { name: 'city', type: 'string', required: true },
        { name: 'unit', type: 'string', required: false, default: 'celsius' },
      ],
      handler: async (params) => {
        const { city, unit = 'celsius' } = params;
        // Your implementation
        const temp = await fetchTemperature(city);
        return { temperature: temp, unit, city };
      },
    },
  },
});

await agent.start();
console.log('Weather agent started!');
```

### Agent with Branding (for UI)

```typescript
const agent = new UAPAgent({
  name: 'Premium Weather API',
  description: 'High-accuracy weather data',
  icon: 'https://example.com/weather-icon.png',
  capabilities: ['Weather'],

  // Branding info (shown in UAP client UIs)
  provider: 'WeatherCo',
  website: 'https://weatherco.com',
  pricing: 'Free tier available',

  // OAuth authentication
  auth: {
    type: 'oauth',
    url: 'https://weatherco.com/oauth/authorize',
    scopes: ['weather.read'],
  },

  tools: { /* ... */ },
});
```

### Agent with Async Operations

```typescript
const agent = new UAPAgent({
  name: 'Video Processor',
  capabilities: ['VideoProcessing'],

  tools: {
    // Synchronous tool
    getInfo: {
      name: 'getInfo',
      description: 'Get video information',
      parameters: [{ name: 'videoUrl', type: 'string', required: true }],
      handler: async (params) => {
        return { duration: 120, format: 'mp4' };
      },
    },

    // Asynchronous tool (returns taskId immediately)
    processVideo: {
      name: 'processVideo',
      description: 'Process a video (long-running)',
      parameters: [{ name: 'videoUrl', type: 'string', required: true }],
      async: true,  // ← Makes it async
      handler: async (params, context) => {
        // Long-running operation
        for (let progress = 0; progress <= 100; progress += 10) {
          await processChunk(params.videoUrl, progress);

          // Update progress
          context?.updateProgress?.(progress);

          await new Promise(r => setTimeout(r, 1000));
        }

        // Notify completion
        return { processedUrl: 'https://cdn.com/processed.mp4' };
      },
    },
  },
});
```

## Creating a Client

Clients discover and interact with agents.

### Basic Client

```typescript
import { UAPClient } from '@uap/protocol';

const client = new UAPClient({
  enableMDNS: true,  // Enable auto-discovery
});

// Listen for agents
client.on('agent-discovered', (agent) => {
  console.log(`Found: ${agent.name}`);
  console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
  console.log(`  Load: ${agent.load}%`);
});

client.on('agent-lost', (agent) => {
  console.log(`Lost: ${agent.name}`);
});

await client.start();
```

### Client with Notifications

```typescript
// Listen for async task updates
client.on('notification', ({ agentId, action, data }) => {
  if (action === 'taskProgress') {
    console.log(`Task ${data.taskId}: ${data.progress}%`);
  }

  if (action === 'taskComplete') {
    console.log(`Task ${data.taskId} completed:`, data.result);
  }

  if (action === 'taskError') {
    console.error(`Task ${data.taskId} failed:`, data.error);
  }
});
```

## Discovery

### Discover by Capability

```typescript
// Find all weather agents
const weatherAgents = client.discover({
  capabilities: ['Weather'],
  status: 'Online',
});

weatherAgents.forEach(agent => {
  console.log(`${agent.name} - Load: ${agent.load}%`);
});
```

### Discover with Filters

```typescript
// Find agents with specific criteria
const agents = client.discover({
  capabilities: ['Database', 'SQL'],  // Must have BOTH
  status: 'Online',                   // Only online agents
  tags: ['HighPerformance'],          // Must have this tag
  maxLoad: 50,                        // Load must be ≤ 50%
});
```

### Get All Agents

```typescript
const allAgents = client.getAgents();

// Group by capability
const byCapability = allAgents.reduce((acc, agent) => {
  agent.capabilities.forEach(cap => {
    if (!acc[cap]) acc[cap] = [];
    acc[cap].push(agent);
  });
  return acc;
}, {});
```

## Calling Tools

### Direct Tool Call

```typescript
// Call a specific agent's tool
const result = await client.callTool(
  'agent-123',           // Agent ID
  'getTemperature',      // Tool name
  { city: 'London' }     // Parameters
);

console.log(result.temperature);
```

### Auto Tool Call (Recommended)

```typescript
// Automatically find and use best agent
const result = await client.callToolAuto(
  'Weather',             // Capability required
  'getTemperature',      // Tool name
  { city: 'London' },    // Parameters
  {
    maxLoad: 70,         // Optional: only use agents under 70% load
    retries: 3,          // Optional: retry on failure
  }
);
```

The client will:
1. Find all agents with 'Weather' capability
2. Filter by maxLoad
3. Pick the least loaded agent
4. Call the tool
5. Retry with different agent if failure

### Error Handling

```typescript
try {
  const result = await client.callToolAuto('Weather', 'getTemp', params);
} catch (error) {
  if (error instanceof AgentNotFoundError) {
    console.error('No weather agents available');
  } else if (error instanceof AgentUnavailableError) {
    console.error('Agent is offline');
  } else if (error instanceof TimeoutError) {
    console.error('Request timed out');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Async Operations

### Calling Async Tool

```typescript
// Returns task ID immediately, doesn't block
const response = await client.callTool(
  agentId,
  'processVideo',
  { videoUrl: 'https://...' }
);

console.log(`Task started: ${response.taskId}`);
// Can continue doing other things...

// Listen for completion
client.on('notification', ({ action, data }) => {
  if (action === 'taskComplete' && data.taskId === response.taskId) {
    console.log('Video ready:', data.result.processedUrl);
  }
});
```

### Progress Tracking

```typescript
const progressMap = new Map();

client.on('notification', ({ action, data }) => {
  if (action === 'taskProgress') {
    progressMap.set(data.taskId, data.progress);
    console.log(`Progress: ${data.progress}%`);
  }
});
```

## MCP Compatibility

### Bridge MCP Server

```typescript
import { createUAPAgentFromMCP } from '@uap/protocol';

const mcpAgent = await createUAPAgentFromMCP(
  // MCP server config
  {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    env: {
      DATABASE_URL: 'postgresql://localhost/db',
    },
  },
  // Server name
  'postgres',
  // UAP agent config (optional)
  {
    name: 'Company Database',
    description: 'PostgreSQL via MCP',
    capabilities: ['Database', 'PostgreSQL'],
    provider: 'Internal IT',
  }
);

await mcpAgent.start();
// Now discoverable as UAP agent!
```

### Bridge Multiple MCP Servers

```typescript
const servers = [
  { name: 'postgres', command: 'npx', args: [...] },
  { name: 'filesystem', command: 'npx', args: [...] },
  { name: 'puppeteer', command: 'node', args: [...] },
];

const agents = await Promise.all(
  servers.map(config =>
    createUAPAgentFromMCP(config, config.name)
  )
);

await Promise.all(agents.map(a => a.start()));
console.log('All MCP servers bridged and discoverable!');
```

## Best Practices

### 1. Use Auto Tool Calling

❌ Don't hardcode agent IDs:
```typescript
const result = await client.callTool('agent-123', 'query', params);
```

✅ Use capability-based discovery:
```typescript
const result = await client.callToolAuto('Database', 'query', params);
```

### 2. Handle Agent Changes

```typescript
// Refresh discovery periodically
setInterval(() => {
  const agents = client.discover({ capabilities: ['Database'] });
  if (agents.length === 0) {
    console.warn('No database agents available!');
  }
}, 30000);
```

### 3. Implement Graceful Shutdown

```typescript
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await agent.stop();  // or client.stop()
  process.exit(0);
});
```

### 4. Monitor Agent Health

```typescript
async function checkHealth(agentId: string) {
  try {
    const latency = await client.ping(agentId);
    const status = await client.getStatus(agentId);

    console.log(`Agent ${agentId}:`);
    console.log(`  Latency: ${latency}ms`);
    console.log(`  Load: ${status.load}%`);
    console.log(`  Queue: ${status.queueDepth} tasks`);

    return latency < 100 && status.load < 80;
  } catch {
    return false;
  }
}
```

### 5. Use Typed Parameters

```typescript
interface GetWeatherParams {
  city: string;
  unit?: 'celsius' | 'fahrenheit';
}

const result = await client.callToolAuto<GetWeatherParams>(
  'Weather',
  'getTemperature',
  { city: 'London', unit: 'celsius' }
);
```

### 6. Implement Retries for Critical Operations

```typescript
async function callWithRetry(
  capability: string,
  tool: string,
  params: any,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.callToolAuto(capability, tool, params);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

## Advanced Usage

### Custom Load Calculation

```typescript
class CustomAgent extends UAPAgent {
  private updateLoad() {
    // Custom load calculation
    const cpuLoad = os.loadavg()[0] * 100;
    const memLoad = (os.totalmem() - os.freemem()) / os.totalmem() * 100;
    this.load = Math.max(cpuLoad, memLoad);
  }
}
```

### Agent Groups

```typescript
// Start multiple related agents
const agents = [
  new UAPAgent({ name: 'DB Primary', capabilities: ['Database'] }),
  new UAPAgent({ name: 'DB Replica', capabilities: ['Database'] }),
  new UAPAgent({ name: 'Cache', capabilities: ['Cache'] }),
];

await Promise.all(agents.map(a => a.start()));

// Client automatically load balances between them
const result = await client.callToolAuto('Database', 'query', sql);
```

### Custom Discovery

```typescript
// Find fastest agent
const agents = client.discover({ capabilities: ['Database'] });
const latencies = await Promise.all(
  agents.map(async a => ({
    agent: a,
    latency: await client.ping(a.agentId),
  }))
);
const fastest = latencies.sort((a, b) => a.latency - b.latency)[0];

const result = await client.callTool(fastest.agent.agentId, 'query', sql);
```

## Troubleshooting

### Agent Not Discovered

1. Check both agent and client are on same network
2. Check firewall allows mDNS (port 5353 UDP)
3. Verify agent started successfully
4. Check client has `enableMDNS: true`

### Connection Timeout

1. Check agent's WebSocket port is accessible
2. Verify no firewall blocking the port
3. Check agent is still running (`client.getAgents()`)

### Tool Call Fails

1. Verify tool name is correct (`getCapabilities()`)
2. Check parameters match tool definition
3. Look at agent logs for errors
4. Try pinging agent first

## Next Steps

- Read the [API Reference](README.md#api-reference)
- Explore [Examples](examples/)
- Check out the [Roadmap](README.md#roadmap)
- Join the community discussions
