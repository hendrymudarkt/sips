import { installSerwist, registerRuntimeCaching } from '@serwist/sw';
import { CacheFirst, ExpirationPlugin } from 'serwist';

const swManifest = (self as unknown as { __SW_MANIFEST: (string | { url: string; revision?: string })[] })
  .__SW_MANIFEST;

installSerwist({
  precacheEntries: swManifest,
  skipWaiting: true,
  clientsClaim: true,
  disableDevLogs: true,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        revision: '1',
        matcher: ({ event }: { event: { request: { mode: string } } }) => event.request.mode === 'navigate',
      },
    ],
  },
});

registerRuntimeCaching({
  matcher: /\/api\/system\/image-proxy/,
  method: 'GET',
  handler: new CacheFirst({
    cacheName: 'photos',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
});
