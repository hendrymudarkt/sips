import { describe, it, expect } from 'vitest';
import { isValidRedirect } from './sanitization';

describe('isValidRedirect', () => {
  it('should return true for valid relative paths', () => {
    expect(isValidRedirect('/dashboard')).toBe(true);
    expect(isValidRedirect('/profile?id=1')).toBe(true);
    expect(isValidRedirect('/')).toBe(true);
  });

  it('should return false for empty or null paths', () => {
    expect(isValidRedirect('')).toBe(false);
    expect(isValidRedirect(null)).toBe(false);
    expect(isValidRedirect(undefined)).toBe(false);
  });

  it('should return false for protocol-relative paths', () => {
    expect(isValidRedirect('//evil.com')).toBe(false);
  });

  it('should return false for absolute URLs', () => {
    expect(isValidRedirect('https://google.com')).toBe(false);
    expect(isValidRedirect('http://evil.com/dashboard')).toBe(false);
    expect(isValidRedirect('javascript:alert(1)')).toBe(false);
  });

  it('should return false for paths starting with backslash', () => {
    expect(isValidRedirect('/\\evil.com')).toBe(false);
  });

  it('should return false for paths with leading whitespace or control characters', () => {
    expect(isValidRedirect('  /dashboard')).toBe(false);
    expect(isValidRedirect('\n/dashboard')).toBe(false);
    expect(isValidRedirect('\r/dashboard')).toBe(false);
    expect(isValidRedirect('\t/dashboard')).toBe(false);
  });

  it('should return false for paths containing backslashes anywhere', () => {
    expect(isValidRedirect('/dashboard\\evil.com')).toBe(false);
    expect(isValidRedirect('/foo\\bar')).toBe(false);
  });

  it('should return false for paths containing URL-encoded backslashes', () => {
    expect(isValidRedirect('/%5cevil.com')).toBe(false);
    expect(isValidRedirect('/%5Cfoo')).toBe(false);
  });

  it('should return false for paths with embedded protocols, colons, or double slashes', () => {
    expect(isValidRedirect('/http://evil.com')).toBe(false);
    expect(isValidRedirect('/https://evil.com')).toBe(false);
    expect(isValidRedirect('/javascript:alert(1)')).toBe(false);
    expect(isValidRedirect('/foo:bar')).toBe(false);
    expect(isValidRedirect('///evil.com')).toBe(false);
  });
});
