/**
 * @fileoverview Service for persisting and managing conversation history.
 * Handles file-based storage of multi-turn conversations.
 * @module src/services/conversationPersistence
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import { config } from '../config/index.js';
import { BaseErrorCode, McpError } from '../types-global/errors.js';
import { ErrorHandler, logger, type RequestContext } from '../utils/index.js';
import { generateConversationId, isValidConversationId } from '../utils/conversation/conversationIdGenerator.js';

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
}

/**
 * Singleton instance of the conversation persistence service.
 */
export const conversationPersistenceService = new ConversationPersistenceService();