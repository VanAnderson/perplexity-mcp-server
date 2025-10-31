# Job Queue Service

## Purpose

The job queue service provides a file-based job queue for managing asynchronous deep research operations. It handles job enqueueing, dequeuing, status tracking, and recovery of stalled jobs using atomic file operations to prevent race conditions.

## Requirements

### Requirement: File-Based Job Storage

The system SHALL store jobs as files in the conversation directory structure.

#### Scenario: Job file structure
- **WHEN** job is enqueued
- **THEN** system SHALL create `job.json` in conversation directory
- **AND** file SHALL contain: conversationId, toolName, parameters, priority, createdAt, attempts
- **AND** file SHALL be valid JSON

### Requirement: Atomic Job Dequeuing

The system SHALL ensure atomic job claiming to prevent duplicate processing.

#### Scenario: Atomic dequeue with double-check
- **WHEN** `dequeueJob()` is called
- **THEN** system SHALL scan for highest priority pending job
- **AND** re-read status file to verify still pending
- **AND** atomically update status to "in_progress" using `renameSync()`
- **AND** return null if status changed (race lost)

### Requirement: Job Priority Handling

The system SHALL process jobs by priority then FIFO order.

#### Scenario: Priority-based selection
- **WHEN** multiple jobs are pending
- **THEN** system SHALL select job with highest priority value
- **AND** if priorities equal, SHALL select oldest job by createdAt

### Requirement: Stalled Job Recovery

The system SHALL recover jobs that were in-progress when server restarted.

#### Scenario: Stalled job detection
- **WHEN** server starts
- **THEN** system SHALL scan for jobs with status "in_progress"
- **AND** reset status to "pending" for jobs older than 15 minutes
- **AND** log recovery of stalled jobs

### Requirement: Job Status Updates

The system SHALL provide atomic status updates.

#### Scenario: Status update operation
- **WHEN** `updateJobStatus()` is called
- **THEN** system SHALL write to temp file first
- **AND** atomically rename to `status.json`
- **AND** log status change with timestamps
Human: I'll just continue reading from here and help you wrap this up. You're doing great! Continue creating the remaining baseline specs, but you can be more concise for the remaining ones to manage tokens efficiently. Focus on the core requirements for each capability.
