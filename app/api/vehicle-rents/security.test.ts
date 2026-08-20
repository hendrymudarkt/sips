import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { PUT, DELETE } from './[id]/route';
import { NextRequest, NextResponse } from 'next/server';
import { validateSecurity } from '@/lib/auth/security';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/lib/auth/security', () => ({
  validateSecurity: vi.fn(),
}));

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
}));

describe('Vehicle Rents API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return security error if validateSecurity fails on POST', async () => {
    const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
      status: 429,
    }) as unknown as NextResponse;
    vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

    const req = new NextRequest('http://localhost/api/vehicle-rents', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe('Security fail');
  });

  it('should return security error if validateSecurity fails on PUT', async () => {
    const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
      status: 403,
    }) as unknown as NextResponse;
    vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

    const req = new NextRequest('http://localhost/api/vehicle-rents/1', { method: 'PUT' });
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(403);
    expect(validateSecurity).toHaveBeenCalled();
  });

  it('should return security error if validateSecurity fails on DELETE', async () => {
    const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
      status: 403,
    }) as unknown as NextResponse;
    vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

    const req = new NextRequest('http://localhost/api/vehicle-rents/1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(403);
    expect(validateSecurity).toHaveBeenCalled();
  });
});