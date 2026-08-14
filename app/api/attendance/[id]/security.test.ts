import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET, PUT, DELETE, POST } from './route';

import { NextRequest, NextResponse } from 'next/server';

import { validateSecurity } from '@/lib/auth/security';
import { getTokenFromCookie } from '@/utils/api/upstreamProxy';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/lib/auth/security', () => ({
  validateSecurity: vi.fn(),
}));

vi.mock('@/utils/api/upstreamProxy', () => ({
  ABSENSI_BASE: 'http://trusted-backend.com/api/attendance',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
}));

vi.mock('@/lib/api/apiProxy', () => ({
  authHeaders: vi.fn(() => ({ Authorization: 'Bearer valid-token' })),
  parseJsonSafe: vi.fn((res) => res.json().then((data: unknown) => ({ data, parseError: false }))),
  proxyFormDataPut: vi.fn(() =>
    NextResponse.json({ ok: false, error: 'Upstream request failed' }, { status: 502 })
  ),
  proxyFormDataDelete: vi.fn(() =>
    NextResponse.json({ ok: false, error: 'Upstream request failed' }, { status: 502 })
  ),
  proxyFormDataPost: vi.fn(() =>
    NextResponse.json({ ok: false, error: 'Upstream request failed' }, { status: 502 })
  ),
}));

describe('Attendance ID API Security', () => {beforeEach(() => {vi.clearAllMocks();
  vi.mocked(getTokenFromCookie).mockResolvedValue('valid-token');
  });

  const context = { params: Promise.resolve({ id: '123' }) };

  describe('GET handler', () => {it('should return 401 if no token', async () => {
      const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');

      vi.mocked(getTokenFromCookie).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/attendance/123');
      const res = await GET(req, context);

      expect(res.status).toBe(401);
    });

    it('should return generic error message on upstream failure', async () => {vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'DB error: connection to 10.0.0.5 refused' }),
        json: async () => ({ message: 'DB error: connection to 10.0.0.5 refused' }),
      } as Response);

      const req = new NextRequest('http://localhost/api/attendance/123');
      const res = await GET(req, context);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Failed to fetch attendance record');
    });
  });

  describe('PUT handler', () => {it('should return security error if validateSecurity fails', async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
        status: 403,
      }) as unknown as NextResponse;

      vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

      const req = new NextRequest('http://localhost/api/attendance/123', { method: 'PUT' });
      const res = await PUT(req, context);

      expect(res.status).toBe(403);
    });

    it('should return 401 if no token', async () => {vi.mocked(validateSecurity).mockResolvedValue(null);
      const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');

      vi.mocked(getTokenFromCookie).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/attendance/123', { method: 'PUT' });
      const res = await PUT(req, context);

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE handler', () => {it('should return security error if validateSecurity fails', async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
        status: 403,
      }) as unknown as NextResponse;

      vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

      const req = new NextRequest('http://localhost/api/attendance/123', { method: 'DELETE' });
      const res = await DELETE(req, context);

      expect(res.status).toBe(403);
    });

    it('should return 401 if no token', async () => {vi.mocked(validateSecurity).mockResolvedValue(null);
      const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');

      vi.mocked(getTokenFromCookie).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/attendance/123', { method: 'DELETE' });
      const res = await DELETE(req, context);

      expect(res.status).toBe(401);
    });
  });

  describe('POST handler (method override)', () => {it('should return security error if validateSecurity fails', async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
        status: 403,
      }) as unknown as NextResponse;

      vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

      const req = new NextRequest('http://localhost/api/attendance/123', { method: 'POST' });
      const res = await POST(req, context);

      expect(res.status).toBe(403);
    });

    it('should return 401 if no token', async () => {vi.mocked(validateSecurity).mockResolvedValue(null);
      const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');

      vi.mocked(getTokenFromCookie).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/attendance/123', { method: 'POST' });
      const res = await POST(req, context);

      expect(res.status).toBe(401);
    });
  });
});
