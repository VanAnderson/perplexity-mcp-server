# Memory Bank: Perplexity MCP Server

## Overview

**Perplexity MCP Server v1.2.1** - Production-ready MCP server providing AI agents access to Perplexity AI's search-augmented generation and deep research capabilities. Built on TypeScript with strict architectural patterns for reliability and maintainability.

**Problem Solved**: AI assistants lack access to current information beyond training data. This server bridges MCP-compatible clients to Perplexity AI API for real-time web search and multi-source research.

**Core Tools**:
- [`perplexity_search`](../../src/mcp-server/tools/perplexitySearch/logic.ts) - Fast search with filtering (recency, domain, academic)
- [`perplexity_deep_research`](../../src/mcp-server/tools/perplexityDeepResearch/logic.ts) - Comprehensive multi-source investigation

---

## Critical Architectural Principles

### 1. The Logic Throws, The Handler Catches

**Immutable pattern - never deviate:**

**Logic Layer** ([`logic.ts`](../../src/mcp-server/tools/*/logic.ts)):
- Pure business logic
- MUST throw [`McpError`](../../src/types-global/errors.ts) on failures
- NEVER use `try...catch` for response formatting
- Self-contained, testable functions

**Handler Layer** ([`registration.ts`](../../src/mcp-server/tools/*/registration.ts)):
- Interfaces with MCP server
- MUST wrap all logic calls in `try...catch`
- Process errors with [`ErrorHandler`](../../src/utils/internal/errorHandler.ts)
- Format final `CallToolResult`

### 2. Structured Request Context

Every operation:
- Creates [`RequestContext`](../../src/utils/internal/requestContext.ts) via `requestContextService.createRequestContext()`
- Passes context through entire call stack
- Logs with [`logger`](../../src/utils/internal/logger.ts) including context
- Maintains unique `requestId` for end-to-end tracing

---

## System Architecture

### Layer Structure

```
src/index.ts (Entry Point)
    ↓
src/mcp-server/server.ts (MCP Server)
    ↓
src/mcp-server/transports/ (stdio | HTTP+auth)
    ↓
src/mcp-server/tools/*/registration.ts (Handler)
    ↓
src/mcp-server/tools/*/logic.ts (Business Logic)
    ↓
src/services/perplexityApi.ts (External API)
    ↓
src/utils/ (Error/Logging/Context/Security)
```

### Key Patterns

**Tool Development (3-file structure)**:
- [`index.ts`](../../src/mcp-server/tools/*/index.ts) - Barrel export
- [`logic.ts`](../../src/mcp-server/tools/*/logic.ts) - Zod schemas + business logic
- [`registration.ts`](../../src/mcp-server/tools/*/registration.ts) - MCP registration + error handling

**Schema-Driven Validation**:
- All I/O validated with [Zod schemas](https://zod.dev/)
- TypeScript types inferred from schemas
- Schema descriptions sent to LLM
- Runtime type safety guaranteed

**Error Strategy**:
- Centralized through [`ErrorHandler`](../../src/utils/internal/errorHandler.ts)
- Structured [`McpError`](../../src/types-global/errors.ts) with standardized codes
- Pattern matching for automatic classification
- Full context preservation

---

## Codebase Map

### Core Configuration
- [`src/config/index.ts`](../../src/config/index.ts) - Environment variables (Zod validated), project root detection, package.json integration

### MCP Server Core
- [`src/mcp-server/server.ts`](../../src/mcp-server/server.ts) - Server instantiation, capability registration, tool orchestration, transport initialization

### Transport Layer
- [`src/mcp-server/transports/stdioTransport.ts`](../../src/mcp-server/transports/stdioTransport.ts) - Default, local clients (Cline, Claude Desktop)
- [`src/mcp-server/transports/httpTransport.ts`](../../src/mcp-server/transports/httpTransport.ts) - HTTP with [Hono](https://hono.dev/), sessions, CORS
- [`src/mcp-server/transports/auth/`](../../src/mcp-server/transports/auth) - JWT + OAuth 2.1 strategies

### Tools (Primary Features)
- [`src/mcp-server/tools/perplexitySearch/`](../../src/mcp-server/tools/perplexitySearch/)
  - Fast queries with temporal/domain/academic filtering
  - Optional reasoning transparency (`showThinking`)
  
- [`src/mcp-server/tools/perplexityDeepResearch/`](../../src/mcp-server/tools/perplexityDeepResearch/)
  - Exhaustive multi-source research
  - Configurable depth (`reasoning_effort`: low/medium/high)
  - 180s timeout requirement

### Services
- [`src/services/perplexityApi.ts`](../../src/services/perplexityApi.ts) - Perplexity API client, request/response handling, cost calculation integration

### Utilities
- [`src/utils/internal/errorHandler.ts`](../../src/utils/internal/errorHandler.ts) - Centralized error processing
- [`src/utils/internal/logger.ts`](../../src/utils/internal/logger.ts) - Winston-based structured logging
- [`src/utils/internal/requestContext.ts`](../../src/utils/internal/requestContext.ts) - Request tracing infrastructure
- [`src/utils/perplexity-utils/costTracker.ts`](../../src/utils/perplexity-utils/costTracker.ts) - Token-based cost estimation
- [`src/utils/security/`](../../src/utils/security/) - Sanitization, ID generation, rate limiting
- [`src/utils/metrics/tokenCounter.ts`](../../src/utils/metrics/tokenCounter.ts) - Token counting with tiktoken

### Type Definitions
- [`src/types-global/errors.ts`](../../src/types-global/errors.ts) - `McpError` class, `BaseErrorCode` enum

---

## Technology Stack

**Runtime**: Node.js >=18.0.0, TypeScript ^5.8.3, ES Modules  
**Core Framework**: MCP SDK ^1.16.0  
**HTTP Server**: Hono ^4.8.5  
**Validation**: Zod ^3.25.74  
**Authentication**: jose ^6.0.12 (JWT/OAuth)  
**Logging**: winston ^3.17.0  
**HTTP Client**: axios ^1.10.0  
**AI Integration**: openai ^5.10.1 (Perplexity endpoint)  
**Utilities**: dotenv, chrono-node, partial-json, tiktoken

**Testing**: Jest ^30.2.0, ts-jest ^29.4.5, nock ^14.0.10, @jest/globals ^30.2.0

**Build**: TypeScript → ES2020, Output: `dist/`, Scripts: build/clean/rebuild/start

---

## Environment Configuration

**Required**:
- `PERPLEXITY_API_KEY` - Perplexity AI API key

**Optional**:
- `MCP_TRANSPORT_TYPE` - `stdio` (default) | `http`
- `MCP_HTTP_PORT` - HTTP port (default: 3010)
- `MCP_HTTP_HOST` - HTTP host (default: 127.0.0.1)
- `MCP_LOG_LEVEL` - debug | info | warn | error (default: info)
- `MCP_AUTH_MODE` - `jwt` (default) | `oauth`
- `MCP_AUTH_SECRET_KEY` - JWT secret (min 32 chars, required for JWT)
- `OAUTH_ISSUER_URL` - OAuth issuer
- `OAUTH_JWKS_URI` - OAuth JWKS endpoint
- `OAUTH_AUDIENCE` - OAuth audience
- `PERPLEXITY_DEFAULT_MODEL` - Model name (default: sonar-reasoning-pro)
- `PERPLEXITY_DEFAULT_EFFORT` - low | medium | high (default: medium)
- `PERPLEXITY_API_BASE_URL` - API endpoint (default: https://api.perplexity.ai)
- `PERPLEXITY_POLLING_INTERVAL_MS` - Polling interval (default: 2000)
- `PERPLEXITY_POLLING_TIMEOUT_MS` - Polling timeout (default: 120000)

---

## Adding a New Tool

### Files to Create

```
src/mcp-server/tools/{toolName}/
├── index.ts           # Barrel export
├── logic.ts          # Schemas + business logic
└── registration.ts   # MCP registration + error handling
```

### Logic Layer Template

```typescript
import { z } from "zod";
import { logger, type RequestContext } from "../../../utils/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";

export const ToolInputSchema = z.object({
  // Input parameters
}).describe("Clear LLM-facing description");

export const ToolResponseSchema = z.object({
  // Output structure
}).describe("Response structure");

export type ToolInput = z.infer<typeof ToolInputSchema>;
export type ToolResponse = z.infer<typeof ToolResponseSchema>;

export async function toolLogic(
  params: ToolInput,
  context: RequestContext
): Promise<ToolResponse> {
  logger.debug("Executing tool logic", { ...context, params });

  if (/* validation fails */) {
    throw new McpError(BaseErrorCode.VALIDATION_ERROR, "Error details");
  }

  // Business logic
  const result = await someOperation();

  logger.info("Tool logic completed", { ...context });
  return result;
}
```

### Registration Layer Template

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorHandler, logger, requestContextService } from "../../../utils/index.js";
import { ToolInput, ToolInputSchema, toolLogic, ToolResponseSchema } from "./logic.js";

export const registerToolName = async (server: McpServer): Promise<void> => {
  server.registerTool(
    "tool_name",
    {
      title: "Tool Title",
      description: "Clear LLM-facing description",
      inputSchema: ToolInputSchema.shape,
      outputSchema: ToolResponseSchema.shape,
    },
    async (params: ToolInput) => {
      const context = requestContextService.createRequestContext({ toolName: "tool_name" });

      try {
        const result = await toolLogic(params, context);
        return {
          structuredContent: result,
          content: [{ type: "text", text: `Success: ${JSON.stringify(result)}` }],
        };
      } catch (error) {
        const mcpError = ErrorHandler.handleError(error, {
          operation: "tool_name",
          context,
          input: params,
        });

        return {
          isError: true,
          content: [{ type: "text", text: mcpError.message }],
          structuredContent: {
            code: mcpError.code,
            message: mcpError.message,
            details: mcpError.details,
          },
        };
      }
    }
  );
  logger.info("Tool 'tool_name' registered successfully.");
};
```

### Register in Server

Edit [`src/mcp-server/server.ts`](../../src/mcp-server/server.ts):

```typescript
import { registerToolName } from "./tools/toolName/index.js";
// ...
await registerToolName(server);
```

---

## Common Modifications

### Adding Parameters
1. Update `ToolInputSchema` in [`logic.ts`](../../src/mcp-server/tools/*/logic.ts)
2. Handle parameter in logic function
3. Types automatically infer

### Changing Validation
1. Modify Zod schema constraints
2. Add validation in logic function
3. Throw `McpError` with appropriate code

### Adding Response Fields
1. Update `ToolResponseSchema` in [`logic.ts`](../../src/mcp-server/tools/*/logic.ts)
2. Add fields to return object
3. Types automatically update

---

## Tool Execution Flow

1. MCP client → tool invocation
2. Transport layer → routes to handler
3. [`registration.ts`](../../src/mcp-server/tools/*/registration.ts) → creates [`RequestContext`](../../src/utils/internal/requestContext.ts)
4. Input validated → Zod schema
5. [`logic.ts`](../../src/mcp-server/tools/*/logic.ts) → called with validated params + context
6. Logic → API call via [`perplexityApiService`](../../src/services/perplexityApi.ts)
7. Response processed OR error thrown
8. Handler catches → [`ErrorHandler`](../../src/utils/internal/errorHandler.ts) processes
9. Formatted response → client

---

## Error Propagation

1. Error occurs → logic/service layer
2. [`McpError`](../../src/types-global/errors.ts) thrown with code + details
3. Handler catches → `try...catch` block
4. [`ErrorHandler.handleError()`](../../src/utils/internal/errorHandler.ts) → processes
5. Error logged with context
6. Structured response → client

---

## Adding a Service

### Service Template

```typescript
import { z } from 'zod';
import { BaseErrorCode, McpError } from '../types-global/errors.js';
import { ErrorHandler, logger, RequestContext } from '../utils/index.js';

const ServiceRequestSchema = z.object({
  // Request structure
});

const ServiceResponseSchema = z.object({
  // Response structure
});

export type ServiceRequest = z.infer<typeof ServiceRequestSchema>;
export type ServiceResponse = z.infer<typeof ServiceResponseSchema>;

class ServiceName {
  constructor() {
    // Initialize
  }

  async operation(
    request: ServiceRequest,
    context: RequestContext
  ): Promise<ServiceResponse> {
    return await ErrorHandler.tryCatch(
      async () => {
        logger.info('Executing service operation', context);
        // Logic here
        return { /* response */ };
      },
      {
        operation: 'ServiceName.operation',
        context,
        input: request,
        errorCode: BaseErrorCode.INTERNAL_ERROR,
      }
    );
  }
}

export const serviceName = new ServiceName();
```

### Export from Services Index

Add to [`src/services/index.ts`](../../src/services/index.ts):
```typescript
export * from './serviceName.js';
```

### Use in Tool Logic

```typescript
import { serviceName } from '../../../services/index.js';

export async function toolLogic(params: ToolInput, context: RequestContext) {
  const result = await serviceName.operation(params, context);
  return result;
}
```

---

## Debugging

**Logging**:
- Set `MCP_LOG_LEVEL=debug` for detailed output
- Check `logs/` directory for log files
- Trace requests via `requestId` in logs
- Verify error codes match `BaseErrorCode` enum

**Common Issues**:
- Tool not appearing → Check server logs, verify registration in [`server.ts`](../../src/mcp-server/server.ts), restart client
- Validation errors → Check Zod schema, verify schema descriptions, test with sample data
- API errors → Verify API key, check endpoint URLs, review timeout settings
- Type errors → Verify exports, check `z.infer<typeof Schema>`, ensure `.js` extensions in imports

**Build & Test**:
```bash
npm run clean              # Remove dist/
npm run build              # Compile TypeScript
npm start                  # Run server
npm test                   # Run all tests
npm test:coverage          # Run tests with coverage report
npm test:watch            # Watch mode for TDD
npm test:unit             # Unit tests only
npm test:tools            # Tool logic tests only
```

---

## Testing Infrastructure

### Test Structure

```
tests/
├── fixtures/           # Reusable mock data
│   ├── contexts.ts    # Mock RequestContext generators
│   └── perplexity-responses.ts  # Mock API responses
├── helpers/           # Test utilities
│   └── mockLogger.ts # Logger mock for tests
└── unit/             # Unit tests
    ├── services/     # Service layer tests
    ├── tools/        # Tool logic tests
    └── utils/        # Utility tests
```

### Testing Framework

**Jest Configuration**:
- ESM support via `NODE_OPTIONS=--experimental-vm-modules`
- TypeScript integration via `ts-jest`
- Coverage thresholds: 70% (statements, branches, functions, lines)
- Isolated modules for proper ESM testing

**HTTP Mocking**:
- [`nock`](https://github.com/nock/nock) for intercepting Perplexity API calls
- No need for complex module mocking
- Clean test setup/teardown

**Fixtures**:
- Type-safe mock data in [`tests/fixtures/`](../../tests/fixtures/)
- Reusable across test suites
- Matches actual API response structures

### Test Coverage Status

**Overall**: 37.9% coverage, 164 passing tests across 7 test suites

**High Coverage Components**:
- Tool logic layers: 95-100% (perplexitySearch, perplexityDeepResearch)
- Service layer: 93.93% (perplexityApi)
- Core utilities: 83-96% (costTracker, sanitization, jsonParser, errorHandler)

**Low Coverage Components** (appropriate for integration testing):
- MCP registration handlers: 0% (require MCP client)
- Transport layers: 0% (require actual connections)
- Authentication middleware: 0% (require auth flows)
- Logger implementation: 16% (Winston wrapper, tested via other components)

### Writing Tests for Tools

**Test file location**: `tests/unit/tools/{toolName}.test.ts`

**Example structure**:
```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import nock from 'nock';
import { toolLogic } from '../../../src/mcp-server/tools/{toolName}/logic.js';
import { createMockContext } from '../../fixtures/contexts.js';
import { config } from '../../../src/config/index.js';

describe('toolLogic', () => {
  const context = createMockContext({ operation: 'toolName.test' });

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should handle successful request', async () => {
    nock(config.perplexityApiBaseUrl)
      .post('/chat/completions')
      .reply(200, mockResponse);

    const result = await toolLogic(params, context);
    
    expect(result).toBeDefined();
    expect(result.someField).toBe(expectedValue);
  });

  it('should handle API errors', async () => {
    nock(config.perplexityApiBaseUrl)
      .post('/chat/completions')
      .reply(429, { error: { message: 'Rate limited' } });

    await expect(toolLogic(params, context)).rejects.toThrow();
  });
});
```

**Key patterns**:
- Use `@jest/globals` for imports (ESM compatibility)
- Mock HTTP with `nock`, not module mocking
- Create fixtures for complex response data
- Test both success and error paths
- Test parameter variations and edge cases

### Writing Tests for Utilities

**Test file location**: `tests/unit/utils/{utilityName}.test.ts`

**Focus areas**:
- Pure function logic (no external dependencies)
- Input validation and sanitization
- Error handling and edge cases
- Type safety verification

**Example**:
```typescript
import { describe, it, expect } from '@jest/globals';
import { ErrorHandler } from '../../../src/utils/internal/errorHandler.js';
import { BaseErrorCode, McpError } from '../../../src/types-global/errors.js';

describe('ErrorHandler.determineErrorCode', () => {
  it('should classify unauthorized errors', () => {
    const error = new Error('Invalid token');
    expect(ErrorHandler.determineErrorCode(error))
      .toBe(BaseErrorCode.UNAUTHORIZED);
  });

  it('should handle non-Error values', () => {
    expect(ErrorHandler.determineErrorCode(null))
      .toBe(BaseErrorCode.INTERNAL_ERROR);
  });
});
```

### Test Fixtures

**Creating mock contexts**:
```typescript
import { createMockContext } from '../../fixtures/contexts.js';

const context = createMockContext({
  operation: 'myOperation',
  toolName: 'myTool',
  requestId: 'test-req-123'
});
```

**Using mock responses**:
```typescript
import { mockSearchSuccessResponse } from '../../fixtures/perplexity-responses.js';

nock(apiUrl).post('/chat/completions').reply(200, mockSearchSuccessResponse);
```

---

## Project Status

**Version**: 1.2.1 (Stable - Production Ready)

**Maturity**: Complete implementation with comprehensive error handling, logging, authentication (JWT + OAuth 2.1), dual transport support (stdio + HTTP), cost tracking.

**Current Focus**: Maintenance, client compatibility, performance optimization for deep research.

**Key Considerations**:
- Deep research requires 180s timeouts (some clients default to 60s)
- Cost varies by model and research depth (automatic estimation via token usage)
- stdio transport most universally compatible
- Tested with Cline and Claude Desktop

**Next Potential Enhancements**:
- Additional search filtering options
- Batch operations
- Response caching layer
- Real-time streaming support
- Enhanced analytics

---

## Remember

This Memory Bank is your complete guide to the Perplexity MCP Server codebase. Key principles:

✓ **Logic throws, Handler catches** - Never deviate  
✓ **RequestContext everywhere** - Full traceability  
✓ **Zod schemas drive types** - Runtime + compile-time safety  
✓ **Three-file tool pattern** - Consistent structure  
✓ **Centralized error handling** - Single point of control

When working on this codebase, always reference architectural principles first, follow established patterns, and maintain the strict separation of concerns that makes this system reliable and maintainable.