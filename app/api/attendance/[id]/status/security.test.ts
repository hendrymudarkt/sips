import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PATCH } from './route';

import { NextRequest } from 'next/server';

import { validateSecurity } from '@/lib/auth/security';


vi.stubGlobal('fetch', vi.fn());


vi.mock('@/utils/api/upstreamProxy', () => ({
  ABSENSI_BASE: 'http://trusted-backend.com/api/attendance',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
}));


vi.mock('@/lib/auth/security', () => ({
  validateSecurity: vi.fn(),
}));

describe('Attendance Status API Security', () => {beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(validateSecurity).mockResolvedValue(null);
});


  it('should return generic error message and not leak upstream details on failure', async () => {
    const req = new NextRequest('http://localhost/api/attendance/123/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved' }),
    });
    const context = { params: Promise.resolve({ id: '123' }) };

    // Mock upstream failure with sensitive info
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Sensitive database error at 192.168.1.50' }),
      text: async () => JSON.stringify({ message: 'Sensitive database error at 192.168.1.50' }),
    } as unknown as Response);

    const res = await PATCH(req, context);

    expect(res.status).toBe(400);
    const data = await res.json();

    // Should NOT contain the sensitive error text or the 'detail' field
    expect(data.error).toBe('Failed to update attendance status');
    expect(data.ok).toBe(false);
  });


  it('should return generic error message and not leak internal error details on crash', async () => {
    const req = new NextRequest('http://localhost/api/attendance/123/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved' }),
    });
    const context = { params: Promise.resolve({ id: '123' }) };

    // Mock a crash
    vi.mocked(global.fetch).mockRejectedValue(new Error('Internal stack trace details...'));

    const res = await PATCH(req, context);

    expect(res.status).toBe(500);
    const data = await res.json();

    // Should NOT contain the stack trace or the 'detail' field
    expect(data.error).toBe('Internal server error');
    expect(data.ok).toBe(false);
  });
});