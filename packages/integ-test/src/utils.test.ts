import {
  getErrorMessage,
  parseDateRange,
  parseGmailDate,
} from '@seawatts/api/utils';
import { describe, expect, it } from 'vitest';

describe('Shared Utilities Integration Tests', () => {
  describe('parseDateRange', () => {
    it('should return undefined for undefined input', () => {
      const result = parseDateRange(undefined);

      expect(result).toBeUndefined();
    });

    it('should parse start and end dates', () => {
      const result = parseDateRange({
        end: '2024-12-31T23:59:59.999Z',
        start: '2024-12-01T00:00:00.000Z',
      });

      expect(result).toBeDefined();
      expect(result?.start).toBeInstanceOf(Date);
      expect(result?.end).toBeInstanceOf(Date);
      expect(result?.start?.getFullYear()).toBe(2024);
      expect(result?.end?.getMonth()).toBe(11); // December
    });

    it('should handle partial date range (only start)', () => {
      const result = parseDateRange({
        start: '2024-12-01T00:00:00.000Z',
      });

      expect(result).toBeDefined();
      expect(result?.start).toBeInstanceOf(Date);
      expect(result?.end).toBeUndefined();
    });

    it('should handle partial date range (only end)', () => {
      const result = parseDateRange({
        end: '2024-12-31T23:59:59.999Z',
      });

      expect(result).toBeDefined();
      expect(result?.start).toBeUndefined();
      expect(result?.end).toBeInstanceOf(Date);
    });

    it('should handle empty object', () => {
      const result = parseDateRange({});

      expect(result).toBeDefined();
      expect(result?.start).toBeUndefined();
      expect(result?.end).toBeUndefined();
    });
  });

  describe('parseGmailDate', () => {
    it('should parse Gmail internal date string', () => {
      // Gmail uses milliseconds since epoch as a string
      const timestamp = '1703001600000'; // Dec 20, 2023 00:00:00 UTC
      const result = parseGmailDate(timestamp);

      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2023);
      expect(result.getUTCMonth()).toBe(11); // December
      expect(result.getUTCDate()).toBe(19);
    });

    it('should handle null input', () => {
      const result = parseGmailDate(null);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(0);
    });

    it('should handle undefined input', () => {
      const result = parseGmailDate(undefined);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(0);
    });

    it('should handle current timestamps', () => {
      const now = Date.now();
      const result = parseGmailDate(String(now));

      expect(Math.abs(result.getTime() - now)).toBeLessThan(1000);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Something went wrong');
      const result = getErrorMessage(error);

      expect(result).toBe('Something went wrong');
    });

    it('should handle string errors', () => {
      const error = 'String error message';
      const result = getErrorMessage(error);

      expect(result).toBe('String error message');
    });

    it('should return unknown for null', () => {
      const result = getErrorMessage(null);

      expect(result).toBe('Unknown error');
    });

    it('should return unknown for undefined', () => {
      const result = getErrorMessage(undefined);

      expect(result).toBe('Unknown error');
    });

    it('should return unknown for objects without message', () => {
      const result = getErrorMessage({ code: 500 });

      expect(result).toBe('Unknown error');
    });

    it('should return unknown for numbers', () => {
      const result = getErrorMessage(404);

      expect(result).toBe('Unknown error');
    });

    it('should handle TypeError', () => {
      const error = new TypeError('Cannot read property');
      const result = getErrorMessage(error);

      expect(result).toBe('Cannot read property');
    });

    it('should handle custom error classes', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error occurred');
      const result = getErrorMessage(error);

      expect(result).toBe('Custom error occurred');
    });
  });

  describe('Date Range with Search Service', () => {
    it('should produce correct date objects for filtering', () => {
      const inputRange = {
        end: '2024-12-31T23:59:59.999Z',
        start: '2024-12-01T00:00:00.000Z',
      };

      const parsedRange = parseDateRange(inputRange);

      // These should be usable in database queries
      expect(parsedRange?.start?.toISOString()).toBe(inputRange.start);
      expect(parsedRange?.end?.toISOString()).toBe(inputRange.end);
    });

    it('should handle timezone-aware dates', () => {
      const pstDate = '2024-12-20T08:00:00.000-08:00';
      const result = parseDateRange({ start: pstDate });

      // Should convert to UTC
      expect(result?.start).toBeInstanceOf(Date);
      expect(result?.start?.getUTCHours()).toBe(16);
    });
  });
});
