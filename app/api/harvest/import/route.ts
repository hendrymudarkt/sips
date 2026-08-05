import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { parseJsonSafe, unauthorizedResponse } from '@/lib/api/apiProxy';
import { validateSecurity } from '@/lib/auth/security';
import { CookieName } from '@/lib/constants';
import { harvestImportSchema, validateInput, sanitizeObject } from '@/lib/utils/inputSanitizer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_LEVELS = new Set<string>(['ADM']);
const MAX_RECORDS = 5000;
const CONCURRENCY = 10;

const SKIP_FIELDS = new Set([
  'id', 'images', 'no_ba_exca', 'local_image_path',
  '_rowKey', '_searchContent', '_outputNum', '_mentahNum', '_overNum',
  '_busukNum', '_busuk2Num', '_kecilNum', '_partenoNum', '_parteno50Num',
  '_brondolNum', '_panjangNum',
]);

function getCookieValue(req: NextRequest, names: string[]) {
  for (const name of names) {
    const value = req.cookies.get(name)?.value;
    if (value) return value;
  }
  return '';
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

  const userLevel = getCookieValue(req, [
    CookieName.SECURE_USER_LEVEL,
    'user_Level', 'user_LEVEL', 'user_level',
  ]).toUpperCase();

  if (!ALLOWED_LEVELS.has(userLevel)) {
    return NextResponse.json(
      { success: false, message: 'Akses ditolak. Hanya KSI dan Admin yang dapat mengimpor data.' },
      { status: 403 }
    );
  }

  const userFcba = getCookieValue(req, [
    CookieName.SECURE_USER_FCBA,
    'user_Fcba', 'user_FCBA', 'user_fcba',
  ]);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Format request tidak valid' },
      { status: 400 }
    );
  }

  const validation = validateInput(body, harvestImportSchema);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, message: validation.error || 'Data tidak valid' },
      { status: 400 }
    );
  }

  const rawRecords = validation.data!.data;

  if (rawRecords.length > MAX_RECORDS) {
    return NextResponse.json(
      { success: false, message: `Maksimal ${MAX_RECORDS} records per batch. Data Anda ${rawRecords.length} records.` },
      { status: 400 }
    );
  }

  const sanitizedRecords = rawRecords.map(r => sanitizeObject(r));

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

  const successes: { nodokumen: string }[] = [];
  const failures: { nodokumen: string; error: string }[] = [];

  async function processRecord(record: Record<string, unknown>): Promise<void> {
    const nodokumen = String(record.nodokumen || record.kode_karyawan || 'unknown');
    try {
      const fd = buildFormData(record);
      const upstream = await fetch(`${BACKEND_URL}/api/apps/panens`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: fd,
      });

      const { data, parseError } = await parseJsonSafe(upstream);

      if (upstream.ok) {
        const resultNodokumen =
          (data && typeof data === 'object' && 'nodokumen' in (data as Record<string, unknown>)
            ? String((data as Record<string, unknown>).nodokumen)
            : null) || nodokumen;
        successes.push({ nodokumen: resultNodokumen });
      } else {
        const rawMsg =
          parseError
            ? 'Respon tidak valid dari server'
            : data && typeof data === 'object' && 'message' in (data as Record<string, unknown>)
              ? String((data as Record<string, unknown>).message)
              : data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)
                ? String((data as Record<string, unknown>).error)
                : `HTTP ${upstream.status}`;
        failures.push({ nodokumen, error: sanitizeErrorMessage(rawMsg) });
        console.error('[HARVEST_IMPORT_RECORD_FAIL]', { nodokumen, status: upstream.status, data });
      }
    } catch (err) {
      const safeMsg = err instanceof Error ? err.message : 'Kesalahan tidak diketahui';
      failures.push({ nodokumen, error: sanitizeErrorMessage(safeMsg) });
      console.error('[HARVEST_IMPORT_RECORD_ERROR]', { nodokumen, error: safeMsg });
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
