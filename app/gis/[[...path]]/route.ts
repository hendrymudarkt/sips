import { NextRequest } from 'next/server';

// The GIS app is an HTTP-only SPA served from root-absolute paths
// (/asset/*, /api/*, /data/*). Browsers on Vercel (HTTPS) block it as
// mixed content, so we proxy it under /gis and rewrite those references
// to stay inside the proxy. We also strip CSP/X-Frame-Options so the app
// can be framed, and pin the edge region close to the upstream server.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GIS_BASE = (process.env.NEXT_PUBLIC_GIS_URL || 'http://gis.skj.my.id').replace(/\/$/, '');

// Matches root-absolute paths like /asset/..., /api/..., /data/...
// without touching full URLs (http://host/api/...) or paths already proxied.
const ROOT_PATH_RE = /(?<![/:.\w])\/(asset|api|data)\//g;

// Absolute URLs pointing back at the GIS base itself (http://gis.skj.my.id/...).
// These are served over HTTP, so inside an HTTPS page they are blocked as mixed
// content and map markers / photos won't render. Rewriting them to the same-origin
// /gis proxy keeps them loading while the page is framed on this origin.
const absoluteGisRe = (() => {
  // Strip the protocol, then match `https?://<host>` (with the scheme added
  // once) followed by a path, query, hash, or end-of-string.
  const host = GIS_BASE.replace(/^https?:\/\//i, '');
  const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`https?:\\/\\/${escaped}(?=[/?#]|$)`, 'g');
})();

// Directives in the upstream response that would prevent framing / break JS.
const FRAMING_HEADERS = [
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
];

// Request headers needed for HTTP byte serving and conditional cache revalidation.
const FORWARDED_HEADERS = [
  'range',
  'if-range',
  'if-modified-since',
  'if-none-match',
  'cache-control',
];

function rewriteBody(body: string): string {
  // 1) Same-origin absolute GIS URLs (http://gis.skj.my.id/...) -> /gis/...
  let out = body.replace(absoluteGisRe, '/gis');
  // 2) Root-absolute asset/api/data paths -> /gis/asset|api|data/...
  out = out.replace(ROOT_PATH_RE, (match) => `/gis${match}`);
  // 3) Pin the document base so relative references (e.g. the marker photo
  //    URL "api/image?file=..." built at runtime in JS) also resolve under
  //    /gis and get proxied — otherwise they resolve against / and 404.
  if (!/<base\b/i.test(out)) {
    out = out.replace(/<head(?=[\s>])/i, `<head><base href="/gis/">`);
  }
  return out;
}

async function proxy(req: NextRequest, method: 'GET' | 'POST' | 'HEAD') {
  const pathname = req.nextUrl.pathname.replace(/^\/gis\/?/, '');
  const search = req.nextUrl.search;
  const upstream = `${GIS_BASE}/${pathname || ''}${search}`;

  const upstreamHeaders: Record<string, string> = {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
    accept: req.headers.get('accept') || '*/*',
    'accept-language': req.headers.get('accept-language') || 'id-ID,id;q=0.9,en;q=0.8',
  };
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers.get(name);
    if (value) upstreamHeaders[name] = value;
  }

  let response: Response;
  try {
    response = await fetch(upstream, {
      method,
      headers: upstreamHeaders,
      redirect: 'follow',
    });
  } catch {
    return new Response('GIS upstream unreachable', { status: 502 });
  }

  const headers = new Headers(response.headers);
  for (const name of FRAMING_HEADERS) headers.delete(name);

  const contentType = headers.get('content-type') || '';
  if (contentType.includes('text/') && response.ok) {
    const text = await response.text();
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type', contentType.split(';')[0] + '; charset=utf-8');
    const body = rewriteBody(text);
    return new Response(body, { status: response.status, headers });
  }

  // Binary / streamed payloads (pmtiles, images, fonts). When the upstream
  // supplied a content-length (incl. 206 range responses required for PMTiles
  // byte serving), re-serve the buffered body so the header is preserved
  // exactly and validates against the actual bytes.
  const contentLength = headers.get('content-length');
  if (contentLength && response.body) {
    const buffer = await response.arrayBuffer();
    headers.set('content-length', String(buffer.byteLength));
    return new Response(buffer, { status: response.status, headers });
  }
  return new Response(response.body, { status: response.status, headers });
}

export function GET(req: NextRequest) {
  return proxy(req, 'GET');
}

export function POST(req: NextRequest) {
  return proxy(req, 'POST');
}