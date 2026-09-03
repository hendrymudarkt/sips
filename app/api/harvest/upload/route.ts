import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { applyUserDataScope } from '@/utils/api/requestScope';
import { proxyGet, unauthorizedResponse } from '@/lib/api/apiProxy';
import { CookieName } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = await getTokenFromCookie();
  if (!token) return unauthorizedResponse();

  const userLevel = req.cookies.get(CookieName.SECURE_USER_LEVEL)?.value?.toUpperCase() ?? '';
  // Harvesting SPB: ADM penuh; KSI approve+open; KRA approve
  if (!['ADM', 'ADMIN', 'KSI', 'KRA'].includes(userLevel)) {
    return NextResponse.json(
      { success: false, message: 'Akses ditolak. Fitur ini khusus Admin, KSI, dan KRA.' },
      { status: 403 }
    );
  }

  const searchParams = new URLSearchParams(req.nextUrl.searchParams.toString());
  applyUserDataScope(req, searchParams);

  const url = `${BACKEND_URL}/api/report/upload-harvesting${searchParams.toString() ? `?${searchParams}` : ''}`;
  return proxyGet(url, token, { emptyOn404: true });
}

