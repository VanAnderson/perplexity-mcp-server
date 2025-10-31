# Conversation History Tool

## Purpose

The get_conversation_history tool retrieves conversation messages and status for a given conversation ID. It supports checking status of async jobs and displaying progress, errors, and completion information.

## Requirements

### Requirement: Conversation Retrieval

The system SHALL retrieve and format conversation history.

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

### Requirement: Job Status Integration

The system SHALL check for and display job status information.

#### Scenario: Pending job status
- **WHEN** conversation has status "pending"
- **THEN** response SHALL include status message: "Job Status: Pending"
- **AND** indicate job is queued and waiting to start
- **AND** show retry attempt if attempts > 0
- **AND** instruct client to check back soon

#### Scenario: In-progress job status
- **WHEN** conversation has status "in_progress"
- **THEN** response SHALL include status message: "Job Status: In Progress"
- **AND** show progress percentage and message
- **AND** show elapsed time in minutes
- **AND** show current attempt number if retrying

#### Scenario: Completed job status
- **WHEN** conversation has status "completed"
- **THEN** response SHALL include status message: "Job Status: Completed"
- **AND** indicate full research report is available
- **AND** show conversation messages below

#### Scenario: Failed job status
- **WHEN** conversation has status "failed"
- **THEN** response SHALL include status message: "Job Status: Failed"
- **AND** show error code and message
- **AND** show number of attempts made
- **AND** display error history if multiple failures occurred
- **AND** suggest reviewing error details

### Requirement: Message Formatting

The system SHALL format conversation messages for readability.

#### Scenario: Message display
- **GIVEN** conversation with messages
- **THEN** system SHALL format each message with role indicator (👤 User / 🤖 Assistant)
- **AND** show message content with preserved formatting
- **AND** separate messages with dividers

