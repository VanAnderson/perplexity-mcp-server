/**
 * @fileoverview Defines the core logic, schemas, and types for the `perplexity_deep_research_followup` tool.
 * This tool continues an existing conversation with a deep research query.
 * @module src/mcp-server/tools/perplexityDeepResearchFollowup/logic
 */

import { z } from 'zod';
import { 
  perplexityApiService, 
  conversationPersistenceService,
  PerplexityChatCompletionRequest 
} from '../../../services/index.js';
import { BaseErrorCode, McpError } from '../../../types-global/errors.js';
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