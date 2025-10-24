/**
 * @fileoverview Tests for JSON parsing utilities
 * Tests partial JSON parsing with <think> blocks and error handling
 */

import { describe, it, expect } from '@jest/globals';
import { jsonParser, Allow } from '../../../src/utils/parsing/jsonParser.js';
import { createMockContext } from '../../fixtures/contexts.js';

describe('jsonParser', () => {
  const context = createMockContext({ operation: 'jsonParser.test' });

  describe('parse - basic functionality', () => {
    it('parses complete valid JSON', () => {
      const input = '{"name": "test", "value": 42}';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('parses incomplete JSON object', () => {
      const input = '{"name": "test", "value": 42';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('parses incomplete JSON array', () => {
      const input = '[1, 2, 3';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual([1, 2, 3]);
    });

    it('parses nested incomplete JSON', () => {
      const input = '{"user": {"name": "Alice", "age": 30';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ user: { name: 'Alice', age: 30 } });
    });

    it('handles arrays with mixed types', () => {
      const input = '[1, "text", true, {"key": "value"}';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual([1, 'text', true, { key: 'value' }]);
    });

    it('handles deeply nested structures', () => {
      const input = '{"level1": {"level2": {"level3": {"value": 123';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ 
        level1: { 
          level2: { 
            level3: { 
              value: 123 
            } 
          } 
        } 
      });
    });

    it('handles boolean values', () => {
      const input = '{"active": true, "disabled": false}';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ active: true, disabled: false });
    });

    it('handles null values', () => {
      const input = '{"value": null, "other": 42}';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ value: null, other: 42 });
    });

    it('handles numeric values', () => {
      const input = '{"int": 42, "float": 3.14, "negative": -10}';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ int: 42, float: 3.14, negative: -10 });
    });

    it('handles JSON with trailing comma', () => {
      const input = '{"a": 1, "b": 2,';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('parse - <think> block handling', () => {
    it('removes <think> block and parses remaining JSON', () => {
      const input = '<think>This is reasoning content</think>{"key": "value"}';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ key: 'value' });
    });

    it('handles <think> block with incomplete JSON', () => {
      const input = '<think>Thinking about the response</think>{"status": "processing", "data": [1, 2';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ status: 'processing', data: [1, 2] });
    });

    it('handles empty <think> block', () => {
      const input = '<think></think>{"result": true}';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ result: true });
    });

    it('handles <think> block with newlines', () => {
      const input = `<think>
      Line 1 of thinking
      Line 2 of thinking
      </think>
      {"answer": 42}`;
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ answer: 42 });
    });

    it('parses JSON without <think> block', () => {
      const input = '{"no": "think block"}';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ no: 'think block' });
    });
  });

  describe('parse - Allow flags', () => {
    it('uses Allow.OBJ for objects only', () => {
      const input = '{"key": "value"';
      const result = jsonParser.parse(input, Allow.OBJ, context);
      
      expect(result).toEqual({ key: 'value' });
    });

    it('uses Allow.ARR for arrays only', () => {
      const input = '[1, 2, 3';
      const result = jsonParser.parse(input, Allow.ARR, context);
      
      // Note: Allow.ARR may not parse the final element without closing bracket
      expect(result).toEqual([1, 2]);
    });

    it('uses combined flags Allow.OBJ | Allow.ARR', () => {
      const input = '{"items": [1, 2, 3';
      const result = jsonParser.parse(input, Allow.OBJ | Allow.ARR, context);
      
      // Note: May not parse final array element without closing bracket
      expect(result).toEqual({ items: [1, 2] });
    });
  });

  describe('parse - error handling', () => {
    it('throws McpError for empty string', () => {
      const input = '';
      
      expect(() => {
        jsonParser.parse(input, Allow.ALL, context);
      }).toThrow('empty');
    });

    it('throws McpError for whitespace-only string', () => {
      const input = '   ';
      
      expect(() => {
        jsonParser.parse(input, Allow.ALL, context);
      }).toThrow('empty');
    });

    it('throws McpError for empty string after <think> block', () => {
      const input = '<think>Some thinking</think>   ';
      
      expect(() => {
        jsonParser.parse(input, Allow.ALL, context);
      }).toThrow('empty');
    });

    it('handles completely invalid JSON', () => {
      const input = 'not json at all';
      
      expect(() => {
        jsonParser.parse(input, Allow.ALL, context);
      }).toThrow();
    });
  });

  describe('parse - complex scenarios', () => {
    it('handles streaming JSON scenario', () => {
      const input = '{"status": "processing", "progress": 75, "data": {"items": [1, 2';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({
        status: 'processing',
        progress: 75,
        data: { items: [1, 2] }
      });
    });

    it('handles incomplete string values', () => {
      const input = '{"message": "Hello world';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({ message: 'Hello world' });
    });

    it('handles complex nested structures with arrays and objects', () => {
      const input = '{"users": [{"name": "Alice", "age": 30}, {"name": "Bob"';
      const result = jsonParser.parse(input, Allow.ALL, context);
      
      expect(result).toEqual({
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob' }
        ]
      });
    });

    it('works without context parameter', () => {
      const input = '{"test": "no context"}';
      const result = jsonParser.parse(input);
      
      expect(result).toEqual({ test: 'no context' });
    });
  });
});