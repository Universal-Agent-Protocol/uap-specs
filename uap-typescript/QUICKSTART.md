# UAP TypeScript - Quick Start

## ✅ Installation Complete

The UAP TypeScript implementation is ready to use!

```bash
cd uap-typescript
npm install  # ✅ Done
npm run build  # ✅ Done
```

## 🚀 Try It Now

### 1. Start an Agent (Terminal 1)

```bash
npm run example:agent
```

This starts a calculator agent that:
- Auto-announces itself via mDNS
- Provides math capabilities (add, subtract, multiply, divide)
- Supports async operations

### 2. Start a Client (Terminal 2)

```bash
npm run example:client
```

This starts a client that:
- Auto-discovers all agents on your network
- Calls calculator tools
- Shows real-time agent status

### 3. Bridge an MCP Server (Terminal 3)

```bash
# First, set your database URL (if you have PostgreSQL)
export DATABASE_URL="postgresql://localhost/mydb"

# Then bridge the MCP server
npm run example:mcp-bridge
```

## 📝 Simple Example

### Create an Agent

```typescript
import { UAPAgent } from './dist/index.js';

const agent = new UAPAgent({
  name: 'Hello World Agent',
  capabilities: ['Greeting'],
  tools: {
    sayHello: {
      name: 'sayHello',
      description: 'Say hello',
      parameters: [{ name: 'name', type: 'string', required: true }],
      handler: async (params) => {
        return { message: `Hello, ${params.name}!` };
      },
    },
  },
});

await agent.start();
console.log('Agent started and discoverable!');
```

### Use from Client

```typescript
import { UAPClient } from './dist/index.js';

const client = new UAPClient({ enableMDNS: true });
await client.start();

// Wait for discovery
await new Promise(r => setTimeout(r, 2000));

// Call tool automatically (finds best agent)
const result = await client.callToolAuto(
  'Greeting',
  'sayHello',
  { name: 'World' }
);

console.log(result.message); // "Hello, World!"
```

## 🔍 What Happens

1. **Agent starts** → Broadcasts on mDNS as "uap-agent"
2. **Client starts** → Listens for mDNS announcements
3. **Discovery** → Client finds agent within 1-2 seconds
4. **Connection** → WebSocket established automatically
5. **Tool Call** → Request sent, response received
6. **Result** → Data returned to client

## ✨ Key Features Working

- ✅ **Auto-discovery** - No config files needed
- ✅ **mDNS** - Local network discovery
- ✅ **WebSocket** - Fast bidirectional communication
- ✅ **Load balancing** - Picks least-busy agent
- ✅ **Async ops** - Long-running tasks don't block
- ✅ **MCP bridge** - Works with existing MCP servers

## 🎯 Next Steps

1. **Create your own agent** - See `examples/simple-agent.ts`
2. **Build a client** - See `examples/client-example.ts`
3. **Bridge MCP servers** - See `examples/mcp-bridge.ts`
4. **Read the docs** - See `README.md` and `USAGE.md`

## 🐛 Troubleshooting

### Agent not discovered?

```bash
# Check both are on same network
# Check firewall allows mDNS (port 5353 UDP)
# Try: sudo ufw allow 5353/udp
```

### Build errors?

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Port in use?

Agents auto-assign ports. If you see port errors, kill existing processes:

```bash
# Find process
lsof -i :PORT_NUMBER

# Kill process
kill -9 PID
```

## 📚 Learn More

- [README.md](README.md) - Full documentation
- [USAGE.md](USAGE.md) - Detailed usage guide
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Technical details
- [UAP Spec](../README.md) - Protocol specification

## 🎉 Success!

You now have a working UAP implementation that's:
- ✅ Better than MCP (auto-discovery, load balancing, failover)
- ✅ MCP compatible (bridge existing servers)
- ✅ Simple to use (no config files)
- ✅ Production-ready (TypeScript, error handling)

**Ready to build amazing multi-agent systems!**
