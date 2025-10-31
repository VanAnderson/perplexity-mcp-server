/**
 * @fileoverview Defines the core logic, schemas, and types for the `perplexity_deep_research_followup` tool.
 * This tool continues an existing conversation with a deep research query.
 * @module src/mcp-server/tools/perplexityDeepResearchFollowup/logic
 */

import { z } from 'zod';
import { config } from '../../../config/index.js';
import { 
  perplexityApiService, 
  conversationPersistenceService,
  PerplexityChatCompletionRequest,
  jobQueueService,
} from '../../../services/index.js';
import { BaseErrorCode, McpError } from '../../../types-global/errors.js';
import { JobData } from '../../../types-global/job-status.js';
import { logger, RequestContext } from '../../../utils/index.js';
import { PerplexitySearchResponseSchema } from '../perplexitySearch/logic.js';

// Input schema for follow-up deep research
export const PerplexityDeepResearchFollowupInputSchema = z.object({
  conversationId: z.string()
    .describe("The conversation ID from a previous search or deep research query."),
  query: z.string().min(1)
    .describe("Your follow-up research question. For complex analysis, provide a structured query with clear objectives. The system has access to previous conversation context."),
  reasoning_effort: z.enum(['low', 'medium', 'high']).optional().default('medium')
    .describe("Controls the computational effort and depth of the research. 'high' provides the most thorough analysis but costs more."),
}).describe("Follow up on an existing Perplexity conversation with a deep research query. This tool continues a conversation started by perplexity_search or perplexity_deep_research, performing exhaustive research while maintaining full context. Cross-mode support: you can follow up on a quick search with deep research, or vice versa.");

// Response schema is identical to regular search
export const PerplexityDeepResearchFollowupResponseSchema = PerplexitySearchResponseSchema;

// Type inference
export type PerplexityDeepResearchFollowupInput = z.infer<typeof PerplexityDeepResearchFollowupInputSchema>;
export type PerplexityDeepResearchFollowupResponse = z.infer<typeof PerplexityDeepResearchFollowupResponseSchema>;

/**
 * Logic function for deep research follow-up.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function perplexityDeepResearchFollowupLogic(
  params: PerplexityDeepResearchFollowupInput,
  context: RequestContext
): Promise<PerplexityDeepResearchFollowupResponse> {
  logger.debug("Executing perplexityDeepResearchFollowupLogic...", { 
    ...context, 
    conversationId: params.conversationId,
    toolInput: params 
  });

  // Check if conversation has an in-progress job
  const jobStatus = conversationPersistenceService.getConversationStatus(params.conversationId, context);
  if (jobStatus && jobStatus.status === 'in_progress') {
    throw new McpError(
      BaseErrorCode.VALIDATION_ERROR,
      `Cannot perform followup on conversation ${params.conversationId} because it has an in-progress job. The previous query is still being processed. Please wait for it to complete, then try your followup again. Use get_conversation_history to check the status.`,
      { ...context, conversationId: params.conversationId, jobStatus: jobStatus.status }
    );
  }

  // Load existing conversation
  const conversation = await conversationPersistenceService.loadConversation(
    params.conversationId,
    context
  );

  logger.debug("Loaded conversation for deep research follow-up", {
    ...context,
    conversationId: params.conversationId,
    messageCount: conversation.messageCount,
  });

  // Check if async mode is enabled for deep research followups
  if (config.perplexityEnableAsyncDeepResearch) {
    logger.info("Async mode enabled for deep research followup, queueing job", { ...context, conversationId: params.conversationId });

    // Append user message to conversation
    await conversationPersistenceService.appendToConversation(
      params.conversationId,
      { role: 'user', content: params.query },
      context
    );

    // Create job data for followup
    const jobData: JobData = {
      conversationId: params.conversationId,
      toolName: 'perplexity_deep_research_followup',
      params: {
        query: params.query,
        reasoning_effort: params.reasoning_effort,
      },
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
      priority: 0,
    };

    // Enqueue the job
    jobQueueService.enqueueJob(jobData);

    // Update status to pending
    const existingStatus = conversationPersistenceService.getConversationStatus(params.conversationId, context);
    if (existingStatus) {
      existingStatus.status = 'pending' as any;
      existingStatus.updatedAt = new Date().toISOString();
      conversationPersistenceService.updateConversationStatus(params.conversationId, existingStatus, context);
    }

    // Return immediately with instructions
    const toolResponse: PerplexityDeepResearchFollowupResponse = {
      rawResultText: `Deep research followup query has been queued for background processing.

To check the status and retrieve results when complete:
1. Use \`get_conversation_history\` with conversation ID: \`${params.conversationId}\`
2. The status will show:
   - "pending": Waiting to start
   - "in_progress": Currently processing
   - "completed": Results ready (conversation will contain the full research report)
   - "failed": An error occurred (details will be in the status)

You can run multiple deep research queries concurrently and poll each one independently.`,
      responseId: 'queued',
      modelUsed: 'sonar-deep-research',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      searchResults: [],
      conversationId: params.conversationId,
      conversationPath: conversationPersistenceService.getConversationPath(params.conversationId),
    };

    logger.info("Deep research followup job queued successfully", {
      ...context,
      conversationId: params.conversationId,
    });

    return toolResponse;
  }

  // Blocking mode (default) - continue with existing behavior

  // Build request with full conversation history + new query
  const requestPayload: PerplexityChatCompletionRequest = {
    model: 'sonar-deep-research',
    messages: [
      ...conversation.messages,
      { role: 'user', content: params.query },
    ],
    reasoning_effort: params.reasoning_effort,
    stream: false,
  };

  logger.info("Calling Perplexity API for follow-up deep research", { 
    ...context, 
    model: 'sonar-deep-research',
    reasoningEffort: params.reasoning_effort,
    conversationId: params.conversationId,
    previousMessageCount: conversation.messageCount,
  });
  logger.debug("API Payload", { ...context, payload: requestPayload });

  const response = await perplexityApiService.chatCompletion(requestPayload, context);

  const rawResultText = response.choices?.[0]?.message?.content;

  if (!rawResultText) {
    logger.warning("Perplexity API returned empty content", { ...context, responseId: response.id });
    throw new McpError(
      BaseErrorCode.SERVICE_UNAVAILABLE,
      'Perplexity API returned an empty response.',
      { ...context, responseId: response.id }
    );
  }

  // Append user query to conversation
  await conversationPersistenceService.appendMessage(
    params.conversationId,
    { role: 'user', content: params.query },
    context
  );

  // Append assistant response to conversation
  const updatedConversation = await conversationPersistenceService.appendMessage(
    params.conversationId,
    { role: 'assistant', content: rawResultText },
    context
  );

  const toolResponse: PerplexityDeepResearchFollowupResponse = {
    rawResultText,
    responseId: response.id,
    modelUsed: response.model,
    usage: response.usage,
    searchResults: response.search_results,
    conversationId: updatedConversation.conversationId,
    conversationPath: conversationPersistenceService.getConversationPath(updatedConversation.conversationId),
  };

  logger.info("Perplexity deep research follow-up logic completed successfully.", {
    ...context,
    responseId: toolResponse.responseId,
    model: toolResponse.modelUsed,
    usage: toolResponse.usage,
    searchResultCount: toolResponse.searchResults?.length ?? 0,
    conversationId: toolResponse.conversationId,
    updatedMessageCount: updatedConversation.messageCount,
  });

  return toolResponse;
}