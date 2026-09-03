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
  // ponytail: dikunci sementara hanya untuk ADM; hapus blok ini untuk dibuka lagi
  if (userLevel !== 'ADM' && userLevel !== 'ADMIN') {
    return NextResponse.json(
      { success: false, message: 'Akses ditolak. Hanya Admin yang dapat mengakses fitur ini.' },
      { status: 403 }
    );
  }

  const searchParams = new URLSearchParams(req.nextUrl.searchParams.toString());
  applyUserDataScope(req, searchParams);

  const url = `${BACKEND_URL}/api/report/upload-harvesting${searchParams.toString() ? `?${searchParams}` : ''}`;
  return proxyGet(url, token, { emptyOn404: true });
}

