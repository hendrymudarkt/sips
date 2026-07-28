import {
  describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';
import { NextRequest, NextResponse } from 'next/server';
import { validateSecurity } from '@/lib/auth/security';
vi.stubGlobal('fetch', vi.fn());
vi.mock('@/lib/auth/security', () => ({  validateSecurity: vi.fn(),}));
vi.mock('@/utils/api/upstreamProxy', () => ({  BACKEND_URL: 'http://trusted-backend.com',  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),  buildFilteredUrl: vi.fn((base) => base),}));
vi.mock('@/lib/api/apiProxy', () => ({  authHeaders: vi.fn(() => ({ Authorization: 'Bearer valid-token' })),  parseJsonSafe: vi.fn((res) => res.json().then((data: unknown) => ({ data, parseError: false }))),  isRecord: vi.fn((v) => typeof v === 'object' && v !== null),}));
vi.mock('@/utils/api/requestScope', () => ({  applyUserDataScope: vi.fn((_req, params) => params),}));
describe('Harvest API Security', () => {
  beforeEach(() => {
  vi.clearAllMocks();  });
  describe('POST handler', () => {
  it('should return security error if validateSecurity fails', async () => {      const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {        status: 403,      }) as unknown as NextResponse;
      vi.mocked(validateSecurity).mockResolvedValue(errorResponse);      const req = new NextRequest('http://localhost/api/harvest', { method: 'POST' });      const res = await POST(req);      expect(res.status).toBe(403);      const data = await res.json();      expect(data.error).toBe('Security fail');    });
    it('should return 401 if no token', async () => {
  vi.mocked(validateSecurity).mockResolvedValue(null);      const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
      vi.mocked(getTokenFromCookie).mockResolvedValue(undefined);      const req = new NextRequest('http://localhost/api/harvest', { method: 'POST' });      const res = await POST(req);      expect(res.status).toBe(401);    });
    it('should return generic error message on upstream failure', async () => {
  vi.mocked(validateSecurity).mockResolvedValue(null);
      vi.mocked(global.fetch).mockResolvedValue({        ok: false,        status: 500,        text: async () => JSON.stringify({ message: 'Detailed SQL error: table panens not found' }),        json: async () => ({ message: 'Detailed SQL error: table panens not found' }),      } as Response);      const req = new NextRequest('http://localhost/api/harvest', { method: 'POST' });      const res = await POST(req);      expect(res.status).toBe(500);      const data = await res.json();      expect(data.error).toBe('Harvest submission failed');    });  });
  describe('GET handler', () => {
  it('should return 401 if no token', async () => {      const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
      vi.mocked(getTokenFromCookie).mockResolvedValue(undefined);      const req = new NextRequest('http://localhost/api/harvest');      const res = await GET(req);      expect(res.status).toBe(401);    });
    it('should return generic error message on upstream failure', async () => {
  vi.mocked(global.fetch).mockResolvedValue({        ok: false,        status: 500,        text: async () => JSON.stringify({ message: 'Detailed error: DB crash at 10.0.0.1' }),        json: async () => ({ message: 'Detailed error: DB crash at 10.0.0.1' }),      } as Response);      const req = new NextRequest('http://localhost/api/harvest');      const res = await GET(req);      expect(res.status).toBe(500);      const data = await res.json();      expect(data.error).toBe('Failed to fetch harvest data');    });  });});
