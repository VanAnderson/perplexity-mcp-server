/**
 * Unit tests for sanitization utility
 * Tests data sanitization for logging and security
 */

import { describe, it, expect } from '@jest/globals';
import { sanitization } from '../../../src/utils/security/sanitization.js';

describe('sanitization', () => {
  describe('sanitizeForLogging', () => {
    it('redacts API keys from objects', () => {
      const input = {
        apiKey: 'secret-key-12345',
        data: 'public data',
      };

      const result = sanitization.sanitizeForLogging(input) as any;

      expect(result.apiKey).toBe('[REDACTED]');
      expect(result.data).toBe('public data');
    });

    it('redacts authorization headers', () => {
      const input = {
        headers: {
          authorization: 'Bearer token-12345',
          'content-type': 'application/json',
        },
      };

      const result = sanitization.sanitizeForLogging(input) as any;

      expect(result.headers.authorization).toBe('[REDACTED]');
      expect(result.headers['content-type']).toBe('application/json');
    });

    it('redacts password fields', () => {
      const input = {
        username: 'user@example.com',
        password: 'super-secret',
        data: 'some data',
      };

      const result = sanitization.sanitizeForLogging(input) as any;

      expect(result.username).toBe('user@example.com');
      expect(result.password).toBe('[REDACTED]');
      expect(result.data).toBe('some data');
    });

    it('handles nested objects', () => {
      const input = {
        user: {
          name: 'John',
          apiKey: 'secret-key',
        },
        config: {
          timeout: 5000,
          credentials: {
            token: 'bearer-token',
          },
        },
      };

      const result = sanitization.sanitizeForLogging(input) as any;

      expect(result.user.name).toBe('John');
      expect(result.user.apiKey).toBe('[REDACTED]');
      expect(result.config.timeout).toBe(5000);
      expect(result.config.credentials).toBe('[REDACTED]');
    });

    it('handles arrays', () => {
      const input = {
        items: [
          { id: 1, apiKey: 'key1' },
          { id: 2, apiKey: 'key2' },
        ],
      };

      const result = sanitization.sanitizeForLogging(input) as any;

      expect(result.items[0].id).toBe(1);
      expect(result.items[0].apiKey).toBe('[REDACTED]');
      expect(result.items[1].id).toBe(2);
      expect(result.items[1].apiKey).toBe('[REDACTED]');
    });

    it('handles null and undefined', () => {
      expect(sanitization.sanitizeForLogging(null)).toBe(null);
      expect(sanitization.sanitizeForLogging(undefined)).toBe(undefined);
    });

    it('handles primitive types', () => {
      expect(sanitization.sanitizeForLogging('string')).toBe('string');
      expect(sanitization.sanitizeForLogging(123)).toBe(123);
      expect(sanitization.sanitizeForLogging(true)).toBe(true);
    });

    it('preserves non-sensitive data', () => {
      const input = {
        query: 'search term',
        limit: 10,
        offset: 0,
        filters: ['tag1', 'tag2'],
      };

      const result = sanitization.sanitizeForLogging(input);

      expect(result).toEqual(input);
    });
  });

  describe('sanitizeString', () => {
    it('sanitizes HTML context by default', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitization.sanitizeString(input, { context: 'html' });
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('sanitizes text context', () => {
      const input = '<b>Hello</b>';
      const result = sanitization.sanitizeString(input, { context: 'text' });
      expect(result).toBe('Hello');
    });

    it('handles empty strings', () => {
      expect(sanitization.sanitizeString('')).toBe('');
    });

    it('sanitizes URL context', () => {
      const validUrl = 'https://example.com';
      const result = sanitization.sanitizeString(validUrl, { context: 'url' });
      expect(result).toBe(validUrl);
    });

    it('rejects invalid URLs in URL context', () => {
      const invalidUrl = 'not-a-url';
      const result = sanitization.sanitizeString(invalidUrl, { context: 'url' });
      expect(result).toBe('');
    });

    it('throws error for javascript context', () => {
      expect(() => {
        sanitization.sanitizeString('alert("test")', { context: 'javascript' });
      }).toThrow();
    });
  });

  describe('sanitizeUrl', () => {
    it('validates and returns valid HTTPS URL', () => {
      const url = 'https://example.com/path';
      const result = sanitization.sanitizeUrl(url);
      expect(result).toBe(url);
    });

    it('validates and returns valid HTTP URL', () => {
      const url = 'http://example.com';
      const result = sanitization.sanitizeUrl(url);
      expect(result).toBe(url);
    });

    it('throws error for javascript: protocol', () => {
      expect(() => {
        sanitization.sanitizeUrl('javascript:alert(1)');
      }).toThrow();
    });

    it('throws error for data: protocol', () => {
      expect(() => {
        sanitization.sanitizeUrl('data:text/html,<script>alert(1)</script>');
      }).toThrow();
    });

    it('throws error for invalid URL format', () => {
      expect(() => {
        sanitization.sanitizeUrl('not-a-url');
      }).toThrow();
    });

    it('trims whitespace from URLs', () => {
      const url = '  https://example.com  ';
      const result = sanitization.sanitizeUrl(url);
      expect(result).toBe('https://example.com');
    });
  });

  describe('sanitizeNumber', () => {
    it('accepts valid numbers', () => {
      expect(sanitization.sanitizeNumber(42)).toBe(42);
      expect(sanitization.sanitizeNumber(3.14)).toBe(3.14);
    });

    it('converts numeric strings to numbers', () => {
      expect(sanitization.sanitizeNumber('42')).toBe(42);
      expect(sanitization.sanitizeNumber('3.14')).toBe(3.14);
    });

    it('clamps values to min', () => {
      const result = sanitization.sanitizeNumber(5, 10, 100);
      expect(result).toBe(10);
    });

    it('clamps values to max', () => {
      const result = sanitization.sanitizeNumber(150, 10, 100);
      expect(result).toBe(100);
    });

    it('throws error for NaN', () => {
      expect(() => {
        sanitization.sanitizeNumber(NaN);
      }).toThrow();
    });

    it('throws error for Infinity', () => {
      expect(() => {
        sanitization.sanitizeNumber(Infinity);
      }).toThrow();
    });

    it('throws error for non-numeric strings', () => {
      expect(() => {
        sanitization.sanitizeNumber('not-a-number');
      }).toThrow();
    });
  });

  describe('sanitizePath', () => {
    it('sanitizes relative paths', () => {
      const result = sanitization.sanitizePath('folder/file.txt');
      expect(result.sanitizedPath).toBeTruthy();
      expect(result.wasAbsolute).toBe(false);
    });

    it('detects path traversal attempts', () => {
      expect(() => {
        sanitization.sanitizePath('../../../etc/passwd', { rootDir: '/app' });
      }).toThrow();
    });

    it('handles absolute paths when allowed', () => {
      const result = sanitization.sanitizePath('/home/user/file.txt', { allowAbsolute: true });
      expect(result.wasAbsolute).toBe(true);
      expect(result.sanitizedPath).toBeTruthy();
    });

    it('rejects null bytes in paths', () => {
      expect(() => {
        sanitization.sanitizePath('file\x00.txt');
      }).toThrow();
    });

    it('normalizes path separators', () => {
      const result = sanitization.sanitizePath('folder\\subfolder\\file.txt', { toPosix: true });
      expect(result.sanitizedPath).toContain('/');
      expect(result.sanitizedPath).not.toContain('\\');
    });
  });

  describe('sanitizeJson', () => {
    it('parses valid JSON', () => {
      const json = '{"key": "value", "number": 42}';
      const result = sanitization.sanitizeJson(json);
      expect(result).toEqual({ key: 'value', number: 42 });
    });

    it('throws error for invalid JSON', () => {
      expect(() => {
        sanitization.sanitizeJson('not json');
      }).toThrow();
    });

    it('enforces max size limit', () => {
      const largeJson = JSON.stringify({ data: 'x'.repeat(1000) });
      expect(() => {
        sanitization.sanitizeJson(largeJson, 100);
      }).toThrow();
    });

    it('allows JSON within size limit', () => {
      const smallJson = '{"small": "data"}';
      const result = sanitization.sanitizeJson(smallJson, 1000);
      expect(result).toEqual({ small: 'data' });
    });
  });
});