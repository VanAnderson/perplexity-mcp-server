/**
 * @fileoverview Defines the core logic, schemas, and types for the `await_conversation_histories` tool.
 * This tool waits for async jobs to complete before returning conversation histories.
 * @module src/mcp-server/tools/awaitConversationHistories/logic
 */

import { z } from 'zod';
import { conversationPersistenceService } from '../../../services/index.js';
import { 
  BatchConversationResponseSchema, 
  createErrorResult, 
  createSuccessResult 
} from '../../../types-global/batch-conversation.js';
import { logger, RequestContext } from '../../../utils/index.js';

// Input schema (same as get_conversation_histories)
export const AwaitConversationHistoriesInputSchema = z.object({
  conversationIds: z.array(z.string())
    .min(1)
    .describe("Array of conversation IDs to await completion for."),
  includeSystemPrompt: z.boolean().optional().default(false)
    .describe("Include system prompts in responses. Defaults to false."),
  pollingIntervalMs: z.number().int().positive().optional().default(2000)
    .describe("Polling interval in milliseconds. Defaults to 2000ms (2 seconds)."),
}).describe("Wait for async job completion and retrieve multiple conversation histories. This tool polls until all jobs reach terminal state (completed/failed). May timeout in some IDEs - if so, simply run again as jobs continue processing in background.");

// Output schema - reuse the batch response schema
export const AwaitConversationHistoriesResponseSchema = BatchConversationResponseSchema;

// Type inference
export type AwaitConversationHistoriesInput = z.infer<typeof AwaitConversationHistoriesInputSchema>;
export type AwaitConversationHistoriesResponse = z.infer<typeof AwaitConversationHistoriesResponseSchema>;

/**
 * Helper to check if a status is terminal (no longer processing)
 */
function isTerminalStatus(status?: string): boolean {
  if (!status) return true; // No status file means no job (terminal)
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

/**
 * Helper to wait for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Logic function for awaiting multiple conversation histories.
 * Polls until all conversations reach terminal state.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function awaitConversationHistoriesLogic(
  params: AwaitConversationHistoriesInput,
  context: RequestContext
): Promise<AwaitConversationHistoriesResponse> {
  logger.debug("Executing awaitConversationHistoriesLogic...", { 
    ...context, 
    conversationIds: params.conversationIds,
    count: params.conversationIds.length,
    pollingIntervalMs: params.pollingIntervalMs,
  });

  const pollingInterval = params.pollingIntervalMs || 2000;
  let iterationCount = 0;
  const startTime = Date.now();

  // Poll until all conversations are in terminal state
  while (true) {
    iterationCount++;

    // Get current status of all conversations
    const batchResults = await conversationPersistenceService.getMultipleConversationsWithStatus(
      params.conversationIds,
      context
    );

    // Check if all are in terminal state
    const allTerminal = Array.from(batchResults.values()).every(result => {
      // Error (not found) is terminal
      if (result.error) return true;
      
      // Check status
      return isTerminalStatus(result.status?.status);
    });

    if (allTerminal) {
      // All jobs complete - build final response
      logger.info("All conversations reached terminal state", {
        ...context,
        conversationIds: params.conversationIds,
        iterationCount,
        elapsedMs: Date.now() - startTime,
      });

      // Transform results into response format
      const response: AwaitConversationHistoriesResponse = {};

      for (const [conversationId, result] of batchResults.entries()) {
        if (result.error) {
          response[conversationId] = createErrorResult(result.error.code, result.error.message);
        } else if (result.conversation) {
          // Filter out system messages if requested
          let messages = result.conversation.messages;
          if (!params.includeSystemPrompt) {
            messages = messages.filter(msg => msg.role !== 'system');
          }

          const filteredConversation = {
            ...result.conversation,
            messages,
            messageCount: messages.length,
          };

          response[conversationId] = createSuccessResult(
            filteredConversation,
            result.status,
            result.status?.progress
          );
        } else {
          response[conversationId] = createErrorResult(
            'UNKNOWN_ERROR',
            'Failed to retrieve conversation for unknown reason'
          );
        }
      }

      return response;
    }

    // Not all terminal - log progress and wait
    const pendingCount = Array.from(batchResults.values()).filter(result => 
      !result.error && !isTerminalStatus(result.status?.status)
    ).length;

    logger.debug("Waiting for conversations to complete", {
      ...context,
      iterationCount,
      pendingCount,
      elapsedMs: Date.now() - startTime,
    });

    // Wait before next poll
    await sleep(pollingInterval);
  }
}

