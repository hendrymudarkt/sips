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
 * Hardened against advanced Open Redirect vectors (CWE-601).
 * Ensures redirect paths strictly start with a single '/' and completely
 * lack backslashes ('\'), URL-encoded backslashes ('%5c' / '%5C'),
 * colons (':'), or double slashes ('//') anywhere in the path string's path component,
 * while allowing standard query/hash parameters to contain colons and double slashes safely.
 */
export function isValidRedirect(path: string | null | undefined): boolean {
  if (!path) return false;

  // Must start with exactly one '/' and not start with '//' or '/\'
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    return false;
  }

  // Validate the path against a dummy origin using the URL constructor
  try {
    const dummyOrigin = 'http://localhost';
    const parsed = new URL(path, dummyOrigin);
    if (parsed.origin !== dummyOrigin) {
      return false;
    }
  } catch {
    return false;
  }

  // Isolate the path-only component (before query '?' or hash '#') to prevent
  // advanced parser-differential bypasses (like backslash, colon, double slash,
  // or URL-encoded backslash in path segments), while allowing safe query parameters.
  const [pathPart] = path.split(/[?#]/);
  const lowerPathPart = pathPart.toLowerCase();
  if (
    pathPart.includes('\\') ||
    pathPart.includes(':') ||
    pathPart.includes('//') ||
    lowerPathPart.includes('%5c')
  ) {
    return false;
  }

  return true;
}
