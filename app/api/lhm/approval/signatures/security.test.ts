import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
vi.stubGlobal('fetch', vi.fn());
vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
}));
vi.mock('@/utils/api/requestScope', () => ({
  applyUserDataScope: vi.fn((_req, params) => params),
}));
describe('LHM Approval Signatures API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should return 401 if no token', async () => {
    const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
    vi.mocked(getTokenFromCookie).mockResolvedValue(undefined);
    const req = new NextRequest(
      'http://localhost/api/lhm/approval/signatures?fcba=123&afdeling=123&kemandoran=123'
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
  it('should degrade gracefully and return placeholder on upstream failure', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Backend error at 10.0.0.1:5432' }),
    } as Response);
    const req = new NextRequest(
      'http://localhost/api/lhm/approval/signatures?fcba=123&afdeling=123&kemandoran=123'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.mandorPanen).toBe('-');
  });
  it('should return generic error on internal crash', async () => {
    const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');
    vi.mocked(getTokenFromCookie).mockRejectedValue(new Error('Stack trace here'));
    const req = new NextRequest(
      'http://localhost/api/lhm/approval/signatures?fcba=123&afdeling=123&kemandoran=123'
    );
    const res = await GET(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toBe('Failed to fetch signatures');
  });
});
