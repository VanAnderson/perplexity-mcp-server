/**
 * @fileoverview Defines the core logic, schemas, and types for the `get_conversation_history` tool.
 * This tool retrieves the full conversation history by conversation ID.
 * @module src/mcp-server/tools/getConversationHistory/logic
 */

import { z } from 'zod';
import { conversationPersistenceService, ConversationMessageSchema } from '../../../services/index.js';
import { JobStatusSchema, ProgressInfoSchema, JobErrorSchema } from '../../../types-global/job-status.js';
import { logger, RequestContext } from '../../../utils/index.js';

// Input schema for getting conversation history
export const GetConversationHistoryInputSchema = z.object({
  conversationId: z.string()
    .describe("The conversation ID to retrieve."),
  includeSystemPrompt: z.boolean().optional().default(false)
    .describe("Include the system prompt in the response. Defaults to false."),
}).describe("Retrieve the full conversation history by conversation ID. Useful for reviewing what's been discussed or debugging conversation context. System prompts are excluded by default but can be included with includeSystemPrompt: true.");

// Output schema for conversation history
export const GetConversationHistoryResponseSchema = z.object({
  conversationId: z.string().describe("The conversation identifier"),
  createdAt: z.string().datetime().describe("ISO 8601 timestamp of conversation creation"),
  updatedAt: z.string().datetime().describe("ISO 8601 timestamp of last update"),
  messageCount: z.number().int().nonnegative().describe("Total number of messages"),
  messages: z.array(ConversationMessageSchema).describe("Array of conversation messages"),
  conversationPath: z.string().describe("Absolute path to the conversation directory"),
  status: JobStatusSchema.optional().describe("Job status if this is an async job"),
  progress: ProgressInfoSchema.optional().describe("Progress information if job is in progress"),
  error: JobErrorSchema.optional().describe("Error information if job failed"),
  statusMessage: z.string().optional().describe("Human-readable status message for async jobs"),
});

// Type inference
export type GetConversationHistoryInput = z.infer<typeof GetConversationHistoryInputSchema>;
export type GetConversationHistoryResponse = z.infer<typeof GetConversationHistoryResponseSchema>;

/**
 * Logic function for getting conversation history.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function getConversationHistoryLogic(
  params: GetConversationHistoryInput,
  context: RequestContext
): Promise<GetConversationHistoryResponse> {
  logger.debug("Executing getConversationHistoryLogic...", { 
    ...context, 
    conversationId: params.conversationId,
    includeSystemPrompt: params.includeSystemPrompt,
  });

  // Check if there's a status file (indicates async job)
  const jobStatus = conversationPersistenceService.getConversationStatus(params.conversationId, context);

  // Load conversation
  const conversation = await conversationPersistenceService.loadConversation(
    params.conversationId,
    context
  );

  // Filter out system message if requested
  let messages = conversation.messages;
  if (!params.includeSystemPrompt) {
    messages = messages.filter(msg => msg.role !== 'system');
  }

  // Base response
  const response: GetConversationHistoryResponse = {
    conversationId: conversation.conversationId,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: messages.length,
    messages,
    conversationPath: conversationPersistenceService.getConversationPath(conversation.conversationId),
  };

  // Add status information if this is an async job
  if (jobStatus) {
    response.status = jobStatus.status;
    response.progress = jobStatus.progress;
    response.error = jobStatus.error;

    // Generate status message based on job status
    switch (jobStatus.status) {
      case 'pending':
        response.statusMessage = `🕒 **Job Status: Pending**

This deep research query is queued and waiting to start. The system will process it shortly.

**What to do:**
- Check back in a moment using \`get_conversation_history\` with this conversation ID
- You can queue additional deep research queries in parallel`;
        break;

      case 'in_progress':
        const elapsedMinutes = jobStatus.progress?.elapsedMs 
          ? Math.floor(jobStatus.progress.elapsedMs / 60000) 
          : 0;
        const progressPercent = jobStatus.progress?.percentage || 0;
        const progressMsg = jobStatus.progress?.message || 'Processing...';
        
        response.statusMessage = `⏳ **Job Status: In Progress** (${progressPercent}%)

This deep research query is currently being processed.

**Progress:** ${progressMsg}
**Elapsed Time:** ${elapsedMinutes} minute${elapsedMinutes !== 1 ? 's' : ''}
${jobStatus.progress?.estimatedRemainingMs ? `**Estimated Remaining:** ${Math.floor(jobStatus.progress.estimatedRemainingMs / 60000)} minute(s)` : ''}

**What to do:**
- Check back soon for results
- Partial results may appear in the conversation as they become available`;
        break;

      case 'completed':
        response.statusMessage = `✅ **Job Status: Completed**

This deep research query has finished processing successfully. The full research report is available in the conversation messages below.`;
        break;

      case 'failed':
        const errorMsg = jobStatus.error?.message || 'Unknown error';
        const errorCode = jobStatus.error?.code || 'UNKNOWN';
        
        response.statusMessage = `❌ **Job Status: Failed**

This deep research query encountered an error and could not be completed.

**Error Code:** ${errorCode}
**Error Message:** ${errorMsg}

**What to do:**
- Review the error details above
- You may want to try submitting a new query with adjusted parameters`;
        break;

      case 'cancelled':
        response.statusMessage = `🚫 **Job Status: Cancelled**

This deep research query was cancelled and will not be processed.`;
        break;
    }
  }

  logger.info("Retrieved conversation history successfully.", {
    ...context,
    conversationId: params.conversationId,
    totalMessages: conversation.messages.length,
    returnedMessages: messages.length,
    hasStatus: !!jobStatus,
    status: jobStatus?.status,
  });

  return response;
}