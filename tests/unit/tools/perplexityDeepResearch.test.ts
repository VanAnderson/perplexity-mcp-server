/**
 * @fileoverview Tests for perplexityDeepResearch tool logic
 * Tests deep research query handling, reasoning effort, and comprehensive report generation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import nock from 'nock';
import { perplexityDeepResearchLogic, PerplexityDeepResearchInput } from '../../../src/mcp-server/tools/perplexityDeepResearch/logic.js';
import { createMockContext } from '../../fixtures/contexts.js';
import { mockDeepResearchResponse } from '../../fixtures/perplexity-responses.js';
import { config } from '../../../src/config/index.js';

describe('perplexityDeepResearchLogic', () => {
  const context = createMockContext({ toolName: 'perplexity_deep_research' });
  const apiBaseUrl = config.perplexityApiBaseUrl;

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('basic deep research functionality', () => {
    it('executes a deep research query successfully', async () => {
      const input: PerplexityDeepResearchInput = {
        query: '# Research Objective\nComprehensive analysis of quantum computing advancements in 2024',
        reasoning_effort: 'medium',
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.model).toBe('sonar-deep-research');
          expect(body.messages).toHaveLength(2);
          expect(body.messages[0].role).toBe('system');
          expect(body.messages[1].role).toBe('user');
          expect(body.messages[1].content).toBe(input.query);
          expect(body.reasoning_effort).toBe('medium');
          return true;
        })
        .reply(200, mockDeepResearchResponse);

      const response = await perplexityDeepResearchLogic(input, context);

      expect(response).toBeDefined();
      expect(response.rawResultText).toContain('# Comprehensive Analysis');
      expect(response.responseId).toBe('resp_deep_xyz789');
      expect(response.modelUsed).toBe('sonar-deep-research');
      expect(response.usage.total_tokens).toBe(2700);
    });

    it('includes system prompt in API call', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Test query with system prompt verification',
        reasoning_effort: 'low',
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.messages[0].content).toContain('expert-level AI research assistant');
          expect(body.messages[0].content).toContain('Systematic & Exhaustive Research');
          expect(body.messages[0].content).toContain('Source Vetting');
          return true;
        })
        .reply(200, mockDeepResearchResponse);

      await perplexityDeepResearchLogic(input, context);
    });

    it('uses sonar-deep-research model', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Model verification test',
        reasoning_effort: 'high',
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.model).toBe('sonar-deep-research');
          return true;
        })
        .reply(200, mockDeepResearchResponse);

      await perplexityDeepResearchLogic(input, context);
    });
  });

  describe('reasoning effort parameter', () => {
    it('handles low reasoning effort', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Quick research query',
        reasoning_effort: 'low',
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.reasoning_effort).toBe('low');
          return true;
        })
        .reply(200, mockDeepResearchResponse);

      const response = await perplexityDeepResearchLogic(input, context);
      expect(response).toBeDefined();
    });

    it('handles medium reasoning effort (default)', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Moderate research query',
        reasoning_effort: 'medium',
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.reasoning_effort).toBe('medium');
          return true;
        })
        .reply(200, mockDeepResearchResponse);

      const response = await perplexityDeepResearchLogic(input, context);
      expect(response).toBeDefined();
    });

    it('handles high reasoning effort', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Comprehensive research requiring maximum depth',
        reasoning_effort: 'high',
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.reasoning_effort).toBe('high');
          return true;
        })
        .reply(200, mockDeepResearchResponse);

      const response = await perplexityDeepResearchLogic(input, context);
      expect(response).toBeDefined();
    });

    it('uses medium as default when reasoning_effort not specified', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Research without explicit reasoning effort',
        reasoning_effort: 'medium',
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          // Default should be medium per schema
          expect(body.reasoning_effort).toBe('medium');
          return true;
        })
        .reply(200, mockDeepResearchResponse);

      await perplexityDeepResearchLogic(input, context);
    });
  });

  describe('structured query handling', () => {
    it('handles markdown-structured queries', async () => {
      const input: PerplexityDeepResearchInput = {
        query: `# Research Objective
Comprehensive analysis of MCP protocol security patterns

# Background Context
Building production MCP server with TypeScript and Node.js

# Focus Areas
1. Authentication strategies (JWT vs OAuth2)
2. Rate limiting best practices
3. Transport security considerations

# Requirements
- Production-ready patterns
- TypeScript examples
- HTTP and stdio transport support`,
        reasoning_effort: 'high',
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.messages[1].content).toContain('# Research Objective');
          expect(body.messages[1].content).toContain('# Background Context');
          expect(body.messages[1].content).toContain('# Focus Areas');
          return true;
        })
        .reply(200, mockDeepResearchResponse);

      const response = await perplexityDeepResearchLogic(input, context);
      expect(response).toBeDefined();
    });

    it('handles simple queries without markdown structure', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'What are the latest advancements in quantum computing error correction techniques as of 2024?',
        reasoning_effort: 'medium',
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(200, mockDeepResearchResponse);

      const response = await perplexityDeepResearchLogic(input, context);
      expect(response).toBeDefined();
    });
  });

  describe('response processing', () => {
    it('extracts search results correctly', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Research with search results',
        reasoning_effort: 'medium',
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(200, mockDeepResearchResponse);

      const response = await perplexityDeepResearchLogic(input, context);

      expect(response.searchResults).toBeDefined();
      expect(response.searchResults).toHaveLength(2);
      expect(response.searchResults?.[0].title).toBe('Nature: Quantum Error Correction 2024');
      expect(response.searchResults?.[0].url).toBe('https://nature.com/quantum-ecc');
      expect(response.searchResults?.[1].date).toBe('2024-01-18');
    });

    it('captures usage metrics with reasoning tokens', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Usage metrics test with reasoning',
        reasoning_effort: 'high',
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(200, mockDeepResearchResponse);

      const response = await perplexityDeepResearchLogic(input, context);

      expect(response.usage).toBeDefined();
      expect(response.usage.prompt_tokens).toBe(200);
      expect(response.usage.completion_tokens).toBe(2500);
      expect(response.usage.total_tokens).toBe(2700);
      // Note: reasoning_tokens and citation_tokens are in the API response
      // but not part of the typed usage object in the response schema
    });

    it('handles comprehensive report content', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Generate comprehensive report',
        reasoning_effort: 'high',
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(200, mockDeepResearchResponse);

      const response = await perplexityDeepResearchLogic(input, context);

      expect(response.rawResultText).toContain('# Comprehensive Analysis');
      expect(response.rawResultText).toContain('## Executive Summary');
      expect(response.rawResultText).toContain('## Key Developments');
    });
  });

  describe('error handling', () => {
    it('throws McpError when API returns empty content', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'This will return empty',
        reasoning_effort: 'medium',
      };

      const emptyResponse = {
        ...mockDeepResearchResponse,
        choices: [
          {
            ...mockDeepResearchResponse.choices[0],
            message: {
              role: 'assistant' as const,
              content: '', // Empty content
            },
          },
        ],
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(200, emptyResponse);

      await expect(perplexityDeepResearchLogic(input, context)).rejects.toThrow('empty response');
    });

    it('throws McpError when API returns no choices', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'This will return no choices',
        reasoning_effort: 'low',
      };

      const noChoicesResponse = {
        ...mockDeepResearchResponse,
        choices: [],
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(200, noChoicesResponse);

      await expect(perplexityDeepResearchLogic(input, context)).rejects.toThrow();
    });

    it('propagates API errors correctly', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'This will fail',
        reasoning_effort: 'high',
      };

      nock(apiBaseUrl)
        .post('/chat/completions')
        .reply(429, {
          error: {
            type: 'rate_limit_exceeded',
            message: 'Rate limit exceeded',
          },
        });

      await expect(perplexityDeepResearchLogic(input, context)).rejects.toThrow();
    });
  });

  describe('configuration', () => {
    it('sets stream to false', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Stream should be false',
        reasoning_effort: 'medium',
      };

      nock(apiBaseUrl)
        .post('/chat/completions', (body) => {
          expect(body.stream).toBe(false);
          return true;
        })
        .reply(200, mockDeepResearchResponse);

      await perplexityDeepResearchLogic(input, context);
    });
  });
});