# Perplexity Deep Research Tool

## Purpose

The perplexity_deep_research tool provides exhaustive, multi-source research capabilities for complex topics. It uses Perplexity's deep research model to conduct thorough investigations and generate comprehensive reports, supporting both blocking and async (non-blocking) execution modes.

## Requirements

### Requirement: Deep Research Query Execution

The system SHALL execute deep research queries using the Perplexity deep research model with configurable reasoning effort.

#### Scenario: Blocking mode deep research
- **GIVEN** `PERPLEXITY_ENABLE_ASYNC_DEEP_RESEARCH` is false or not set
- **WHEN** client calls `perplexity_deep_research` with query
- **THEN** system SHALL execute query synchronously
- **AND** wait for Perplexity API to complete (may take 60-180 seconds)
- **AND** return full research report with citations
- **AND** include conversation ID, token usage, and cost estimate

#### Scenario: Async mode deep research
- **GIVEN** `PERPLEXITY_ENABLE_ASYNC_DEEP_RESEARCH` is true
- **WHEN** client calls `perplexity_deep_research` with query
- **THEN** system SHALL enqueue job to background queue
- **AND** return immediately (< 1 second) with conversation ID
- **AND** create conversation directory with initial status "pending"
- **AND** instruct client to use `get_conversation_history` to poll for results

#### Scenario: Reasoning effort levels
- **WHEN** client specifies `reasoning_effort` parameter
- **THEN** system SHALL support values: `low`, `medium`, `high`
- **AND** default to `medium` if not specified
- **AND** pass reasoning_effort to Perplexity API
- **AND** higher effort increases research depth and cost

### Requirement: Asynchronous Job Queuing

When async mode is enabled, the system SHALL queue deep research jobs for background processing.

#### Scenario: Job enqueuing
- **GIVEN** async mode enabled
- **WHEN** deep research query received
- **THEN** system SHALL create conversation directory immediately
- **AND** write initial conversation.json with user query
- **AND** write status.json with status "pending"
- **AND** write job.json with job parameters and priority
- **AND** return conversation ID to client within 1 second

#### Scenario: Job priority assignment
- **WHEN** enqueueing job
- **THEN** system SHALL assign priority (default: 0)
- **AND** higher priority jobs SHALL be processed first
- **AND** jobs with same priority SHALL be processed FIFO

### Requirement: Conversation Creation and Persistence

The system SHALL create persistent conversation data for each deep research query.

#### Scenario: Initial conversation creation
- **WHEN** deep research query initiated
- **THEN** system SHALL generate unique conversation ID
- **AND** create directory `conversation-logs/{conversationId}/`
- **AND** write `conversation.json` with user query
- **AND** write `status.json` with initial status
- **AND** include creation timestamp and model information

#### Scenario: Conversation completion
- **WHEN** deep research completes successfully
- **THEN** system SHALL append assistant response to conversation.json
- **AND** update status.json to "completed"
- **AND** set completedAt timestamp
- **AND** remove job.json file

### Requirement: Comprehensive Report Generation

The system SHALL generate detailed research reports with proper formatting and citations.

#### Scenario: Report structure
- **WHEN** deep research completes
- **THEN** assistant response SHALL include executive summary
- **AND** multiple sections with detailed analysis
- **AND** proper markdown formatting with headings
- **AND** inline citations to sources
- **AND** minimum 5000 words for high effort research

#### Scenario: Citation handling
- **GIVEN** research includes web sources
- **THEN** system SHALL include citation numbers in text [1][2]
- **AND** provide source URLs where available
- **AND** attribute information to credible sources

### Requirement: Error Handling in Deep Research

The system SHALL handle errors during deep research with appropriate retry logic and user feedback.

#### Scenario: API error in blocking mode
- **GIVEN** blocking mode
- **WHEN** Perplexity API returns error
- **THEN** system SHALL return error immediately to client
- **AND** NOT create conversation file
- **AND** log error with full context

#### Scenario: API error in async mode
- **GIVEN** async mode
- **WHEN** background worker encounters API error
- **THEN** system SHALL update status.json to "failed"
- **AND** include error message and code
- **AND** increment attempts counter
- **AND** retry job if attempts < max retries
- **AND** mark as permanently failed if max retries exceeded

### Requirement: Timeout Management

The system SHALL configure appropriate timeouts for deep research operations.

#### Scenario: Timeout configuration
- **GIVEN** deep research query
- **THEN** system SHALL use `PERPLEXITY_POLLING_TIMEOUT_MS` for timeout
- **AND** default timeout SHALL be 600000ms (10 minutes)
- **AND** log warning if query approaches timeout
- **AND** abort and retry if timeout exceeded (in async mode)

#### Scenario: Client timeout guidance
- **WHEN** tool registration occurs
- **THEN** tool description SHALL include recommended timeout of 180+ seconds
- **AND** warn that shorter timeouts may cause failures

### Requirement: Cost Management

The system SHALL provide cost visibility for deep research queries.

#### Scenario: Cost estimation
- **WHEN** deep research completes
- **THEN** system SHALL calculate total token usage
- **AND** estimate cost based on deep research model pricing ($5 per 1M tokens)
- **AND** include cost in response or conversation metadata
- **AND** log cost for monitoring purposes

#### Scenario: Cost warnings
- **WHEN** query likely to exceed $1 in cost
- **THEN** system SHOULD log warning
- **AND** include cost estimate in response

### Requirement: Security Disclaimer (Optional)

When `PERPLEXITY_ENABLE_SECURITY_DISCLAIMER` is enabled, the system SHALL display security warnings.

#### Scenario: Security disclaimer enabled
- **GIVEN** `PERPLEXITY_ENABLE_SECURITY_DISCLAIMER` environment variable is "true"
- **WHEN** tool is displayed to user
- **THEN** system SHALL include disclaimer in tool description
- **AND** emphasize importance for deep research due to long processing time
- **AND** warn against including sensitive information

