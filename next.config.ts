import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withBundleAnalyzer from '@next/bundle-analyzer';
import withSerwist from '@serwist/next';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const withBundle = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const backendUrl = process.env.BACKEND_URL ? new URL(process.env.BACKEND_URL) : null;

const backendOrigin = backendUrl ? backendUrl.origin : '';
const backendOriginHttps = backendOrigin ? backendOrigin.replace('http://', 'https://') : '';

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
  : '';
const gisUrl = process.env.NEXT_PUBLIC_GIS_URL
  ? process.env.NEXT_PUBLIC_GIS_URL.replace(/\/$/, '')
  : '';
const gisOrigin = gisUrl ? new URL(gisUrl).origin : '';

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  // All HTTP images are proxied through /api/system/image-proxy ('self').
  // HTTPS origins listed as fallback if proxy edge case fails.
  `img-src 'self' data: blob: https://img.daisyui.com ${backendOriginHttps}`.trim(),
  `connect-src 'self'${siteOrigin ? ` ${siteOrigin}` : ''} ${backendOrigin} ${backendOriginHttps}`.trim(),
  "frame-src 'self' https://vercel.live",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  `form-action 'self' https://www.google.com${gisOrigin ? ` ${gisOrigin}` : ''}${siteOrigin ? ` ${siteOrigin}` : ''}`,
];

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '0',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: cspDirectives.join('; '),
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
];

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    localPatterns: [
      {
        pathname: '/api/system/image-proxy',
        search: '*',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.daisyui.com',
        pathname: '/images/**',
      },
      ...(backendUrl
        ? [
            {
              protocol: backendUrl.protocol.replace(':', '') as 'http' | 'https',
              hostname: backendUrl.hostname,
              port: backendUrl.port || undefined,
              pathname: '/**',
            },
          ]
        : []),
    ],
  },

  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  experimental: {
    // Optimize large packages for more efficient bundling.
    optimizePackageImports: [
      'react-data-table-component',
      'lucide-react',
      '@tanstack/react-query',
      'react-hot-toast',
      'next-intl',
    ],
    // Keep partial prerendering disabled until it is validated for these routes.
    ppr: false,
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Security: Hide Next.js version
  poweredByHeader: false,

  // HTTP headers for caching and baseline browser protections.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Cache Next.js static assets for one year.
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache public images for seven days.
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Cache public image assets.
        source: '/:file(.*\\.(?:svg|ico|png|jpg|jpeg|webp|avif))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=3600',
          },
        ],
      },
      {
        // API routes should always return fresh data.
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache',
          },
        ],
      },
    ];
  },

  compress: true,
  // Keep default ETag generation enabled for conditional caching.

  // Proxy the HTTP-only GIS app through our HTTPS origin so browsers on Vercel
  // don't block it as mixed content.
  async rewrites() {
    if (!gisUrl) return [];
    return [
      {
        source: '/gis/:path*',
        destination: `${gisUrl}/:path*`,
      },
    ];
  },
};

const serwistNextConfig = withSerwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
  reloadOnOnline: false,
  cacheOnNavigation: false,
})(nextConfig);

export default withNextIntl(withBundle(serwistNextConfig));

