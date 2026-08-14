import {
  describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import { getTokenFromCookie } from '@/utils/api/upstreamProxy';
vi.stubGlobal('fetch', vi.fn());
vi.mock('@/utils/api/upstreamProxy', () => ({  BACKEND_URL: 'http://trusted-backend.com',  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),}));
vi.mock('@/utils/api/requestScope', () => ({  applyUserDataScope: vi.fn((_req, params) => params),}));
vi.mock('@/lib/api/apiProxy', () => ({  authHeaders: vi.fn(() => ({ Authorization: 'Bearer valid-token' })),  parseJsonSafe: vi.fn((res) => res.json().then((data: unknown) => ({ data, parseError: false }))),  isRecord: vi.fn((v) => typeof v === 'object' && v !== null),}));
describe('SIPS Users API Security', () => {
  beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTokenFromCookie).mockResolvedValue('valid-token');  });
  it('should return 401 if no token', async () => {    const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
    vi.mocked(getTokenFromCookie).mockResolvedValue(undefined);    const req = new NextRequest('http://localhost/api/master/sips-users');    const res = await GET(req);    expect(res.status).toBe(401);    const data = await res.json();    expect(data.error).toBe('Unauthenticated');  });
  it('should return generic error message on upstream failure', async () => {
  vi.mocked(global.fetch).mockResolvedValue({      ok: false,      status: 500,      text: async () => JSON.stringify({ message: 'DB connection failed at 10.0.0.5:5432' }),      json: async () => ({ message: 'DB connection failed at 10.0.0.5:5432' }),    } as Response);    const req = new NextRequest('http://localhost/api/master/sips-users');    const res = await GET(req);    expect(res.status).toBe(500);    const data = await res.json();    expect(data.error).toBe('Failed to fetch master users');  });
  it('should return generic error message on internal crash', async () => {    const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
    vi.mocked(getTokenFromCookie).mockRejectedValue(new Error('Crash with stack trace'));    const req = new NextRequest('http://localhost/api/master/sips-users');    await expect(GET(req)).rejects.toThrow();  });});