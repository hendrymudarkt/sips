import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
}));

describe('LHM Signatures API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply data scope to search parameters for restricted roles', async () => {
    // Mock a Mandor (MDP) user who is trying to access data from another FCBA/Afdeling
    const req = new NextRequest(
      'http://localhost/api/approval/lhm-signatures?fcba=OTHER&afdeling=OTHER&kemandoran=OTHER'
    );
    req.cookies.set('auth_token', 'valid-token');
    req.cookies.set('user_Level', 'MDP');
    req.cookies.set('user_Fcba', 'MY_FCBA');
    req.cookies.set('user_Afdeling', 'MY_AFD');
    req.cookies.set('user_Gang', 'MY_GANG');

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [{ fullname: 'Test User' }] }),
    } as Response);

    await GET(req);

    // Verify that the fetch calls use the user's scoped values, not the requested ones
    const fetchCalls = vi.mocked(global.fetch).mock.calls;
    expect(fetchCalls.length).toBeGreaterThan(0);

    fetchCalls.forEach(call => {
      const url = new URL(call[0] as string);
      expect(url.searchParams.get('fcba')).toBe('MY_FCBA');
      expect(url.searchParams.get('afdeling')).toBe('MY_AFD');
      // For MDP, it should also restrict gangcode
      if (url.searchParams.has('gangcode')) {
        expect(url.searchParams.get('gangcode')).toBe('MY_GANG');
      }
    });
  });

  it('should return generic error message and not leak internal error details on crash', async () => {
    const req = new NextRequest(
      'http://localhost/api/approval/lhm-signatures?fcba=A&afdeling=B&kemandoran=C'
    );

    // Mock a crash in getTokenFromCookie which is outside the fetch loop try-catch
    const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
    vi.mocked(getTokenFromCookie).mockRejectedValueOnce(new Error('Sensitive database crash'));

    const res = await GET(req);

    expect(res.status).toBe(500);
    const data = await res.json();

    // Should NOT contain the sensitive error text
    expect(data.message).toBe('Failed to fetch signatures');
    expect(data.success).toBe(false);
  });
});
