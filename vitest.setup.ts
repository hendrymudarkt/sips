import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

beforeEach(async () => {
  // Solve Vitest Mock Leakage pattern globally by resetting mocked implementations
  try {
    const upstreamProxy = await import('@/utils/api/upstreamProxy');
    if (upstreamProxy && upstreamProxy.getTokenFromCookie) {
      vi.mocked(upstreamProxy.getTokenFromCookie).mockResolvedValue('valid-token');
    }
  } catch (e) {
    // Ignore if not mocked or not found
  }

  try {
    const security = await import('@/lib/auth/security');
    if (security && security.validateSecurity) {
      vi.mocked(security.validateSecurity).mockResolvedValue(null);
    }
  } catch (e) {
    // Ignore if not mocked or not found
  }
});
