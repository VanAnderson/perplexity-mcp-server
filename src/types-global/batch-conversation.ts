/**
 * @fileoverview Types and schemas for batch conversation retrieval.
 * @module src/types-global/batch-conversation
 */

import { z } from 'zod';
import { ConversationSchema } from '../services/conversationPersistence.js';
import { ConversationStatusSchema, ProgressInfoSchema } from './job-status.js';

/**
 * Error schema for batch conversation results
 */
export const BatchConversationErrorSchema = z.object({
  code: z.string().describe('Error code (e.g., NOT_FOUND, INVALID_ID)'),
  message: z.string().describe('Human-readable error message'),
});

export type BatchConversationError = z.infer<typeof BatchConversationErrorSchema>;

/**
 * Individual conversation result in a batch response
 */
export const ConversationResultSchema = z.object({
  conversation: ConversationSchema.optional().describe('Full conversation data if available'),
  status: ConversationStatusSchema.optional().describe('Job status if conversation is async job'),
  progress: ProgressInfoSchema.optional().describe('Progress information for in-progress jobs'),
  error: BatchConversationErrorSchema.optional().describe('Error information if conversation not found or failed'),
});

export type ConversationResult = z.infer<typeof ConversationResultSchema>;

/**
 * Batch conversation response schema - object keyed by conversationId
 */
export const BatchConversationResponseSchema = z.record(
  z.string().describe('Conversation ID'),
  ConversationResultSchema.describe('Result for this conversation')
);

export type BatchConversationResponse = z.infer<typeof BatchConversationResponseSchema>;

/**
 * Helper to create an error result for a conversation
 */
export function createErrorResult(code: string, message: string): ConversationResult {
  return {
    error: {
      code,
      message,
    },
  };
}

/**
 * Helper to create a successful result with conversation data
 */
export function createSuccessResult(
  conversation: z.infer<typeof ConversationSchema>,
  status?: z.infer<typeof ConversationStatusSchema>,
  progress?: z.infer<typeof ProgressInfoSchema>
): ConversationResult {
  return {
    conversation,
    status,
    progress,
  };
}

