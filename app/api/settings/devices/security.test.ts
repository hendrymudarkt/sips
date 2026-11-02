import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { getTokenFromCookie } from '@/utils/api/upstreamProxy';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'https://trusted-backend.test',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
}));

vi.mock('@/lib/auth/security', () => ({
  validateSecurity: vi.fn(() => Promise.resolve(null)),
}));

describe('Device list API access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenFromCookie).mockResolvedValue('valid-token');
  });

  it('requires an authenticated session', async () => {
    vi.mocked(getTokenFromCookie).mockResolvedValue(undefined);
    const response = await GET(new NextRequest('http://localhost/api/settings/devices'));

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('blocks users who are not admins before contacting the backend', async () => {
    const request = new NextRequest('http://localhost/api/settings/devices');
    request.cookies.set('SECURE_USER_LEVEL', 'MGR');
    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('proxies the paginated device search for admins', async () => {
    const request = new NextRequest('http://localhost/api/settings/devices?page=2&q=phone');
    request.cookies.set('SECURE_USER_LEVEL', 'ADMIN');
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            current_page: 2,
            last_page: 3,
            total: 250,
            from: 101,
            to: 200,
            data: [{ id: 8, device_id: 'DEV-00008', status: 'inactive' }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.devices).toHaveLength(1);
    expect(body.pagination.currentPage).toBe(2);
    expect(new URL(vi.mocked(global.fetch).mock.calls[0][0] as string).searchParams.get('q')).toBe(
      'phone'
    );
  });
});
