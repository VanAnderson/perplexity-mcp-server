/**
 * @fileoverview Defines the core logic, schemas, and types for the `get_conversation_histories` tool.
 * This tool retrieves multiple conversation histories in a single batch operation.
 * @module src/mcp-server/tools/getConversationHistories/logic
 */

import { z } from 'zod';
import { conversationPersistenceService } from '../../../services/index.js';
import { 
  BatchConversationResponseSchema, 
  ConversationResultSchema,
  createErrorResult, 
  createSuccessResult 
} from '../../../types-global/batch-conversation.js';
import { logger, RequestContext } from '../../../utils/index.js';

// Input schema for getting multiple conversation histories
export const GetConversationHistoriesInputSchema = z.object({
  conversationIds: z.array(z.string())
    .min(1)
    .describe("Array of conversation IDs to retrieve."),
  includeSystemPrompt: z.boolean().optional().default(false)
    .describe("Include system prompts in responses. Defaults to false."),
}).describe("Retrieve multiple conversation histories in a single batch operation. Returns an object keyed by conversationId, with each value containing the conversation data, status (if async job), and any errors.");

// Output schema - reuse the batch response schema
export const GetConversationHistoriesResponseSchema = BatchConversationResponseSchema;

// Type inference
export type GetConversationHistoriesInput = z.infer<typeof GetConversationHistoriesInputSchema>;
export type GetConversationHistoriesResponse = z.infer<typeof GetConversationHistoriesResponseSchema>;

/**
 * Logic function for getting multiple conversation histories.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function getConversationHistoriesLogic(
  params: GetConversationHistoriesInput,
  context: RequestContext
): Promise<GetConversationHistoriesResponse> {
  logger.debug("Executing getConversationHistoriesLogic...", { 
    ...context, 
    conversationIds: params.conversationIds,
    count: params.conversationIds.length,
    includeSystemPrompt: params.includeSystemPrompt,
  });

  // Use batch retrieval method from conversation persistence service
  const batchResults = await conversationPersistenceService.getMultipleConversationsWithStatus(
    params.conversationIds,
    context
  );

  // Transform results into the response format
  const response: GetConversationHistoriesResponse = {};

  for (const [conversationId, result] of batchResults.entries()) {
    if (result.error) {
      // Conversation not found or error occurred
      response[conversationId] = createErrorResult(result.error.code, result.error.message);
    } else if (result.conversation) {
      // Filter out system messages if requested
      let messages = result.conversation.messages;
      if (!params.includeSystemPrompt) {
        messages = messages.filter(msg => msg.role !== 'system');
      }

      // Create conversation with filtered messages
      const filteredConversation = {
        ...result.conversation,
        messages,
        messageCount: messages.length,
      };

      // Build result with conversation, status, and progress
      response[conversationId] = createSuccessResult(
        filteredConversation,
        result.status,
        result.status?.progress
      );
    } else {
      // Unexpected case - no error and no conversation
      response[conversationId] = createErrorResult(
        'UNKNOWN_ERROR',
        'Failed to retrieve conversation for unknown reason'
      );
    }
  }

  logger.info("Retrieved multiple conversation histories successfully.", {
    ...context,
    totalRequested: params.conversationIds.length,
    successCount: Object.values(response).filter(r => r.conversation).length,
    errorCount: Object.values(response).filter(r => r.error).length,
  });

  return response;
}

