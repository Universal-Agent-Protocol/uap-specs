/**
 * Agent Registry - Central store for discovered agents
 */

import { EventEmitter } from 'events';
import { AgentRegistration, DiscoveryRequest, DiscoveryResponse } from '../core/types.js';

export class AgentRegistry extends EventEmitter {
  private agents: Map<string, AgentRegistration> = new Map();
  private heartbeatTimeout = 30000; // 30 seconds

  /**
   * Register an agent
   */
  register(agent: AgentRegistration): void {
    const existing = this.agents.get(agent.agentId);

    this.agents.set(agent.agentId, agent);

    if (!existing) {
      this.emit('agent-discovered', agent);
    } else {
      this.emit('agent-updated', agent);
    }

    // Set timeout to mark agent as offline if no heartbeat
    this.scheduleHeartbeatCheck(agent.agentId);
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.delete(agentId);
      this.emit('agent-lost', agent);
    }
  }

  /**
   * Update agent status
   */
  updateStatus(agentId: string, status: AgentRegistration['status'], load?: number): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      if (load !== undefined) {
        agent.load = load;
      }
      agent.timestamp = new Date().toISOString();
      this.emit('agent-updated', agent);
    }
  }

  /**
   * Get agent by ID
   */
  get(agentId: string): AgentRegistration | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Discover agents matching criteria
   */
  discover(request: DiscoveryRequest): DiscoveryResponse {
    const { criteria } = request;
    let matches = Array.from(this.agents.values());

    // Filter by capabilities
    if (criteria.capabilities && criteria.capabilities.length > 0) {
      matches = matches.filter((agent) =>
        criteria.capabilities!.every((cap) => agent.capabilities.includes(cap))
      );
    }

    // Filter by status
    if (criteria.status) {
      matches = matches.filter((agent) => agent.status === criteria.status);
    }

    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      matches = matches.filter(
        (agent) =>
          agent.metadata.tags &&
          criteria.tags!.some((tag) => agent.metadata.tags!.includes(tag))
      );
    }

    // Filter by max load
    if (criteria.maxLoad !== undefined) {
      matches = matches.filter((agent) => agent.load <= criteria.maxLoad!);
    }

    // Sort by load (prefer less loaded agents)
    matches.sort((a, b) => a.load - b.load);

    return {
      agents: matches,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get all agents
   */
  getAll(): AgentRegistration[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by capability
   */
  getByCapability(capability: string): AgentRegistration[] {
    return Array.from(this.agents.values()).filter((agent) =>
      agent.capabilities.includes(capability)
    );
  }

  /**
   * Schedule heartbeat check
   */
  private scheduleHeartbeatCheck(agentId: string): void {
    setTimeout(() => {
      const agent = this.agents.get(agentId);
      if (agent) {
        const lastSeen = new Date(agent.timestamp).getTime();
        const now = Date.now();

        if (now - lastSeen > this.heartbeatTimeout) {
          // Mark as offline or remove
          this.updateStatus(agentId, 'Offline');
        }
      }
    }, this.heartbeatTimeout);
  }

  /**
   * Clear all agents
   */
  clear(): void {
    this.agents.clear();
    this.emit('registry-cleared');
  }
}
