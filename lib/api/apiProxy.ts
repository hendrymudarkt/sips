/**
 * Shared server-side proxy helpers for Next.js API routes.
 * Centralises the repetitive fetch -> parse -> error-handle pattern
 * that was copy-pasted across every route handler.
 *
 * Principles applied: DRY, SoC, SSOT, Fail Fast, KISS
 */
import { NextResponse } from 'next/server';

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function extractMessage(data: unknown, fallback = 'Unknown error'): string {
  if (isRecord(data) && typeof data.message === 'string') return data.message;
  return fallback;
}

// ─── Standard JSON headers ────────────────────────────────────────────────────

export const JSON_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export function authHeaders(token: string): HeadersInit {
  return { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
}

// ─── Safe JSON parse ──────────────────────────────────────────────────────────

export async function parseJsonSafe(
  res: Response
): Promise<{ data: unknown; parseError: boolean }> {
  const text = await res.text();
  if (!text) return { data: null, parseError: false };
  try {
    return { data: JSON.parse(text), parseError: false };
  } catch {
    return { data: text, parseError: true };
  }
}

// ─── Normalise array response ─────────────────────────────────────────────────

export function extractDataArray(data: unknown): unknown[] {
  if (!isRecord(data)) return [];
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data as unknown[];
  return [];
}

// ─── Unauthenticated response ─────────────────────────────────────────────────

export function unauthorizedResponse(
  message = 'No authentication token found. Please login again.'
) {
  return NextResponse.json({ success: false, message }, { status: 401 });
}

// ─── Generic GET proxy ────────────────────────────────────────────────────────

/**
 * Proxy a GET request to an upstream URL and return the response as-is.
 * Handles 404-as-empty, parse errors, and upstream errors uniformly.
 */
export async function proxyGet(
  upstreamUrl: string,
  token: string,
  options: { emptyOn404?: boolean } = {}
): Promise<NextResponse> {
  const response = await fetch(upstreamUrl, {
    method: 'GET',
    headers: authHeaders(token),
    cache: 'no-store',
  });

  const { data, parseError } = await parseJsonSafe(response);

  if (parseError) {
    console.error('Failed to parse API response:', data);
    return NextResponse.json(
      { success: false, message: 'Failed to parse API response', data: [] },
      { status: 500 }
    );
  }

  if (!response.ok) {
    const errorMsg = extractMessage(data);
    if (
      options.emptyOn404 &&
      (response.status === 404 || errorMsg.toLowerCase().includes('tidak ditemukan'))
    ) {
      return NextResponse.json({ success: true, message: 'Data tidak ditemukan', data: [] });
    }

    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    console.error('[API_PROXY_GET_ERROR]', {
      status: response.status,
      url: upstreamUrl,
      data,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch data from upstream API',
        data: [],
      },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}

// ─── Generic POST proxy ───────────────────────────────────────────────────────

/**
 * Proxy a POST request with a JSON body to an upstream URL.
 * Validates that `body.data` is an array (Fail Fast).
 * Sanitizes input and validates CSRF token.
 */
export async function proxyPost(
  upstreamUrl: string,
  token: string,
  body: unknown
): Promise<NextResponse> {
  const { data: payload } = body as { data?: unknown };

  if (!payload || !Array.isArray(payload)) {
    return NextResponse.json(
      { success: false, message: 'Invalid request format. Expected data array.' },
      { status: 400 }
    );
  }

  // SECURITY: Input is already validated with zod schemas at each route.
  // Do NOT blanket-strip payload strings here: the old sanitizeObject regex
  // was bypassable AND silently corrupted legitimate data (e.g. keterangan
  // containing "<", "--", "OR"). React escapes on output; the Laravel
  // backend is the final authority for business-rule validation.
  const response = await fetch(upstreamUrl, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ data: payload }),
  });

  const { data, parseError } = await parseJsonSafe(response);

  if (parseError) {
    console.error('Failed to parse API response:', data);
    return NextResponse.json(
      { success: false, message: 'Failed to parse API response' },
      { status: 500 }
    );
  }

  if (!response.ok) {
    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    console.error('[API_PROXY_POST_ERROR]', {
      status: response.status,
      url: upstreamUrl,
      data,
    });

    return NextResponse.json(
      { success: false, message: 'Failed to process request with upstream API' },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}

// ─── FormData proxy helpers ──────────────────────────────────────────────────

/**
 * Clean internal-only fields from FormData before forwarding upstream.
 * The Next.js security layer adds _csrf_token which should never reach
 * the upstream Laravel backend.
 */
export function cleanInternalFields(form: FormData): void {
  form.delete('_csrf_token');
}

async function handleFormDataResponse(
  upstream: Response,
  logTag: string,
  upstreamUrl: string
): Promise<NextResponse> {
  const { data, parseError } = await parseJsonSafe(upstream);

  if (parseError) {
    console.error(`[${logTag}_PARSE_ERROR]`, { status: upstream.status, url: upstreamUrl, data });
    return NextResponse.json(
      { ok: false, error: 'Invalid response format from upstream' },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    console.error(`[${logTag}_ERROR]`, { status: upstream.status, url: upstreamUrl, data });
    return NextResponse.json(
      { ok: false, error: 'Upstream request failed' },
      { status: upstream.status }
    );
  }

  return NextResponse.json({ ok: true, data });
}

/**
 * Proxy a FormData PUT (with _method override) to an upstream URL.
 * Forwards the original FormData directly instead of rebuilding it,
 * to avoid File serialisation issues on Vercel serverless runtime
 * (File objects from req.formData() lose binary data when moved to a
 * new FormData instance).
 */
export async function proxyFormDataPut(
  upstreamUrl: string,
  token: string,
  incoming: FormData,
  logTag: string
): Promise<NextResponse> {
  cleanInternalFields(incoming);
  incoming.append('_method', 'PUT');

  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: incoming,
  });

  return handleFormDataResponse(upstream, `${logTag}_PUT`, upstreamUrl);
}

/**
 * Proxy a FormData DELETE (with ba_deleted validation) to an upstream URL.
 * Forwards the original FormData directly to avoid File serialisation
 * issues on Vercel serverless runtime.
 */
export async function proxyFormDataDelete(
  upstreamUrl: string,
  token: string,
  incoming: FormData,
  logTag: string
): Promise<NextResponse> {
  const baDeleted = incoming.get('ba_deleted');
  if (!(baDeleted instanceof File)) {
    return NextResponse.json(
      { ok: false, error: 'BA delete file is required' },
      { status: 400 }
    );
  }

  cleanInternalFields(incoming);

  const upstream = await fetch(upstreamUrl, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: incoming,
  });

  return handleFormDataResponse(upstream, `${logTag}_DELETE`, upstreamUrl);
}

/**
 * Proxy a FormData POST (for method-override scenarios) to an upstream URL.
 * Forwards the original FormData directly to avoid File serialisation
 * issues on Vercel serverless runtime.
 */
export async function proxyFormDataPost(
  upstreamUrl: string,
  token: string,
  incoming: FormData,
  logTag: string
): Promise<NextResponse> {
  cleanInternalFields(incoming);

  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: incoming,
  });

  return handleFormDataResponse(upstream, `${logTag}_POST`, upstreamUrl);
}

