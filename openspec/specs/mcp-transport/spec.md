# MCP Transport Layer

## Purpose

The MCP transport layer provides communication mechanisms between clients and the MCP server, supporting both stdio (standard input/output) and HTTP transports with authentication and error handling.

## Requirements

### Requirement: Transport Selection

The system SHALL support configurable transport selection via environment variable.

#### Scenario: Stdio transport (default)
- **GIVEN** `MCP_TRANSPORT_TYPE` is unset or "stdio"
- **WHEN** server starts
- **THEN** system SHALL use stdio transport
- **AND** communicate via stdin/stdout
- **AND** suitable for direct process communication

#### Scenario: HTTP transport
- **GIVEN** `MCP_TRANSPORT_TYPE` is "http"
- **WHEN** server starts
- **THEN** system SHALL use HTTP transport
- **AND** start Hono HTTP server
- **AND** listen on configured port and host

### Requirement: Stdio Transport

The system SHALL implement stdio transport using MCP SDK.

#### Scenario: Stdio communication
- **WHEN** using stdio transport
- **THEN** system SHALL read JSON-RPC requests from stdin
- **AND** write JSON-RPC responses to stdout
- **AND** NOT require authentication
- **AND** suitable for single-user local execution

### Requirement: HTTP Transport

The system SHALL implement HTTP transport with Hono framework.

#### Scenario: HTTP server setup
- **WHEN** using HTTP transport
- **THEN** system SHALL start Hono server on `MCP_HTTP_HOST:MCP_HTTP_PORT`
- **AND** register MCP routes
- **AND** enable CORS with configured origins
- **AND** require authentication (JWT or OAuth)

#### Scenario: HTTP endpoint
- **WHEN** client sends HTTP request to MCP endpoint
- **THEN** system SHALL validate authentication
- **AND** parse MCP request from body
- **AND** execute requested tool
- **AND** return MCP response as JSON

### Requirement: Authentication

The system SHALL require authentication for HTTP transport.

#### Scenario: JWT authentication
- **GIVEN** `MCP_AUTH_MODE` is "jwt"
- **WHEN** HTTP request received
- **THEN** system SHALL validate JWT token in Authorization header
- **AND** verify signature using `MCP_AUTH_SECRET_KEY`
- **AND** reject if token invalid or expired

#### Scenario: OAuth authentication
- **GIVEN** `MCP_AUTH_MODE` is "oauth"
- **WHEN** HTTP request received
- **THEN** system SHALL validate OAuth token
- **AND** verify with OAuth provider
- **AND** reject if token invalid

### Requirement: Error Handling

The system SHALL handle transport errors gracefully.

#### Scenario: HTTP error response
- **WHEN** tool execution fails in HTTP mode
- **THEN** system SHALL return appropriate HTTP status code
- **AND** return error details in response body
- **AND** log error with request context

#### Scenario: Stdio error handling
- **WHEN** tool execution fails in stdio mode
- **THEN** system SHALL return JSON-RPC error response
- **AND** include error code and message
- **AND** log error for debugging

### Requirement: CORS Support

The system SHALL support CORS for HTTP transport.

#### Scenario: CORS configuration
- **WHEN** HTTP server starts
- **THEN** system SHALL enable CORS middleware
- **AND** allow configured origins
- **AND** support preflight requests
- **AND** include appropriate CORS headers in responses

