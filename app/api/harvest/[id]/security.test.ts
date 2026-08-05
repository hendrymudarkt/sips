import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET, PUT, DELETE, POST } from './route';

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

vi.mock('@/lib/api/apiProxy', () => ({
  parseJsonSafe: vi.fn((res) => res.json().then((data: unknown) => ({ data, parseError: false }))),
}));

describe('Harvest ID API Security', () => {beforeEach(() => {vi.clearAllMocks();
  });

  const context = { params: Promise.resolve({ id: '123' }) };

  describe('GET handler', () => {it('should return 401 if no token', async () => {
      const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');

      vi.mocked(getTokenFromCookie).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/harvest/123');
      const res = await GET(req, context);

      expect(res.status).toBe(401);
    });

    it('should return generic error message on upstream failure', async () => {vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'DB error: connection refused' }),
        json: async () => ({ message: 'DB error: connection refused' }),
      } as Response);

      const req = new NextRequest('http://localhost/api/harvest/123');
      const res = await GET(req, context);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Failed to fetch harvest record');
    });
  });

  describe('PUT handler', () => {it('should return security error if validateSecurity fails', async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
        status: 403,
      }) as unknown as NextResponse;

      vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

      const req = new NextRequest('http://localhost/api/harvest/123', { method: 'PUT' });
      const res = await PUT(req, context);

      expect(res.status).toBe(403);
    });

    it('should return 401 if no token', async () => {vi.mocked(validateSecurity).mockResolvedValue(null);
      const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');

      vi.mocked(getTokenFromCookie).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/harvest/123', { method: 'PUT' });
      const res = await PUT(req, context);

      expect(res.status).toBe(401);
    });

    it('should return generic error message on upstream failure', async () => {vi.mocked(validateSecurity).mockResolvedValue(null);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'Detailed SQL error at 10.0.0.5' }),
        json: async () => ({ message: 'Detailed SQL error at 10.0.0.5' }),
      } as Response);

      const req = new NextRequest('http://localhost/api/harvest/123', { method: 'PUT' });
      const res = await PUT(req, context);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Failed to update harvest record');
    });
  });

  describe('DELETE handler', () => {it('should return security error if validateSecurity fails', async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
        status: 403,
      }) as unknown as NextResponse;

      vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

      const req = new NextRequest('http://localhost/api/harvest/123', { method: 'DELETE' });
      const res = await DELETE(req, context);

      expect(res.status).toBe(403);
    });

    it('should return 401 if no token', async () => {vi.mocked(validateSecurity).mockResolvedValue(null);
      const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');

      vi.mocked(getTokenFromCookie).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/harvest/123', { method: 'DELETE' });
      const res = await DELETE(req, context);

      expect(res.status).toBe(401);
    });

    it('should return generic error message on upstream failure', async () => {vi.mocked(validateSecurity).mockResolvedValue(null);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'Internal: DB crash on node 5' }),
        json: async () => ({ message: 'Internal: DB crash on node 5' }),
      } as Response);

      const formData = new FormData();
      formData.append('ba_deleted', new Blob(['test'], { type: 'application/pdf' }), 'ba.pdf');

      const req = new NextRequest('http://localhost/api/harvest/123', {
        method: 'DELETE',
        body: formData,
      });
      const res = await DELETE(req, context);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Failed to delete harvest record');
    });
  });

  describe('POST handler (method override)', () => {it('should return security error if validateSecurity fails', async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
        status: 403,
      }) as unknown as NextResponse;

      vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

      const req = new NextRequest('http://localhost/api/harvest/123', { method: 'POST' });
      const res = await POST(req, context);

      expect(res.status).toBe(403);
    });

    it('should return 401 if no token', async () => {vi.mocked(validateSecurity).mockResolvedValue(null);
      const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');

      vi.mocked(getTokenFromCookie).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/harvest/123', { method: 'POST' });
      const res = await POST(req, context);

      expect(res.status).toBe(401);
    });
  });
});
