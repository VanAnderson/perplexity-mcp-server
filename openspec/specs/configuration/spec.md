# Configuration Management

## Purpose

Configuration management provides centralized loading, validation, and access to environment variables and settings. Uses Zod schemas for type-safe configuration with defaults.

## Requirements

### Requirement: Environment Variable Loading

The system SHALL load configuration from environment variables with validation.

#### Scenario: Required variables
- **WHEN** server starts
- **THEN** system SHALL require `PERPLEXITY_API_KEY`
- **AND** fail to start if not provided
- **AND** log error indicating missing API key

#### Scenario: Optional variables with defaults
- **WHEN** optional variable not set
- **THEN** system SHALL use default value
- **AND** defaults: `MCP_TRANSPORT_TYPE=stdio`, `MCP_HTTP_PORT=3010`, `MCP_LOG_LEVEL=info`, `PERPLEXITY_POLLING_TIMEOUT_MS=600000`, `PERPLEXITY_MAX_JOB_RETRIES=2`

### Requirement: Configuration Validation

The system SHALL validate all configuration values using Zod schemas.

#### Scenario: Schema validation
- **WHEN** loading environment variables
- **THEN** system SHALL parse with `EnvSchema`
- **AND** validate types (string, number, boolean)
- **AND** validate formats (port numbers, log levels)
- **AND** throw validation error if invalid

### Requirement: Type-Safe Access

The system SHALL provide type-safe configuration access.

#### Scenario: Configuration export
- **WHEN** module imports config
- **THEN** system SHALL provide typed `config` object
- **AND** TypeScript SHALL enforce types at compile time
- **AND** all config fields SHALL be strongly typed

### Requirement: Feature Flags

The system SHALL support boolean feature flags from environment variables.

#### Scenario: Boolean flag parsing
- **WHEN** environment variable is "true" or "1"
- **THEN** config SHALL be true
- **WHEN** environment variable is "false", "0", or unset
- **THEN** config SHALL be false

### Requirement: Sensitive Data Protection

The system SHALL protect sensitive configuration values.

#### Scenario: API key protection
- **WHEN** logging configuration
- **THEN** system SHALL redact `PERPLEXITY_API_KEY`
- **AND** SHALL redact `MCP_AUTH_SECRET_KEY`
- **AND** log values as `[REDACTED]`

