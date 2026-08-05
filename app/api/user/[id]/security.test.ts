import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { GET } from './route';
import { PATCH } from './status/route';
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { cookies } from 'next/headers';
import { validateSecurity } from '@/lib/security';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/utils/api/upstreamProxy', () => ({
  getTokenFromCookie: vi.fn(),
  BACKEND_URL: 'http://trusted-backend.com',
}));

vi.mock('@/lib/security', () => ({
  validateSecurity: vi.fn(),
}));

describe('User API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/user/[id]', () => {
    it('should return 429 if rate limit exceeded', async () => {
      (validateSecurity as Mock).mockResolvedValue(
        NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 })
      );

      const req = new NextRequest('http://localhost/api/user/123');
      const res = await GET(req, { params: Promise.resolve({ id: '123' }) });

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toBe('Too many requests');
    });

    it('should return 401 if unauthenticated', async () => {
      (validateSecurity as Mock).mockResolvedValue(null);
      (getTokenFromCookie as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/user/123');
      const res = await GET(req, { params: Promise.resolve({ id: '123' }) });

      expect(res.status).toBe(401);
    });

    it('should return 403 (IDOR) if non-admin tries to access other profile', async () => {
      (validateSecurity as Mock).mockResolvedValue(null);
      (getTokenFromCookie as Mock).mockResolvedValue('valid-token');

      (cookies as Mock).mockResolvedValue({
        get: vi.fn().mockImplementation((name) => {
          if (name === 'log_id') return { value: '999' };
          if (name === 'user_Level') return { value: 'MDR' };
          return null;
        }),
      });

      const req = new NextRequest('http://localhost/api/user/123');
      const res = await GET(req, { params: Promise.resolve({ id: '123' }) });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Forbidden');
    });

    it('should allow access if user accesses their own profile', async () => {
      (validateSecurity as Mock).mockResolvedValue(null);
      (getTokenFromCookie as Mock).mockResolvedValue('valid-token');

      (cookies as Mock).mockResolvedValue({
        get: vi.fn().mockImplementation((name) => {
          if (name === 'log_id') return { value: '123' };
          if (name === 'user_Level') return { value: 'MDR' };
          return null;
        }),
      });

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123', name: 'Test User' }),
      });

      const req = new NextRequest('http://localhost/api/user/123');
      const res = await GET(req, { params: Promise.resolve({ id: '123' }) });

      expect(res.status).toBe(200);
    });

    it('should allow admin to access any profile', async () => {
      (validateSecurity as Mock).mockResolvedValue(null);
      (getTokenFromCookie as Mock).mockResolvedValue('valid-token');

      (cookies as Mock).mockResolvedValue({
        get: vi.fn().mockImplementation((name) => {
          if (name === 'log_id') return { value: '999' };
          if (name === 'SECURE_USER_LEVEL') return { value: 'ADM' };
          return null;
        }),
      });

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123', name: 'Test User' }),
      });

      const req = new NextRequest('http://localhost/api/user/123');
      const res = await GET(req, { params: Promise.resolve({ id: '123' }) });

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/user/[id]/status', () => {
    it('should return 403 if validateSecurity fails (CSRF/Rate Limit)', async () => {
      (validateSecurity as Mock).mockResolvedValue(
        NextResponse.json({ ok: false, error: 'Security fail' }, { status: 403 })
      );

      const req = new NextRequest('http://localhost/api/user/123/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Y' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: '123' }) });

      expect(res.status).toBe(403);
    });

    it('should return 403 if non-admin tries to update status', async () => {
      (validateSecurity as Mock).mockResolvedValue(null);
      (getTokenFromCookie as Mock).mockResolvedValue('valid-token');

      (cookies as Mock).mockResolvedValue({
        get: vi.fn().mockImplementation((name) => {
          if (name === 'user_Level') return { value: 'MDR' };
          return null;
        }),
      });

      const req = new NextRequest('http://localhost/api/user/123/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Y' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: '123' }) });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Forbidden');
    });

    it('should allow admin to update status', async () => {
      (validateSecurity as Mock).mockResolvedValue(null);
      (getTokenFromCookie as Mock).mockResolvedValue('valid-token');

      (cookies as Mock).mockResolvedValue({
        get: vi.fn().mockImplementation((name) => {
          if (name === 'SECURE_USER_LEVEL') return { value: 'ADM' };
          return null;
        }),
      });

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const req = new NextRequest('http://localhost/api/user/123/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Y' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: '123' }) });

      expect(res.status).toBe(200);
    });
  });
});
