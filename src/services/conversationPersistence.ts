/**
 * @fileoverview Service for persisting and managing conversation history.
 * Handles file-based storage of multi-turn conversations.
 * @module src/services/conversationPersistence
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import { config } from '../config/index.js';
import { BaseErrorCode, McpError } from '../types-global/errors.js';
import { ErrorHandler, logger, type RequestContext } from '../utils/index.js';
import { generateConversationId, isValidConversationId } from '../utils/conversation/conversationIdGenerator.js';
import { ConversationStatus, ConversationStatusSchema, createInitialStatus } from '../types-global/job-status.js';

/**
 * Schema for a single conversation message.
 */
export const ConversationMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']).describe('The role of the message sender'),
  content: z.string().describe('The message content'),
});

/**
 * Schema for a complete conversation.
 */
export const ConversationSchema = z.object({
  conversationId: z.string().describe('Unique conversation identifier'),
  createdAt: z.string().datetime().describe('ISO 8601 timestamp of conversation creation'),
  updatedAt: z.string().datetime().describe('ISO 8601 timestamp of last update'),
  messageCount: z.number().int().nonnegative().describe('Total number of messages'),
  messages: z.array(ConversationMessageSchema).describe('Array of conversation messages'),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;

/**
 * Service class for managing conversation persistence.
 */
class ConversationPersistenceService {
  /**
   * Gets the base directory for conversation logs.
   * @throws {McpError} If conversation logs directory is not configured
   */
  private getBaseDir(): string {
    if (!config.conversationLogsPath) {
      throw new McpError(
        BaseErrorCode.CONFIGURATION_ERROR,
        'Conversation logs directory is not configured. Check CONVERSATION_LOGS_DIR configuration.'
      );
    }
    return config.conversationLogsPath;
  }

  /**
   * Gets the directory path for a specific conversation.
   * @param conversationId - The conversation ID
   * @returns The absolute path to the conversation directory
   */
  private getConversationDir(conversationId: string): string {
    return path.join(this.getBaseDir(), conversationId);
  }

  /**
   * Gets the file path for a conversation's JSON file.
   * @param conversationId - The conversation ID
   * @returns The absolute path to the conversation.json file
   */
  private getConversationFilePath(conversationId: string): string {
    return path.join(this.getConversationDir(conversationId), 'conversation.json');
  }

  /**
   * Gets the file path for a conversation's status file.
   * @param conversationId - The conversation ID
   * @returns The absolute path to the status.json file
   */
  public getStatusFilePath(conversationId: string): string {
    return path.join(this.getConversationDir(conversationId), 'status.json');
  }

  /**
   * Gets the file path for a conversation's job file.
   * @param conversationId - The conversation ID
   * @returns The absolute path to the job.json file
   */
  public getJobFilePath(conversationId: string): string {
    return path.join(this.getConversationDir(conversationId), 'job.json');
  }

  /**
   * Gets the conversation file path (public method for returning to user).
   * @param conversationId - The conversation ID
   * @returns The absolute path to the conversation directory
   */
  public getConversationPath(conversationId: string): string {
    return this.getConversationDir(conversationId);
  }

  /**
   * Ensures the conversation directory exists.
   * @param conversationId - The conversation ID
   * @param context - Request context for logging
   */
  private ensureConversationDir(conversationId: string, context: RequestContext): void {
    const conversationDir = this.getConversationDir(conversationId);
    
    if (!existsSync(conversationDir)) {
      try {
        mkdirSync(conversationDir, { recursive: true });
        logger.debug('Created conversation directory', { ...context, conversationDir });
      } catch (error) {
        throw new McpError(
          BaseErrorCode.FILESYSTEM_ERROR,
          `Failed to create conversation directory: ${error instanceof Error ? error.message : String(error)}`,
          { conversationId, conversationDir }
        );
      }
    }
  }

  /**
   * Checks if a conversation exists.
   * @param conversationId - The conversation ID to check
   * @returns true if the conversation exists, false otherwise
   */
  public async conversationExists(conversationId: string): Promise<boolean> {
    if (!isValidConversationId(conversationId)) {
      return false;
    }
    
    const filePath = this.getConversationFilePath(conversationId);
    return existsSync(filePath);
  }

  /**
   * Creates a new conversation with initial messages.
   * @param initialMessages - The initial messages to store
   * @param context - Request context for logging
   * @returns The created conversation
   */
  public async createConversation(
    initialMessages: ConversationMessage[],
    context: RequestContext
  ): Promise<Conversation> {
    return await ErrorHandler.tryCatch(
      async () => {
        const conversationId = generateConversationId();
        const now = new Date().toISOString();
        
        const conversation: Conversation = {
          conversationId,
          createdAt: now,
          updatedAt: now,
          messageCount: initialMessages.length,
          messages: initialMessages,
        };

        // Validate conversation structure
        ConversationSchema.parse(conversation);

        // Ensure directory exists
        this.ensureConversationDir(conversationId, context);

        // Write to file
        const filePath = this.getConversationFilePath(conversationId);
        try {
          writeFileSync(filePath, JSON.stringify(conversation, null, 2), 'utf-8');
          logger.info('Created conversation', { ...context, conversationId, messageCount: initialMessages.length });
        } catch (error) {
          throw new McpError(
            BaseErrorCode.FILESYSTEM_ERROR,
            `Failed to write conversation file: ${error instanceof Error ? error.message : String(error)}`,
            { conversationId, filePath }
          );
        }

        return conversation;
      },
      {
        operation: 'ConversationPersistenceService.createConversation',
        context,
        errorCode: BaseErrorCode.INTERNAL_ERROR,
      }
    );
  }

  /**
   * Loads an existing conversation by ID.
   * @param conversationId - The conversation ID to load
   * @param context - Request context for logging
   * @returns The loaded conversation
   * @throws {McpError} If conversation doesn't exist or is corrupted
   */
  public async loadConversation(
    conversationId: string,
    context: RequestContext
  ): Promise<Conversation> {
    return await ErrorHandler.tryCatch(
      async () => {
        // Validate conversation ID format
        if (!isValidConversationId(conversationId)) {
          throw new McpError(
            BaseErrorCode.VALIDATION_ERROR,
            `Invalid conversation ID format: ${conversationId}. Expected format: yyyymmdd-[timestamp]`,
            { conversationId }
          );
        }

        // Check if conversation exists
        const filePath = this.getConversationFilePath(conversationId);
        if (!existsSync(filePath)) {
          throw new McpError(
            BaseErrorCode.CONVERSATION_NOT_FOUND,
            `Conversation ${conversationId} does not exist. Start a new conversation with perplexity_search or perplexity_deep_research.`,
            { conversationId, filePath }
          );
        }

        // Read and parse conversation file
        let rawData: string;
        try {
          rawData = readFileSync(filePath, 'utf-8');
        } catch (error) {
          throw new McpError(
            BaseErrorCode.FILESYSTEM_ERROR,
            `Failed to read conversation file: ${error instanceof Error ? error.message : String(error)}`,
            { conversationId, filePath }
          );
        }

        // Parse JSON
        let parsedData: unknown;
        try {
          parsedData = JSON.parse(rawData);
        } catch (error) {
          throw new McpError(
            BaseErrorCode.CONVERSATION_CORRUPTED,
            `Conversation ${conversationId} data is corrupted. Please start a new conversation.`,
            { conversationId, error: error instanceof Error ? error.message : String(error) }
          );
        }

        // Validate schema
        try {
          const conversation = ConversationSchema.parse(parsedData);
          logger.debug('Loaded conversation', { ...context, conversationId, messageCount: conversation.messageCount });
          return conversation;
        } catch (error) {
          throw new McpError(
            BaseErrorCode.CONVERSATION_CORRUPTED,
            `Conversation ${conversationId} failed schema validation. Please start a new conversation.`,
            { conversationId, validationError: error }
          );
        }
      },
      {
        operation: 'ConversationPersistenceService.loadConversation',
        context,
        input: { conversationId },
        errorCode: BaseErrorCode.INTERNAL_ERROR,
      }
    );
  }

  /**
   * Appends a new message to an existing conversation.
   * @param conversationId - The conversation ID
   * @param message - The message to append
   * @param context - Request context for logging
   * @returns The updated conversation
   */
  public async appendMessage(
    conversationId: string,
    message: ConversationMessage,
    context: RequestContext
  ): Promise<Conversation> {
    return await ErrorHandler.tryCatch(
      async () => {
        // Validate message
        ConversationMessageSchema.parse(message);

        // Load existing conversation
        const conversation = await this.loadConversation(conversationId, context);

        // Append message
        conversation.messages.push(message);
        conversation.messageCount = conversation.messages.length;
        conversation.updatedAt = new Date().toISOString();

        // Write updated conversation
        const filePath = this.getConversationFilePath(conversationId);
        try {
          writeFileSync(filePath, JSON.stringify(conversation, null, 2), 'utf-8');
          logger.debug('Appended message to conversation', { 
            ...context, 
            conversationId, 
            messageRole: message.role,
            newMessageCount: conversation.messageCount 
          });
        } catch (error) {
          throw new McpError(
            BaseErrorCode.FILESYSTEM_ERROR,
            `Failed to update conversation file: ${error instanceof Error ? error.message : String(error)}`,
            { conversationId, filePath }
          );
        }

        return conversation;
      },
      {
        operation: 'ConversationPersistenceService.appendMessage',
        context,
        input: { conversationId, messageRole: message.role },
        errorCode: BaseErrorCode.INTERNAL_ERROR,
      }
    );
  }

  /**
   * Creates a new conversation with an initial status file.
   * Used for async job processing.
   * @param messages - Array of initial messages
   * @param toolName - Name of the tool creating the conversation
   * @param context - Request context for logging
   * @param conversationId - Optional conversation ID (generates one if not provided)
   * @returns The created conversation
   */
  async createConversationWithStatus(
    messages: ConversationMessage[],
    toolName: string,
    context: RequestContext,
    conversationId?: string
  ): Promise<Conversation> {
    const convId = conversationId || generateConversationId();
    
    // Create the conversation directory first
    this.ensureConversationDir(convId, context);
    
    // Create initial status
    const status = createInitialStatus(convId, toolName);
    const statusFilePath = this.getStatusFilePath(convId);
    
    try {
      // Write status file
      writeFileSync(statusFilePath, JSON.stringify(status, null, 2), 'utf-8');
      logger.debug('Created status file', { ...context, conversationId: convId });
    } catch (error) {
      throw new McpError(
        BaseErrorCode.FILESYSTEM_ERROR,
        `Failed to create status file: ${error instanceof Error ? error.message : String(error)}`,
        { conversationId: convId }
      );
    }
    
    // Create the conversation (passing convId as optional third argument)
    const now = new Date().toISOString();
    const conversation: Conversation = {
      conversationId: convId,
      createdAt: now,
      updatedAt: now,
      messageCount: messages.length,
      messages,
    };

    const conversationFilePath = this.getConversationFilePath(convId);
    const validatedConversation = ConversationSchema.parse(conversation);

    try {
      writeFileSync(conversationFilePath, JSON.stringify(validatedConversation, null, 2), 'utf-8');
      logger.info('Conversation created with status', { ...context, conversationId: convId });
    } catch (error) {
      throw new McpError(
        BaseErrorCode.FILESYSTEM_ERROR,
        `Failed to write conversation file: ${error instanceof Error ? error.message : String(error)}`,
        { conversationId: convId }
      );
    }

    return validatedConversation;
  }

  /**
   * Updates the status of a conversation.
   * @param conversationId - The conversation ID
   * @param statusUpdate - Partial or full status update
   * @param context - Request context for logging
   */
  updateConversationStatus(
    conversationId: string,
    statusUpdate: ConversationStatus,
    context: RequestContext
  ): void {
    const statusFilePath = this.getStatusFilePath(conversationId);
    
    try {
      // Validate status
      const validatedStatus = ConversationStatusSchema.parse(statusUpdate);
      
      // Write status file atomically
      const tempPath = `${statusFilePath}.tmp`;
      writeFileSync(tempPath, JSON.stringify(validatedStatus, null, 2), 'utf-8');
      
      if (existsSync(statusFilePath)) {
        unlinkSync(statusFilePath);
      }
      writeFileSync(statusFilePath, JSON.stringify(validatedStatus, null, 2), 'utf-8');
      
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }

      logger.debug('Updated conversation status', {
        ...context,
        conversationId,
        status: validatedStatus.status,
      });
    } catch (error) {
      throw new McpError(
        BaseErrorCode.FILESYSTEM_ERROR,
        `Failed to update conversation status: ${error instanceof Error ? error.message : String(error)}`,
        { conversationId }
      );
    }
  }

  /**
   * Gets the status of a conversation.
   * @param conversationId - The conversation ID
   * @param context - Request context for logging
   * @returns The conversation status or null if not found
   */
  getConversationStatus(conversationId: string, context: RequestContext): ConversationStatus | null {
    const statusFilePath = this.getStatusFilePath(conversationId);
    
    if (!existsSync(statusFilePath)) {
      logger.debug('Status file not found', { ...context, conversationId });
      return null;
    }

    try {
      const statusContent = readFileSync(statusFilePath, 'utf-8');
      const status = ConversationStatusSchema.parse(JSON.parse(statusContent));
      return status;
    } catch (error) {
      logger.error('Failed to read conversation status', {
        ...context,
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Appends a message to an existing conversation.
   * Supports incremental/partial updates for streaming.
   * @param conversationId - The conversation ID
   * @param message - The message to append
   * @param context - Request context for logging
   * @param partial - If true, indicates this is a partial/incremental update
   */
  async appendToConversation(
    conversationId: string,
    message: ConversationMessage,
    context: RequestContext,
    partial: boolean = false
  ): Promise<void> {
    // Load existing conversation
    const conversation = await this.loadConversation(conversationId, context);
    
    // If partial, check if last message is from same role and update it
    if (partial && conversation.messages.length > 0) {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      if (lastMessage.role === message.role) {
        // Append to existing message content
        lastMessage.content += message.content;
      } else {
        // Different role, add as new message
        conversation.messages.push(message);
      }
    } else {
      // Not partial, just add new message
      conversation.messages.push(message);
    }
    
    // Update metadata
    conversation.updatedAt = new Date().toISOString();
    conversation.messageCount = conversation.messages.length;
    
    // Save updated conversation
    const conversationFilePath = this.getConversationFilePath(conversationId);
    const validatedConversation = ConversationSchema.parse(conversation);
    
    try {
      // Atomic write
      const tempPath = `${conversationFilePath}.tmp`;
      writeFileSync(tempPath, JSON.stringify(validatedConversation, null, 2), 'utf-8');
      
      if (existsSync(conversationFilePath)) {
        unlinkSync(conversationFilePath);
      }
      writeFileSync(conversationFilePath, JSON.stringify(validatedConversation, null, 2), 'utf-8');
      
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }

      logger.debug('Appended message to conversation', {
        ...context,
        conversationId,
        partial,
        messageRole: message.role,
      });
    } catch (error) {
      throw new McpError(
        BaseErrorCode.FILESYSTEM_ERROR,
        `Failed to append to conversation: ${error instanceof Error ? error.message : String(error)}`,
        { conversationId }
      );
    }
  }
}

/**
 * Singleton instance of the conversation persistence service.
 */
export const conversationPersistenceService = new ConversationPersistenceService();