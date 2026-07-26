export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeNumericInput(input: string): string {
  return input.replace(/[^0-9.-]/g, '');
}

/**
 * Validates that a redirect path is safe to use.
 * Prevents Open Redirect vulnerabilities (CWE-601).
 * Safe paths must start with a single '/' and not be protocol-relative.
 */
export function isValidRedirect(path: string | null | undefined): boolean {
  if (!path) return false;

  // Safe relative paths must strictly start with a single '/'
  // and cannot be protocol-relative ('//') or backslash-prefixed ('/\')
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    return false;
  }

  // Relative paths should never contain backslashes on standard web servers.
  // We forbid backslashes ('\') and their URL-encoded equivalents ('%5c' / '%5C')
  // to prevent browser-specific backslash normalization bypasses (e.g. Chrome/Edge)
  if (path.includes('\\') || path.toLowerCase().includes('%5c')) {
    return false;
  }

  // Prevent embedded absolute URLs, protocols, or double-slashes within the path
  // (e.g. '/http://evil.com' or '/javascript:alert(1)')
  if (path.includes('//') || path.includes(':')) {
    return false;
  }

  return true;
}
