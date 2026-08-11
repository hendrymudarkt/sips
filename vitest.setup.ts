import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

beforeEach(async () => {
  try {
    const upstream = await import('./utils/api/upstreamProxy');
    if (upstream && 'getTokenFromCookie' in upstream) {
      const mocked = vi.mocked(upstream.getTokenFromCookie);
      if (typeof mocked.mockResolvedValue === 'function') {
        mocked.mockResolvedValue('valid-token');
      }
    }
  } catch {}

  try {
    const security = await import('./lib/auth/security');
    if (security && 'validateSecurity' in security) {
      const mocked = vi.mocked(security.validateSecurity);
      if (typeof mocked.mockResolvedValue === 'function') {
        mocked.mockResolvedValue(null);
      }
    }
  } catch {}
});
