import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

beforeEach(async () => {
  try {
    const upstreamProxy = await import('@/utils/api/upstreamProxy');
    if (
      upstreamProxy &&
      upstreamProxy.getTokenFromCookie &&
      vi.isMockFunction(upstreamProxy.getTokenFromCookie)
    ) {
      vi.mocked(upstreamProxy.getTokenFromCookie).mockResolvedValue('valid-token');
    }
  } catch {}

  try {
    const security = await import('@/lib/auth/security');
    if (security && security.validateSecurity && vi.isMockFunction(security.validateSecurity)) {
      vi.mocked(security.validateSecurity).mockResolvedValue(null);
    }
  } catch {}
});
