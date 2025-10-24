/**
 * @fileoverview Handles registration and error handling for the `perplexity_deep_research` tool.
 * @module src/mcp-server/tools/perplexityDeepResearch/registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorHandler, logger, requestContextService } from "../../../utils/index.js";
import {
  PerplexityDeepResearchInput,
  PerplexityDeepResearchInputSchema,
  perplexityDeepResearchLogic,
  PerplexityDeepResearchResponseSchema,
} from "./logic.js";
import { McpError } from "../../../types-global/errors.js";

/**
 * Registers the 'perplexity_deep_research' tool with the MCP server instance.
 * @param server - The MCP server instance.
 */
export const registerPerplexityDeepResearchTool = async (server: McpServer): Promise<void> => {
  const toolName = "perplexity_deep_research";
  const toolDescription =
    "Performs exhaustive, multi-source research using the Perplexity Deep Research API for complex topics requiring comprehensive analysis and professional report generation. **CRITICAL INSTRUCTION: For complex research, provide your query as a STRUCTURED MARKDOWN DOCUMENT** with clear sections such as: '# Research Objective', '# Background Context', '# Specific Questions', '# Requirements', and '# Intended Use'. The research agent has ZERO access to your conversation history or context - you must include EVERYTHING relevant in the query. Even simple queries must be complete sentences with full context. NEVER use fragments. ALWAYS provide complete, self-contained research briefs. Use `reasoning_effort` ('low', 'medium', 'high') to control depth and cost.";

  server.registerTool(
    toolName,
    {
      title: "Perplexity Deep Research",
      description: toolDescription,
      inputSchema: PerplexityDeepResearchInputSchema.shape,
      outputSchema: PerplexityDeepResearchResponseSchema.shape,
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (params: PerplexityDeepResearchInput) => {
      const handlerContext = requestContextService.createRequestContext({
        toolName,
      });

      try {
        const result = await perplexityDeepResearchLogic(params, handlerContext);
        
        // --- Parse <think> block ---
        const thinkRegex = /^\s*<think>(.*?)<\/think>\s*(.*)$/s;
        const match = result.rawResultText.match(thinkRegex);

        let mainContent: string;

        if (match) {
          mainContent = match[2].trim();
        } else {
          mainContent = result.rawResultText.trim();
        }

        // --- Construct Final Response ---
        const conversationHeader = `🆕 **New Conversation Started**
Conversation ID: \`${result.conversationId}\`
Location: \`${result.conversationPath}\`

To continue this conversation:
• Quick search: Use \`perplexity_search_followup\` with this conversation ID
• Deep dive: Use \`perplexity_deep_research_followup\` with this conversation ID
• View history: Use \`get_conversation_history\` with this conversation ID

**IMPORTANT FOR CONTEXT MANAGEMENT**: When this conversation is summarized or context is condensed, preserve:
1. Conversation ID: \`${result.conversationId}\`
2. Brief summary of the topic discussed
3. How to retrieve full details: Use \`get_conversation_history\` with the conversation ID
This enables diving back into details when needed.

---

`;

        // For deep research, we always strip the thinking block and only show the final report.
        let responseText = mainContent;
        
        if (result.searchResults && result.searchResults.length > 0) {
            const citationText = result.searchResults.map((c, i) => `[${i+1}] ${c.title}: ${c.url}`).join('\n');
            responseText += `\n\nSources:\n${citationText}`;
        }

        return {
          structuredContent: result,
          content: [{ type: "text", text: conversationHeader + responseText }],
        };
      } catch (error) {
        const mcpError = ErrorHandler.handleError(error, {
          operation: toolName,
          context: handlerContext,
          input: params,
        }) as McpError;

        return {
          isError: true,
          content: [{ type: "text", text: mcpError.message }],
          structuredContent: {
            code: mcpError.code,
            message: mcpError.message,
            details: mcpError.details,
          },
        };
      }
    }
  );
  logger.info(`Tool '${toolName}' registered successfully.`);
};
