import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

beforeEach(async () => {
  // Clear all call histories
  vi.clearAllMocks();

  // Dynamically import to avoid eager loading issues and reset mocked implementations
  try {
    const absensiProxy = await import('@/utils/api/absensiProxy');
    if (absensiProxy && absensiProxy.getTokenFromCookie && vi.isMockFunction(absensiProxy.getTokenFromCookie)) {
      vi.mocked(absensiProxy.getTokenFromCookie).mockResolvedValue('valid-token');
    }
  } catch {
    // ignore if module doesn't exist or isn't mocked
  }

  try {
    const apiProxy = await import('@/lib/api/apiProxy');
    if (apiProxy && apiProxy.proxyGet && vi.isMockFunction(apiProxy.proxyGet)) {
      vi.mocked(apiProxy.proxyGet).mockResolvedValue(new Response(JSON.stringify({ ok: true, data: [] }), { status: 200 }));
    }
  } catch {
    // ignore
  }
});
