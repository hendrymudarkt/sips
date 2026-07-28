import { describe, it, expect } from 'vitest';
import {
  formatPerfDate,
  formatPerfNumber,
  getCachedDateTimeFormat,
  getCachedNumberFormat,
  getCachedCollator,
  perfCompare,
} from './perf-formatter';

describe('perf-formatter', () => {
  describe('getCachedDateTimeFormat', () => {
    it('should return an Intl.DateTimeFormat instance', () => {
      const formatter = getCachedDateTimeFormat('en-US');
      expect(formatter).toBeInstanceOf(Intl.DateTimeFormat);
    });

    it('should cache instances', () => {
      const f1 = getCachedDateTimeFormat('en-US');
      const f2 = getCachedDateTimeFormat('en-US');
      expect(f1).toBe(f2);
    });

    it('should cache instances with options', () => {
      const options: Intl.DateTimeFormatOptions = { month: 'long' };
      const f1 = getCachedDateTimeFormat('en-US', options);
      const f2 = getCachedDateTimeFormat('en-US', options);
      expect(f1).toBe(f2);
    });
  });

  describe('getCachedCollator & perfCompare', () => {
    it('should return an Intl.Collator instance and cache it', () => {
      const collator1 = getCachedCollator('en-US');
      const collator2 = getCachedCollator('en-US');
      expect(collator1).toBeInstanceOf(Intl.Collator);
      expect(collator1).toBe(collator2);
    });

    it('should compare strings correctly via perfCompare', () => {
      expect(perfCompare('apple', 'banana', 'en-US')).toBeLessThan(0);
      expect(perfCompare('cherry', 'banana', 'en-US')).toBeGreaterThan(0);
      expect(perfCompare('apple', 'apple', 'en-US')).toBe(0);
    });
  });

  describe('getCachedNumberFormat', () => {
    it('should return an Intl.NumberFormat instance', () => {
      const formatter = getCachedNumberFormat('en-US');
      expect(formatter).toBeInstanceOf(Intl.NumberFormat);
    });

    it('should cache instances', () => {
      const f1 = getCachedNumberFormat('en-US');
      const f2 = getCachedNumberFormat('en-US');
      expect(f1).toBe(f2);
    });
  });

  describe('formatPerfDate', () => {
    it('should format a date string correctly', () => {
      const date = '2023-01-01';
      const formatted = formatPerfDate(date, 'en-US');
      expect(formatted).toBe('1/1/2023');
    });

    it('should handle invalid dates gracefully', () => {
      expect(formatPerfDate('invalid', 'en-US')).toBe('invalid');
    });

    it('should return empty string for null/undefined', () => {
      expect(formatPerfDate('', 'en-US')).toBe('');
    });
  });

  describe('formatPerfNumber', () => {
    it('should format a number correctly', () => {
      const num = 1234.56;
      const formatted = formatPerfNumber(num, 'en-US');
      expect(formatted).toBe('1,234.56');
    });

    it('should handle numeric strings', () => {
      expect(formatPerfNumber('1234.56', 'en-US')).toBe('1,234.56');
    });

    it('should handle invalid numbers', () => {
      expect(formatPerfNumber('abc', 'en-US')).toBe('abc');
    });
  });
});
