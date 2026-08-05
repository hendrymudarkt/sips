import {
  describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
vi.stubGlobal('fetch', vi.fn());
vi.mock('@/utils/api/upstreamProxy', () => ({  BACKEND_URL: 'http://trusted-backend.com',  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),}));
vi.mock('@/lib/api/apiProxy', () => ({  authHeaders: vi.fn(() => ({ Authorization: 'Bearer valid-token' })),  extractDataArray: vi.fn((data) => data?.data || []),}));
vi.mock('@/utils/api/requestScope', () => ({  applyUserDataScope: vi.fn((_req, params) => params),}));
describe('Fields API Security', () => {
  beforeEach(() => {
  vi.clearAllMocks();  });
  it('should return 401 if no token', async () => {    const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
    vi.mocked(getTokenFromCookie).mockResolvedValue(undefined);    const req = new NextRequest('http://localhost/api/master/fields');    const res = await GET(req);    expect(res.status).toBe(401);    const data = await res.json();    expect(data.error).toBe('Unauthorized');  });
  it('should return generic error message on upstream failure', async () => {
  vi.mocked(global.fetch).mockResolvedValue({      ok: false,      status: 500,      text: async () => 'Internal Server Error: DB crash at 10.0.0.5',    } as Response);    const req = new NextRequest('http://localhost/api/master/fields');    const res = await GET(req);    expect(res.status).toBe(500);    const data = await res.json();    expect(data.error).toBe('Failed to fetch fields');    expect(data.ok).toBe(false);  });});