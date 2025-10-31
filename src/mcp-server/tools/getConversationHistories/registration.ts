/**
 * @fileoverview Registers the `get_conversation_histories` tool with the MCP server.
 * Handles batch conversation retrieval, error handling, and response formatting.
 * @module src/mcp-server/tools/getConversationHistories/registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorHandler, logger, requestContextService } from "../../../utils/index.js";
import { McpError } from "../../../types-global/errors.js";
import {
  getConversationHistoriesLogic,
  GetConversationHistoriesInput,
  GetConversationHistoriesInputSchema,
  GetConversationHistoriesResponseSchema,
} from "./logic.js";

/**
 * Helper to format status message for a conversation
 */
function formatStatusMessage(status?: string, progress?: any, error?: any, attempts?: number): string {
  if (!status) return '';

  const errorHistory = error?.errorHistory || [];
  
  switch (status) {
    case 'pending':
      const retryInfo = (attempts || 0) > 0 
        ? ` (Retry attempt ${(attempts || 0) + 1})` 
        : '';
      return `🕒 Status: Pending${retryInfo} - Queued for processing`;
    
    case 'in_progress':
      const progressPercent = progress?.percentage || 0;
      const progressMsg = progress?.message || 'Processing...';
      const elapsedMin = progress?.elapsedMs ? Math.floor(progress.elapsedMs / 60000) : 0;
      const attemptInfo = (attempts || 0) > 0 ? ` (Attempt ${(attempts || 0) + 1})` : '';
      return `⏳ Status: In Progress (${progressPercent}%)${attemptInfo} - ${progressMsg} (${elapsedMin}m elapsed)`;
    
    case 'completed':
      return `✅ Status: Completed - Research report available`;
    
    case 'failed':
      const errorMsg = error?.message || 'Unknown error';
      const errorCode = error?.code || 'UNKNOWN';
      const attemptSuffix = (attempts || 0) > 0 ? ` after ${attempts} attempts` : '';
      const historyInfo = errorHistory.length > 0 
        ? ` (${errorHistory.length} errors in history)` 
        : '';
      return `❌ Status: Failed${attemptSuffix} - [${errorCode}] ${errorMsg}${historyInfo}`;
    
    case 'cancelled':
      return `🚫 Status: Cancelled`;
    
    default:
      return `⚠️  Status: ${status}`;
  }
}

/**
 * Registers the get_conversation_histories tool with the MCP server.
 * @param server - The MCP server instance
 */
export const registerGetConversationHistories = async (server: McpServer): Promise<void> => {
  server.registerTool(
    "get_conversation_histories",
    {
      title: "Get Multiple Conversation Histories",
      description: "Retrieve multiple conversation histories in a single batch operation. Returns an object keyed by conversationId. Each entry contains the conversation data (if available), job status (if async), and error information (if failed/not found). Useful for monitoring multiple async deep research queries or reviewing several conversations efficiently.",
      inputSchema: GetConversationHistoriesInputSchema.shape,
    },
    async (params: GetConversationHistoriesInput) => {
      const context = requestContextService.createRequestContext({
        toolName: "get_conversation_histories",
      });

      try {
        const result = await getConversationHistoriesLogic(params, context);

        // Format batch results as readable text
        const header = `📚 **Batch Conversation Retrieval**\nTotal Requested: ${params.conversationIds.length}\n\n---\n\n`;

        const conversationTexts: string[] = [];

        for (const [conversationId, convResult] of Object.entries(result)) {
          let convText = `**Conversation ID:** \`${conversationId}\`\n`;

          if (convResult.error) {
            // Error case
            convText += `❌ Error: [${convResult.error.code}] ${convResult.error.message}\n`;
          } else if (convResult.conversation) {
            // Success case
            const conv = convResult.conversation;
            convText += `Created: ${new Date(conv.createdAt).toLocaleString()}\n`;
            convText += `Updated: ${new Date(conv.updatedAt).toLocaleString()}\n`;
            convText += `Messages: ${conv.messageCount}\n`;

            // Add status if present
            if (convResult.status) {
              const statusMsg = formatStatusMessage(
                convResult.status.status,
                convResult.progress,
                convResult.status.error,
                convResult.status.attempts
              );
              convText += `${statusMsg}\n`;
            }

            // Show first/last message preview
            if (conv.messages.length > 0) {
              const firstMsg = conv.messages[0];
              const preview = firstMsg.content.length > 100 
                ? firstMsg.content.substring(0, 100) + '...' 
                : firstMsg.content;
              convText += `\nFirst Message: "${preview}"\n`;
            }
          }

          conversationTexts.push(convText);
        }

        const fullText = header + conversationTexts.join('\n---\n\n');

        // Summary
        const successCount = Object.values(result).filter(r => r.conversation).length;
        const errorCount = Object.values(result).filter(r => r.error).length;
        const pendingCount = Object.values(result).filter(r => 
          r.status?.status === 'pending' || r.status?.status === 'in_progress'
        ).length;

        const summary = `\n---\n\n**Summary:**\n- ✅ Retrieved: ${successCount}\n- ❌ Errors: ${errorCount}\n- ⏳ In Progress/Pending: ${pendingCount}`;

        return {
          structuredContent: result,
          content: [
            {
              type: "text",
              text: fullText + summary,
            },
          ],
        };
      } catch (error) {
        const mcpError = ErrorHandler.handleError(error, {
          operation: "get_conversation_histories",
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
  logger.info("Tool 'get_conversation_histories' registered successfully.");
};

