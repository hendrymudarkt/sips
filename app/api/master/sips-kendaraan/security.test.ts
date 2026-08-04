import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest, NextResponse } from 'next/server';
import { validateSecurity } from '@/lib/auth/security';
import { UserLevel } from '@/lib/constants';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/lib/auth/security', () => ({
  validateSecurity: vi.fn(),
}));

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
}));

vi.mock('@/lib/api/apiProxy', () => ({
  authHeaders: vi.fn(() => ({ Authorization: 'Bearer valid-token' })),
  parseJsonSafe: vi.fn((res) => res.json().then((data: unknown) => ({ data, parseError: false }))),
  isRecord: vi.fn((v) => typeof v === 'object' && v !== null),
}));

describe('SIPS Kendaraan API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return security error if validateSecurity fails', async () => {
    const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
      status: 403,
    }) as unknown as NextResponse;
    vi.mocked(validateSecurity).mockResolvedValue(errorResponse);
    const req = new NextRequest('http://localhost/api/master/sips-kendaraan');
    const res = await GET(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Security fail');
  });

  it('should return 401 if no token', async () => {
    vi.mocked(validateSecurity).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/master/sips-kendaraan');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthenticated');
  });

  it('should return generic error message on upstream failure', async () => {
    vi.mocked(validateSecurity).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/master/sips-kendaraan');
    req.cookies.set('auth_token', 'valid-token');
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ message: 'DB error at 10.0.0.5:5432' }),
      json: async () => ({ message: 'DB error at 10.0.0.5:5432' }),
    } as Response);
    const res = await GET(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to fetch kendaraan data');
    expect(data.ok).toBe(false);
  });

  it('should enforce role-based scoping (CWE-285)', async () => {
    vi.mocked(validateSecurity).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/master/sips-kendaraan?fcba=OTHER_FCBA');
    req.cookies.set('auth_token', 'valid-token');
    req.cookies.set('user_Level', UserLevel.MANAGER);
    req.cookies.set('user_Fcba', 'MY_FCBA');

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    await GET(req);
    const lastFetchUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
    expect(lastFetchUrl).toContain('fcba=MY_FCBA');
    expect(lastFetchUrl).not.toContain('fcba=OTHER_FCBA');
  });
});
