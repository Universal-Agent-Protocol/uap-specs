/**
 * UAP Error Types
 */

export class UAPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'UAPError';
  }
}

export class AgentNotFoundError extends UAPError {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`, 'AGENT_NOT_FOUND', 404);
    this.name = 'AgentNotFoundError';
  }
}

export class AgentUnavailableError extends UAPError {
  constructor(agentId: string) {
    super(`Agent unavailable: ${agentId}`, 'AGENT_UNAVAILABLE', 503);
    this.name = 'AgentUnavailableError';
  }
}

export class ToolNotFoundError extends UAPError {
  constructor(toolName: string) {
    super(`Tool not found: ${toolName}`, 'TOOL_NOT_FOUND', 404);
    this.name = 'ToolNotFoundError';
  }
}

export class AuthenticationError extends UAPError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_FAILED', 401);
    this.name = 'AuthenticationError';
  }
}

export class NegotiationRejectedError extends UAPError {
  constructor(negotiationId: string, reason?: string) {
    super(
      `Negotiation rejected: ${negotiationId}${reason ? ` - ${reason}` : ''}`,
      'NEGOTIATION_REJECTED',
      400
    );
    this.name = 'NegotiationRejectedError';
  }
}

export class TimeoutError extends UAPError {
  constructor(operation: string) {
    super(`Operation timed out: ${operation}`, 'TIMEOUT', 408);
    this.name = 'TimeoutError';
  }
}
