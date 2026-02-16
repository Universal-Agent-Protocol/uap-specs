/**
 * mDNS-based Agent Discovery
 * Auto-discovers agents on local network using Bonjour/Zeroconf
 */

import Bonjour from 'bonjour-service';
import { EventEmitter } from 'events';
import { AgentRegistration } from '../core/types';

const UAP_SERVICE_TYPE = 'uap-agent';

export class MDNSDiscovery extends EventEmitter {
  private bonjour: InstanceType<typeof Bonjour>;
  private browser: any;
  private publisher: any;

  constructor() {
    super();
    this.bonjour = new Bonjour();
  }

  /**
   * Publish agent on mDNS
   */
  publish(agent: AgentRegistration): void {
    // Unpublish existing if any
    if (this.publisher) {
      this.unpublish();
    }

    // Publish service
    this.publisher = this.bonjour.publish({
      name: agent.name,
      type: UAP_SERVICE_TYPE,
      port: agent.port,
      txt: {
        agentId: agent.agentId,
        capabilities: JSON.stringify(agent.capabilities),
        status: agent.status,
        load: agent.load.toString(),
        version: agent.metadata.version,
        description: agent.description || '',
        icon: agent.icon || '',
        provider: agent.provider || '',
        website: agent.website || '',
        pricing: agent.pricing || '',
        authType: agent.auth?.type || 'none',
      },
    });

    console.log(`[mDNS] Published agent: ${agent.name} on port ${agent.port}`);
  }

  /**
   * Unpublish agent
   */
  unpublish(): void {
    if (this.publisher) {
      this.publisher.stop();
      this.publisher = null;
      console.log('[mDNS] Unpublished agent');
    }
  }

  /**
   * Start browsing for agents on network
   */
  startBrowsing(): void {
    this.browser = this.bonjour.find({ type: UAP_SERVICE_TYPE });

    this.browser.on('up', (service: any) => {
      try {
        const agent = this.serviceToAgent(service);
        this.emit('agent-discovered', agent);
        console.log(`[mDNS] Discovered agent: ${agent.name} at ${agent.host}:${agent.port}`);
      } catch (error) {
        console.error('[mDNS] Error processing discovered service:', error);
      }
    });

    this.browser.on('down', (service: any) => {
      try {
        const agentId = service.txt?.agentId;
        if (agentId) {
          this.emit('agent-lost', agentId);
          console.log(`[mDNS] Lost agent: ${service.name}`);
        }
      } catch (error) {
        console.error('[mDNS] Error processing lost service:', error);
      }
    });

    console.log('[mDNS] Started browsing for UAP agents');
  }

  /**
   * Stop browsing
   */
  stopBrowsing(): void {
    if (this.browser) {
      this.browser.stop();
      this.browser = null;
      console.log('[mDNS] Stopped browsing');
    }
  }

  /**
   * Shutdown mDNS
   */
  shutdown(): void {
    this.unpublish();
    this.stopBrowsing();
    this.bonjour.destroy();
    console.log('[mDNS] Shutdown complete');
  }

  /**
   * Convert mDNS service to AgentRegistration
   */
  private serviceToAgent(service: any): AgentRegistration {
    const txt = service.txt || {};

    return {
      agentId: txt.agentId,
      name: service.name,
      description: txt.description || undefined,
      icon: txt.icon || undefined,
      host: service.referer?.address || service.host || 'localhost',
      port: service.port,
      capabilities: txt.capabilities ? JSON.parse(txt.capabilities) : [],
      status: (txt.status as any) || 'Online',
      load: parseInt(txt.load || '0'),
      metadata: {
        version: txt.version || '1.0.0',
        tags: txt.tags ? JSON.parse(txt.tags) : [],
      },
      timestamp: new Date().toISOString(),
      auth: txt.authType
        ? {
            type: txt.authType,
            url: txt.authUrl,
          }
        : undefined,
      provider: txt.provider || undefined,
      website: txt.website || undefined,
      pricing: txt.pricing || undefined,
    };
  }
}
