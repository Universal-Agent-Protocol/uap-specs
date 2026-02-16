# UAP Apps - Running Guide

## ✅ What's Running Now

### 1. UAP Agent Directory Server
**Status**: ✅ RUNNING
**Port**: 4000
**URL**: http://localhost:4000

**Endpoints**:
- `GET /health` - Server health check
- `GET /api/stats` - Registry statistics
- `GET /api/agents` - List all agents
- `POST /api/agents/register` - Register new agent
- `POST /api/agents/discover` - Discover agents by criteria
- `POST /api/agents/:id/heartbeat` - Update agent status

**Test it**:
```bash
# Health check
curl http://localhost:4000/health

# Get stats
curl http://localhost:4000/api/stats

# List agents
curl http://localhost:4000/api/agents
```

---

## 🚀 How to Expose Publicly (ngrok)

### If you have ngrok installed:

```bash
# Expose directory server (port 4000)
ngrok http 4000

# You'll get a public URL like:
# https://xxxx-xx-xx-xx-xx.ngrok-free.app
```

### If you don't have ngrok:

**Install ngrok**:
```bash
# Download from https://ngrok.com/download
# Or use package manager:
brew install ngrok  # macOS
choco install ngrok  # Windows
snap install ngrok  # Linux
```

**Authenticate** (free account at ngrok.com):
```bash
ngrok config add-authtoken YOUR_TOKEN
```

**Run**:
```bash
ngrok http 4000
```

---

## 📱 Access the Apps

### Directory (Registry)
```
Local:  http://localhost:4000
Stats:  http://localhost:4000/api/stats
Health: http://localhost:4000/health

With ngrok:
Public: https://your-ngrok-url.ngrok-free.app
```

### Scheduler (when started)
```bash
cd /home/user/uap-specs/uap-apps/scheduler
npm run dev
# Runs on http://localhost:3001

# Expose with ngrok:
ngrok http 3001
```

### Marketplace
```bash
cd /home/user/uap-specs/uap-apps/marketplace
npm run dev
# Runs on http://localhost:3002

ngrok http 3002
```

---

## 🧪 Test the Directory

### Register a Test Agent

```bash
curl -X POST http://localhost:4000/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "test-agent-1",
    "name": "Test Calculator Agent",
    "owner": {
      "name": "Demo User"
    },
    "capabilities": ["Calculator", "Math"],
    "description": "A test calculator agent",
    "status": "online",
    "load": 10,
    "endpoint": {
      "host": "localhost",
      "port": 8080,
      "protocol": "ws"
    }
  }'
```

### Discover Agents

```bash
# Find agents with Calculator capability
curl -X POST http://localhost:4000/api/agents/discover \
  -H "Content-Type: application/json" \
  -d '{
    "capabilities": ["Calculator"],
    "availableNow": true
  }'
```

### Get All Agents

```bash
curl http://localhost:4000/api/agents
```

---

## 🔧 Start Other Apps

### Scheduler

```bash
cd /home/user/uap-specs/uap-apps/scheduler
npm install  # if not done
npm run dev

# Visit: http://localhost:3001
# Expose: ngrok http 3001
```

### Marketplace

```bash
cd /home/user/uap-specs/uap-apps/marketplace
npm install  # if not done
npm run dev

# Visit: http://localhost:3002
# Expose: ngrok http 3002
```

### Complete Setup (All Apps)

```bash
# Terminal 1: Directory Server (already running)
cd /home/user/uap-specs/uap-apps/directory/server
ts-node standalone.ts

# Terminal 2: Scheduler
cd /home/user/uap-specs/uap-apps/scheduler
npm run dev

# Terminal 3: Marketplace
cd /home/user/uap-specs/uap-apps/marketplace
npm run dev

# Terminal 4: ngrok for Directory
ngrok http 4000

# Terminal 5: ngrok for Scheduler
ngrok http 3001

# Terminal 6: ngrok for Marketplace
ngrok http 3002
```

---

## 📊 Current Status

```
✅ UAP Protocol Implementation (TypeScript)
✅ Agent Directory (Backend API running on port 4000)
✅ Shared Types Library
✅ Scheduler App (UI ready, needs npm run dev)
✅ Marketplace App (scaffolded)
✅ Coordinator App (scaffolded)
✅ Resource Sharing App (scaffolded)
✅ Family Hub App (scaffolded)
```

---

## 🎯 Quick Demo

### 1. Check Server is Running

```bash
curl http://localhost:4000/health
# Should return: {"status":"healthy","agents":0,"services":0}
```

### 2. Register Demo Agents

```bash
# Register Agent 1: Calendar
curl -X POST http://localhost:4000/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "alice-agent",
    "name": "Alice'\''s Personal Agent",
    "owner": {"name": "Alice"},
    "capabilities": ["Calendar", "Email"],
    "status": "online",
    "load": 15,
    "endpoint": {"host": "localhost", "port": 8081, "protocol": "ws"}
  }'

# Register Agent 2: Code Review
curl -X POST http://localhost:4000/api/agents/register \
  -H "Content-Type": "application/json" \
  -d '{
    "agentId": "bob-agent",
    "name": "Bob'\''s Dev Agent",
    "owner": {"name": "Bob"},
    "capabilities": ["CodeReview", "Testing"],
    "status": "online",
    "load": 25,
    "endpoint": {"host": "localhost", "port": 8082, "protocol": "ws"}
  }'

# Register Agent 3: GPU Provider
curl -X POST http://localhost:4000/api/agents/register \
  -H "Content-Type": application/json" \
  -d '{
    "agentId": "compute-agent",
    "name": "GPU Compute Provider",
    "owner": {"name": "Compute Co"},
    "capabilities": ["GPU", "Compute", "ModelTraining"],
    "status": "online",
    "load": 40,
    "endpoint": {"host": "compute.example.com", "port": 8083, "protocol": "wss"}
  }'
```

### 3. Discover Agents

```bash
# Find all agents
curl http://localhost:4000/api/agents | jq .

# Find calendar agents
curl -X POST http://localhost:4000/api/agents/discover \
  -H "Content-Type": application/json" \
  -d '{"capabilities": ["Calendar"]}' | jq .

# Find code reviewers
curl -X POST http://localhost:4000/api/agents/discover \
  -H "Content-Type: application/json" \
  -d '{"capabilities": ["CodeReview"]}' | jq .

# Find GPU providers
curl -X POST http://localhost:4000/api/agents/discover \
  -H "Content-Type: application/json" \
  -d '{"capabilities": ["GPU"]}' | jq .
```

### 4. Get Stats

```bash
curl http://localhost:4000/api/stats | jq .
```

---

## 🌐 Accessing via ngrok

Once you run ngrok, you'll get URLs like:

```
Directory:   https://abc123.ngrok-free.app
Scheduler:   https://def456.ngrok-free.app
Marketplace: https://ghi789.ngrok-free.app
```

**Share these URLs** and anyone can:
- View the agent directory
- Discover available agents
- Use the scheduler interface
- Browse the marketplace

---

## 📝 Notes

- Directory server is running in background (PID in bash jobs)
- Use `jobs` to see running background tasks
- Use `kill %1` to stop background job
- Agents marked offline after 60 seconds of no heartbeat
- All data is in-memory (resets on server restart)

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find what's using port 4000
lsof -i :4000

# Kill it
kill -9 PID
```

### Server Not Responding

```bash
# Check if running
curl http://localhost:4000/health

# Restart server
cd /home/user/uap-specs/uap-apps/directory/server
ts-node standalone.ts
```

### ngrok Not Working

```bash
# Check ngrok is installed
ngrok version

# Check ngrok is authenticated
ngrok config check

# Try alternative port
ngrok http 4000 --region us
```

---

## ✨ What You Can Do Now

1. ✅ **Directory is running** - Register and discover agents
2. ✅ **API is accessible** - Test with curl or Postman
3. ✅ **Ready for demo** - Share ngrok URL
4. ⏭️ **Start Scheduler** - `cd scheduler && npm run dev`
5. ⏭️ **Start other apps** - Follow same pattern
6. ⏭️ **Build frontend** - Next.js apps ready to run

**The foundation is live and working!** 🎉
