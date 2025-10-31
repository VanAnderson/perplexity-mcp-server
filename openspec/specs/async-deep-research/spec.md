# Asynchronous Deep Research

## Purpose

The async deep research capability enables non-blocking execution of long-running deep research queries. When enabled via `PERPLEXITY_ENABLE_ASYNC_DEEP_RESEARCH`, deep research queries are queued and processed by a background worker, allowing clients to continue other work while research completes.

## Requirements

### Requirement: Async Mode Configuration

The system SHALL support toggling async mode via environment variable.

#### Scenario: Async mode enabled
- **GIVEN** `PERPLEXITY_ENABLE_ASYNC_DEEP_RESEARCH` is set to "true" or "1"
- **WHEN** server starts
- **THEN** system SHALL enable async mode for deep research
- **AND** start background worker service
- **AND** log "Async deep research: enabled"

#### Scenario: Async mode disabled
- **GIVEN** `PERPLEXITY_ENABLE_ASYNC_DEEP_RESEARCH` is not set or set to "false"
- **WHEN** server starts
- **THEN** system SHALL use blocking mode for deep research
- **AND** NOT start background worker
- **AND** log "Async deep research: disabled"

### Requirement: Immediate Response on Query Submission

When async mode is enabled, the system SHALL return immediately upon query submission.

#### Scenario: Query submission response
- **GIVEN** async mode enabled
- **WHEN** client submits deep research query
- **THEN** system SHALL return response within 1 second
- **AND** response SHALL include conversation ID
- **AND** response SHALL include polling instructions
- **AND** response SHALL reference `get_conversation_history` tool

#### Scenario: Response message format
- **WHEN** async query submitted
- **THEN** response SHALL include formatted message:
  ```
  🆕 **New Conversation Started**
  Conversation ID: `{conversationId}`
  Deep research query has been queued for background processing.
  
  **To check status and retrieve results:**
  Use the `get_conversation_history` tool with this conversation ID.
  The system will process your query in the background and stream results as they become available.
  ```

### Requirement: Status Tracking Throughout Lifecycle

The system SHALL maintain accurate status information throughout job lifecycle.

#### Scenario: Status progression
- **WHEN** job is enqueued
- **THEN** status SHALL be "pending"
- **WHEN** worker picks up job
- **THEN** status SHALL change to "in_progress"
- **WHEN** job completes successfully
- **THEN** status SHALL change to "completed"
- **WHEN** job fails after retries
- **THEN** status SHALL change to "failed"

#### Scenario: Status metadata
- **FOR** each status
- **THEN** status.json SHALL include:
  - conversationId
  - status (pending | in_progress | completed | failed)
  - toolName ("perplexity_deep_research")
  - startedAt (ISO 8601 timestamp)
  - updatedAt (ISO 8601 timestamp)
  - attempts (number of execution attempts)
  - completedAt (ISO 8601 timestamp, if completed/failed)
  - error (error details, if failed)
  - errorHistory (array of all errors encountered)
  - progress (progress information, if in_progress)

### Requirement: Progress Reporting

The system SHALL provide progress information for in-progress jobs.

#### Scenario: Progress updates
- **GIVEN** job is in progress
- **WHEN** client checks status via `get_conversation_history`
- **THEN** system SHALL return progress information including:
  - Percentage complete (estimated)
  - Progress message (e.g., "Querying Perplexity API...")
  - Elapsed time in milliseconds
  - Current attempt number (if retrying)

#### Scenario: Progress calculation
- **WHEN** job starts
- **THEN** progress SHALL be 25% with message "Querying Perplexity API..."
- **WHEN** streaming begins
- **THEN** progress SHALL be 50% with message "Processing response..."
- **WHEN** near completion
- **THEN** progress SHALL be 75-95% with message "Finalizing research report..."

### Requirement: Concurrent Job Processing

The system SHALL support processing multiple deep research jobs concurrently.

#### Scenario: Multiple jobs queued
- **GIVEN** multiple deep research queries submitted
- **WHEN** background worker is processing jobs
- **THEN** worker SHALL process jobs concurrently (up to worker capacity)
- **AND** each job SHALL have independent status tracking
- **AND** jobs SHALL NOT interfere with each other
- **AND** conversation files SHALL be isolated per conversation ID

#### Scenario: Job prioritization
- **GIVEN** multiple jobs pending
- **WHEN** worker dequeues next job
- **THEN** system SHALL select highest priority job first
- **AND** if priorities equal, SHALL select oldest job first (FIFO)

### Requirement: Retry Logic for Failed Jobs

The system SHALL retry failed jobs according to configured retry policy.

#### Scenario: Retry configuration
- **GIVEN** `PERPLEXITY_MAX_JOB_RETRIES` is set to N
- **WHEN** job fails
- **THEN** system SHALL retry up to N times
- **AND** default retry count SHALL be 2 (3 total attempts)

#### Scenario: Retry execution
- **WHEN** job fails with error
- **THEN** system SHALL append error to errorHistory
- **AND** increment attempts counter
- **AND** set status back to "pending" if attempts < max retries
- **AND** set status to "failed" if attempts >= max retries
- **AND** log retry attempt with error details

#### Scenario: Retry status message
- **WHEN** client checks status of retrying job
- **THEN** status message SHALL indicate "Retry Attempt: {attempts + 1}"
- **AND** show previous errors in error history section

### Requirement: Race Condition Prevention

The system SHALL prevent duplicate processing of jobs through atomic operations.

#### Scenario: Atomic job claiming
- **GIVEN** multiple worker instances or concurrent dequeue calls
- **WHEN** workers attempt to dequeue same job
- **THEN** only one worker SHALL successfully claim job
- **AND** other workers SHALL receive null (no job)
- **AND** system SHALL use file renaming for atomicity

#### Scenario: Double-check pattern
- **WHEN** worker selects job to process
- **THEN** worker SHALL re-read status file before claiming
- **AND** verify status is still "pending"
- **AND** atomically update status to "in_progress"
- **AND** return null if status changed (another worker claimed it)

### Requirement: Follow-up Query Blocking

The system SHALL prevent follow-up queries on conversations with in-progress deep research jobs.

#### Scenario: Blocked follow-up on pending job
- **GIVEN** conversation has job with status "pending" or "in_progress"
- **WHEN** client attempts `perplexity_search_followup` or `perplexity_deep_research_followup`
- **THEN** system SHALL reject follow-up with error message
- **AND** error SHALL indicate job is still processing
- **AND** error SHALL instruct client to wait for completion

#### Scenario: Allowed follow-up after completion
- **GIVEN** conversation has job with status "completed"
- **WHEN** client attempts follow-up query
- **THEN** system SHALL allow follow-up to proceed normally

### Requirement: Async Follow-up Queries

When async mode is enabled, deep research follow-up queries SHALL also execute asynchronously.

#### Scenario: Async deep research followup
- **GIVEN** async mode enabled
- **WHEN** client calls `perplexity_deep_research_followup` on completed conversation
- **THEN** system SHALL enqueue new job for follow-up query
- **AND** return immediately with conversation ID
- **AND** follow same async pattern as initial query
- **AND** append follow-up results to existing conversation when complete

### Requirement: Resource Cleanup

The system SHALL clean up completed and failed jobs appropriately.

#### Scenario: Job file removal on completion
- **WHEN** job completes successfully
- **THEN** system SHALL remove job.json file
- **AND** keep conversation.json and status.json for history

#### Scenario: Failed job cleanup
- **WHEN** job fails permanently (max retries exceeded)
- **THEN** system SHALL remove job.json file
- **AND** keep conversation.json and status.json with error details
- **AND** log permanent failure

### Requirement: Monitoring and Observability

The system SHALL provide comprehensive logging for async operations.

#### Scenario: Job lifecycle logging
- **WHEN** job is enqueued
- **THEN** system SHALL log "Job enqueued" with conversation ID and tool name
- **WHEN** job is dequeued
- **THEN** system SHALL log "Job dequeued" with conversation ID and priority
- **WHEN** job completes
- **THEN** system SHALL log "Job completed" with conversation ID and duration
- **WHEN** job fails
- **THEN** system SHALL log "Job failed" with error details

#### Scenario: Performance metrics
- **FOR** each completed job
- **THEN** system SHALL log execution duration
- **AND** log token usage and cost
- **AND** log retry count if applicable

