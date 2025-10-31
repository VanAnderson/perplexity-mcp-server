# Project Context

## Purpose

Perplexity MCP Server provides a Model Context Protocol (MCP) server implementation that enables AI agents and LLMs to access Perplexity AI's search-augmented generation and deep research capabilities through a standardized, secure interface.

### Goals
- Provide fast, search-augmented query capabilities via Perplexity API
- Enable exhaustive, multi-source deep research for complex topics
- Support asynchronous, non-blocking operations for long-running research
- Maintain conversation history with persistent file-based storage
- Ensure production-ready reliability with retry logic, error handling, and atomic operations
- Support both stdio and HTTP transports for maximum flexibility

## Tech Stack

### Core Technologies
- **TypeScript 5.8+** - Primary language with strict typing
- **Node.js 18+** - Runtime environment
- **@modelcontextprotocol/sdk 1.16+** - MCP protocol implementation
- **Zod 3.25+** - Schema validation and type safety

### API & HTTP
- **Hono 4.8+** - High-performance HTTP framework
- **Axios 1.10+** - HTTP client for Perplexity API calls
- **Jose 6.0+** - JWT authentication

### Utilities
- **Winston 3.17+** - Structured logging with file rotation
- **Dotenv 16.4+** - Environment variable management
- **Tiktoken 1.0+** - Token counting for cost tracking
- **Sanitize-html 2.17+** - Input sanitization

### Testing
- **Jest 30.2+** - Test framework
- **Nock 14.0+** - HTTP mocking
- **195 unit tests** covering all critical functionality

## Project Conventions

### Code Style
- **File naming**: kebab-case for files (`my-service.ts`), PascalCase for classes
- **Variable naming**: camelCase for variables/functions, UPPER_CASE for constants
- **Type safety**: All code must be fully typed with no `any` (except when necessary with strict justification)
- **Error handling**: Use `McpError` for all user-facing errors, wrap API errors appropriately
- **Async patterns**: Use `async/await`, avoid callbacks
- **Imports**: Use `.js` extensions in imports even for TypeScript files (ES modules)

### Architecture Patterns
- **Modular structure**: Each capability is a separate directory under `src/mcp-server/tools/`
- **Service layer**: All external integrations go through `src/services/`
- **Utilities**: Shared utilities in `src/utils/` (organized by concern: internal, metrics, security, etc.)
- **Configuration**: Single source of truth in `src/config/index.ts` with Zod validation
- **Request context**: Use `AsyncLocalStorage` for tracking request IDs throughout call chains
- **File-based persistence**: All conversation data stored in `conversation-logs/{conversationId}/`

### Testing Strategy
- **Unit tests**: Located in `tests/unit/`, mirror source directory structure
- **Test coverage**: Aim for >80% coverage on critical paths
- **Mocking**: Use `jest.mock()` for external dependencies, `nock` for HTTP
- **Fixtures**: Shared test data in `tests/fixtures/`
- **Test isolation**: Each test must be independent, use `beforeEach`/`afterEach` for cleanup

### Git Workflow
- **Branch naming**: `{username}/{feature-or-fix-description}` (e.g., `VanAnderson/add-retry-logic`)
- **Commits**: Conventional commits style (feat:, fix:, docs:, etc.)
- **PRs**: All changes via PR, require passing tests
- **Main branch**: Always production-ready, protected

## Domain Context

### Perplexity AI Integration
- **Search models**: `sonar`, `sonar-pro`, `sonar-reasoning` for fast queries
- **Deep research model**: `sonar-deep-research` for exhaustive multi-source analysis
- **Reasoning effort levels**: `low`, `medium`, `high` control research depth vs. cost
- **API constraints**: Deep research can take 60-180 seconds, requires timeout handling

### MCP (Model Context Protocol)
- **Tools**: Exposed capabilities that AI agents can invoke
- **Transports**: stdio (default) for direct process comm, HTTP for network access
- **Request/Response**: Structured JSON with Zod schema validation
- **Error reporting**: Standardized error codes and messages

### Conversation Model
- **Conversation ID**: Timestamp-based unique identifier (format: `YYYYMMDD-timestamp`)
- **Message structure**: `{ role: 'user' | 'assistant' | 'system', content: string }`
- **Persistence**: Each conversation is a directory with `conversation.json`, `status.json`, `job.json`
- **Context management**: Clients instructed to preserve conversation IDs for continuity

## Important Constraints

### Technical Constraints
- **Atomic operations**: File operations must use `renameSync()` for atomicity (prevents race conditions)
- **Job queue**: File-based (no external DB), designed for single-machine deployment
- **Background worker**: Single worker instance per server (concurrent job processing within worker)
- **Timeout handling**: Deep research requires 180+ second timeouts in clients
- **Token limits**: Perplexity API has context length limits, track conversation length

### Performance Constraints
- **API rate limits**: Respect Perplexity API rate limits (handled by their infrastructure)
- **Cost management**: Deep research is expensive ($5 per 1M tokens), track usage
- **File I/O**: All persistence is file-based, optimize for minimal reads/writes

### Security Constraints
- **API key protection**: Never log or expose `PERPLEXITY_API_KEY`
- **Input sanitization**: All user inputs sanitized before API calls
- **Authentication**: HTTP mode requires JWT or OAuth 2.1
- **CORS**: HTTP server enforces origin restrictions

## External Dependencies

### Required Services
- **Perplexity API** (`https://api.perplexity.ai`) - Core search and research functionality
  - Authentication: Bearer token (API key)
  - Rate limiting: Handled by Perplexity
  - Pricing: Variable by model and token usage

### Optional Services (HTTP mode only)
- **OAuth provider** - If using OAuth 2.1 authentication
  - JWKS endpoint for key validation
  - Token introspection

### File System Dependencies
- **conversation-logs/** - Persistent conversation storage (must be writable)
- **logs/** - Application logs with rotation (optional, can disable)

## Development Workflow

### Local Development
1. Copy `.env.example` to `.env` and set `PERPLEXITY_API_KEY`
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile TypeScript
4. Run `npm start` to start server (stdio mode by default)

### Testing Workflow
1. Run `npm test` for all tests
2. Run `npm run test:unit` for unit tests only
3. Run `npm run test:coverage` for coverage report
4. All tests must pass before committing

### Deployment
- **Build**: `npm run build` generates `dist/` directory
- **Start**: `node dist/index.js` (reads `.env` or env vars)
- **Logs**: Written to `logs/` directory with rotation
- **Monitoring**: Check `logs/error.log` and `logs/combined.log`
