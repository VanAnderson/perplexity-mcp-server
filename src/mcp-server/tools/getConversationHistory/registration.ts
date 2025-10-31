/**
 * @fileoverview Registers the `get_conversation_history` tool with the MCP server.
 * Handles tool registration, error handling, and response formatting.
 * @module src/mcp-server/tools/getConversationHistory/registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorHandler, logger, requestContextService } from "../../../utils/index.js";
import { McpError } from "../../../types-global/errors.js";
import {
  getConversationHistoryLogic,
  GetConversationHistoryInput,
  GetConversationHistoryInputSchema,
  GetConversationHistoryResponseSchema,
} from "./logic.js";

/**
 * Registers the get_conversation_history tool with the MCP server.
 * @param server - The MCP server instance
 */
export const registerGetConversationHistory = async (server: McpServer): Promise<void> => {
  server.registerTool(
    "get_conversation_history",
    {
      title: "Get Conversation History",
      description: "Retrieve the full conversation history by conversation ID. Useful for reviewing what's been discussed or debugging conversation context.",
      inputSchema: GetConversationHistoryInputSchema.shape,
      outputSchema: GetConversationHistoryResponseSchema.shape,
    },
    async (params: GetConversationHistoryInput) => {
      const context = requestContextService.createRequestContext({
        toolName: "get_conversation_history",
      });

      try {
        const result = await getConversationHistoryLogic(params, context);

        // Add status message if present (for async jobs)
        const statusSection = result.statusMessage ? `${result.statusMessage}\n\n---\n\n` : '';

        // Format conversation history as readable text
        const header = `📜 **Conversation History**\nConversation ID: \`${result.conversationId}\`\nCreated: ${new Date(result.createdAt).toLocaleString()}\nLast Updated: ${new Date(result.updatedAt).toLocaleString()}\nMessages: ${result.messageCount}\nLocation: \`${result.conversationPath}\`\n\n---\n\n`;

        const messageTexts = result.messages.map((msg, idx) => {
          const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
          const separator = idx < result.messages.length - 1 ? '\n\n---\n\n' : '';
          return `**${role}:**\n${msg.content}${separator}`;
        });

        const fullText = statusSection + header + messageTexts.join('');

        return {
          structuredContent: result,
          content: [
            {
              type: "text",
              text: fullText,
            },
          ],
        };
      } catch (error) {
        const mcpError = ErrorHandler.handleError(error, {
          operation: "get_conversation_history",
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
  logger.info("Tool 'get_conversation_history' registered successfully.");
};