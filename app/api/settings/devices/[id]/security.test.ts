import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from './route';
import { getTokenFromCookie } from '@/utils/api/upstreamProxy';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'https://trusted-backend.test',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
}));

vi.mock('@/lib/auth/security', () => ({
  validateSecurity: vi.fn(() => Promise.resolve(null)),
}));

describe('Device access API authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenFromCookie).mockResolvedValue('valid-token');
  });

  it('prevents non-admins from changing device access', async () => {
    const request = new NextRequest('http://localhost/api/settings/devices/8', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    request.cookies.set('SECURE_USER_LEVEL', 'KSI');

    const response = await PATCH(request, { params: Promise.resolve({ id: '8' }) });

    expect(response.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('updates registered_at when an admin activates a device', async () => {
    const request = new NextRequest('http://localhost/api/settings/devices/8', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active', device_id: 'changed-id' }),
    });
    request.cookies.set('SECURE_USER_LEVEL', 'ADM');
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: 'Updated' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const response = await PATCH(request, { params: Promise.resolve({ id: '8' }) });

    expect(response.status).toBe(200);
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.method).toBe('PATCH');
    const forwardedBody = JSON.parse(String(vi.mocked(global.fetch).mock.calls[0][1]?.body));
    expect(forwardedBody.status).toBe('active');
    expect(forwardedBody.registered_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('does not change registered_at when suspending a device', async () => {
    const request = new NextRequest('http://localhost/api/settings/devices/8', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' }),
    });
    request.cookies.set('SECURE_USER_LEVEL', 'ADM');
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: 'Updated' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const response = await PATCH(request, { params: Promise.resolve({ id: '8' }) });

    expect(response.status).toBe(200);
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.body).toBe(
      JSON.stringify({ status: 'suspended' })
    );
  });

  it('rejects unsupported device statuses', async () => {
    const request = new NextRequest('http://localhost/api/settings/devices/8', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
    request.cookies.set('SECURE_USER_LEVEL', 'ADM');

    const response = await PATCH(request, { params: Promise.resolve({ id: '8' }) });

    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
