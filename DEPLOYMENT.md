# Deployment

## Environment Variables

Set these values in the deployment environment:

```env
BACKEND_URL=http://your-backend-url
NEXT_PUBLIC_SITE_URL=https://your-site-url
NEXT_PUBLIC_APP_URL=https://your-app-url
NEXT_PUBLIC_GIS_URL=http://your-gis-url
TRUSTED_IMAGE_DOMAINS=your-domain.com
```

- `BACKEND_URL`: Backend API server (used server-side only via proxy routes).
- `NEXT_PUBLIC_SITE_URL`: Public site URL for archive links, external app links, and CSP.
- `NEXT_PUBLIC_APP_URL`: Public URL of this application, used for Open Graph/social preview metadata (`og:image`, `twitter:image`), sitemap, and CSP. Falls back to `NEXT_PUBLIC_SITE_URL` when not set.
- `NEXT_PUBLIC_GIS_URL`: Internal GIS server URL for map links (optional — link hidden if not set).
- `TRUSTED_IMAGE_DOMAINS`: Comma-separated hostname suffixes allowed by the image proxy.

## Build Process

```bash
npm ci
npm run lint
npm run test
npm run build
```

## Node or VM Deployment

```bash
npm ci --omit=dev
npm run build
npm run start
```

Run the application behind HTTPS and a reverse proxy that forwards standard headers.

## Vercel Deployment

1. Connect the repository.
2. Configure the required environment variables.
3. Use the default Next.js build command.
4. Verify image proxy and backend API access after deployment.

## Container Deployment

1. Install dependencies with `npm ci`.
2. Build with `npm run build`.
3. Start with `npm run start`.
4. Expose the configured application port.

## Post-Deployment Checks

- Login succeeds and redirects to the dashboard.
- LHM approval access matches role requirements.
- Attendance, harvest, transport, and LHM API pages load data.
- Backend-hosted images render through the image proxy.
- Security and cache headers are present in responses.
