# Conversation Persistence Service

## Purpose

The conversation persistence service manages file-based storage of conversation data, including messages, status, and job information. It provides methods for creating, reading, and updating conversations with atomic file operations.

## Requirements

### Requirement: Conversation Directory Structure

The system SHALL organize conversations in a standard directory structure.

#### Scenario: Directory creation
- **WHEN** conversation is created
- **THEN** system SHALL create directory `conversation-logs/{conversationId}/`
- **AND** conversationId SHALL use format `YYYYMMDD-timestamp`
- **AND** directory SHALL be writable

### Requirement: Conversation File Management

The system SHALL manage conversation.json, status.json, and job.json files.

#### Scenario: Conversation file creation
- **WHEN** `createConversationWithStatus()` is called
- **THEN** system SHALL write `conversation.json` with initial messages
- **AND** write `status.json` with initial status
- **AND** write `job.json` if job data provided
- **AND** return conversation ID

#### Scenario: Message appending
- **WHEN** `appendMessage()` is called
- **THEN** system SHALL read existing conversation.json
- **AND** append new message to messages array
- **AND** update updatedAt timestamp
- **AND** write back atomically

### Requirement: Status File Updates

The system SHALL provide atomic status file updates.

#### Scenario: Status update
- **WHEN** `updateConversationStatus()` is called
- **THEN** system SHALL write to temp file
- **AND** atomically rename to status.json using `renameSync()`
- **AND** preserve all status fields

### Requirement: Conversation Retrieval

The system SHALL provide methods to retrieve conversation data.

#### Scenario: Get conversation
- **WHEN** `getConversation()` is called with conversation ID
- **THEN** system SHALL read conversation.json
- **AND** parse and validate JSON structure
- **AND** return conversation data or null if not found

#### Scenario: Get conversation status
- **WHEN** `getConversationStatus()` is called
- **THEN** system SHALL read status.json
- **AND** parse status data
- **AND** return status or null if not found

### Requirement: Error Handling

The system SHALL handle file system errors gracefully.

#### Scenario: File not found
- **WHEN** reading non-existent conversation
- **THEN** system SHALL return null
- **AND** NOT throw error

#### Scenario: Invalid JSON
- **WHEN** conversation file contains invalid JSON
- **THEN** system SHALL log error
- **AND** return null or throw McpError

