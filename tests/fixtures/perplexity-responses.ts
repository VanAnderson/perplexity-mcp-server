/**
 * Mock Perplexity API responses for testing
 */

/**
 * Successful search response
 */
export const mockSearchSuccessResponse = {
  id: 'test-response-id-123',
  model: 'sonar',
  created: 1704067200,
  object: 'chat.completion' as const,
  choices: [
    {
      index: 0,
      finish_reason: 'stop',
      message: {
        role: 'assistant' as const,
        content: 'TypeScript is a strongly typed programming language...',
      },
      delta: undefined,
    },
  ],
  usage: {
    prompt_tokens: 150,
    completion_tokens: 300,
    total_tokens: 450,
  },
  search_results: [
    {
      title: 'TypeScript Documentation',
      url: 'https://www.typescriptlang.org/docs/',
      date: '2024-01-15',
    },
    {
      title: 'TypeScript Handbook',
      url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
      date: '2024-01-10',
    },
    {
      title: 'TypeScript Release Notes',
      url: 'https://devblogs.microsoft.com/typescript/',
      date: '2024-01-15',
    },
  ],
  citations: ['https://www.typescriptlang.org/docs/', 'https://www.typescriptlang.org/docs/handbook/intro.html'],
};

/**
 * Deep research response with reasoning tokens
 */
export const mockDeepResearchResponse = {
  id: 'resp_deep_xyz789',
  model: 'sonar-deep-research',
  created: 1704067200,
  object: 'chat.completion' as const,
  choices: [
    {
      index: 0,
      finish_reason: 'stop',
      message: {
        role: 'assistant' as const,
        content:
          '# Comprehensive Analysis: Quantum Computing in 2024\n\n## Executive Summary\n\nQuantum computing has reached significant milestones in 2024...\n\n## Key Developments\n\n### 1. Error Correction\n[Detailed analysis with citations]\n\n### 2. Scalability\n[Detailed analysis with citations]',
      },
      delta: undefined,
    },
  ],
  usage: {
    prompt_tokens: 200,
    completion_tokens: 2500,
    total_tokens: 2700,
    reasoning_tokens: 500,
    citation_tokens: 150,
    num_search_queries: 12,
  },
  search_results: [
    {
      title: 'Nature: Quantum Error Correction 2024',
      url: 'https://nature.com/quantum-ecc',
      date: '2024-01-20',
    },
    {
      title: 'Science: Scalable Quantum Systems',
      url: 'https://science.org/quantum-scale',
      date: '2024-01-18',
    },
  ],
};

/**
 * Empty content response (error scenario)
 */
export const mockEmptyResponse = {
  id: 'resp_empty_001',
  model: 'sonar-reasoning-pro',
  created: 1704067200,
  object: 'chat.completion' as const,
  choices: [],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 0,
    total_tokens: 10,
  },
};

/**
 * Response with all optional filters applied
 */
export const mockFilteredSearchResponse = {
  ...mockSearchSuccessResponse,
  id: 'resp_filtered_456',
  search_results: [
    {
      title: 'Recent arXiv Paper on Quantum Computing',
      url: 'https://arxiv.org/abs/2024.00001',
      date: '2024-01-25',
    },
  ],
};

/**
 * API error responses
 */
export const mockApiErrorResponses = {
  rateLimited: {
    response: {
      status: 429,
      data: {
        error: {
          message: 'Rate limit exceeded. Please try again later.',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
        },
      },
    },
  },
  invalidApiKey: {
    response: {
      status: 401,
      data: {
        error: {
          message: 'Invalid API key provided.',
          type: 'authentication_error',
          code: 'invalid_api_key',
        },
      },
    },
  },
  timeout: {
    code: 'ECONNABORTED',
    message: 'timeout of 120000ms exceeded',
  },
  networkError: {
    code: 'ENOTFOUND',
    message: 'getaddrinfo ENOTFOUND api.perplexity.ai',
  },
};