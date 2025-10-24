/**
 * Unit tests for costTracker utility
 * Tests Perplexity API cost calculation logic
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { calculatePerplexityCost } from '../../../src/utils/perplexity-utils/costTracker.js';
import { createMockContext } from '../../fixtures/contexts.js';
import type { RequestContext } from '../../../src/utils/internal/requestContext.js';

// Mock logger to suppress output during tests
jest.mock('../../../src/utils/internal/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warning: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

describe('costTracker - calculatePerplexityCost', () => {
  let mockContext: RequestContext;

  beforeEach(() => {
    mockContext = createMockContext({ operation: 'costTracker.test' });
  });

  describe('sonar model pricing', () => {
    it('calculates cost for sonar model with low tier', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 2000,
        total_tokens: 3000,
      };

      const cost = calculatePerplexityCost('sonar', usage, 'low', mockContext);

      // Expected: (1000/1M * $1) + (2000/1M * $1) + ($5/1000 requests)
      // = 0.001 + 0.002 + 0.005 = 0.008
      expect(cost).toBeCloseTo(0.008, 6);
    });

    it('calculates cost for sonar model with medium tier', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 2000,
        total_tokens: 3000,
      };

      const cost = calculatePerplexityCost('sonar', usage, 'medium', mockContext);

      // Expected: (1000/1M * $1) + (2000/1M * $1) + ($8/1000 requests)
      // = 0.001 + 0.002 + 0.008 = 0.011
      expect(cost).toBeCloseTo(0.011, 6);
    });

    it('calculates cost for sonar model with high tier', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 2000,
        total_tokens: 3000,
      };

      const cost = calculatePerplexityCost('sonar', usage, 'high', mockContext);

      // Expected: (1000/1M * $1) + (2000/1M * $1) + ($12/1000 requests)
      // = 0.001 + 0.002 + 0.012 = 0.015
      expect(cost).toBeCloseTo(0.015, 6);
    });
  });

  describe('sonar-pro model pricing', () => {
    it('calculates cost for sonar-pro model with high tier', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 2000,
        total_tokens: 3000,
      };

      const cost = calculatePerplexityCost('sonar-pro', usage, 'high', mockContext);

      // Expected: (1000/1M * $3) + (2000/1M * $15) + ($14/1000 requests)
      // = 0.003 + 0.030 + 0.014 = 0.047
      expect(cost).toBeCloseTo(0.047, 6);
    });
  });

  describe('sonar-reasoning model pricing', () => {
    it('calculates cost for sonar-reasoning model', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 2000,
        total_tokens: 3000,
      };

      const cost = calculatePerplexityCost('sonar-reasoning', usage, 'medium', mockContext);

      // Expected: (1000/1M * $1) + (2000/1M * $5) + ($8/1000 requests)
      // = 0.001 + 0.010 + 0.008 = 0.019
      expect(cost).toBeCloseTo(0.019, 6);
    });
  });

  describe('sonar-reasoning-pro model pricing', () => {
    it('calculates cost for sonar-reasoning-pro model', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 2000,
        total_tokens: 3000,
      };

      const cost = calculatePerplexityCost('sonar-reasoning-pro', usage, 'medium', mockContext);

      // Expected: (1000/1M * $2) + (2000/1M * $8) + ($10/1000 requests)
      // = 0.002 + 0.016 + 0.010 = 0.028
      expect(cost).toBeCloseTo(0.028, 6);
    });
  });

  describe('sonar-deep-research model pricing', () => {
    it('calculates cost with reasoning and citation tokens', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 2000,
        total_tokens: 3650,
        reasoning_tokens: 500,
        citation_tokens: 150,
        search_queries: 10,
      };

      const cost = calculatePerplexityCost('sonar-deep-research', usage, undefined, mockContext);

      // Expected:
      // Input: 1000/1M * $2 = 0.002
      // Output: 2000/1M * $8 = 0.016
      // Reasoning: 500/1M * $3 = 0.0015
      // Citation: 150/1M * $2 = 0.0003
      // Search queries: 10/1000 * $5 = 0.05
      // Total = 0.0698
      expect(cost).toBeCloseTo(0.0698, 6);
    });

    it('calculates cost without reasoning tokens', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 2000,
        total_tokens: 3150,
        citation_tokens: 150,
        search_queries: 5,
      };

      const cost = calculatePerplexityCost('sonar-deep-research', usage, null, mockContext);

      // Expected:
      // Input: 1000/1M * $2 = 0.002
      // Output: 2000/1M * $8 = 0.016
      // Citation: 150/1M * $2 = 0.0003
      // Search queries: 5/1000 * $5 = 0.025
      // Total = 0.0433
      expect(cost).toBeCloseTo(0.0433, 6);
    });
  });

  describe('edge cases', () => {
    it('returns null for unknown model', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 2000,
        total_tokens: 3000,
      };

      const cost = calculatePerplexityCost('unknown-model', usage, 'medium', mockContext);

      expect(cost).toBeNull();
    });

    it('handles zero token usage', () => {
      const usage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      const cost = calculatePerplexityCost('sonar', usage, 'low', mockContext);

      // Only request fee: $5/1000 = 0.005
      expect(cost).toBeCloseTo(0.005, 6);
    });

    it('calculates cost without tier (undefined)', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 2000,
        total_tokens: 3000,
      };

      const cost = calculatePerplexityCost('sonar', usage, undefined, mockContext);

      // No request fee applied when tier is undefined
      // Expected: (1000/1M * $1) + (2000/1M * $1) = 0.003
      expect(cost).toBeCloseTo(0.003, 6);
    });

    it('handles large token counts correctly', () => {
      const usage = {
        prompt_tokens: 500000,
        completion_tokens: 1000000,
        total_tokens: 1500000,
      };

      const cost = calculatePerplexityCost('sonar-pro', usage, 'high', mockContext);

      // Expected: (500000/1M * $3) + (1000000/1M * $15) + ($14/1000)
      // = 1.5 + 15 + 0.014 = 16.514
      expect(cost).toBeCloseTo(16.514, 6);
    });
  });

  describe('precision and rounding', () => {
    it('rounds to 6 decimal places', () => {
      const usage = {
        prompt_tokens: 123,
        completion_tokens: 456,
        total_tokens: 579,
      };

      const cost = calculatePerplexityCost('sonar', usage, 'medium', mockContext);

      expect(cost).toBeDefined();
      expect(cost!.toString().split('.')[1]?.length).toBeLessThanOrEqual(6);
    });
  });
});