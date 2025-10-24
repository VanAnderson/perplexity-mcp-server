/**
 * Test fixtures for conversation persistence testing.
 * Provides mock conversation data for unit tests.
 */

import type { Conversation, ConversationMessage } from '../../src/services/conversationPersistence.js';

/**
 * Mock system message for conversations.
 */
export const mockSystemMessage: ConversationMessage = {
  role: 'system',
  content: 'You are an advanced AI assistant with access to real-time web search and deep research capabilities through Perplexity AI.',
};

/**
 * Mock user message.
 */
export const mockUserMessage: ConversationMessage = {
  role: 'user',
  content: 'What are the latest features in TypeScript 5.8?',
};

/**
 * Mock assistant response.
 */
export const mockAssistantMessage: ConversationMessage = {
  role: 'assistant',
  content: 'TypeScript 5.8 introduces several key features including improved type inference, enhanced performance optimizations, and new compiler options.',
};

/**
 * Mock follow-up user message.
 */
export const mockFollowupUserMessage: ConversationMessage = {
  role: 'user',
  content: 'How do I use the new decorators?',
};

/**
 * Mock follow-up assistant response.
 */
export const mockFollowupAssistantMessage: ConversationMessage = {
  role: 'assistant',
  content: 'The new decorators in TypeScript 5.8 follow the Stage 3 decorator proposal. Here\'s how to use them...',
};

/**
 * Mock conversation with initial messages.
 */
export const mockConversation: Conversation = {
  conversationId: '20250124-1706102400123',
  createdAt: '2025-01-24T15:00:00.123Z',
  updatedAt: '2025-01-24T15:00:00.123Z',
  messageCount: 3,
  messages: [
    mockSystemMessage,
    mockUserMessage,
    mockAssistantMessage,
  ],
};

/**
 * Mock conversation with follow-up messages.
 */
export const mockConversationWithFollowup: Conversation = {
  conversationId: '20250124-1706102400123',
  createdAt: '2025-01-24T15:00:00.123Z',
  updatedAt: '2025-01-24T15:05:30.456Z',
  messageCount: 5,
  messages: [
    mockSystemMessage,
    mockUserMessage,
    mockAssistantMessage,
    mockFollowupUserMessage,
    mockFollowupAssistantMessage,
  ],
};

/**
 * Mock conversation for deep research.
 */
export const mockDeepResearchConversation: Conversation = {
  conversationId: '20250125-1706188800456',
  createdAt: '2025-01-25T10:00:00.456Z',
  updatedAt: '2025-01-25T10:00:00.456Z',
  messageCount: 3,
  messages: [
    mockSystemMessage,
    {
      role: 'user',
      content: 'Perform comprehensive analysis of quantum computing error correction methods.',
    },
    {
      role: 'assistant',
      content: 'Comprehensive analysis of quantum computing error correction methods:\n\n1. Surface Codes\n2. Topological Codes\n3. Cat Codes\n\n[Detailed research results...]',
    },
  ],
};

/**
 * Valid conversation ID examples.
 */
export const validConversationIds = [
  '20250124-1706102400123',
  '20250125-1706188800456',
  '20231231-1704067200000',
];

/**
 * Invalid conversation ID examples.
 */
export const invalidConversationIds = [
  'invalid-id',
  '20250124',
  '1706102400123',
  '2025-01-24-1706102400123',
  '20250124-',
  '-1706102400123',
  '',
];

/**
 * Creates a mock conversation with custom messages.
 */
export function createMockConversation(
  messages: ConversationMessage[],
  conversationId = '20250124-1706102400123'
): Conversation {
  const now = new Date().toISOString();
  return {
    conversationId,
    createdAt: now,
    updatedAt: now,
    messageCount: messages.length,
    messages,
  };
}