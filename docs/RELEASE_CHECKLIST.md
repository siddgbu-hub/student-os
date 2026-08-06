# Student OS — V1 Release Checklist

## 1. Pre-Deployment Verification
- [x] Environment variable configurations set for production Cloudflare Workers & Pages.
- [x] Database migrations 0001 through 0005 executed sequentially against D1 database.
- [x] CORS policies restricted to production domain endpoints.
- [x] Development seed data isolated (`student@example.com` only seeded in dev database).
- [x] Sensitive parameters and API tokens configured via secret bindings (`wrangler secret put JWT_SECRET`).

## 2. Code Quality & Build Checks
- [x] `pnpm build` across all workspace packages succeeds without errors (379ms).
- [x] `pnpm typecheck` across all 6 workspace packages passes with 0 errors (`tsc --noEmit`).
- [x] `pnpm lint` passes with 0 errors and 0 warnings (`eslint .`).

## 3. Module Functional Audit
- [x] **Authentication**: OTP email generation, Google Sign-In primary CTA layout, rate limiting (3 requests / 15 mins), device session tracking.
- [x] **Study Module**: Subject CRUD, Chapter CRUD, live study session execution with active session mutual exclusion, timer persistence, and cancel/complete actions.
- [x] **Planner Module**: Task CRUD, status updates, priority sorting (High/Medium/Low), daily/weekly view toggle, completion accuracy calculations.
- [x] **Revision Module**: Automatic revision item generation upon study session completion, spaced repetition stage escalation (1d, 3d, 7d, 14d, 30d), due/overdue tracking, revision session timer.
- [x] **Analytics Module**: Multi-module statistics aggregation, study & revision streak calculation, responsive SVG trend bar chart, subject focus share breakdown.
- [x] **User Account Module**: Personal & academic profile updates, theme preference engine (`system` / `light` / `dark`), time format, device session revocation, account deletion request modal.

## 4. UI & Accessibility Checklist
- [x] Standardized `EmptyState` components across all empty lists with title, description, and primary CTA.
- [x] Standardized `ErrorState` components with retry handler.
- [x] Reusable `Toast` notification system with `role="status"` and `role="alert"` live regions.
- [x] Keyboard `Escape` key close handlers on all modal dialogs.
- [x] `loading` spinner state on form submit buttons to prevent double-submissions.
- [x] Responsive layout across desktop (1180px), tablet, and mobile devices.

## 5. Security & Data Integrity Audit
- [x] All D1 SQL queries use parameterized prepared bindings (`db.prepare(...).bind(...)`) preventing SQL injection.
- [x] All REST routes protected by Hono bearer token auth middleware (`createAuthMiddleware`).
- [x] Foreign key constraints with `ON DELETE CASCADE` and `ON DELETE SET NULL` on child tables.
- [x] Soft-deleted & inactive parent records excluded from dependency calculations per `AGENTS.md`.
