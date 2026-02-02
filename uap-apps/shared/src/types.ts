/**
 * Shared types for UAP applications
 */

// Agent Profile
export interface AgentProfile {
  agentId: string;
  name: string;
  owner: {
    name: string;
    email?: string;
    avatar?: string;
  };
  capabilities: string[];
  description?: string;
  icon?: string;
  status: 'online' | 'offline' | 'busy';
  load: number;
  lastSeen: string;
  endpoint: {
    host: string;
    port: number;
    protocol: 'ws' | 'wss';
  };
  metadata?: {
    version?: string;
    tags?: string[];
    [key: string]: any;
  };
}

// Service Offerings
export interface ServiceOffering {
  id: string;
  agentId: string;
  type: 'calendar' | 'compute' | 'review' | 'storage' | 'other';
  name: string;
  description: string;
  pricing?: {
    model: 'free' | 'usage' | 'subscription';
    amount?: number;
    currency?: string;
    unit?: string;
  };
  availability: {
    schedule?: string; // cron or description
    capacity?: number;
    currentLoad?: number;
  };
  requirements?: {
    authentication?: boolean;
    authorization?: string[];
  };
}

// Coordination Request
export interface CoordinationRequest {
  id: string;
  requesterId: string;
  type: 'schedule' | 'task' | 'resource' | 'query';
  description: string;
  requirements: {
    capabilities?: string[];
    timeframe?: {
      start: string;
      end: string;
    };
    budget?: {
      max: number;
      currency: string;
    };
    participants?: string[]; // agent IDs
  };
  status: 'open' | 'negotiating' | 'accepted' | 'completed' | 'cancelled';
  responses: CoordinationResponse[];
  createdAt: string;
  expiresAt?: string;
}

export interface CoordinationResponse {
  agentId: string;
  status: 'interested' | 'proposed' | 'accepted' | 'declined';
  proposal?: {
    timeSlots?: string[];
    price?: number;
    terms?: Record<string, any>;
  };
  message?: string;
  timestamp: string;
}

// Calendar Integration
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  attendees: {
    agentId: string;
    status: 'pending' | 'accepted' | 'declined';
  }[];
  location?: string;
  metadata?: Record<string, any>;
}

// Resource Sharing
export interface ResourceListing {
  id: string;
  agentId: string;
  resourceType: 'gpu' | 'cpu' | 'storage' | 'bandwidth' | 'custom';
  name: string;
  description: string;
  specifications: Record<string, any>;
  pricing: {
    model: 'hourly' | 'per-use' | 'subscription';
    amount: number;
    currency: string;
  };
  availability: {
    hours: string;
    maxDuration?: number;
    currentUsers: number;
    maxUsers: number;
  };
  requirements?: {
    verification?: boolean;
    deposit?: number;
  };
}

// Agent Authentication
export interface AgentAuth {
  agentId: string;
  token: string;
  expiresAt: string;
  scopes: string[];
  owner: {
    id: string;
    verified: boolean;
  };
}

// Discovery Query
export interface DiscoveryQuery {
  capabilities?: string[];
  serviceType?: string;
  maxLoad?: number;
  availableNow?: boolean;
  location?: 'local' | 'remote' | 'any';
  tags?: string[];
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
}

// Negotiation
export interface Negotiation {
  id: string;
  participants: string[]; // agent IDs
  topic: string;
  status: 'open' | 'in-progress' | 'agreed' | 'rejected' | 'expired';
  proposals: NegotiationProposal[];
  agreedTerms?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NegotiationProposal {
  agentId: string;
  proposalNumber: number;
  terms: Record<string, any>;
  timestamp: string;
  response?: 'accept' | 'counter' | 'reject';
}

// Family/Group
export interface AgentGroup {
  id: string;
  name: string;
  description?: string;
  type: 'family' | 'team' | 'project' | 'custom';
  members: {
    agentId: string;
    role: 'owner' | 'admin' | 'member';
    joinedAt: string;
  }[];
  sharedResources: {
    type: string;
    resourceId: string;
    permissions: string[];
  }[];
  coordinationChannel?: string; // UAP channel for group coordination
}
