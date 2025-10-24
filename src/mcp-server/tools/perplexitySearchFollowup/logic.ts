/**
 * @fileoverview Defines the core logic, schemas, and types for the `perplexity_search_followup` tool.
 * This tool continues an existing conversation with a new search query.
 * @module src/mcp-server/tools/perplexitySearchFollowup/logic
 */

import { z } from 'zod';
import { config } from '../../../config/index.js';
import { 
  perplexityApiService, 
  conversationPersistenceService,
  PerplexityChatCompletionRequest, 
  PerplexityChatCompletionRequestSchema 
} from '../../../services/index.js';
import { BaseErrorCode, McpError } from '../../../types-global/errors.js';
import { logger, RequestContext } from '../../../utils/index.js';
import { PerplexitySearchResponseSchema } from '../perplexitySearch/logic.js';

// Input schema for follow-up search
export const PerplexitySearchFollowupInputSchema = z.object({
  conversationId: z.string()
    .describe("The conversation ID from a previous search or deep research query."),
  query: z.string().min(1)
    .describe("Your follow-up question. This will be added to the conversation history. **IMPORTANT:** Write a complete, clear question. The system has access to previous conversation context, so you can reference earlier topics naturally."),
  return_related_questions: z.boolean().optional().default(false)
    .describe("If true, the model will suggest related questions in its response. Defaults to false."),
  search_recency_filter: z.string().optional()
    .describe("Restricts the web search to a specific timeframe. Accepts 'day', 'week', 'month', 'year'."),
  search_domain_filter: z.array(z.string()).optional()
    .describe("A list of domains to restrict or exclude from the search. (e.g. ['wikipedia.org', 'arxiv.org'])."),
  search_after_date_filter: z.string().optional()
    .describe("Filters search results to content published after a specific date (MM/DD/YYYY)."),
  search_before_date_filter: z.string().optional()
    .describe("Filters search results to content published before a specific date (MM/DD/YYYY)."),
  search_mode: z.enum(['web', 'academic']).optional()
    .describe("Set to 'academic' to prioritize scholarly sources."),
  showThinking: z.boolean().optional().default(false)
    .describe("If true, includes the model's internal reasoning in the response. Defaults to false."),
}).describe("Follow up on an existing Perplexity conversation with a new search query. This tool continues a conversation started by perplexity_search or perplexity_deep_research, maintaining full context. The system automatically includes the full conversation history, so you can ask follow-up questions naturally. Supports all search filters (recency, date, domain, mode).");

// Response schema is identical to regular search
export const PerplexitySearchFollowupResponseSchema = PerplexitySearchResponseSchema;

// Type inference
export type PerplexitySearchFollowupInput = z.infer<typeof PerplexitySearchFollowupInputSchema>;
export type PerplexitySearchFollowupResponse = z.infer<typeof PerplexitySearchFollowupResponseSchema>;

/**
 * Logic function for search follow-up.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function perplexitySearchFollowupLogic(
  params: PerplexitySearchFollowupInput,
  context: RequestContext
): Promise<PerplexitySearchFollowupResponse> {
  logger.debug("Executing perplexitySearchFollowupLogic...", { 
    ...context, 
    conversationId: params.conversationId,
    toolInput: params 
  });

  // Load existing conversation
  const conversation = await conversationPersistenceService.loadConversation(
    params.conversationId,
    context
  );

  logger.debug("Loaded conversation for follow-up", {
    ...context,
    conversationId: params.conversationId,
    messageCount: conversation.messageCount,
  });

  // Validate model configuration
  const modelValidation = PerplexityChatCompletionRequestSchema.shape.model.safeParse(config.perplexityDefaultModel);
  if (!modelValidation.success) {
    throw new McpError(
      BaseErrorCode.CONFIGURATION_ERROR,
      `Invalid Perplexity default model configured: ${config.perplexityDefaultModel}`,
      { ...context, error: modelValidation.error }
    );
  }
  const modelToUse = modelValidation.data;

  // Build request with full conversation history + new query
  const requestPayload: PerplexityChatCompletionRequest = {
    model: modelToUse,
    messages: [
      ...conversation.messages,
      { role: 'user', content: params.query },
    ],
    stream: false,
    ...(params.return_related_questions && { return_related_questions: params.return_related_questions }),
    ...(params.search_recency_filter && { search_recency_filter: params.search_recency_filter }),
    ...(params.search_domain_filter && { search_domain_filter: params.search_domain_filter }),
    ...(params.search_after_date_filter && { search_after_date_filter: params.search_after_date_filter }),
    ...(params.search_before_date_filter && { search_before_date_filter: params.search_before_date_filter }),
    ...(params.search_mode && { search_mode: params.search_mode }),
  };

  logger.info("Calling Perplexity API for follow-up search", { 
    ...context, 
    model: modelToUse,
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

  const toolResponse: PerplexitySearchFollowupResponse = {
    rawResultText,
    responseId: response.id,
    modelUsed: response.model,
    usage: response.usage,
    searchResults: response.search_results,
    conversationId: updatedConversation.conversationId,
    conversationPath: conversationPersistenceService.getConversationPath(updatedConversation.conversationId),
  };

  logger.info("Perplexity search follow-up logic completed successfully.", {
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