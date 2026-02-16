/**
 * Universal Agent Protocol (UAP) - TypeScript Implementation
 *
 * Main exports
 */

// Core types
export * from './core/types';
export * from './core/errors';
export { MessageBuilder, MessageValidator } from './core/message';

// Discovery
export { AgentRegistry } from './discovery/registry';
export { MDNSDiscovery } from './discovery/mdns';

// Server (Agent)
export { UAPAgent } from './server/uap-agent';

// Client
export { UAPClient } from './client/uap-client';

// MCP Compatibility
export { MCPAdapter, createUAPAgentFromMCP } from './mcp/adapter';
