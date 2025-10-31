## Why

Current conversation retrieval is limited to one conversation at a time, requiring multiple API calls when users need to check status or retrieve multiple conversations. This creates inefficiency for batch operations and makes it difficult to monitor multiple async deep research queries simultaneously.

## What Changes

- Modify `get_conversation_history` tool to accept array of conversation IDs (backward compatible with single string)
- Add new `get_conversation_histories` tool for explicit batch retrieval (returns object keyed by conversationId)
- Add new `await_conversation_histories` tool (async mode only) that polls and waits for all jobs to complete before returning
- Add batch retrieval helper method to conversation persistence service
- Create batch conversation response types with error handling for partial failures
- Support mixed status responses (completed, pending, in_progress, failed, not_found) in single batch

## Impact

- Affected specs: `conversation-history`, `async-deep-research`
- Affected code:
  - `src/mcp-server/tools/getConversationHistory/` - support array input
  - `src/mcp-server/tools/getConversationHistories/` - new tool (immediate batch)
  - `src/mcp-server/tools/awaitConversationHistories/` - new tool (polling batch, async mode only)
  - `src/services/conversationPersistence.ts` - add batch method
  - `src/types-global/batch-conversation.ts` - new schemas
  - `src/mcp-server/server.ts` - register new tools
- Breaking changes: None (backward compatible, new tools only)
- Benefits:
  - Reduced API calls for batch operations
  - Easier monitoring of multiple async jobs
  - Better UX for power users managing many conversations
  - Efficient polling for completion of multiple jobs

## Reference Documents

This change builds on the async deep research infrastructure. See linked plan document: `/async-.plan.md`

Key technical decisions:
- Response format: Object keyed by conversationId for efficient lookup
- Error handling: Partial results with error indicators per conversation
- Timeout: Let MCP client timeout naturally (user retries as needed)
- No batch size limit (trust client/server capabilities)

