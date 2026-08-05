import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockReturnValue({
    get: vi.fn((key) => {
      if (key === 'csrf_token') return { value: 'fake-csrf' };
      return undefined;
    }),
  }),
}));

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: vi.fn(() => true),
}));

describe('Open LHM Submit API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return generic error message and not leak upstream details on failure', async () => {
    const req = new NextRequest('http://localhost/api/open/lhm/submit', {
      method: 'POST',
      body: JSON.stringify({ data: [] }),
    });

    // Mock upstream failure with sensitive info
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () =>
        JSON.stringify({
          message: 'SQLSTATE[HY000] [2002] Connection refused',
          error:
            'Exception: Error at /var/www/laravel/app/Http/Controllers/OpenLhmController.php:123',
        }),
    } as Response);

    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();

    // Should contain generic message
    expect(data.message).toBe('Submit failed');
    // Should NOT contain the sensitive 'error' field or the detailed message
    expect(data.error).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('SQLSTATE');
    expect(JSON.stringify(data)).not.toContain('/var/www/laravel');
  });
});
