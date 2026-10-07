import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { parseJsonSafe, unauthorizedResponse } from '@/lib/api/apiProxy';
import { validateSecurity } from '@/lib/auth/security';
import { CookieName } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_LEVELS = new Set<string>(['ADM']);
const MAX_RECORDS = 5000;
const CONCURRENCY = 10;

const SKIP_FIELDS = new Set([
  'id',
  '_rowKey', '_searchContent', '_index', '_displayDate', '_typeLabel',
  '_totaljanjangNum', '_outputNum', '_janjangnormalNum', '_brondolanNum',
  '_mentahNum', '_abnormalNum',
]);

function getCookieValue(req: NextRequest, name: string) {
  return req.cookies.get(name)?.value || '';
}

function buildFormData(record: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(record)) {
    if (SKIP_FIELDS.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (key === 'id') continue;
    fd.append(key, String(value));
  }
  return fd;
}

function sanitizeErrorMessage(raw: string, maxLen = 200): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x1F]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();
  if (!token) return unauthorizedResponse();

  const userLevel = getCookieValue(req, CookieName.SECURE_USER_LEVEL).toUpperCase();

  if (!ALLOWED_LEVELS.has(userLevel)) {
    return NextResponse.json(
      { success: false, message: 'Akses ditolak. Hanya Admin yang dapat mengimpor data.' },
      { status: 403 }
    );
  }

  const userFcba = getCookieValue(req, CookieName.SECURE_USER_FCBA);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Format request tidak valid' },
      { status: 400 }
    );
  }

  const rawRecords =
    body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)
      ? (body as { data: unknown }).data
      : [];

  if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
    return NextResponse.json(
      { success: false, message: 'Data tidak boleh kosong' },
      { status: 400 }
    );
  }

  if (rawRecords.length > MAX_RECORDS) {
    return NextResponse.json(
      { success: false, message: `Maksimal ${MAX_RECORDS} records per batch. Data Anda ${rawRecords.length} records.` },
      { status: 400 }
    );
  }

  const sanitizedRecords = rawRecords as Array<Record<string, unknown>>;

  if (userLevel !== 'ADM' && userFcba) {
    for (const record of sanitizedRecords) {
      const recordFcba = record.fcba as string | undefined;
      if (recordFcba && recordFcba !== userFcba) {
        return NextResponse.json(
          {
            success: false,
            message: `FCBA tidak sesuai. Data memiliki FCBA "${recordFcba}" tetapi akun Anda memiliki FCBA "${userFcba}".`,
          },
          { status: 403 }
        );
      }
    }
  }

  const successes: { nopengangkutan: string }[] = [];
  const failures: { nopengangkutan: string; error: string }[] = [];

  async function processRecord(record: Record<string, unknown>): Promise<void> {
    const nopengangkutan = String(
      record.nopengangkutan || record.nospb || record.nodokumen || 'unknown'
    );
    try {
      const fd = buildFormData(record);
      const upstream = await fetch(`${BACKEND_URL}/api/apps/pengangkutans`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: fd,
      });

      const { data, parseError } = await parseJsonSafe(upstream);

      if (upstream.ok) {
        const resultKey =
          (data && typeof data === 'object' && 'nopengangkutan' in (data as Record<string, unknown>)
            ? String((data as Record<string, unknown>).nopengangkutan)
            : null) || nopengangkutan;
        successes.push({ nopengangkutan: resultKey });
      } else {
        const rawMsg =
          parseError
            ? 'Respon tidak valid dari server'
            : data && typeof data === 'object' && 'message' in (data as Record<string, unknown>)
              ? String((data as Record<string, unknown>).message)
              : data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)
                ? String((data as Record<string, unknown>).error)
                : `HTTP ${upstream.status}`;
        failures.push({ nopengangkutan, error: sanitizeErrorMessage(rawMsg) });
        console.error('[TRANSPORT_IMPORT_RECORD_FAIL]', { nopengangkutan, status: upstream.status, data });
      }
    } catch (err) {
      const safeMsg = err instanceof Error ? err.message : 'Kesalahan tidak diketahui';
      failures.push({ nopengangkutan, error: sanitizeErrorMessage(safeMsg) });
      console.error('[TRANSPORT_IMPORT_RECORD_ERROR]', { nopengangkutan, error: safeMsg });
    }
  }

  for (let i = 0; i < sanitizedRecords.length; i += CONCURRENCY) {
    const pool = sanitizedRecords.slice(i, i + CONCURRENCY);
    await Promise.all(pool.map(processRecord));
  }

  return NextResponse.json({
    success: true,
    data: {
      successCount: successes.length,
      failCount: failures.length,
      success: successes,
      failed: failures,
    },
  });
}
