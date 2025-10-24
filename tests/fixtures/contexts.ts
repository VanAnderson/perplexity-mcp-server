/**
 * Mock RequestContext objects for testing
 */
import type { RequestContext } from '../../src/utils/internal/requestContext.js';

/**
 * Creates a mock RequestContext with default values
 */
export const createMockContext = (overrides: Partial<RequestContext> = {}): RequestContext => ({
  requestId: 'test-req-123',
  timestamp: '2024-01-01T00:00:00.000Z',
  toolName: 'test-tool',
  ...overrides,
});

/**
 * Common test contexts
 */
export const testContexts = {
  perplexitySearch: createMockContext({
    toolName: 'perplexity_search',
    requestId: 'search-test-001',
  }),
  perplexityDeepResearch: createMockContext({
    toolName: 'perplexity_deep_research',
    requestId: 'deep-research-test-001',
  }),
  apiService: createMockContext({
    operation: 'PerplexityApiService.chatCompletion',
    requestId: 'api-test-001',
  }),
};