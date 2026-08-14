import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET } from './route';

import { NextRequest } from 'next/server';
import { getTokenFromCookie } from '@/utils/api/upstreamProxy';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
}));

describe('User Detail API Security', () => {beforeEach(() => {vi.clearAllMocks();
  vi.mocked(getTokenFromCookie).mockResolvedValue('valid-token');
  });

  const context = { params: Promise.resolve({ id: '123' }) };

  it('should return 401 if no token', async () => {
    const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');

    vi.mocked(getTokenFromCookie).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/master/user/123');
    const res = await GET(req, context);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthenticated');
  });

  it('should return generic error message on upstream failure', async () => {vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'DB error: timeout connecting to 10.0.0.5' }),
    } as Response);

    const req = new NextRequest('http://localhost/api/master/user/123');
    const res = await GET(req, context);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to fetch user data');
    expect(data.ok).toBe(false);
  });
});
