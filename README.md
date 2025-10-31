# Perplexity MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-^5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP%20SDK-^1.15.0-green.svg)](https://modelcontextprotocol.io/)
[![Version](https://img.shields.io/badge/Version-1.1.0-blue.svg)](./package.json)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-Stable-green.svg)](https://github.com/cyanheads/perplexity-mcp-server/issues)
[![GitHub](https://img.shields.io/github/stars/cyanheads/perplexity-mcp-server?style=social)](https://github.com/cyanheads/perplexity-mcp-server)

**Supercharge your AI agents with Perplexity's Search API!**

An MCP (Model Context Protocol) server providing comprehensive access to the Perplexity AI API. It enables LLMs and AI agents to perform fast, search-augmented queries and conduct exhaustive, multi-source deep research, all through a standardized, secure, and easy-to-integrate protocol.

Built on the [`cyanheads/mcp-ts-template`](https://github.com/cyanheads/mcp-ts-template), this server follows a modular architecture with robust error handling, logging, and security features.

## 🚀 Core Capabilities: Perplexity Tools 🛠️

This server equips your AI with specialized tools to leverage Perplexity's unique capabilities:

| Tool Name                                               | Description                                                                                                                      | Key Features                                                                                                                                                                                                                   |
| :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`perplexity_search`](#perplexity_search)               | Performs a fast, search-augmented query using the Perplexity API. Ideal for quick questions and real-time information retrieval. | - Filter by recency (`day`, `week`, `month`, `year`).<br/>- Filter by domain or date range.<br/>- Prioritize scholarly sources with `academic` mode.<br/>- Optionally include the model's internal reasoning (`showThinking`). |
| [`perplexity_deep_research`](#perplexity_deep_research) | Conducts an exhaustive, multi-source investigation for complex topics, delivering a detailed report.                             | - Ideal for in-depth analysis and report generation.<br/>- Control research depth and cost with `reasoning_effort` (`low`, `medium`, `high`).                                                                                  |

> **Note**: For the deep research tool, I recommend allowing a longer timeout (e.g. 180 seconds) through MCP Clients like Cline. Other clients may time out after 60 seconds, which isn't sufficient for deep research.

---

## Table of Contents

| [Overview](#overview)           | [Features](#features)                   | [Installation](#installation) |
| :------------------------------ | :-------------------------------------- | :---------------------------- |
| [Configuration](#configuration) | [Project Structure](#project-structure) |
| [Tools](#tools)                 | [Development](#development)             | [License](#license)           |

## Overview

The Perplexity MCP Server acts as a bridge, allowing applications (MCP Clients) that understand the Model Context Protocol (MCP)—like advanced AI assistants (LLMs), IDE extensions, or custom research tools—to interact directly and efficiently with the Perplexity AI API.

Instead of complex, one-off API integrations, your tools can leverage this server to:

- **Automate Research**: Enable agents to perform quick lookups or deep-dive research programmatically.
- **Enhance AI Reasoning**: Provide LLMs with up-to-date, verifiable information from the web to ground their responses.
- **Integrate Search into Workflows**: Seamlessly add search-augmented generation to any AI-driven task.

Built on the robust `mcp-ts-template`, this server provides a standardized, secure, and efficient way to expose Perplexity's functionality via the MCP standard.

> **Developer Note**: This repository includes a [.clinerules](.clinerules) file that serves as a developer cheat sheet for your LLM coding agent with quick reference for the codebase patterns, file locations, and code snippets.

## Features

### Core Utilities

Leverages the robust utilities provided by the `mcp-ts-template`:

- **Logging**: Structured, configurable logging with file rotation and optional MCP notifications.
- **Error Handling**: Centralized error processing with standardized `McpError` types.
- **Configuration**: Environment variable loading (`dotenv`) with Zod validation.
- **Input Validation/Sanitization**: Uses `zod` for schema validation and a dedicated sanitization utility.
- **Request Context**: Operation tracking and correlation via unique request IDs using `AsyncLocalStorage`.
- **Type Safety**: Strong typing enforced by TypeScript and Zod schemas.
- **HTTP Transport**: High-performance HTTP server using **Hono**, featuring session management and CORS support.
- **Authentication**: Robust authentication layer supporting JWT and OAuth 2.1.

### Perplexity Integration

- **Dual API Support**: Full integration with both the standard Chat Completions API (`perplexity_search`) and the more intensive research models (`perplexity_deep_research`).
- **Advanced Search Control**: Fine-grained control over search parameters, including recency, domain filtering, and academic source prioritization.
- **Cost Tracking**: A utility to estimate the cost of API calls based on token usage and model, helping manage expenses.
- **Resilient API Client**: A dedicated service for interacting with the Perplexity API, featuring built-in error handling and request/response logging.

## Installation

### Prerequisites

- [Node.js (>=18.0.0)](https://nodejs.org/)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A **Perplexity API Key** - [Get one from your Perplexity account settings](https://www.perplexity.ai/settings/api)

### Setup

1.  Clone the repository:

    ```bash
    git clone https://github.com/cyanheads/perplexity-mcp-server.git
    cd perplexity-mcp-server
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Build the project:
    ```bash
    npm run build
    ```

## Configuration

### Environment Variables

Configure the server by creating a `.env` file in the project root (you can copy `.env.example`). These variables can also be set in your MCP client's configuration.

| Variable              | Description                                                      | Default     |
| :-------------------- | :--------------------------------------------------------------- | :---------- |
| `PERPLEXITY_API_KEY`  | **Required.** Your API key for Perplexity.                       | `""`        |
| `MCP_TRANSPORT_TYPE`  | Transport mechanism: `stdio` or `http`.                          | `stdio`     |
| `MCP_HTTP_PORT`       | Port for the HTTP server (if `MCP_TRANSPORT_TYPE=http`).         | `3010`      |
| `MCP_HTTP_HOST`       | Host address for the HTTP server.                                | `127.0.0.1` |
| `MCP_LOG_LEVEL`       | Logging level (`debug`, `info`, `warn`, `error`).                | `info`      |
| `MCP_AUTH_MODE`       | Authentication for HTTP: `jwt` or `oauth`.                       | `jwt`       |
| `MCP_AUTH_SECRET_KEY` | **Required for `jwt` auth.** A secure secret key (min 32 chars). | `""`        |

### MCP Client Settings

Add the following to your MCP client's configuration file (e.g., `cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "perplexity-mcp-server": {
      "command": "node",
      "args": ["/path/to/your/perplexity-mcp-server/dist/index.js"],
      "env": {
        "PERPLEXITY_API_KEY": "YOUR_PERPLEXITY_API_KEY_HERE"
      }
    }
  }
}
```

## Project Structure

The codebase follows a modular structure within the `src/` directory:

```
src/
├── index.ts              # Entry point: Initializes and starts the server
├── config/               # Configuration loading (env vars, package info)
│   └── index.ts
├── mcp-server/           # Core MCP server logic and capability registration
│   ├── server.ts         # Server setup, capability registration
│   ├── transports/       # Transport handling (stdio, http)
│   └── tools/            # MCP Tool implementations (subdirs per tool)
├── services/             # External service integrations (Perplexity API client)
├── types-global/         # Shared TypeScript type definitions
└── utils/                # Common utility functions (logger, error handler, etc.)
```

For a detailed file tree, run `npm run tree` or see [docs/tree.md](docs/tree.md).

## Tools

The Perplexity MCP Server provides comprehensive tools for search, research, and conversation management.

### Query Tools

| Tool Name                  | Description                                          | Key Arguments                                                                               |
| :------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| `perplexity_search`        | Performs a fast, search-augmented query.             | `query`, `search_recency_filter?`, `search_domain_filter?`, `search_mode?`, `showThinking?` |
| `perplexity_deep_research` | Conducts an exhaustive, multi-source research query. | `query`, `reasoning_effort?`                                                                |
| `perplexity_search_followup` | Continues an existing conversation with new search query. | `conversationId`, `query`, search filters                                                   |
| `perplexity_deep_research_followup` | Continues conversation with new deep research query. | `conversationId`, `query`, `reasoning_effort?`                                              |

### Conversation Management Tools

| Tool Name                  | Description                                          | Key Arguments                                                                               |
| :------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| `get_conversation_history` | Retrieves a single conversation with status information. | `conversationId`, `includeSystemPrompt?`                                                    |
| `get_conversation_histories` | Retrieves multiple conversations in a single batch operation. | `conversationIds[]`, `includeSystemPrompt?`                                                 |
| `await_conversation_histories` | Waits for async jobs to complete, then returns all conversations. (Async mode only) | `conversationIds[]`, `includeSystemPrompt?`, `pollingIntervalMs?`                          |

_Note: All tools support comprehensive error handling and return structured JSON responses._

#### Batch Conversation Retrieval

The batch retrieval tools (`get_conversation_histories` and `await_conversation_histories`) enable efficient monitoring of multiple async deep research queries:

**`get_conversation_histories`** - Returns immediate snapshot of all requested conversations:
- Returns object keyed by `conversationId` for easy lookup
- Each entry includes conversation data (if available), job status (if async), and error info (if failed/not found)
- Useful for checking status of multiple jobs without waiting

**`await_conversation_histories`** - Waits for completion before returning (async mode only):
- Polls every 2 seconds until all jobs reach terminal state (completed/failed)
- No internal timeout - waits indefinitely until MCP client times out
- If timeout occurs, simply re-run the tool to resume waiting
- Ideal when you need all results before proceeding

**Example Use Case:**
```javascript
// Submit 3 deep research queries
const ids = [id1, id2, id3];

// Check status immediately
get_conversation_histories({ conversationIds: ids })
// Returns: { id1: {status: "in_progress"}, id2: {status: "pending"}, id3: {status: "completed", conversation: {...}} }

// Wait for all to complete
await_conversation_histories({ conversationIds: ids })
// Blocks until all complete, then returns full conversation data for all
```

## Development

### Build and Test

```bash
# Build the project (compile TS to JS in dist/)
npm run build

# Clean build artifacts
npm run clean

# Generate a file tree representation for documentation
npm run tree

# Clean build artifacts and then rebuild the project
npm run rebuild

# Start the server using stdio (default)
npm start
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Built with the <a href="https://modelcontextprotocol.io/">Model Context Protocol</a>
</div>
