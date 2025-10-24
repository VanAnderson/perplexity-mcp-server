/**
 * Unit tests for conversation persistence service.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { conversationPersistenceService } from '../../../src/services/conversationPersistence.js';
import { BaseErrorCode } from '../../../src/types-global/errors.js';
import { createMockContext } from '../../fixtures/contexts.js';
import {
  mockSystemMessage,
  mockUserMessage,
  mockAssistantMessage,
  mockFollowupUserMessage,
  validConversationIds,
  invalidConversationIds,
} from '../../fixtures/conversations.js';
import { config } from '../../../src/config/index.js';

// Test directory for conversation logs
const TEST_CONVERSATION_LOGS_DIR = path.join(process.cwd(), 'test-conversation-logs');

describe('ConversationPersistenceService', () => {
  const context = createMockContext({ operation: 'conversationPersistence.test' });
  let originalConversationLogsPath: string | null;

  beforeEach(() => {
    // Save original config
    originalConversationLogsPath = config.conversationLogsPath;
    
    // Create test directory
    if (!existsSync(TEST_CONVERSATION_LOGS_DIR)) {
      mkdirSync(TEST_CONVERSATION_LOGS_DIR, { recursive: true });
    }
    
    // Override config for testing
    (config as any).conversationLogsPath = TEST_CONVERSATION_LOGS_DIR;
  });

  afterEach(() => {
    // Restore original config
    (config as any).conversationLogsPath = originalConversationLogsPath;
    
    // Clean up test directory
    if (existsSync(TEST_CONVERSATION_LOGS_DIR)) {
      rmSync(TEST_CONVERSATION_LOGS_DIR, { recursive: true, force: true });
    }
  });

  describe('createConversation', () => {
    it('should create a conversation successfully', async () => {
      const initialMessages = [mockSystemMessage, mockUserMessage, mockAssistantMessage];
      
      const conversation = await conversationPersistenceService.createConversation(
        initialMessages,
        context
      );

      expect(conversation).toBeDefined();
      expect(conversation.conversationId).toMatch(/^\d{8}-\d{13}$/);
      expect(conversation.messageCount).toBe(3);
      expect(conversation.messages).toEqual(initialMessages);
      expect(conversation.createdAt).toBeDefined();
      expect(conversation.updatedAt).toBeDefined();
    });

    it('should persist conversation to disk', async () => {
      const initialMessages = [mockSystemMessage, mockUserMessage];
      
      const conversation = await conversationPersistenceService.createConversation(
        initialMessages,
        context
      );

      const conversationPath = conversationPersistenceService.getConversationPath(
        conversation.conversationId
      );
      const filePath = path.join(conversationPath, 'conversation.json');

      expect(existsSync(filePath)).toBe(true);

      const fileContent = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(fileContent.conversationId).toBe(conversation.conversationId);
      expect(fileContent.messageCount).toBe(2);
    });

    it('should validate message schema', async () => {
      const invalidMessages: any = [
        { role: 'invalid', content: 'test' },
      ];

      await expect(
        conversationPersistenceService.createConversation(invalidMessages, context)
      ).rejects.toThrow();
    });

    it('should create directory structure automatically', async () => {
      const initialMessages = [mockSystemMessage];
      
      const conversation = await conversationPersistenceService.createConversation(
        initialMessages,
        context
      );

      const conversationPath = conversationPersistenceService.getConversationPath(
        conversation.conversationId
      );

      expect(existsSync(conversationPath)).toBe(true);
    });
  });

  describe('loadConversation', () => {
    it('should load an existing conversation', async () => {
      // Create a conversation first
      const initialMessages = [mockSystemMessage, mockUserMessage, mockAssistantMessage];
      const created = await conversationPersistenceService.createConversation(
        initialMessages,
        context
      );

      // Load it back
      const loaded = await conversationPersistenceService.loadConversation(
        created.conversationId,
        context
      );

      expect(loaded).toEqual(created);
      expect(loaded.messageCount).toBe(3);
      expect(loaded.messages).toEqual(initialMessages);
    });

    it('should throw CONVERSATION_NOT_FOUND for non-existent conversation', async () => {
      const nonExistentId = '20250124-1706102400999';

      await expect(
        conversationPersistenceService.loadConversation(nonExistentId, context)
      ).rejects.toMatchObject({
        code: BaseErrorCode.CONVERSATION_NOT_FOUND,
      });
    });

    it('should throw VALIDATION_ERROR for invalid conversation ID format', async () => {
      for (const invalidId of invalidConversationIds) {
        await expect(
          conversationPersistenceService.loadConversation(invalidId, context)
        ).rejects.toMatchObject({
          code: BaseErrorCode.VALIDATION_ERROR,
        });
      }
    });

    it('should throw CONVERSATION_CORRUPTED for invalid JSON', async () => {
      // Create a conversation
      const initialMessages = [mockSystemMessage];
      const created = await conversationPersistenceService.createConversation(
        initialMessages,
        context
      );

      // Corrupt the file
      const conversationPath = conversationPersistenceService.getConversationPath(
        created.conversationId
      );
      const filePath = path.join(conversationPath, 'conversation.json');
      writeFileSync(filePath, 'invalid json{', 'utf-8');

      await expect(
        conversationPersistenceService.loadConversation(created.conversationId, context)
      ).rejects.toMatchObject({
        code: BaseErrorCode.CONVERSATION_CORRUPTED,
      });
    });

    it('should throw CONVERSATION_CORRUPTED for invalid schema', async () => {
      // Create a conversation
      const initialMessages = [mockSystemMessage];
      const created = await conversationPersistenceService.createConversation(
        initialMessages,
        context
      );

      // Write invalid data (missing required fields)
      const conversationPath = conversationPersistenceService.getConversationPath(
        created.conversationId
      );
      const filePath = path.join(conversationPath, 'conversation.json');
      writeFileSync(filePath, JSON.stringify({ invalid: 'data' }), 'utf-8');

      await expect(
        conversationPersistenceService.loadConversation(created.conversationId, context)
      ).rejects.toMatchObject({
        code: BaseErrorCode.CONVERSATION_CORRUPTED,
      });
    });
  });

  describe('appendMessage', () => {
    it('should append message to existing conversation', async () => {
      // Create initial conversation
      const initialMessages = [mockSystemMessage, mockUserMessage, mockAssistantMessage];
      const created = await conversationPersistenceService.createConversation(
        initialMessages,
        context
      );

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Append a new message
      const updated = await conversationPersistenceService.appendMessage(
        created.conversationId,
        mockFollowupUserMessage,
        context
      );

      expect(updated.messageCount).toBe(4);
      expect(updated.messages).toHaveLength(4);
      expect(updated.messages[3]).toEqual(mockFollowupUserMessage);
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(created.updatedAt).getTime()
      );
    });

    it('should persist appended message to disk', async () => {
      // Create initial conversation
      const initialMessages = [mockSystemMessage, mockUserMessage];
      const created = await conversationPersistenceService.createConversation(
        initialMessages,
        context
      );

      // Append message
      await conversationPersistenceService.appendMessage(
        created.conversationId,
        mockAssistantMessage,
        context
      );

      // Load from disk
      const loaded = await conversationPersistenceService.loadConversation(
        created.conversationId,
        context
      );

      expect(loaded.messageCount).toBe(3);
      expect(loaded.messages[2]).toEqual(mockAssistantMessage);
    });

    it('should throw error for non-existent conversation', async () => {
      const nonExistentId = '20250124-1706102400999';

      await expect(
        conversationPersistenceService.appendMessage(
          nonExistentId,
          mockUserMessage,
          context
        )
      ).rejects.toMatchObject({
        code: BaseErrorCode.CONVERSATION_NOT_FOUND,
      });
    });

    it('should validate message schema before appending', async () => {
      // Create initial conversation
      const initialMessages = [mockSystemMessage];
      const created = await conversationPersistenceService.createConversation(
        initialMessages,
        context
      );

      const invalidMessage: any = { role: 'invalid', content: 'test' };

      await expect(
        conversationPersistenceService.appendMessage(
          created.conversationId,
          invalidMessage,
          context
        )
      ).rejects.toThrow();
    });

    it('should update messageCount correctly after multiple appends', async () => {
      // Create initial conversation
      const initialMessages = [mockSystemMessage, mockUserMessage];
      const created = await conversationPersistenceService.createConversation(
        initialMessages,
        context
      );

      // Append multiple messages
      await conversationPersistenceService.appendMessage(
        created.conversationId,
        mockAssistantMessage,
        context
      );
      await conversationPersistenceService.appendMessage(
        created.conversationId,
        mockFollowupUserMessage,
        context
      );
      const final = await conversationPersistenceService.appendMessage(
        created.conversationId,
        { role: 'assistant', content: 'Final response' },
        context
      );

      expect(final.messageCount).toBe(5);
      expect(final.messages).toHaveLength(5);
    });
  });

  describe('conversationExists', () => {
    it('should return true for existing conversation', async () => {
      const initialMessages = [mockSystemMessage];
      const created = await conversationPersistenceService.createConversation(
        initialMessages,
        context
      );

      const exists = await conversationPersistenceService.conversationExists(
        created.conversationId
      );

      expect(exists).toBe(true);
    });

    it('should return false for non-existent conversation', async () => {
      const nonExistentId = '20250124-1706102400999';

      const exists = await conversationPersistenceService.conversationExists(nonExistentId);

      expect(exists).toBe(false);
    });

    it('should return false for invalid conversation ID format', async () => {
      for (const invalidId of invalidConversationIds) {
        const exists = await conversationPersistenceService.conversationExists(invalidId);
        expect(exists).toBe(false);
      }
    });
  });

  describe('getConversationPath', () => {
    it('should return correct conversation path', async () => {
      const conversationId = '20250124-1706102400123';
      const conversationPath = conversationPersistenceService.getConversationPath(
        conversationId
      );

      expect(conversationPath).toContain(conversationId);
      expect(conversationPath).toContain('conversation-logs');
    });
  });
});