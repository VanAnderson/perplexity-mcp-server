## ADDED Requirements

### Requirement: Batch Job Status Monitoring

The system SHALL support monitoring status of multiple async jobs simultaneously through batch retrieval tools.

#### Scenario: Monitor multiple pending jobs
- **WHEN** multiple async deep research jobs are queued
- **THEN** client can retrieve status of all jobs via get_conversation_histories
- **AND** each job status SHALL be independently reported
- **AND** progress information SHALL be included for in_progress jobs
- **AND** client can poll batch status efficiently without separate calls

#### Scenario: Wait for multiple jobs completion
- **WHEN** client needs all jobs to complete before proceeding
- **THEN** client can use await_conversation_histories tool
- **AND** tool SHALL wait until all jobs reach terminal state (completed/failed)
- **AND** return all conversation data in single response
- **AND** handle timeout gracefully with retry instructions

### Requirement: Batch Retry Status Visibility

The system SHALL expose retry information for all jobs in batch responses.

#### Scenario: Batch response includes retry details
- **WHEN** batch retrieval includes jobs that have been retried
- **THEN** each job result SHALL include attempts count
- **AND** error history SHALL be available if job encountered errors
- **AND** current retry status SHALL be indicated in progress information
- **AND** clients can see retry progression across multiple jobs

