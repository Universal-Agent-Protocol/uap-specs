/**
 * UAP Agent Directory Server
 * Central registry for agent discovery
 */

import express from 'express';
import cors from 'cors';
import { AgentProfile, ServiceOffering, DiscoveryQuery } from '@uap/shared/src/types';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// In-memory storage (in production, use database)
const agents: Map<string, AgentProfile> = new Map();
const services: Map<string, ServiceOffering> = new Map();
const agentServices: Map<string, string[]> = new Map(); // agentId -> serviceIds

/**
 * Register agent
 */
app.post('/api/agents/register', (req, res) => {
  const profile: AgentProfile = req.body;

  agents.set(profile.agentId, {
    ...profile,
    lastSeen: new Date().toISOString(),
  });

  console.log(`[Registry] Agent registered: ${profile.name} (${profile.agentId})`);

  res.json({ success: true, agentId: profile.agentId });
});

/**
 * Update agent status
 */
app.post('/api/agents/:agentId/heartbeat', (req, res) => {
  const { agentId } = req.params;
  const { status, load } = req.body;

  const agent = agents.get(agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  agent.status = status || agent.status;
  agent.load = load !== undefined ? load : agent.load;
  agent.lastSeen = new Date().toISOString();

  agents.set(agentId, agent);

  res.json({ success: true });
});

/**
 * Discover agents
 */
app.post('/api/agents/discover', (req, res) => {
  const query: DiscoveryQuery = req.body;

  let results = Array.from(agents.values());

  // Filter by capabilities
  if (query.capabilities && query.capabilities.length > 0) {
    results = results.filter(agent =>
      query.capabilities!.every(cap => agent.capabilities.includes(cap))
    );
  }

  // Filter by max load
  if (query.maxLoad !== undefined) {
    results = results.filter(agent => agent.load <= query.maxLoad!);
  }

  // Filter by availability
  if (query.availableNow) {
    results = results.filter(agent => agent.status === 'online');
  }

  // Filter by tags
  if (query.tags && query.tags.length > 0) {
    results = results.filter(agent =>
      agent.metadata?.tags &&
      query.tags!.some(tag => agent.metadata!.tags!.includes(tag))
    );
  }

  // Sort by load (prefer less loaded)
  results.sort((a, b) => a.load - b.load);

  res.json({ agents: results });
});

/**
 * Get all agents
 */
app.get('/api/agents', (req, res) => {
  const allAgents = Array.from(agents.values())
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

  res.json({ agents: allAgents });
});

/**
 * Get agent by ID
 */
app.get('/api/agents/:agentId', (req, res) => {
  const { agentId } = req.params;
  const agent = agents.get(agentId);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json(agent);
});

/**
 * Register service offering
 */
app.post('/api/services/register', (req, res) => {
  const service: ServiceOffering = req.body;

  services.set(service.id, service);

  // Track services per agent
  const agentServiceList = agentServices.get(service.agentId) || [];
  agentServiceList.push(service.id);
  agentServices.set(service.agentId, agentServiceList);

  console.log(`[Registry] Service registered: ${service.name} by ${service.agentId}`);

  res.json({ success: true, serviceId: service.id });
});

/**
 * Discover services
 */
app.post('/api/services/discover', (req, res) => {
  const { type, agentId } = req.body;

  let results = Array.from(services.values());

  if (type) {
    results = results.filter(s => s.type === type);
  }

  if (agentId) {
    results = results.filter(s => s.agentId === agentId);
  }

  res.json({ services: results });
});

/**
 * Get agent's services
 */
app.get('/api/agents/:agentId/services', (req, res) => {
  const { agentId } = req.params;
  const serviceIds = agentServices.get(agentId) || [];
  const agentServiceList = serviceIds.map(id => services.get(id)).filter(Boolean);

  res.json({ services: agentServiceList });
});

/**
 * Unregister agent
 */
app.delete('/api/agents/:agentId', (req, res) => {
  const { agentId } = req.params;

  agents.delete(agentId);

  // Remove services
  const serviceIds = agentServices.get(agentId) || [];
  serviceIds.forEach(id => services.delete(id));
  agentServices.delete(agentId);

  console.log(`[Registry] Agent unregistered: ${agentId}`);

  res.json({ success: true });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agents: agents.size,
    services: services.size,
  });
});

/**
 * Stats
 */
app.get('/api/stats', (req, res) => {
  const stats = {
    totalAgents: agents.size,
    onlineAgents: Array.from(agents.values()).filter(a => a.status === 'online').length,
    totalServices: services.size,
    capabilityBreakdown: {} as Record<string, number>,
  };

  // Count capabilities
  agents.forEach(agent => {
    agent.capabilities.forEach(cap => {
      stats.capabilityBreakdown[cap] = (stats.capabilityBreakdown[cap] || 0) + 1;
    });
  });

  res.json(stats);
});

// Cleanup offline agents every minute
setInterval(() => {
  const now = Date.now();
  const timeout = 60000; // 1 minute

  agents.forEach((agent, agentId) => {
    const lastSeen = new Date(agent.lastSeen).getTime();
    if (now - lastSeen > timeout && agent.status !== 'offline') {
      agent.status = 'offline';
      agents.set(agentId, agent);
      console.log(`[Registry] Agent marked offline: ${agent.name}`);
    }
  });
}, 60000);

app.listen(PORT, () => {
  console.log(`\n===========================================`);
  console.log(`🌐 UAP Agent Directory Server`);
  console.log(`===========================================`);
  console.log(`📡 Running on: http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`📈 Stats: http://localhost:${PORT}/api/stats`);
  console.log(`===========================================\n`);
});

export default app;
