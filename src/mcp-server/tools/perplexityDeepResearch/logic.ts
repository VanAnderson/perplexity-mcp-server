/**
 * @fileoverview Defines the core logic, schemas, and types for the `perplexity_deep_research` tool.
 * This tool interfaces with the Perplexity API to perform exhaustive, multi-source research.
 * @module src/mcp-server/tools/perplexityDeepResearch/logic
 */

import { z } from 'zod';
import { config } from '../../../config/index.js';
import { perplexityApiService, conversationPersistenceService, PerplexityChatCompletionRequest } from '../../../services/index.js';
import { jobQueueService } from '../../../services/jobQueue.js';
import { BaseErrorCode, McpError } from '../../../types-global/errors.js';
import { JobData } from '../../../types-global/job-status.js';
import { logger, RequestContext } from '../../../utils/index.js';
import { PerplexitySearchResponseSchema } from '../perplexitySearch/logic.js';

// 1. DEFINE Zod input and output schemas.
export const PerplexityDeepResearchInputSchema = z.object({
  query: z.string().min(1).describe("The comprehensive research query for Perplexity's deep research engine. **CRITICAL: Provide COMPLETE, WELL-STRUCTURED CONTEXT.** This research agent has NO access to your conversation history. For complex or multi-faceted research, provide your query as a structured markdown document that includes: 1) Research Objective (what you're trying to understand/accomplish), 2) Background Context (relevant technologies, versions, current situation), 3) Specific Questions or Focus Areas, 4) Constraints or Requirements, 5) Intended Use Case or Audience. EXAMPLE BAD QUERY: 'research MCP SDK'. EXAMPLE GOOD QUERY: '# Research Objective\\nComprehensive analysis of authentication patterns in Model Context Protocol servers\\n\\n# Background\\nBuilding an MCP server using @modelcontextprotocol/sdk v1.15.0 in TypeScript/Node.js that will handle sensitive data\\n\\n# Focus Areas\\n1. JWT vs OAuth2 implementation patterns\\n2. Best practices for API key management\\n3. Rate limiting strategies\\n4. Security considerations for HTTP transport\\n\\n# Requirements\\n- Production-ready patterns\\n- TypeScript examples preferred\\n- Must support both stdio and HTTP transports'"),
  reasoning_effort: z.enum(['low', 'medium', 'high']).optional().default('medium').describe("Controls the computational effort and depth of the research. 'high' provides the most thorough analysis but costs more."),
}).describe("Performs exhaustive, multi-source research using Perplexity Deep Research API for complex topics requiring in-depth analysis and comprehensive report generation. **CRITICAL: For complex research, provide a STRUCTURED MARKDOWN DOCUMENT as your query** with clear sections: Research Objective, Background Context, Specific Questions, Requirements, and Intended Use. The research agent has NO conversation history - include ALL context. Simple queries should still be complete sentences with full context. Use `reasoning_effort` to control depth.");

// The response schema is identical to the search response, so we can reuse it.
export const PerplexityDeepResearchResponseSchema = PerplexitySearchResponseSchema;


// 2. INFER and export TypeScript types.
export type PerplexityDeepResearchInput = z.infer<typeof PerplexityDeepResearchInputSchema>;
export type PerplexityDeepResearchResponse = z.infer<typeof PerplexityDeepResearchResponseSchema>;


// --- System Prompt ---
const SYSTEM_PROMPT = `You are an expert-level AI research assistant using the Perplexity deep research engine. Your primary directive is to conduct exhaustive, multi-source research and generate detailed, well-structured, and impeccably cited reports suitable for an expert audience.

**Core Directives:**

1.  **Systematic & Exhaustive Research:** Conduct a comprehensive, multi-faceted search to build a deep and nuanced understanding of the topic. Synthesize information from a wide array of sources to ensure the final report is complete.
2.  **Source Vetting:** Apply rigorous standards to source evaluation. Prioritize primary sources, peer-reviewed literature, and authoritative contemporary reports. Scrutinize sources for bias and accuracy.
3.  **Accurate & Robust Citations:** Every piece of information, data point, or claim must be attributed with a precise, inline citation. Ensure all citation metadata (URL, title) is captured correctly and completely.

**Final Report Formatting Rules:**

1.  **Synthesize and Structure:** Your answer must be a comprehensive synthesis of the information gathered. Structure the response logically with clear headings, subheadings, and paragraphs to create a professional-grade document.
2.  **Depth and Detail:** Provide a thorough and detailed analysis. Avoid superficiality and demonstrate a deep command of the subject matter.
3.  **Clarity and Precision:** Use clear, precise, and professional language.
4.  **Stand-Alone Report:** The final answer must be a complete, stand-alone report, ready for publication. Do not include conversational filler or meta-commentary on your research process.`;

/**
 * 3. IMPLEMENT and export the core logic function.
 * It must remain pure: its only concerns are its inputs and its return value or thrown error.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function perplexityDeepResearchLogic(
  params: PerplexityDeepResearchInput,
  context: RequestContext
): Promise<PerplexityDeepResearchResponse> {
  logger.debug("Executing perplexityDeepResearchLogic...", { ...context, toolInput: params });

  // Check if async mode is enabled
  if (config.perplexityEnableAsyncDeepResearch) {
    logger.info("Async mode enabled, queueing deep research job", { ...context });
    
    // Create conversation with just system and user messages (no assistant response yet)
    const conversation = await conversationPersistenceService.createConversationWithStatus(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: params.query },
      ],
      'perplexity_deep_research',
      context
    );

    // Create job data
    const jobData: JobData = {
      conversationId: conversation.conversationId,
      toolName: 'perplexity_deep_research',
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

    // Return immediately with instructions
    const toolResponse: PerplexityDeepResearchResponse = {
      rawResultText: `Deep research query has been queued for background processing.

This query will be processed asynchronously. To check the status and retrieve results:

1. Use \`get_conversation_history\` with conversation ID: \`${conversation.conversationId}\`
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
      conversationId: conversation.conversationId,
      conversationPath: conversationPersistenceService.getConversationPath(conversation.conversationId),
    };

    logger.info("Deep research job queued successfully", {
      ...context,
      conversationId: conversation.conversationId,
    });

    return toolResponse;
  }

  // Blocking mode (default) - existing behavior
  const requestPayload: PerplexityChatCompletionRequest = {
    model: 'sonar-deep-research',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: params.query },
    ],
    reasoning_effort: params.reasoning_effort,
    stream: false,
  };

  logger.info("Calling Perplexity API with deep research model (blocking mode)", { ...context, reasoningEffort: params.reasoning_effort });
  logger.debug("API Payload", { ...context, payload: requestPayload });

  const response = await perplexityApiService.chatCompletion(requestPayload, context);

  const choice = response.choices?.[0];
  const rawResultText = choice?.message?.content;

  if (!rawResultText) {
    logger.warning("Perplexity API returned empty content", { ...context, responseId: response.id });
    throw new McpError(
      BaseErrorCode.SERVICE_UNAVAILABLE,
      'Perplexity API returned an empty response.',
      { ...context, responseId: response.id }
    );
  }

  // Create conversation with system prompt, user query, and assistant response
  const conversation = await conversationPersistenceService.createConversation(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: params.query },
      { role: 'assistant', content: rawResultText },
    ],
    context
  );

  const toolResponse: PerplexityDeepResearchResponse = {
    rawResultText,
    responseId: response.id,
    modelUsed: response.model,
    usage: response.usage,
    searchResults: response.search_results,
    conversationId: conversation.conversationId,
    conversationPath: conversationPersistenceService.getConversationPath(conversation.conversationId),
  };

  logger.info("Perplexity deep research logic completed successfully.", {
    ...context,
    responseId: toolResponse.responseId,
    model: toolResponse.modelUsed,
    usage: toolResponse.usage,
    searchResultCount: toolResponse.searchResults?.length ?? 0,
    conversationId: toolResponse.conversationId,
  });

  return toolResponse;
}
