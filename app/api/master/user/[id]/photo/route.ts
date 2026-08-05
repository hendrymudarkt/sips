import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { parseJsonSafe } from '@/lib/api/apiProxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const { id } = await params;
  const form = await req.formData();

  const upstream = await fetch(`${BACKEND_URL}/api/user/${encodeURIComponent(id)}/photo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: form,
  });

  const { data, parseError } = await parseJsonSafe(upstream);

  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }

  if (!upstream.ok) {
    console.error('[API_USER_PHOTO_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: (data as Record<string, unknown>)?.message || 'Failed to upload photo' },
      { status: upstream.status }
    );
  }

  return NextResponse.json({ ok: true, data });
}
