# SIPS Architecture

## Project Structure

```
app/                          # Next.js App Router pages and API routes
  (views)/                    # Route groups for page layouts
    attendance/               # Attendance views (upload, approval)
    dashboard/                # Dashboard page (UserDashboard)
    harvest/                  # Harvest views (list, upload)
    harvest-quality/          # Harvest quality upload
    transport/                # Transport (pengangkutan) CRUD
    lhm/                      # LHM (Laporan Hasil Muter) views
    open/lhm/                 # Open LHM views
    approval/lhm/             # LHM approval views
    apk-upload/               # APK upload for mobile apps
    change-password/          # Password change page
    users/                    # User management
  api/                        # Route handlers (BFF layer)
    attendance/               # Attendance API proxy
    transport/                # Transport API proxy
    harvest/                  # Harvest API proxy
    master/                   # Master data endpoints (tph, karyawans)
    system/                   # System utilities (image-proxy)
  components/
    ui/                       # Reusable UI primitives (DataTable, SearchSelect, icons, skeletons, etc.)
    features/                 # Feature-specific components (dashboard-chart, attendance-form-modal, etc.)
    feedback/                 # Feedback components (empty-state, delete-modal, app-tour)
    auth/                     # Auth providers
    layout/                   # Layout wrappers
    theme/                    # Theme components
  types/                      # App-specific types (UserProfile)

hooks/                        # Custom React hooks for data fetching & state
  useDashboardData.ts         # Dashboard aggregation
  useTransportData.ts         # Transport CRUD operations & form state
  useHarvestData.ts           # Harvest CRUD operations
  useUsersData.ts             # User management
  useBatchSubmit.ts           # Batch submission logic
  useUploadPage.ts            # Upload page base logic
  useLocale.ts                # Locale detection
  useSearchShortcut.ts        # Keyboard shortcut for search
  useTheme.ts / useThemeEffect.ts  # Theme management

utils/                        # Pure utility functions
  api/                        # API helpers (apiHelpers.ts)
  auth/                       # Auth utilities (authHelper, cookieStore, backendConfig)
  helpers/                    # Formatters (perf-formatter, filterHelper, imageHelper, etc.)
  services/                   # Service layer (API client wrappers)
    attendanceUploadService.ts
    transportService.ts       # Transport API calls
    harvestService.ts         # Harvest API calls
    businessUnitService.ts    # FCBA/Afdeling lookup
    masterDataService.ts      # Master data (TPH, etc.)
    exportCsv.ts              # CSV export
    lhmReportXlsx.ts          # LHM report Excel export
    mapHelper.ts              # Map URL builder
  queryKeys.ts                # React Query key factories

types/                        # Shared domain types
  domain.ts                   # Absensi, Transport, Harvest, User, FormState, etc.

lib/                          # Non-React utilities & configuration
  api/                        # Backend API client configuration
  auth/                       # Server-side auth utilities
  constants/                  # App constants (menuConfig.ts)
  utils/                      # Server utilities (inputSanitizer.ts)
  validations/                # Validation schemas

i18n/                         # Internationalization (next-intl)
  request.ts                  # i18n request config

messages/                     # Translation message files

config/                       # App configuration files

public/                       # Static assets

e2e/                          # End-to-end tests (Playwright)
```

## Path Conventions

TypeScript paths use the `@/` alias (configured in `tsconfig.json`) which maps to the project root:
- `@/hooks/useDashboardData`
- `@/utils/services/transportService`
- `@/app/components/ui/search-select`
- `@/types/domain`

## Architecture Decisions

### 1. Hooks extract data logic

Each feature page delegates its data-fetching and state-management logic to a dedicated hook (e.g., `useDashboardData`, `useTransportData`). This keeps page components focused on rendering while hooks own loading/error states, query invalidation, and derived data.

### 2. Services centralize API calls

The `utils/services/` directory contains thin wrappers around fetch/axios calls to the backend. Components never call fetch directly — they go through a hook which calls a service. This provides a single point for error handling, request formatting, and URL construction.

### 3. Shared types in `types/domain.ts`

All domain models (Absensi, Transport, Harvest, User, etc.) are defined in `types/domain.ts` and imported by hooks, services, and components. This avoids type duplication across views and keeps the schema consistent.

### 4. BFF API routes (`app/api/`)

Next.js route handlers act as a Backend-for-Frontend (BFF) layer. They proxy requests to the Java backend, handle authentication, transform data formats, and validate inputs using Zod schemas. Views never call the Java backend directly.

### 5. Feature-based view grouping

Each feature is grouped under `app/(views)/<feature-name>/` containing its page component, optional sub-routes (e.g., `upload/`, `approval/`), and feature-specific types.

### 6. Component hierarchy

- `ui/` — Generic, reusable primitives (DataTable, SearchSelect, Icons, Skeletons, Toolbar, FilterBar)
- `features/` — Feature-specific composites (dashboard-chart, attendance-form-modal, lhm-report-client)
- `feedback/` — User feedback patterns (empty-state, delete-modal, app-tour, access-denied)

### 7. Form state and validation

Complex forms (Transport, Harvest) use the `use<Feature>Data` hook pattern which manages form state, validation errors, and submission logic. Zod schemas in `lib/validations/` provide server-side input validation.

### 8. Internationalization

UI labels use `next-intl` with `useTranslations()` hook. Translation files are in `messages/`. Locale is detected via a custom `useLocale` hook.
