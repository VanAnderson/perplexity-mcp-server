/**
 * @fileoverview Registers the `perplexity_search_followup` tool with the MCP server.
 * Handles tool registration, error handling, and response formatting.
 * @module src/mcp-server/tools/perplexitySearchFollowup/registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorHandler, logger, requestContextService } from "../../../utils/index.js";
import { McpError } from "../../../types-global/errors.js";
import {
  perplexitySearchFollowupLogic,
  PerplexitySearchFollowupInput,
  PerplexitySearchFollowupInputSchema,
  PerplexitySearchFollowupResponseSchema,
} from "./logic.js";

/**
 * Registers the perplexity_search_followup tool with the MCP server.
 * @param server - The MCP server instance
 */
export const registerPerplexitySearchFollowup = async (server: McpServer): Promise<void> => {
  server.registerTool(
    "perplexity_search_followup",
    {
      title: "Perplexity Search Follow-up",
      description: "Follow up on an existing Perplexity conversation with a new search query. This tool continues a conversation started by perplexity_search or perplexity_deep_research, maintaining full context. You can switch between search and deep research modes within the same conversation.",
      inputSchema: PerplexitySearchFollowupInputSchema.shape,
      outputSchema: PerplexitySearchFollowupResponseSchema.shape,
    },
    async (params: PerplexitySearchFollowupInput) => {
      const context = requestContextService.createRequestContext({
        toolName: "perplexity_search_followup",
      });

      try {
        const result = await perplexitySearchFollowupLogic(params, context);

        // Format response with conversation header
        const responseHeader = `🔗 **Conversation Continued**
Conversation ID: \`${result.conversationId}\`
Location: \`${result.conversationPath}\`

To follow up:
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

        return {
          structuredContent: result,
          content: [
            {
              type: "text",
              text: responseHeader + result.rawResultText,
            },
          ],
        };
      } catch (error) {
        const mcpError = ErrorHandler.handleError(error, {
          operation: "perplexity_search_followup",
          context,
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
  logger.info("Tool 'perplexity_search_followup' registered successfully.");
};