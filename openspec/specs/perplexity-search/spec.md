# Perplexity Search Tool

## Purpose

The perplexity_search tool provides fast, search-augmented query capabilities using Perplexity's AI models. It enables AI agents to perform real-time web searches with answer synthesis, supporting recency filtering, domain filtering, and academic source prioritization.

## Requirements

### Requirement: Search Query Execution

The system SHALL execute search-augmented queries using the Perplexity Chat Completions API with configurable search parameters.

#### Scenario: Basic search query
- **WHEN** a client calls `perplexity_search` with a query
- **THEN** the system SHALL send the query to Perplexity API with `model: "sonar"`
- **AND** return the assistant's response with citations
- **AND** include conversation ID for follow-up queries
- **AND** include token usage and estimated cost

#### Scenario: Search with recency filter
- **WHEN** client specifies `search_recency_filter`
- **THEN** system SHALL include recency filter in API request
- **AND** support values: `day`, `week`, `month`, `year`

#### Scenario: Academic search mode
- **WHEN** client specifies `search_mode: "academic"`
- **THEN** system SHALL prioritize scholarly sources in results
- **AND** include academic citations where available

#### Scenario: Domain filtering
- **WHEN** client provides `search_domain_filter` array
- **THEN** system SHALL restrict search to specified domains
- **AND** validate domain format before API call

### Requirement: Conversation Management

The system SHALL create and persist conversation data for each search query.

#### Scenario: First query creates conversation
- **WHEN** search query is executed
- **THEN** system SHALL generate unique conversation ID with format `YYYYMMDD-timestamp`
- **AND** create conversation directory at `conversation-logs/{conversationId}/`
- **AND** write `conversation.json` with user query and assistant response
- **AND** return conversation ID to client

#### Scenario: Conversation data structure
- **GIVEN** a completed search
- **THEN** `conversation.json` SHALL contain array of message objects
- **AND** each message SHALL have `role` ("user" | "assistant") and `content`
- **AND** assistant message SHALL include response text with citations
- **AND** conversation SHALL include metadata (createdAt, updatedAt, model)

### Requirement: Input Validation and Sanitization

The system SHALL validate and sanitize all input parameters before processing.

#### Scenario: Query validation
- **WHEN** client provides query parameter
- **THEN** system SHALL validate query is non-empty string
- **AND** sanitize query to remove HTML/script tags
- **AND** reject queries exceeding 10000 characters
- **AND** return validation error if query invalid

#### Scenario: Search parameter validation
- **WHEN** client provides optional search parameters
- **THEN** system SHALL validate `search_recency_filter` is one of allowed values
- **AND** validate `search_mode` is "web" or "academic"  
- **AND** validate `search_domain_filter` is array of valid domains
- **AND** validate date filters are in MM/DD/YYYY format if provided

### Requirement: Error Handling

The system SHALL handle errors gracefully and provide actionable error messages.

#### Scenario: API error handling
- **WHEN** Perplexity API returns error
- **THEN** system SHALL catch error and wrap in `McpError`
- **AND** log error with request context
- **AND** return user-friendly error message
- **AND** include original error code if available

#### Scenario: Timeout handling
- **WHEN** API request exceeds 30 second timeout
- **THEN** system SHALL abort request
- **AND** return timeout error to client
- **AND** NOT create conversation file for failed request

#### Scenario: Invalid API key
- **WHEN** API returns 401 Unauthorized
- **THEN** system SHALL return error indicating API key issue
- **AND** suggest checking `PERPLEXITY_API_KEY` environment variable

### Requirement: Cost Tracking

The system SHALL calculate and return cost estimates for each query.

#### Scenario: Cost calculation
- **GIVEN** a completed search query
- **THEN** system SHALL count prompt and completion tokens
- **AND** calculate cost using current model pricing
- **AND** include estimated cost in response
- **AND** log token usage for monitoring

### Requirement: Security Disclaimer (Optional)

When `PERPLEXITY_ENABLE_SECURITY_DISCLAIMER` is enabled, the system SHALL display security warnings.

#### Scenario: Security disclaimer enabled
- **GIVEN** `PERPLEXITY_ENABLE_SECURITY_DISCLAIMER` environment variable is "true"
- **WHEN** tool is displayed to user
- **THEN** system SHALL include disclaimer in tool description
- **AND** warn users to anonymize sensitive data
- **AND** prohibit including real API keys, tokens, passwords, URLs, or proprietary algorithms

#### Scenario: Security disclaimer disabled
- **GIVEN** `PERPLEXITY_ENABLE_SECURITY_DISCLAIMER` is not set or "false"
- **THEN** system SHALL NOT display security disclaimer

