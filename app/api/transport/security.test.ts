import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as POST_LIST } from './route';
import { PUT, DELETE, POST as POST_ID } from './[id]/route';
import { NextRequest, NextResponse } from 'next/server';
import { validateSecurity } from '@/lib/security';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/lib/security', () => ({
  validateSecurity: vi.fn(),
}));

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
}));

describe('Transport API Security Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('List Route POST', () => {
    it('should return security error if validateSecurity fails', async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
        status: 429,
      }) as unknown as NextResponse;
      vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

      const req = new NextRequest('http://localhost/api/transport', { method: 'POST' });
      const res = await POST_LIST(req);

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toBe('Security fail');
    });

    it('should proceed if validateSecurity passes', async () => {
      vi.mocked(validateSecurity).mockResolvedValue(null);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true }),
        json: async () => ({ ok: true }),
      } as Response);

      const formData = new FormData();
      formData.append('test', 'value');

      const req = new NextRequest('http://localhost/api/transport', {
        method: 'POST',
        body: formData,
      });
      const res = await POST_LIST(req);

      expect(res.status).toBe(200);
      expect(validateSecurity).toHaveBeenCalled();
    });
  });

  describe('ID Route PUT', () => {
    it('should return security error if validateSecurity fails', async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
        status: 403,
      }) as unknown as NextResponse;
      vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

      const req = new NextRequest('http://localhost/api/transport/1', { method: 'PUT' });
      const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

      expect(res.status).toBe(403);
      expect(validateSecurity).toHaveBeenCalled();
    });
  });

  describe('ID Route DELETE', () => {
    it('should return security error if validateSecurity fails', async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
        status: 403,
      }) as unknown as NextResponse;
      vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

      const req = new NextRequest('http://localhost/api/transport/1', { method: 'DELETE' });
      const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });

      expect(res.status).toBe(403);
      expect(validateSecurity).toHaveBeenCalled();
    });
  });

  describe('ID Route POST (Method Override)', () => {
    it('should return security error if validateSecurity fails', async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
        status: 403,
      }) as unknown as NextResponse;
      vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

      const req = new NextRequest('http://localhost/api/transport/1', { method: 'POST' });
      const res = await POST_ID(req, { params: Promise.resolve({ id: '1' }) });

      expect(res.status).toBe(403);
      expect(validateSecurity).toHaveBeenCalled();
    });
  });
});
