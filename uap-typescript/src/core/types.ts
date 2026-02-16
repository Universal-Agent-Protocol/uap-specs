/**
 * Core UAP Protocol Types
 * Based on Universal Agent Protocol Specification
 */

// ============================================================================
// UACP (Communication Protocol) Types
// ============================================================================

export type MessageType = 'Request' | 'Response' | 'Notification' | 'Error';
export type ContentType = 'JSON' | 'XML' | 'Binary';
export type Priority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface UACPHeader {
  messageId: string;           // UUID
  protocolVersion: string;     // e.g., "1.0"
  timestamp: string;           // ISO8601
  senderId: string;            // Agent ID
  recipientId: string;         // Agent ID or "Broadcast"
  messageType: MessageType;
  correlationId?: string;      // Links responses to requests
  authToken?: string;          // JWT or similar
  signature?: string;          // Digital signature
  contentType: ContentType;
  priority: Priority;
}

export interface UACPPayload {
  action: string;              // Action to perform
  data: any;                   // Action-specific data
}

export interface UACPMessage {
  header: UACPHeader;
  payload: UACPPayload;
}

// ============================================================================
// UADP (Discovery Protocol) Types
// ============================================================================

export type AgentStatus = 'Online' | 'Offline' | 'Busy' | 'Unavailable';

export interface AgentMetadata {
  version: string;
  tags?: string[];
  customProperties?: Record<string, any>;
}

export interface AgentRegistration {
  agentId: string;
  name: string;                // Human-readable name
  description?: string;        // Service description
  icon?: string;               // Icon URL for UI
  host: string;
  port: number;
  capabilities: string[];      // e.g., ["PostgreSQL", "SQLQuery"]
  status: AgentStatus;
  load: number;                // Percentage (0-100)
  metadata: AgentMetadata;
  timestamp: string;           // ISO8601
  signature?: string;

  // Auth information for UI
  auth?: {
    type: 'none' | 'oauth' | 'api-key' | 'basic';
    url?: string;              // OAuth URL
    scopes?: string[];
  };

  // Branding
  provider?: string;           // e.g., "Neon"
  website?: string;
  pricing?: string;            // e.g., "Free", "Usage-based"
}

export interface DiscoveryRequest {
  senderId: string;
  criteria: {
    capabilities?: string[];
    status?: AgentStatus;
    tags?: string[];
    maxLoad?: number;          // Only return agents below this load
  };
  timestamp: string;
  signature?: string;
}

export interface DiscoveryResponse {
  agents: AgentRegistration[];
  timestamp: string;
  signature?: string;
}

// ============================================================================
// UACO (Coordination Protocol) Types
// ============================================================================

export type NegotiationResponse = 'Accept' | 'Reject' | 'CounterOffer';

export interface NegotiationRequest {
  negotiationId: string;
  topic: string;               // e.g., "TaskExecution"
  parameters: {
    taskId?: string;
    taskType?: string;
    deadline?: string;
    compensation?: number;
    [key: string]: any;
  };
}

export interface NegotiationResponseData {
  negotiationId: string;
  response: NegotiationResponse;
  counterOffer?: {
    compensation?: number;
    deadline?: string;
    additionalTerms?: Record<string, any>;
  };
}

export interface CommitmentTerms {
  negotiationId: string;
  terms: Record<string, any>;
}

// ============================================================================
// Tool/Capability Types
// ============================================================================

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: any;
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  handler: (params: any, context?: ExecutionContext) => Promise<any>;
  async?: boolean;             // If true, returns taskId and runs in background
}

export interface ExecutionContext {
  contextId: string;
  taskList: string[];
  currentState: Record<string, any>;
  dataStore: Record<string, any>;
  updateProgress?: (progress: number) => void;
  notifyComplete?: (result: any) => void;
}

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentConfig {
  agentId?: string;            // Auto-generated if not provided
  name: string;
  description?: string;
  icon?: string;
  host?: string;               // Auto-detected if not provided
  port?: number;               // Auto-assigned if not provided
  capabilities: string[];
  tools: Record<string, Tool>;
  metadata?: Partial<AgentMetadata>;
  auth?: AgentRegistration['auth'];
  provider?: string;
  website?: string;
  pricing?: string;
}

// ============================================================================
// Client Configuration
// ============================================================================

export interface ClientConfig {
  clientId?: string;           // Auto-generated if not provided
  discoveryInterval?: number;  // How often to refresh discovery (ms)
  enableMDNS?: boolean;        // Enable mDNS discovery
  registryUrl?: string;        // Optional central registry URL
}

// ============================================================================
// MCP Compatibility Types
// ============================================================================

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}
