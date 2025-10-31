/**
 * @fileoverview Handles registration and error handling for the `perplexity_search` tool.
 * @module src/mcp-server/tools/perplexitySearch/registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorHandler, logger, requestContextService } from "../../../utils/index.js";
import {
  PerplexitySearchInput,
  PerplexitySearchInputSchema,
  perplexitySearchLogic,
  PerplexitySearchResponseSchema,
} from "./logic.js";
import { McpError } from "../../../types-global/errors.js";
import { PERPLEXITY_PRIVACY_DISCLAIMER } from "../shared-constants.js";

/**
 * Registers the 'perplexity_search' tool with the MCP server instance.
 * @param server - The MCP server instance.
 */
export const registerPerplexitySearchTool = async (server: McpServer): Promise<void> => {
  const toolName = "perplexity_search";
  const toolDescription =
    `Performs a search-augmented query using the Perplexity Search API. **CRITICAL INSTRUCTION: You MUST write queries using COMPLETE, GRAMMATICALLY CORRECT SENTENCES with FULL CONTEXT.** The research agent has NO access to your conversation history or prior context. Every query must be self-contained and include ALL relevant information: what you're researching, why, specific technologies/versions, constraints, and desired outcomes. NEVER use fragments like 'latest updates' or 'how to use this'. ALWAYS provide complete context like 'What are the latest security best practices for implementing JWT authentication in Node.js Express applications as of 2025?' Supports filtering by recency, date, domain, and search mode (web or academic). ${PERPLEXITY_PRIVACY_DISCLAIMER}`;

  server.registerTool(
    toolName,
    {
      title: "Perplexity Search",
      description: toolDescription,
      inputSchema: PerplexitySearchInputSchema.shape,
      outputSchema: PerplexitySearchResponseSchema.shape,
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (params: PerplexitySearchInput) => {
      const handlerContext = requestContextService.createRequestContext({
        toolName,
      });

      try {
        const result = await perplexitySearchLogic(params, handlerContext);
        
        // --- Parse <think> block ---
        const thinkRegex = /^\s*<think>(.*?)<\/think>\s*(.*)$/s;
        const match = result.rawResultText.match(thinkRegex);

        let thinkingContent: string | null = null;
        let mainContent: string;

        if (match) {
          thinkingContent = match[1].trim();
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

        let responseText = mainContent;
        if (params.showThinking && thinkingContent) {
          responseText = `--- Thinking ---\n${thinkingContent}\n\n--- Answer ---\n${mainContent}`;
        }
        
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
