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

  it('should return false for advanced parser-differential bypass attempts (CWE-601)', () => {
    expect(isValidRedirect('/\\google.com')).toBe(false);
    expect(isValidRedirect('/\\\\google.com')).toBe(false);
    expect(isValidRedirect('/%5Cgoogle.com')).toBe(false);
    expect(isValidRedirect('/%5cgoogle.com')).toBe(false);
    expect(isValidRedirect('/google.com:80')).toBe(false);
    expect(isValidRedirect('/google.com/')).toBe(true); // normal relative path
  });

  it('should permit safe colons and double slashes in query parameters', () => {
    expect(isValidRedirect('/dashboard?timestamp=2023-10-10T12:00:00Z')).toBe(true);
    expect(isValidRedirect('/dashboard?target=https://trusted.local/auth')).toBe(true);
    expect(isValidRedirect('/login?redirect=//evil.com')).toBe(true); // query parameters are safe for redirection targets unless raw redirected
  });
});
