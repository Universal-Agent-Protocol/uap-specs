/**
 * UACP Message Utilities
 */

import { v4 as uuidv4 } from 'uuid';
import { UACPMessage, UACPHeader, MessageType, Priority } from './types';

export class MessageBuilder {
  /**
   * Create a UACP message
   */
  static create(
    senderId: string,
    recipientId: string,
    messageType: MessageType,
    action: string,
    data: any,
    options: {
      correlationId?: string;
      priority?: Priority;
      authToken?: string;
    } = {}
  ): UACPMessage {
    const header: UACPHeader = {
      messageId: uuidv4(),
      protocolVersion: '1.0',
      timestamp: new Date().toISOString(),
      senderId,
      recipientId,
      messageType,
      correlationId: options.correlationId,
      authToken: options.authToken,
      contentType: 'JSON',
      priority: options.priority || 'Normal',
    };

    return {
      header,
      payload: {
        action,
        data,
      },
    };
  }

  /**
   * Create a request message
   */
  static request(
    senderId: string,
    recipientId: string,
    action: string,
    data: any,
    options?: { priority?: Priority; authToken?: string }
  ): UACPMessage {
    return this.create(senderId, recipientId, 'Request', action, data, {
      correlationId: uuidv4(),
      ...options,
    });
  }

  /**
   * Create a response message
   */
  static response(
    senderId: string,
    recipientId: string,
    correlationId: string,
    action: string,
    data: any,
    options?: { authToken?: string }
  ): UACPMessage {
    return this.create(senderId, recipientId, 'Response', action, data, {
      correlationId,
      ...options,
    });
  }

  /**
   * Create a notification message
   */
  static notification(
    senderId: string,
    recipientId: string,
    action: string,
    data: any,
    options?: { priority?: Priority }
  ): UACPMessage {
    return this.create(senderId, recipientId, 'Notification', action, data, options);
  }

  /**
   * Create an error message
   */
  static error(
    senderId: string,
    recipientId: string,
    correlationId: string | undefined,
    error: { code: string; message: string; details?: any }
  ): UACPMessage {
    return this.create(senderId, recipientId, 'Error', 'error', error, {
      correlationId,
      priority: 'High',
    });
  }
}

/**
 * Message validation
 */
export class MessageValidator {
  static validate(message: UACPMessage): boolean {
    // Basic validation
    if (!message.header || !message.payload) {
      return false;
    }

    const { header, payload } = message;

    // Validate header
    if (!header.messageId || !header.senderId || !header.recipientId) {
      return false;
    }

    if (!['Request', 'Response', 'Notification', 'Error'].includes(header.messageType)) {
      return false;
    }

    // Validate payload
    if (!payload.action) {
      return false;
    }

    return true;
  }
}
