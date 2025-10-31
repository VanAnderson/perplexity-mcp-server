# Conversation Follow-up Tools

## Purpose

The follow-up tools (`perplexity_search_followup` and `perplexity_deep_research_followup`) enable continuing conversations by adding new queries to existing conversation threads while maintaining context.

## Requirements

### Requirement: Search Follow-up Execution

The system SHALL execute follow-up search queries on existing conversations.

#### Scenario: Search followup
- **WHEN** `perplexity_search_followup` is called
- **THEN** system SHALL load existing conversation messages
- **AND** append new user query to conversation
- **AND** send full conversation history to Perplexity API
- **AND** append assistant response to conversation
- **AND** return updated conversation with same conversation ID

### Requirement: Deep Research Follow-up Execution

The system SHALL execute follow-up deep research queries with async support.

#### Scenario: Blocking deep research followup
- **GIVEN** async mode is disabled
- **WHEN** `perplexity_deep_research_followup` is called
- **THEN** system SHALL execute synchronously like normal deep research
- **AND** maintain conversation continuity

#### Scenario: Async deep research followup
- **GIVEN** async mode is enabled
- **WHEN** `perplexity_deep_research_followup` is called
- **THEN** system SHALL enqueue follow-up job
- **AND** return immediately with conversation ID
- **AND** follow async pattern like initial deep research

### Requirement: In-Progress Job Blocking

The system SHALL prevent follow-ups on conversations with active jobs.

#### Scenario: Blocked followup on pending/in-progress job
- **GIVEN** conversation has job with status "pending" or "in_progress"
- **WHEN** client attempts any follow-up
- **THEN** system SHALL reject with error
- **AND** message SHALL indicate job is still processing
- **AND** instruct client to wait for completion via `get_conversation_history`

### Requirement: Context Preservation

The system SHALL maintain full conversation context across follow-ups.

#### Scenario: Context loading
- **WHEN** executing follow-up
- **THEN** system SHALL load all previous messages
- **AND** include them in API request
- **AND** maintain message order (chronological)
- **AND** preserve message roles (user/assistant)

### Requirement: Error Handling

The system SHALL handle follow-up errors appropriately.

#### Scenario: Conversation not found
- **WHEN** follow-up references non-existent conversation ID
- **THEN** system SHALL return error indicating conversation not found
- **AND** suggest creating new conversation instead

