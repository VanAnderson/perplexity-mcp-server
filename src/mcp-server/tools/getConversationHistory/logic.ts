/**
 * @fileoverview Defines the core logic, schemas, and types for the `get_conversation_history` tool.
 * This tool retrieves the full conversation history by conversation ID.
 * @module src/mcp-server/tools/getConversationHistory/logic
 */

import { z } from 'zod';
import { conversationPersistenceService, ConversationMessageSchema } from '../../../services/index.js';
import { logger, RequestContext } from '../../../utils/index.js';

// Input schema for getting conversation history
export const GetConversationHistoryInputSchema = z.object({
  conversationId: z.string()
    .describe("The conversation ID to retrieve."),
  includeSystemPrompt: z.boolean().optional().default(false)
    .describe("Include the system prompt in the response. Defaults to false."),
}).describe("Retrieve the full conversation history by conversation ID. Useful for reviewing what's been discussed or debugging conversation context. System prompts are excluded by default but can be included with includeSystemPrompt: true.");

// Output schema for conversation history
export const GetConversationHistoryResponseSchema = z.object({
  conversationId: z.string().describe("The conversation identifier"),
  createdAt: z.string().datetime().describe("ISO 8601 timestamp of conversation creation"),
  updatedAt: z.string().datetime().describe("ISO 8601 timestamp of last update"),
  messageCount: z.number().int().nonnegative().describe("Total number of messages"),
  messages: z.array(ConversationMessageSchema).describe("Array of conversation messages"),
  conversationPath: z.string().describe("Absolute path to the conversation directory"),
});

// Type inference
export type GetConversationHistoryInput = z.infer<typeof GetConversationHistoryInputSchema>;
export type GetConversationHistoryResponse = z.infer<typeof GetConversationHistoryResponseSchema>;

/**
 * Logic function for getting conversation history.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function getConversationHistoryLogic(
  params: GetConversationHistoryInput,
  context: RequestContext
): Promise<GetConversationHistoryResponse> {
  logger.debug("Executing getConversationHistoryLogic...", { 
    ...context, 
    conversationId: params.conversationId,
    includeSystemPrompt: params.includeSystemPrompt,
  });

  // Load conversation
  const conversation = await conversationPersistenceService.loadConversation(
    params.conversationId,
    context
  );

  // Filter out system message if requested
  let messages = conversation.messages;
  if (!params.includeSystemPrompt) {
    messages = messages.filter(msg => msg.role !== 'system');
  }

  const response: GetConversationHistoryResponse = {
    conversationId: conversation.conversationId,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: messages.length,
    messages,
    conversationPath: conversationPersistenceService.getConversationPath(conversation.conversationId),
  };

  logger.info("Retrieved conversation history successfully.", {
    ...context,
    conversationId: params.conversationId,
    totalMessages: conversation.messages.length,
    returnedMessages: messages.length,
  });

  return response;
}