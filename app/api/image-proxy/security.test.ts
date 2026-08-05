import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import { getTokenFromCookie } from '@/utils/api/upstreamProxy';

vi.mock('@/utils/api/upstreamProxy', () => ({
  getTokenFromCookie: vi.fn(),
  BACKEND_URL: 'http://trusted-backend.com',
  ABSENSI_BASE: 'http://trusted-backend.com/api/absensi',
}));

vi.mock('@/utils/backendConfig', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
}));

describe('Image Proxy Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 (placeholder) if user is not authenticated', async () => {
    (getTokenFromCookie as Mock).mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost/api/image-proxy?url=http://trusted-backend.com/img.jpg'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type');
    expect(contentType).toBe('image/svg+xml');
  });

  it('should return 200 (placeholder) if image origin is not trusted', async () => {
    (getTokenFromCookie as Mock).mockResolvedValue('valid-token');

    const req = new NextRequest(
      'http://localhost/api/image-proxy?url=http://malicious-site.com/img.jpg'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type');
    expect(contentType).toBe('image/svg+xml');
  });

  it('should allow exact match for backend origin', async () => {
    (getTokenFromCookie as Mock).mockResolvedValue('valid-token');

    // Mock fetch to succeed
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      arrayBuffer: async () => new ArrayBuffer(10),
    });

    const req = new NextRequest(
      'http://localhost/api/image-proxy?url=http://trusted-backend.com/img.jpg'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
  });

  it('should allow subdomains of trusted parent domain', async () => {
    (getTokenFromCookie as Mock).mockResolvedValue('valid-token');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'image/png' }),
      arrayBuffer: async () => new ArrayBuffer(10),
    });

    const req = new NextRequest(
      'http://localhost/api/image-proxy?url=https://any.company.com/photo.png'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  it('should block SSRF bypass attempts via other public suffix subdomains', async () => {
    (getTokenFromCookie as Mock).mockResolvedValue('valid-token');

    // Attempting to bypass by using another subdomain on the same public suffix (my.id)
    const req = new NextRequest(
      'http://localhost/api/image-proxy?url=http://other-user.my.id/img.jpg'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type');
    expect(contentType).toBe('image/svg+xml');
  });

  it('should return 200 (placeholder) if image URL is malformed', async () => {
    (getTokenFromCookie as Mock).mockResolvedValue('valid-token');

    const req = new NextRequest('http://localhost/api/image-proxy?url=not-a-url');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type');
    expect(contentType).toBe('image/svg+xml');
  });
});
