import { NextRequest, NextResponse } from 'next/server';
import { ImageProxy } from '@/lib/constants';
import { BACKEND_URL } from '@/utils/auth/backendConfig';
import { env } from '@/lib/env';
import { getTokenFromCookie } from '@/utils/api/upstreamProxy';

const PLACEHOLDER_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f3f4f6"/><text x="200" y="150" font-family="sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">Image unavailable</text></svg>'
);

/**
 * Returns a generic placeholder image for security or fetch failures.
 * This prevents broken images in the UI and hides specific failure reasons from clients (CWE-209).
 */
function placeholderResponse() {
  return new NextResponse(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    },
  });
}

const getBackendHostname = (): string => {
  try {
    return new URL(BACKEND_URL).hostname;
  } catch {
    return '';
  }
};

/**
 * Check if the image URL hostname is trusted.
 * Allows the BACKEND_URL hostname OR subdomains of the specifically trusted domain.
 * This prevents SSRF bypasses via public suffixes (CWE-441).
 */
const getTrustedDomains = (): string[] => {
  const raw = env.TRUSTED_IMAGE_DOMAINS;
  return raw
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean);
};

const isTrustedHostname = (hostname: string): boolean => {
  const backendHost = getBackendHostname();
  if (!backendHost) return false;

  if (hostname === backendHost) return true;

  const trustedDomains = getTrustedDomains();
  return trustedDomains.some(
    d => hostname === d || hostname.endsWith(`.${d}`)
  );
};

/**
 * Image proxy to serve images from HTTP backend through HTTPS
 * This solves mixed content issues in production (Vercel)
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Authentication check (CWE-306)
    // Proxy should only be accessible to authenticated users.
    const token = await getTokenFromCookie();
    if (!token) {
      return placeholderResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const rawUrl = searchParams.get('url');

    if (!rawUrl) {
      return placeholderResponse();
    }

    // Decode the URL parameter to handle double-encoding from next/image optimizer
    const imageUrl = (() => {
      try {
        return decodeURIComponent(rawUrl);
      } catch {
        return rawUrl;
      }
    })();

    // SECURITY: Robust origin validation (CWE-441 / CWE-918)
    // Ensure the URL is from a trusted hostname.
    try {
      const parsedUrl = new URL(imageUrl);
      if (!isTrustedHostname(parsedUrl.hostname)) {
        return placeholderResponse();
      }
    } catch {
      return placeholderResponse();
    }

    // Fetch the image from the backend with auth token
    const response = await fetch(imageUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'image/*, */*',
      },
    });

    if (!response.ok) {
      return placeholderResponse();
    }

    // Validate content type before reading body
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return placeholderResponse();
    }

    const imageBuffer = await response.arrayBuffer();

    if (!imageBuffer || imageBuffer.byteLength === 0) {
      return placeholderResponse();
    }

    if (imageBuffer.byteLength > ImageProxy.MAX_SIZE_BYTES) {
      return placeholderResponse();
    }

    // Return the image with proper security headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // SECURITY: Prevent MIME-sniffing (CWE-116)
        'X-Content-Type-Options': 'nosniff',
        // SECURITY: Restrictive CSP for images (CWE-1021)
        'Content-Security-Policy':
          "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
        // SECURITY: Use private cache for potentially sensitive user photos (PII)
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch {
    return placeholderResponse();
  }
}
