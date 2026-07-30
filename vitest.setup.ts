import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

beforeEach(async () => {
  try {
    const upstreamProxy = await import('@/utils/api/upstreamProxy');
    if (upstreamProxy && vi.isMockFunction(upstreamProxy.getTokenFromCookie)) {
      upstreamProxy.getTokenFromCookie.mockReset();
      upstreamProxy.getTokenFromCookie.mockResolvedValue('valid-token');
    }
  } catch (e) {}

  try {
    const security = await import('@/lib/auth/security');
    if (security && vi.isMockFunction(security.validateSecurity)) {
      security.validateSecurity.mockReset();
      security.validateSecurity.mockResolvedValue(null);
    }
  } catch (e) {}
});
