/**
 * @fileoverview Tests for perplexitySearch tool logic
 * Tests search query handling, parameter validation, and response processing
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import nock from 'nock';
import { perplexitySearchLogic, PerplexitySearchInput } from '../../../src/mcp-server/tools/perplexitySearch/logic.js';
import { createMockContext } from '../../fixtures/contexts.js';
import { mockSearchSuccessResponse } from '../../fixtures/perplexity-responses.js';
import { config } from '../../../src/config/index.js';
import { BaseErrorCode } from '../../../src/types-global/errors.js';

describe('perplexitySearchLogic', () => {
  const context = createMockContext({ toolName: 'perplexity_search' });
  const apiBaseUrl = config.perplexityApiBaseUrl;

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('basic search functionality', () => {
    it('executes a simple search query successfully', async () => {
      const input: PerplexitySearchInput = {
        query: 'What are the latest features in TypeScript 5.8?',
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.model).toBe(config.perplexityDefaultModel);
          expect(body.messages).toHaveLength(2);
          expect(body.messages[0].role).toBe('system');
          expect(body.messages[1].role).toBe('user');
          expect(body.messages[1].content).toBe(input.query);
          return true;
        })
        .reply(200, mockSearchSuccessResponse);

      const response = await perplexitySearchLogic(input, context);

      expect(response).toBeDefined();
      expect(response.rawResultText).toBe('TypeScript is a strongly typed programming language...');
      expect(response.responseId).toBe('test-response-id-123');
      expect(response.modelUsed).toBe('sonar');
      expect(response.usage.total_tokens).toBe(450);
      expect(response.searchResults).toHaveLength(3);
    });

    it('includes system prompt in API call', async () => {
      const input: PerplexitySearchInput = {
        query: 'Test query with system prompt verification',
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.messages[0].content).toContain('advanced AI assistant');
          expect(body.messages[0].content).toContain('Systematic Research');
          return true;
        })
        .reply(200, mockSearchSuccessResponse);

      await perplexitySearchLogic(input, context);
    });
  });

  describe('search filters', () => {
    it('applies recency filter correctly', async () => {
      const input: PerplexitySearchInput = {
        query: 'Recent AI developments',
        search_recency_filter: 'week',
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.search_recency_filter).toBe('week');
          return true;
        })
        .reply(200, mockSearchSuccessResponse);

      const response = await perplexitySearchLogic(input, context);
      expect(response).toBeDefined();
    });

    it('applies domain filter correctly', async () => {
      const input: PerplexitySearchInput = {
        query: 'TypeScript documentation',
        search_domain_filter: ['typescriptlang.org', 'github.com'],
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.search_domain_filter).toEqual(['typescriptlang.org', 'github.com']);
          return true;
        })
        .reply(200, mockSearchSuccessResponse);

      const response = await perplexitySearchLogic(input, context);
      expect(response).toBeDefined();
    });

    it('applies date range filters correctly', async () => {
      const input: PerplexitySearchInput = {
        query: 'AI research papers',
        search_after_date_filter: '01/01/2024',
        search_before_date_filter: '12/31/2024',
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.search_after_date_filter).toBe('01/01/2024');
          expect(body.search_before_date_filter).toBe('12/31/2024');
          return true;
        })
        .reply(200, mockSearchSuccessResponse);

      const response = await perplexitySearchLogic(input, context);
      expect(response).toBeDefined();
    });

    it('applies academic search mode correctly', async () => {
      const input: PerplexitySearchInput = {
        query: 'Quantum computing research',
        search_mode: 'academic',
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.search_mode).toBe('academic');
          return true;
        })
        .reply(200, mockSearchSuccessResponse);

      const response = await perplexitySearchLogic(input, context);
      expect(response).toBeDefined();
    });

    it('applies multiple filters simultaneously', async () => {
      const input: PerplexitySearchInput = {
        query: 'Machine learning papers from arxiv',
        search_mode: 'academic',
        search_domain_filter: ['arxiv.org'],
        search_recency_filter: 'month',
        return_related_questions: true,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.search_mode).toBe('academic');
          expect(body.search_domain_filter).toEqual(['arxiv.org']);
          expect(body.search_recency_filter).toBe('month');
          expect(body.return_related_questions).toBe(true);
          return true;
        })
        .reply(200, mockSearchSuccessResponse);

      const response = await perplexitySearchLogic(input, context);
      expect(response).toBeDefined();
    });
  });

  describe('optional parameters', () => {
    it('handles return_related_questions flag', async () => {
      const input: PerplexitySearchInput = {
        query: 'What is Node.js?',
        return_related_questions: true,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.return_related_questions).toBe(true);
          return true;
        })
        .reply(200, mockSearchSuccessResponse);

      const response = await perplexitySearchLogic(input, context);
      expect(response).toBeDefined();
    });

    it('handles showThinking flag (defaults to false)', async () => {
      const input: PerplexitySearchInput = {
        query: 'How does async/await work?',
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(200, mockSearchSuccessResponse);

      const response = await perplexitySearchLogic(input, context);
      expect(response).toBeDefined();
    });

    it('omits optional parameters when not provided', async () => {
      const input: PerplexitySearchInput = {
        query: 'Simple query without filters',
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.search_domain_filter).toBeUndefined();
          expect(body.search_recency_filter).toBeUndefined();
          expect(body.search_mode).toBeUndefined();
          expect(body.return_related_questions).toBeUndefined();
          return true;
        })
        .reply(200, mockSearchSuccessResponse);

      const response = await perplexitySearchLogic(input, context);
      expect(response).toBeDefined();
    });
  });

  describe('response processing', () => {
    it('extracts search results correctly', async () => {
      const input: PerplexitySearchInput = {
        query: 'TypeScript features',
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(200, mockSearchSuccessResponse);

      const response = await perplexitySearchLogic(input, context);

      expect(response.searchResults).toBeDefined();
      expect(response.searchResults).toHaveLength(3);
      expect(response.searchResults?.[0].title).toBe('TypeScript Documentation');
      expect(response.searchResults?.[0].url).toBe('https://www.typescriptlang.org/docs/');
      expect(response.searchResults?.[1].title).toBe('TypeScript Handbook');
      expect(response.searchResults?.[2].date).toBe('2024-01-15');
    });

    it('handles responses without search results', async () => {
      const input: PerplexitySearchInput = {
        query: 'General knowledge query',
        return_related_questions: false,
        showThinking: false,
      };

      const responseWithoutSearchResults = {
        ...mockSearchSuccessResponse,
        search_results: undefined,
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(200, responseWithoutSearchResults);

      const response = await perplexitySearchLogic(input, context);

      expect(response.searchResults).toBeUndefined();
    });

    it('captures usage metrics correctly', async () => {
      const input: PerplexitySearchInput = {
        query: 'Usage metrics test',
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(200, mockSearchSuccessResponse);

      const response = await perplexitySearchLogic(input, context);

      expect(response.usage).toBeDefined();
      expect(response.usage.prompt_tokens).toBe(150);
      expect(response.usage.completion_tokens).toBe(300);
      expect(response.usage.total_tokens).toBe(450);
    });
  });

  describe('error handling', () => {
    it('throws McpError when API returns empty content', async () => {
      const input: PerplexitySearchInput = {
        query: 'This will return empty',
        return_related_questions: false,
        showThinking: false,
      };

      const emptyResponse = {
        ...mockSearchSuccessResponse,
        choices: [
          {
            ...mockSearchSuccessResponse.choices[0],
            message: {
              role: 'assistant',
              content: '', // Empty content
            },
          },
        ],
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(200, emptyResponse);

      await expect(perplexitySearchLogic(input, context)).rejects.toThrow('empty response');
    });

    it('throws McpError when API returns no choices', async () => {
      const input: PerplexitySearchInput = {
        query: 'This will return no choices',
        return_related_questions: false,
        showThinking: false,
      };

      const noChoicesResponse = {
        ...mockSearchSuccessResponse,
        choices: [],
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(200, noChoicesResponse);

      await expect(perplexitySearchLogic(input, context)).rejects.toThrow();
    });

    it('propagates API errors correctly', async () => {
      const input: PerplexitySearchInput = {
        query: 'This will fail',
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(429, {
          error: {
            type: 'rate_limit_exceeded',
            message: 'Rate limit exceeded',
          },
        });

      await expect(perplexitySearchLogic(input, context)).rejects.toThrow();
    });

    // Note: Network error tests removed due to Jest/nock interaction issues
    // These are better tested in integration tests or manual testing
  });

  describe('model configuration', () => {
    it('uses configured default model', async () => {
      const input: PerplexitySearchInput = {
        query: 'Model configuration test',
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.model).toBe(config.perplexityDefaultModel);
          return true;
        })
        .reply(200, mockSearchSuccessResponse);

      await perplexitySearchLogic(input, context);
    });

    it('sets stream to false', async () => {
      const input: PerplexitySearchInput = {
        query: 'Stream should be false',
        return_related_questions: false,
        showThinking: false,
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.stream).toBe(false);
          return true;
        })
        .reply(200, mockSearchSuccessResponse);

      await perplexitySearchLogic(input, context);
    });
  });
});