import {
  describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest, NextResponse } from 'next/server';
import { validateSecurity } from '@/lib/auth/security';
vi.stubGlobal('fetch', vi.fn());
vi.mock('@/lib/auth/security', () => ({  validateSecurity: vi.fn(),}));
vi.mock('@/utils/api/upstreamProxy', () => ({  BACKEND_URL: 'http://trusted-backend.com',  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),}));
vi.mock('next/headers', () => ({  cookies: vi.fn(),}));
vi.mock('@/lib/constants', () => ({  UserLevel: { ADMIN: 'ADMIN' },}));
describe('Token API Security', () => {
  beforeEach(() => {
  vi.clearAllMocks();  });
  it('should return security error if validateSecurity fails', async () => {    const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {      status: 403,    }) as unknown as NextResponse;
    vi.mocked(validateSecurity).mockResolvedValue(errorResponse);    const req = new NextRequest('http://localhost/api/auth/token');    const res = await GET(req);    expect(res.status).toBe(403);    const data = await res.json();    expect(data.error).toBe('Security fail');  });
  it('should return 401 if no token', async () => {
  vi.mocked(validateSecurity).mockResolvedValue(null);    const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
    vi.mocked(getTokenFromCookie).mockResolvedValue(undefined);    const req = new NextRequest('http://localhost/api/auth/token');    const res = await GET(req);    expect(res.status).toBe(401);    const data = await res.json();    expect(data.message).toBe('No token');  });
  it('should return 400 if user ID cookie is missing', async () => {
  vi.mocked(validateSecurity).mockResolvedValue(null);    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockResolvedValue({      get: vi.fn(() => undefined),    } as never);    const req = new NextRequest('http://localhost/api/auth/token');    const res = await GET(req);    expect(res.status).toBe(400);    const data = await res.json();    expect(data.message).toBe('User ID missing');  });
  it('should return generic error if profile verification fails', async () => {
  vi.mocked(validateSecurity).mockResolvedValue(null);    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockResolvedValue({      get: vi.fn((name: string) =>        name === 'log_id' ? { value: '123' } : undefined      ),    } as never);
    vi.mocked(global.fetch).mockResolvedValue({      ok: false,      status: 500,      json: async () => ({ message: 'Backend unreachable at 10.0.0.1:5432' }),    } as Response);    const req = new NextRequest('http://localhost/api/auth/token');    const res = await GET(req);    expect(res.status).toBe(500);    const data = await res.json();    expect(data.message).toBe('Failed to verify permissions');  });
  it('should return 403 if user is not admin', async () => {
  vi.mocked(validateSecurity).mockResolvedValue(null);    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockResolvedValue({      get: vi.fn((name: string) =>        name === 'log_id' ? { value: '123' } : undefined      ),    } as never);
    vi.mocked(global.fetch).mockResolvedValue({      ok: true,      status: 200,      json: async () => ({ level: 'USER' }),    } as Response);    const req = new NextRequest('http://localhost/api/auth/token');    const res = await GET(req);    expect(res.status).toBe(403);    const data = await res.json();    expect(data.message).toContain('Admin access required');  });
  it('should return generic error on internal crash', async () => {
  vi.mocked(validateSecurity).mockResolvedValue(null);    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockRejectedValue(new Error('Stack trace: cookies module failure'));    const req = new NextRequest('http://localhost/api/auth/token');    const res = await GET(req);    expect(res.status).toBe(500);    const data = await res.json();    expect(data.message).toBe('Internal server error');  });});