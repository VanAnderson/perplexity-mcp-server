## ADDED Requirements

### Requirement: Batch Conversation Retrieval

The system SHALL support retrieving multiple conversations in a single request via the get_conversation_histories tool.

#### Scenario: Batch retrieval with mixed statuses
- **WHEN** client calls `get_conversation_histories` with array of conversation IDs
- **THEN** system SHALL return object keyed by conversationId
- **AND** each entry SHALL contain conversation data if available
- **AND** each entry SHALL contain status if job exists
- **AND** each entry SHALL contain error if conversation not found or failed
- **AND** response SHALL include all requested IDs even if some don't exist

#### Scenario: Response structure for batch retrieval
- **GIVEN** batch request for conversations with different states
- **THEN** response SHALL use format: `{ [conversationId]: { conversation?, status?, progress?, error? } }`
- **AND** completed conversations SHALL include full conversation data and status "completed"
- **AND** pending/in_progress conversations SHALL include status and progress information
- **AND** failed conversations SHALL include error object with code and message
- **AND** non-existent conversations SHALL include error with code "NOT_FOUND"

#### Scenario: Partial failure handling
- **WHEN** some conversation IDs don't exist
- **THEN** system SHALL still return results for valid conversations
- **AND** include error indicators for invalid/missing conversations
- **AND** NOT fail entire request due to partial failures

### Requirement: Await Multiple Conversations

When async mode is enabled, the system SHALL provide await_conversation_histories tool to wait for job completion.

#### Scenario: Wait for all jobs to complete
- **GIVEN** `PERPLEXITY_ENABLE_ASYNC_DEEP_RESEARCH` is true
- **WHEN** client calls `await_conversation_histories` with array of conversation IDs
- **THEN** system SHALL check status of all conversations
- **AND** if any are "pending" or "in_progress", poll every 2 seconds
- **AND** continue polling until all are "completed", "failed", or "not_found"
- **AND** return batch results in same format as get_conversation_histories

#### Scenario: Indefinite wait with client timeout
- **WHEN** await tool is polling for completion
- **THEN** system SHALL NOT implement internal timeout
- **AND** continue polling until client times out or jobs complete
- **AND** if client timeout occurs, jobs continue processing in background
- **AND** client can re-call tool to resume waiting

#### Scenario: Tool registration in async mode only
- **GIVEN** `PERPLEXITY_ENABLE_ASYNC_DEEP_RESEARCH` is false or not set
- **THEN** system SHALL NOT register await_conversation_histories tool
- **GIVEN** async mode is enabled
- **THEN** system SHALL register await_conversation_histories tool
- **AND** include timeout warning in tool description

## MODIFIED Requirements

### Requirement: Conversation Retrieval

The system SHALL retrieve and format conversation history for given conversation ID(s).

#### Scenario: Basic retrieval
- **WHEN** `get_conversation_history` is called with conversation ID
- **THEN** system SHALL read conversation.json
- **AND** format messages in human-readable format
- **AND** include conversation metadata (created, updated, model)
- **AND** return conversation location path

#### Scenario: Conversation not found
- **WHEN** conversation ID doesn't exist
- **THEN** system SHALL return error indicating conversation not found
- **AND** suggest checking conversation ID format

#### Scenario: Array input support (new)
- **WHEN** `get_conversation_history` is called with array of conversation IDs
- **THEN** system SHALL process as batch request
- **AND** return object keyed by conversationId
- **AND** maintain backward compatibility with single string input

#### Scenario: Conversation not found in batch (new)
- **WHEN** batch request includes non-existent conversation ID
- **THEN** system SHALL include entry with error object
- **AND** error SHALL have code "NOT_FOUND"
- **AND** error SHALL have descriptive message
- **AND** NOT prevent other conversations from being returned

