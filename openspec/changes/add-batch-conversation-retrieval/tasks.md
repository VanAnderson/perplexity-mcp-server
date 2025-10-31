## 1. Type Definitions and Schemas
- [ ] 1.1 Create `src/types-global/batch-conversation.ts` with ConversationResultSchema and BatchConversationResponseSchema
- [ ] 1.2 Export new types from `src/types-global/index.ts`

## 2. Conversation Persistence Service Enhancement
- [ ] 2.1 Add `getMultipleConversationsWithStatus(conversationIds: string[])` method to `src/services/conversationPersistence.ts`
- [ ] 2.2 Implement efficient batch file reading (parallel reads where possible)
- [ ] 2.3 Return structured results with conversation, status, and error fields

## 3. Modify Existing get_conversation_history Tool
- [ ] 3.1 Update `src/mcp-server/tools/getConversationHistory/logic.ts` to handle string OR array input
- [ ] 3.2 Update `src/mcp-server/tools/getConversationHistory/registration.ts` inputSchema to accept both types
- [ ] 3.3 Update outputSchema to support single result or keyed object response
- [ ] 3.4 Maintain backward compatibility with single string input

## 4. Create get_conversation_histories Tool
- [ ] 4.1 Create directory `src/mcp-server/tools/getConversationHistories/`
- [ ] 4.2 Implement `logic.ts` using batch persistence method
- [ ] 4.3 Create `registration.ts` with array-only input schema
- [ ] 4.4 Add `index.ts` exports
- [ ] 4.5 Format response as object keyed by conversationId with conversation, status, error fields

## 5. Create await_conversation_histories Tool
- [ ] 5.1 Create directory `src/mcp-server/tools/awaitConversationHistories/`
- [ ] 5.2 Implement `logic.ts` with polling loop (poll every 2 seconds)
- [ ] 5.3 Add logic to check all conversation statuses and wait for completion
- [ ] 5.4 Create `registration.ts` with timeout warning in description
- [ ] 5.5 Add `index.ts` exports
- [ ] 5.6 Ensure tool only registers when PERPLEXITY_ENABLE_ASYNC_DEEP_RESEARCH is true

## 6. Server Registration
- [ ] 6.1 Update `src/mcp-server/server.ts` to register get_conversation_histories (always)
- [ ] 6.2 Conditionally register await_conversation_histories (async mode only)
- [ ] 6.3 Keep get_conversation_history for backward compatibility

## 7. Testing
- [ ] 7.1 Write unit tests for batch persistence method
- [ ] 7.2 Write unit tests for get_conversation_histories (mixed valid/invalid IDs)
- [ ] 7.3 Write unit tests for await polling logic with various status transitions
- [ ] 7.4 Test error handling for non-existent conversations
- [ ] 7.5 Test response format (keyed by conversationId)
- [ ] 7.6 Integration test: submit multiple async queries and retrieve batch

## 8. Documentation
- [ ] 8.1 Update README.md with new tools
- [ ] 8.2 Document batch retrieval patterns
- [ ] 8.3 Add examples of await tool usage with timeout guidance
- [ ] 8.4 Update mcp-config.json.example if needed

