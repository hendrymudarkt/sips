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

  // Safe paths must start with a single '/'
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    return false;
  }

  try {
    // Utilize native URL constructor with a localhost base to parse relative redirect
    const parsed = new URL(path, 'http://localhost');

    // The parsed hostname must remain 'localhost' (ensuring it's relative)
    if (parsed.hostname !== 'localhost') {
      return false;
    }

    // Isolate the path-only component before query or hash boundaries
    const pathOnly = path.split('?')[0].split('#')[0];

    // Strictly verify that the path component lacks backslashes, URL-encoded backslashes, colons, or double slashes
    if (
      pathOnly.includes('\\') ||
      pathOnly.toLowerCase().includes('%5c') ||
      pathOnly.includes(':') ||
      pathOnly.includes('//')
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
