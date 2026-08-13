# SIPS Mobile Web

SIPS Mobile Web is a Next.js application for operational attendance, harvest, transport, LHM, and approval workflows. It uses server-side API route proxies, cookie-based authentication, role-aware navigation, and dashboard views for operational monitoring.

## Tech Stack

- Next.js App Router with TypeScript
- React 19
- Tailwind CSS and DaisyUI
- TanStack Query
- next-intl
- Vitest (unit tests)
- Playwright (E2E tests)
- ESLint and Prettier

## Active Features

- Dashboard analytics
- Attendance data monitoring
- Harvest data monitoring
- Transport data monitoring
- LHM reports
- LHM approval
- User authentication, logout, force logout, and change password
- Image proxy support for backend-hosted media
- English and Indonesian translations

## Project Structure

```text
app/
  (views)/
    approval/          LHM approval views
    attendance/        Attendance views
    change-password/   Password management
    dashboard/         Analytics dashboard
    harvest/           Harvest views
    lhm/               LHM views
    pengangkutan/      Transport views
  api/                 Server-side API proxies
  components/
    auth/              Auth-related components
    features/          Feature-specific components (FilterBar, Toolbar, AttendanceFormModal, etc.)
    feedback/          Loading, error, empty states
    layout/            Layout components
    theme/             Theme components
    ui/                Generic UI primitives
  types/               Shared application types (legacy)
config/                Configuration files
e2e/
  fixtures/            E2E test fixtures
  helpers/             E2E helper utilities
  specs/               Playwright test specs
hooks/                 React hooks (useAttendanceData, useHarvestData, useTransportData, etc.)
i18n/                  next-intl routing and request setup
lib/
  api/                 API proxy utilities
  auth/                Auth helpers (csrf, rateLimiter, fetchWithCsrf)
  constants/           Shared constants and menu config
  utils/               Utility functions (helpers, input sanitizer)
  validations/         Zod schemas
messages/              Locale message files
types/                 Shared domain types (domain.ts)
utils/
  api/                 API client utilities
  auth/                Auth utilities
  helpers/             Helper functions
  queryKeys.ts         Centralized TanStack Query key constants
  services/            Service layer (attendanceService, harvestService, transportService, etc.)
```

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Required environment variables:

```env
BACKEND_URL=http://your-backend-url
NEXT_PUBLIC_SITE_URL=https://your-site-url
NEXT_PUBLIC_APP_URL=https://your-app-url
NEXT_PUBLIC_GIS_URL=http://your-gis-url
TRUSTED_IMAGE_DOMAINS=your-domain.com
```

## Common Commands

```bash
npm run dev           Start development server
npm run build         Production build
npm run start         Start production server
npm run lint          Run ESLint
npm run test          Run Vitest unit tests
npm run test:coverage Run Vitest with coverage
npm run format:check  Check Prettier formatting
npx playwright test   Run Playwright E2E tests
```

## Testing

### Unit Tests (Vitest)

```bash
npm run test
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
npx playwright test
npx playwright test --reporter=list --workers=1
npx playwright test --headed  # Run with browser visible
npx playwright test --debug   # Run with Playwright inspector
```

E2E tests are located in `e2e/specs/`:
- `auth.spec.ts` - Login, logout, password change
- `attendance.spec.ts` - Attendance CRUD workflows
- `harvest.spec.ts` - Harvest CRUD workflows
- `transport.spec.ts` - Transport CRUD workflows
- `lhm.spec.ts` - LHM report and approval
- `dashboard.spec.ts` - Dashboard analytics
- `users.spec.ts` - User management

## Architecture

```text
Browser
  |
  | cookies, locale, UI requests
  v
Next.js App Router
  |
  | server-side route handlers proxy backend requests
  v
Backend API
  |
  | operational data, auth, media
  v
Data services
```

### Frontend Layered Architecture

```text
Views (app/(views)/*)     → Page components composing hooks and shared UI
  |
Hooks (hooks/*)           → Data fetching, form state, side effects
  |
Services (utils/services/*) → API call logic
  |
API Proxy (app/api/*)       → Server-side route handlers
  |
Backend API
```

### Key Patterns

- **Query Keys** are centralized in `utils/queryKeys.ts` as a `QueryKeys` constant — never inline query keys.
- **Domain types** live in `types/domain.ts` (Absensi, Harvest, Transport, etc.).
- **Data hooks** (e.g., `useAttendanceData`) encapsulate TanStack Query calls and return `{ data, isLoading, error }`.
- **Service functions** (e.g., `attendanceService.fetchAll(filters)`) handle HTTP requests and response parsing.
- **Shared UI components** (FilterBar, Toolbar, DataTable, AttendanceFormModal) live in `app/components/features/`.

The middleware handles public-route redirects, locale defaults, authentication checks, and LHM approval role protection. API handlers should keep backend credentials and server-only behavior on the server side.

## Troubleshooting

- `Missing backend URL`: set `BACKEND_URL` in `.env.local`.
- Login redirects back to `/`: confirm the backend login response sets the expected auth cookies.
- Backend images do not render: confirm `BACKEND_URL` is configured and reachable.
- PowerShell blocks `npm`: run commands through `npm.cmd`.
- Unit tests fail with browser globals missing: confirm Vitest is using the configured `jsdom` environment.
- E2E tests fail: ensure the dev server is running (`npm run dev`) before `npx playwright test`.

## Quality Standards

- Keep shared constants in `lib/constants/`.
- Use domain types from `types/domain.ts`.
- Use centralized `QueryKeys` from `utils/queryKeys.ts`.
- Use centralized error helpers for route-handler failures.
- Follow the hook + service + types pattern when adding new features.
- Keep comments in English (minimize comments).
- Run lint, unit tests, E2E tests, and format checks before opening a PR.
