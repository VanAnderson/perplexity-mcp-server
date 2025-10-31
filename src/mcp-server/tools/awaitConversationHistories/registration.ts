/**
 * @fileoverview Registers the `await_conversation_histories` tool with the MCP server.
 * This tool is only registered when async deep research mode is enabled.
 * @module src/mcp-server/tools/awaitConversationHistories/registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorHandler, logger, requestContextService } from "../../../utils/index.js";
import { McpError } from "../../../types-global/errors.js";
import { config } from "../../../config/index.js";
import {
  awaitConversationHistoriesLogic,
  AwaitConversationHistoriesInput,
  AwaitConversationHistoriesInputSchema,
  AwaitConversationHistoriesResponseSchema,
} from "./logic.js";

/**
 * Helper to format status message for a conversation
 */
function formatStatusMessage(status?: string, progress?: any, error?: any, attempts?: number): string {
  if (!status) return '';

  switch (status) {
    case 'pending':
      const retryInfo = (attempts || 0) > 0 
        ? ` (Retry attempt ${(attempts || 0) + 1})` 
        : '';
      return `🕒 Pending${retryInfo}`;
    
    case 'in_progress':
      const progressPercent = progress?.percentage || 0;
      const attemptInfo = (attempts || 0) > 0 ? ` (Attempt ${(attempts || 0) + 1})` : '';
      return `⏳ In Progress (${progressPercent}%)${attemptInfo}`;
    
    case 'completed':
      return `✅ Completed`;
    
    case 'failed':
      const errorCode = error?.code || 'UNKNOWN';
      const attemptSuffix = (attempts || 0) > 0 ? ` after ${attempts} attempts` : '';
      return `❌ Failed [${errorCode}]${attemptSuffix}`;
    
    case 'cancelled':
      return `🚫 Cancelled`;
    
    default:
      return `⚠️  ${status}`;
  }
}

/**
 * Registers the await_conversation_histories tool with the MCP server.
 * Only registers if async deep research mode is enabled.
 * @param server - The MCP server instance
 */
export const registerAwaitConversationHistories = async (server: McpServer): Promise<void> => {
  // Only register if async mode is enabled
  if (!config.perplexityEnableAsyncDeepResearch) {
    logger.info("Async deep research disabled - skipping 'await_conversation_histories' tool registration");
    return;
  }

  server.registerTool(
    "await_conversation_histories",
    {
      title: "Await Multiple Conversation Histories (Async Mode)",
      description: `Wait for async job completion and retrieve multiple conversation histories. This tool polls every 2 seconds until all requested jobs reach terminal state (completed/failed/cancelled).

⚠️  **Timeout Behavior**: This tool waits indefinitely until jobs complete. In some IDEs, this may timeout (typically 60-180 seconds). If timeout occurs, simply run the tool again - jobs continue processing in background and you can resume waiting.

**When to use**:
- You've submitted multiple async deep research queries
- You want to wait for all to complete before proceeding
- You need batch results only after full completion

**Alternative**: Use \`get_conversation_histories\` to check status without waiting.`,
      inputSchema: AwaitConversationHistoriesInputSchema.shape,
    },
    async (params: AwaitConversationHistoriesInput) => {
      const context = requestContextService.createRequestContext({
        toolName: "await_conversation_histories",
      });

      try {
        const result = await awaitConversationHistoriesLogic(params, context);

        // Format results as readable text
        const header = `⏳ **Awaited Multiple Conversations**\nAll ${params.conversationIds.length} conversation(s) have reached completion.\n\n---\n\n`;

        const conversationTexts: string[] = [];

        for (const [conversationId, convResult] of Object.entries(result)) {
          let convText = `**${conversationId}**\n`;

          if (convResult.error) {
            convText += `❌ Error: [${convResult.error.code}] ${convResult.error.message}\n`;
          } else if (convResult.conversation) {
            const conv = convResult.conversation;
            const statusMsg = formatStatusMessage(
              convResult.status?.status,
              convResult.progress,
              convResult.status?.error,
              convResult.status?.attempts
            );
            
            convText += `${statusMsg} | ${conv.messageCount} messages\n`;
            
            // Show brief preview if completed
            if (convResult.status?.status === 'completed' && conv.messages.length > 0) {
              const lastMsg = conv.messages[conv.messages.length - 1];
              if (lastMsg.role === 'assistant') {
                const preview = lastMsg.content.length > 150 
                  ? lastMsg.content.substring(0, 150) + '...' 
                  : lastMsg.content;
                convText += `\nPreview: "${preview}"\n`;
              }
            }
          }

          conversationTexts.push(convText);
        }

        const fullText = header + conversationTexts.join('\n---\n\n');

        // Summary
        const successCount = Object.values(result).filter(r => 
          r.status?.status === 'completed'
        ).length;
        const failedCount = Object.values(result).filter(r => 
          r.status?.status === 'failed' || r.error
        ).length;

        const summary = `\n---\n\n**Summary:**\n- ✅ Completed: ${successCount}\n- ❌ Failed/Errors: ${failedCount}\n\n**Tip**: Use \`get_conversation_history\` with individual IDs to view full details.`;

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
          operation: "await_conversation_histories",
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
  logger.info("Tool 'await_conversation_histories' registered successfully (async mode enabled).");
};

