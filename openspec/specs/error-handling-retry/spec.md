# Error Handling and Retry Logic

## Purpose

Error handling and retry logic provides centralized error processing, standardized error types, retry mechanisms for transient failures, and comprehensive error logging.

## Requirements

### Requirement: Standardized Error Types

The system SHALL use `McpError` for all user-facing errors.

#### Scenario: McpError structure
- **WHEN** creating user-facing error
- **THEN** system SHALL use `McpError` class
- **AND** include error code, message, and optional details
- **AND** error codes: `ValidationError`, `ApiError`, `NotFoundError`, `TimeoutError`, `InternalError`

### Requirement: Error Wrapping

The system SHALL wrap external API errors appropriately.

#### Scenario: API error wrapping
- **WHEN** Perplexity API returns error
- **THEN** system SHALL catch error
- **AND** extract error message and status code
- **AND** wrap in McpError with appropriate code
- **AND** include original error in details for logging

### Requirement: Retry Configuration

The system SHALL support configurable retry logic.

#### Scenario: Retry policy
- **GIVEN** `PERPLEXITY_MAX_JOB_RETRIES` is set
- **WHEN** job fails
- **THEN** system SHALL retry up to configured maximum
- **AND** default SHALL be 2 retries (3 total attempts)
- **AND** increment attempts counter on each try

### Requirement: Error History Tracking

The system SHALL maintain history of errors for retried jobs.

#### Scenario: Error history
- **WHEN** job fails and is retried
- **THEN** system SHALL append error to `errorHistory` array
- **AND** each entry SHALL include error code, message, timestamp
- **AND** preserve all errors for debugging

### Requirement: Transient vs Permanent Failure Distinction

The system SHALL distinguish between retryable and permanent failures.

#### Scenario: Retryable errors
- **WHEN** error is network timeout, rate limit, or server error (5xx)
- **THEN** system SHALL mark for retry if attempts remaining
- **AND** set status to "pending" for re-processing

#### Scenario: Permanent errors
- **WHEN** error is validation, authentication (401), or client error (4xx)
- **THEN** system SHALL mark as "failed" immediately
- **AND** NOT retry regardless of retry config

### Requirement: Error Logging

The system SHALL log errors with full context.

#### Scenario: Error logging
- **WHEN** error occurs
- **THEN** system SHALL log at ERROR level
- **AND** include request context (requestId, conversationId)
- **AND** include stack trace for debugging
- **AND** include attempt number if retrying

