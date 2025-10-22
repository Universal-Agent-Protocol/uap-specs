/**
 * Universal Agent Protocol (UAP) - TypeScript Implementation
 *
 * Main exports
 */

// Core types
export * from './core/types.js';
export * from './core/errors.js';
export { MessageBuilder, MessageValidator } from './core/message.js';

// Discovery
export { AgentRegistry } from './discovery/registry.js';
export { MDNSDiscovery } from './discovery/mdns.js';

// Server (Agent)
export { UAPAgent } from './server/uap-agent.js';

// Client
export { UAPClient } from './client/uap-client.js';

// MCP Compatibility
export { MCPAdapter, createUAPAgentFromMCP } from './mcp/adapter.js';
