/**
 * @fileoverview Registers the `perplexity_deep_research_followup` tool with the MCP server.
 * Handles tool registration, error handling, and response formatting.
 * @module src/mcp-server/tools/perplexityDeepResearchFollowup/registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorHandler, logger, requestContextService } from "../../../utils/index.js";
import { McpError } from "../../../types-global/errors.js";
import {
  perplexityDeepResearchFollowupLogic,
  PerplexityDeepResearchFollowupInput,
  PerplexityDeepResearchFollowupInputSchema,
  PerplexityDeepResearchFollowupResponseSchema,
} from "./logic.js";
import { PERPLEXITY_PRIVACY_DISCLAIMER } from "../shared-constants.js";

/**
 * Registers the perplexity_deep_research_followup tool with the MCP server.
 * @param server - The MCP server instance
 */
export const registerPerplexityDeepResearchFollowup = async (server: McpServer): Promise<void> => {
  server.registerTool(
    "perplexity_deep_research_followup",
    {
      title: "Perplexity Deep Research Follow-up",
      description: `Follow up on an existing Perplexity conversation with a deep research query. This tool continues a conversation started by perplexity_search or perplexity_deep_research, performing exhaustive multi-source research while maintaining full context. Cross-mode support allows switching between quick search and deep research. ${PERPLEXITY_PRIVACY_DISCLAIMER}`,
      inputSchema: PerplexityDeepResearchFollowupInputSchema.shape,
    },
    async (params: PerplexityDeepResearchFollowupInput) => {
      const context = requestContextService.createRequestContext({
        toolName: "perplexity_deep_research_followup",
      });

      try {
        const result = await perplexityDeepResearchFollowupLogic(params, context);

        // Format response with conversation header
        const responseHeader = `🔗 **Conversation Continued (Deep Research)**
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
          operation: "perplexity_deep_research_followup",
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
  logger.info("Tool 'perplexity_deep_research_followup' registered successfully.");
};