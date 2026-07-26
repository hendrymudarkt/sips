import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

beforeEach(async () => {
  try {
    const { getTokenFromCookie } = await import('@/utils/api/absensiProxy');
    if (vi.isMockFunction(getTokenFromCookie)) {
      vi.mocked(getTokenFromCookie).mockResolvedValue('valid-token');
    }
  } catch {}

  try {
    const { proxyGet } = await import('@/lib/api/apiProxy');
    if (vi.isMockFunction(proxyGet)) {
      vi.mocked(proxyGet).mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] })));
    }
  } catch {}
});
