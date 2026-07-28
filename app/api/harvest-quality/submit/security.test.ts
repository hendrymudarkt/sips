import {
  describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest, NextResponse } from 'next/server';
import { validateSecurity } from '@/lib/auth/security';
vi.stubGlobal('fetch', vi.fn());
vi.mock('@/lib/auth/security', () => ({  validateSecurity: vi.fn(),}));
vi.mock('@/utils/api/upstreamProxy', () => ({  BACKEND_URL: 'http://trusted-backend.com',  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),}));
vi.mock('@/lib/api/apiProxy', () => ({  authHeaders: vi.fn(() => ({ Authorization: 'Bearer valid-token' })),  parseJsonSafe: vi.fn((res) => res.json().then((data: unknown) => ({ data, parseError: false }))),  unauthorizedResponse: vi.fn(() => NextResponse.json({ success: false, message: 'No authentication token found. Please login again.' }, { status: 401 })),}));
vi.mock('@/lib/utils/inputSanitizer', () => ({  validateInput: vi.fn(() => ({ success: true, data: { test: 'value' } })),  sanitizeObject: vi.fn((obj) => obj),  harvestSubmitSchema: {},}));
describe('Harvest Quality Submit API Security', () => {
  beforeEach(() => {
  vi.clearAllMocks();  });
  it('should return security error if validateSecurity fails', async () => {    const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {      status: 403,    }) as unknown as NextResponse;
    vi.mocked(validateSecurity).mockResolvedValue(errorResponse);    const req = new NextRequest('http://localhost/api/harvest-quality/submit', { method: 'POST' });    const res = await POST(req);    expect(res.status).toBe(403);    const data = await res.json();    expect(data.error).toBe('Security fail');  });
  it('should return 401 if no token', async () => {
  vi.mocked(validateSecurity).mockResolvedValue(null);    const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
    vi.mocked(getTokenFromCookie).mockResolvedValue(undefined);    const req = new NextRequest('http://localhost/api/harvest-quality/submit', { method: 'POST' });    const res = await POST(req);    expect(res.status).toBe(401);  });
  it('should return generic error message on upstream failure', async () => {
  vi.mocked(validateSecurity).mockResolvedValue(null);
    vi.mocked(global.fetch).mockResolvedValue({      ok: false,      status: 500,      text: async () => JSON.stringify({ message: 'Detailed error: DB timeout at pool connection' }),      json: async () => ({ message: 'Detailed error: DB timeout at pool connection' }),    } as Response);    const req = new NextRequest('http://localhost/api/harvest-quality/submit', {      method: 'POST',      body: JSON.stringify({}),    });    const res = await POST(req);    expect(res.status).toBe(500);    const data = await res.json();    expect(data.message).toBe('Failed to submit harvesting quality');  });});
