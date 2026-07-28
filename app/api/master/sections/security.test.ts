import { GET } from './route';
import { NextRequest } from 'next/server';
import { getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { UserLevel } from '@/lib/constants';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
  authHeaders: vi.fn(token => ({
    Authorization: `Bearer ${token}`,
  })),
}));

vi.mock('@/lib/api/apiProxy', () => ({
  authHeaders: vi.fn(token => ({
    Authorization: `Bearer ${token}`,
  })),
  extractDataArray: vi.fn(json => json.data || []),
}));

describe('Sections API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getTokenFromCookie).mockResolvedValue(undefined);
    const req = new NextRequest('http://localhost/api/sections');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should enforce role-based scoping (CWE-285)', async () => {
    vi.mocked(getTokenFromCookie).mockResolvedValue('valid-token');
    const req = new NextRequest('http://localhost/api/sections?fcba=OTHER_FCBA');
    req.cookies.set('user_Level', UserLevel.MANAGER);
    req.cookies.set('user_Fcba', 'MY_FCBA');

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    await GET(req);
    const lastFetchUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
    expect(lastFetchUrl).toContain('fcba=MY_FCBA');
    expect(lastFetchUrl).not.toContain('fcba=OTHER_FCBA');
  });
});
