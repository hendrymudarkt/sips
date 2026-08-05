import {
  describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
vi.stubGlobal('fetch', vi.fn());
vi.mock('@/utils/api/upstreamProxy', () => ({  BACKEND_URL: 'http://trusted-backend.com',  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),}));
vi.mock('@/utils/api/requestScope', () => ({  applyUserDataScope: vi.fn((_req, params) => params),}));
vi.mock('@/lib/api/apiProxy', () => ({  proxyGet: vi.fn(() => Promise.resolve(new Response(JSON.stringify({ success: true, data: [] })))),  unauthorizedResponse: vi.fn(() => new Response(JSON.stringify({ success: false, message: 'No authentication token found. Please login again.' }), { status: 401 })),}));
describe('LHM API Security', () => {
  beforeEach(() => {
  vi.clearAllMocks();  });
  it('should return 401 if no token', async () => {    const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
    vi.mocked(getTokenFromCookie).mockResolvedValue(undefined);    const req = new NextRequest('http://localhost/api/lhm');    const res = await GET(req);    expect(res.status).toBe(401);  });
  it('should call proxyGet when token is present', async () => {    const { proxyGet } = await import('@/lib/api/apiProxy');
    vi.mocked(proxyGet).mockResolvedValue(      new Response(JSON.stringify({ success: true, data: [] })) as never    );    const req = new NextRequest('http://localhost/api/lhm');    const res = await GET(req);    expect(proxyGet).toHaveBeenCalled();    expect(res.status).toBe(200);  });});