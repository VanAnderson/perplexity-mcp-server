# Background Worker Service

## Purpose

The background worker service processes queued deep research jobs asynchronously. It continuously polls the job queue, executes jobs, updates status, handles errors, and implements retry logic.

## Requirements

### Requirement: Worker Lifecycle Management

The system SHALL start and stop worker based on async mode configuration.

#### Scenario: Worker startup
- **GIVEN** `PERPLEXITY_ENABLE_ASYNC_DEEP_RESEARCH` is true
- **WHEN** server starts
- **THEN** system SHALL call `startWorker()`
- **AND** begin processing loop
- **AND** log "Background worker started"

#### Scenario: Worker shutdown
- **WHEN** server receives shutdown signal
- **THEN** system SHALL stop worker gracefully
- **AND** complete current job before stopping
- **AND** log "Background worker stopped"

### Requirement: Job Processing Loop

The system SHALL continuously poll for and process jobs.

#### Scenario: Processing cycle
- **WHEN** worker is running
- **THEN** system SHALL call `dequeueJob()` every 1 second
- **AND** if job found, execute job immediately
- **AND** if no job, wait and retry
- **AND** continue loop until stopped

### Requirement: Deep Research Job Execution

The system SHALL execute deep research jobs and stream results.

#### Scenario: Job execution
- **WHEN** worker processes deep research job
- **THEN** system SHALL update status to "in_progress"
- **AND** call Perplexity API with job parameters
- **AND** update progress during execution
- **AND** append results to conversation.json
- **AND** update status to "completed" on success

### Requirement: Error Handling and Retry

The system SHALL handle errors and retry failed jobs.

#### Scenario: Retry on failure
- **WHEN** job execution fails
- **THEN** system SHALL check attempts against `PERPLEXITY_MAX_JOB_RETRIES`
- **AND** if attempts < max, mark for retry (status = "pending")
- **AND** if attempts >= max, mark as "failed" permanently
- **AND** append error to errorHistory

### Requirement: Concurrent Job Support

The system SHALL handle multiple jobs without interference.

#### Scenario: Job isolation
- **WHEN** processing multiple jobs
- **THEN** each job SHALL have independent status tracking
- **AND** conversation files SHALL be isolated by conversation ID
- **AND** errors in one job SHALL NOT affect others

