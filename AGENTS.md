# SIPS repository guidance

## UI and visual design

- Treat the existing SIPS pages as the design system. Before building or restyling a screen, inspect a nearby page with the same job and reuse its layout, components, and interaction patterns.
- Keep the existing stack: Next.js App Router, TypeScript, Tailwind utilities, DaisyUI theme tokens, and the shared components under `app/components`.
- For list and administration pages, prefer `PageLayout`, `Toolbar`, `QuickSearch`, `FilterBar` when needed, `AppDataTable`, and `StatusBadge`. Follow nearby screens such as Users, Transport, and Vehicle Rent.
- Use theme-aware classes (`base-100`, `base-200`, `base-content`, `primary`, and semantic status colors); do not introduce a page-specific palette or one-off CSS when existing tokens and components cover the need.
- Keep screens practical and consistent: clear page title, compact toolbar, search and filters near the data, readable table columns, and explicit loading, empty, and error states. Keep actions in a consistent row/toolbar position and make button labels describe the outcome.
- Use responsive layouts, visible keyboard focus, accessible names for icon-only controls, and confirmations for consequential actions. Keep the existing information and behavior when changing presentation.
- Avoid decorative hero sections, gradients, arbitrary KPI cards, excessive shadows, or a new component style that makes one screen feel unrelated to the rest of SIPS.
- Add or update strings in both `messages/id.json` and `messages/en.json`; use the existing `next-intl` translation patterns rather than hard-coded interface copy.

## Data and access

- Before adding API calls, inspect existing route handlers, shared API helpers, hooks, and the corresponding backend API contract. Keep backend credentials server-side and use the authenticated proxy pattern.
- Enforce privileged access on the server with the trusted `SECURE_*` cookies in middleware and API handlers; client-side menu visibility is not authorization.
- Preserve request validation, CSRF checks for mutations, explicit upstream errors, query invalidation, and accessible loading/disabled states.
- Keep status labels and transitions aligned with the backend's actual status values. Do not silently map unknown statuses to success.

## Validation

- Add focused tests for new authorization or state-changing API behavior.
- Run ESLint, focused Vitest tests, formatting checks, and the narrowest applicable type/build check for changes.
