import { GET } from './route';
import { NextRequest } from 'next/server';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
  getTokenFromCookie: vi.fn(),
  buildFilteredUrl: vi.fn(),
  safeJson: vi.fn(),
}));

vi.mock('@/lib/api/apiProxy', () => ({
  authHeaders: vi.fn(() => ({ Authorization: 'Bearer valid-token' })),
  extractDataArray: vi.fn(data => data.data || []),
}));

describe('Karyawans API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return generic error message and not leak upstream details on failure', async () => {
    const mockToken = 'valid-token';
    const req = new NextRequest('http://localhost/api/karyawans');
    req.cookies.set('auth_token', mockToken);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Internal Server Error: Database connection failed at 10.0.0.5:5432',
    } as Response);

    const res = await GET(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to fetch employee data');
    expect(data.ok).toBe(false);
  });

  it('should return 401 if unauthorized', async () => {
    const req = new NextRequest('http://localhost/api/karyawans');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
