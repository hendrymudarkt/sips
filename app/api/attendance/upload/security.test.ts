import {
  describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import { NextRequest, NextResponse } from 'next/server';
import { validateSecurity } from '@/lib/auth/security';
import { getTokenFromCookie } from '@/utils/api/upstreamProxy';
vi.stubGlobal('fetch', vi.fn());
vi.mock('@/lib/auth/security', () => ({  validateSecurity: vi.fn(),}));
vi.mock('@/utils/api/upstreamProxy', () => ({  BACKEND_URL: 'http://trusted-backend.com',  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),}));
vi.mock('@/utils/api/requestScope', () => ({  applyUserDataScope: vi.fn((_req, params) => params),}));
vi.mock('@/lib/api/apiProxy', () => ({  authHeaders: vi.fn(() => ({ Authorization: 'Bearer valid-token' })),  parseJsonSafe: vi.fn((res) => res.json().then((data: unknown) => ({ data, parseError: false }))),  extractMessage: vi.fn((data) => data?.message || 'Unknown error'),  unauthorizedResponse: vi.fn(() => NextResponse.json({ success: false, message: 'No authentication token found. Please login again.' }, { status: 401 })),}));
vi.mock('@/lib/utils/inputSanitizer', () => ({  validateInput: vi.fn(() => ({ success: true, data: { test: 'value' } })),  uploadSubmitSchema: {},}));
describe('Attendance Upload API Security', () => {
  beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTokenFromCookie).mockResolvedValue('valid-token');  });
  describe('GET handler', () => {
  it('should return 401 if no token', async () => {      const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
      vi.mocked(getTokenFromCookie).mockResolvedValue(undefined);      const req = new NextRequest('http://localhost/api/attendance/upload');      const res = await GET(req);      expect(res.status).toBe(401);    });  });
  describe('PUT handler', () => {
  it('should return security error if validateSecurity fails', async () => {      const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {        status: 403,      }) as unknown as NextResponse;
      vi.mocked(validateSecurity).mockResolvedValue(errorResponse);      const req = new NextRequest('http://localhost/api/attendance/upload', { method: 'PUT' });      const res = await PUT(req);      expect(res.status).toBe(403);    });
    it('should return 401 if no token', async () => {
  vi.mocked(validateSecurity).mockResolvedValue(null);      const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
      vi.mocked(getTokenFromCookie).mockResolvedValue(undefined);      const req = new NextRequest('http://localhost/api/attendance/upload', { method: 'PUT' });      const res = await PUT(req);      expect(res.status).toBe(401);    });
    it('should return generic error message on upstream failure', async () => {
  vi.mocked(validateSecurity).mockResolvedValue(null);
      vi.mocked(global.fetch).mockResolvedValue({        ok: false,        status: 500,        text: async () => JSON.stringify({ message: 'DB error at 10.0.0.1: pool exhausted' }),        json: async () => ({ message: 'DB error at 10.0.0.1: pool exhausted' }),      } as Response);      const req = new NextRequest('http://localhost/api/attendance/upload?id=123', {        method: 'PUT',        body: JSON.stringify({}),      });      const res = await PUT(req);      expect(res.status).toBe(500);      const data = await res.json();      expect(data.error).toContain('External API error');    });  });});