/**
 * @fileoverview Tests for ErrorHandler utility
 * Tests error classification, mapping, formatting, and core functionality
 */

import { describe, it, expect } from '@jest/globals';
import { ErrorHandler } from '../../../src/utils/internal/errorHandler.js';
import { BaseErrorCode, McpError } from '../../../src/types-global/errors.js';

describe('ErrorHandler', () => {
  describe('determineErrorCode', () => {
    it('should return code from McpError', () => {
      const error = new McpError(BaseErrorCode.VALIDATION_ERROR, 'Test error');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.VALIDATION_ERROR);
    });

    it('should map TypeError to VALIDATION_ERROR', () => {
      const error = new TypeError('Type error');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.VALIDATION_ERROR);
    });

    it('should map SyntaxError to VALIDATION_ERROR', () => {
      const error = new SyntaxError('Syntax error');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.VALIDATION_ERROR);
    });

    it('should map ReferenceError to INTERNAL_ERROR', () => {
      const error = new ReferenceError('Reference error');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.INTERNAL_ERROR);
    });

    it('should map RangeError to VALIDATION_ERROR', () => {
      const error = new RangeError('Range error');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.VALIDATION_ERROR);
    });

    it('should match unauthorized pattern', () => {
      const error = new Error('Unauthorized access');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.UNAUTHORIZED);
    });

    it('should match invalid token pattern', () => {
      const error = new Error('Invalid token provided');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.UNAUTHORIZED);
    });

    it('should match expired token pattern', () => {
      const error = new Error('expired token');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.UNAUTHORIZED);
    });

    it('should match forbidden pattern', () => {
      const error = new Error('Permission denied');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.FORBIDDEN);
    });

    it('should match access denied pattern', () => {
      const error = new Error('Access denied to resource');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.FORBIDDEN);
    });

    it('should match not found pattern', () => {
      const error = new Error('Resource not found');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.NOT_FOUND);
    });

    it('should match missing pattern', () => {
      const error = new Error('Missing required resource');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.NOT_FOUND);
    });

    it('should match validation pattern', () => {
      const error = new Error('Invalid input data');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.VALIDATION_ERROR);
    });

    it('should match malformed pattern', () => {
      const error = new Error('Malformed request');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.VALIDATION_ERROR);
    });

    it('should match conflict pattern', () => {
      const error = new Error('Resource already exists');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.CONFLICT);
    });

    it('should match duplicate pattern', () => {
      const error = new Error('Duplicate entry detected');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.CONFLICT);
    });

    it('should match rate limit pattern', () => {
      const error = new Error('Rate limit exceeded');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.RATE_LIMITED);
    });

    it('should match too many requests pattern', () => {
      const error = new Error('Too many requests');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.RATE_LIMITED);
    });

    it('should match timeout pattern', () => {
      const error = new Error('Request timed out');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.TIMEOUT);
    });

    it('should match deadline exceeded pattern', () => {
      const error = new Error('Deadline exceeded');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.TIMEOUT);
    });

    it('should match service unavailable pattern', () => {
      const error = new Error('Service unavailable');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.SERVICE_UNAVAILABLE);
    });

    it('should match bad gateway pattern', () => {
      const error = new Error('Bad gateway');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.SERVICE_UNAVAILABLE);
    });

    it('should default to INTERNAL_ERROR for unknown errors', () => {
      const error = new Error('Some random error');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.INTERNAL_ERROR);
    });

    it('should handle string errors', () => {
      expect(ErrorHandler.determineErrorCode('string error')).toBe(BaseErrorCode.INTERNAL_ERROR);
    });

    it('should handle null', () => {
      expect(ErrorHandler.determineErrorCode(null)).toBe(BaseErrorCode.INTERNAL_ERROR);
    });

    it('should handle undefined', () => {
      expect(ErrorHandler.determineErrorCode(undefined)).toBe(BaseErrorCode.INTERNAL_ERROR);
    });

    it('should handle numbers', () => {
      expect(ErrorHandler.determineErrorCode(123)).toBe(BaseErrorCode.INTERNAL_ERROR);
    });

    it('should be case-insensitive for pattern matching', () => {
      const error = new Error('UNAUTHORIZED ACCESS');
      expect(ErrorHandler.determineErrorCode(error)).toBe(BaseErrorCode.UNAUTHORIZED);
    });
  });

  describe('mapError', () => {
    it('should map error based on message pattern', () => {
      const error = new Error('Authentication failed');
      const mappings = [
        {
          pattern: /auth/i,
          errorCode: BaseErrorCode.UNAUTHORIZED,
          factory: (err: unknown) => new McpError(BaseErrorCode.UNAUTHORIZED, 'Auth error'),
        },
      ];

      const result = ErrorHandler.mapError(error, mappings);
      expect(result).toBeInstanceOf(McpError);
      expect((result as McpError).code).toBe(BaseErrorCode.UNAUTHORIZED);
    });

    it('should map error based on error name pattern', () => {
      const error = new TypeError('Type mismatch');
      const mappings = [
        {
          pattern: /TypeError/i,
          errorCode: BaseErrorCode.VALIDATION_ERROR,
          factory: (err: unknown) => new McpError(BaseErrorCode.VALIDATION_ERROR, 'Type error'),
        },
      ];

      const result = ErrorHandler.mapError(error, mappings);
      expect(result).toBeInstanceOf(McpError);
    });

    it('should test multiple patterns in order', () => {
      const error = new Error('Invalid authentication token');
      const mappings = [
        {
          pattern: /invalid/i,
          errorCode: BaseErrorCode.VALIDATION_ERROR,
          factory: () => new McpError(BaseErrorCode.VALIDATION_ERROR, 'Invalid'),
        },
        {
          pattern: /auth/i,
          errorCode: BaseErrorCode.UNAUTHORIZED,
          factory: () => new McpError(BaseErrorCode.UNAUTHORIZED, 'Auth'),
        },
      ];

      const result = ErrorHandler.mapError(error, mappings);
      // Should match first pattern
      expect((result as McpError).code).toBe(BaseErrorCode.VALIDATION_ERROR);
    });

    it('should use defaultFactory when no mapping matches', () => {
      const error = new Error('Random error');
      const mappings = [
        {
          pattern: /specific/i,
          errorCode: BaseErrorCode.NOT_FOUND,
          factory: () => new McpError(BaseErrorCode.NOT_FOUND, 'Not found'),
        },
      ];

      const result = ErrorHandler.mapError(
        error,
        mappings,
        (err) => new McpError(BaseErrorCode.INTERNAL_ERROR, 'Default error')
      );

      expect(result).toBeInstanceOf(McpError);
      expect((result as McpError).code).toBe(BaseErrorCode.INTERNAL_ERROR);
    });

    it('should return original error when no mapping and no defaultFactory', () => {
      const error = new Error('Original error');
      const mappings: any[] = [];

      const result = ErrorHandler.mapError(error, mappings);
      expect(result).toBe(error);
    });

    it('should wrap non-Error values when no mapping matches', () => {
      const mappings: any[] = [];

      const result = ErrorHandler.mapError('string error', mappings);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('string error');
    });

    it('should pass additionalContext to factory', () => {
      const error = new Error('Test error');
      let capturedContext: any = null;

      const mappings = [
        {
          pattern: /test/i,
          errorCode: BaseErrorCode.INTERNAL_ERROR,
          factory: (err: unknown, context?: Record<string, unknown>) => {
            capturedContext = context;
            return new Error('Mapped');
          },
          additionalContext: { source: 'test', level: 'high' },
        },
      ];

      ErrorHandler.mapError(error, mappings);
      expect(capturedContext).toEqual({ source: 'test', level: 'high' });
    });
  });

  describe('formatError', () => {
    it('should format McpError correctly', () => {
      const error = new McpError(BaseErrorCode.VALIDATION_ERROR, 'Validation failed', {
        field: 'email',
        reason: 'invalid format',
      });

      const formatted = ErrorHandler.formatError(error);

      expect(formatted).toEqual({
        code: BaseErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: { field: 'email', reason: 'invalid format' },
      });
    });

    it('should format standard Error correctly', () => {
      const error = new Error('Not found');
      error.name = 'NotFoundError';

      const formatted = ErrorHandler.formatError(error);

      expect(formatted).toHaveProperty('code');
      expect(formatted).toHaveProperty('message', 'Not found');
      expect(formatted).toHaveProperty('details');
      expect((formatted.details as any).errorType).toBe('NotFoundError');
    });

    it('should format TypeError correctly', () => {
      const error = new TypeError('Invalid type');

      const formatted = ErrorHandler.formatError(error);

      expect(formatted.code).toBe(BaseErrorCode.VALIDATION_ERROR);
      expect(formatted.message).toBe('Invalid type');
      expect((formatted.details as any).errorType).toBe('TypeError');
    });

    it('should format string errors', () => {
      const formatted = ErrorHandler.formatError('string error');

      expect(formatted).toHaveProperty('code', BaseErrorCode.UNKNOWN_ERROR);
      expect(formatted).toHaveProperty('message', 'string error');
      expect(formatted).toHaveProperty('details');
    });

    it('should handle null error', () => {
      const formatted = ErrorHandler.formatError(null);

      expect(formatted).toHaveProperty('code', BaseErrorCode.UNKNOWN_ERROR);
      expect(formatted).toHaveProperty('message');
      expect(formatted.message).toContain('Null');
      expect(formatted).toHaveProperty('details');
    });

    it('should handle undefined error', () => {
      const formatted = ErrorHandler.formatError(undefined);

      expect(formatted).toHaveProperty('code', BaseErrorCode.UNKNOWN_ERROR);
      expect(formatted).toHaveProperty('message');
      expect(formatted.message).toContain('Undefined');
    });

    it('should handle McpError with empty details', () => {
      const error = new McpError(BaseErrorCode.INTERNAL_ERROR, 'Internal error');

      const formatted = ErrorHandler.formatError(error);

      expect(formatted).toEqual({
        code: BaseErrorCode.INTERNAL_ERROR,
        message: 'Internal error',
        details: {},
      });
    });

    it('should handle McpError with null details', () => {
      const error = new McpError(BaseErrorCode.INTERNAL_ERROR, 'Internal error', null as any);

      const formatted = ErrorHandler.formatError(error);

      expect(formatted.code).toBe(BaseErrorCode.INTERNAL_ERROR);
      expect(formatted.message).toBe('Internal error');
      expect(formatted.details).toEqual({});
    });

    it('should handle number errors', () => {
      const formatted = ErrorHandler.formatError(42);

      expect(formatted.code).toBe(BaseErrorCode.UNKNOWN_ERROR);
      expect(formatted.message).toBe('42');
    });

    it('should handle object errors', () => {
      const formatted = ErrorHandler.formatError({ custom: 'error' });

      expect(formatted.code).toBe(BaseErrorCode.UNKNOWN_ERROR);
      expect(formatted.message).toContain('custom');
    });
  });
});