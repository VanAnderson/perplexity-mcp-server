/**
 * Global test setup file
 * Runs once before all tests
 */

import path from 'path';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PERPLEXITY_API_KEY = 'test-api-key-mock';
process.env.MCP_LOG_LEVEL = 'error'; // Suppress logs during tests
process.env.MCP_TRANSPORT_TYPE = 'stdio';

// Use test-specific conversation logs directory
process.env.CONVERSATION_LOGS_DIR = path.join(process.cwd(), 'test-conversation-logs');

// Mock console methods to reduce noise in test output
// Using arrow functions instead of jest.fn() to avoid dependency issues
const noop = () => {};
global.console = {
  ...console,
  log: noop,
  debug: noop,
  info: noop,
  warn: noop,
  // Keep error for debugging test failures
  error: console.error,
};