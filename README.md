<div align="center">

# GoSwift

### Fast, Reliable Logistics & Last-Mile Delivery — Built for the African Market

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB%20%2B%20Realtime-3fcf8e?style=flat-square&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2024-f7df1e?style=flat-square&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088ff?style=flat-square&logo=github-actions)](https://github.com/features/actions)
[![PWA](https://img.shields.io/badge/PWA-Installable-5a0fc8?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)](#license)

**A production-grade, full-stack logistics platform connecting customers, drivers, and operations in real time.**

[Features](#features) · [Architecture](#frontend-architecture) · [Database](#database-design) · [Auth System](#authentication--authorization) · [Dispatch Engine](#dispatch-engine) · [Setup](#getting-started) · [API Reference](#api-overview) · [CI/CD](#cicd--deployment)

</div>

---

## Overview

GoSwift is a production-ready logistics and last-mile delivery platform purpose-built for the African market. It enables customers to place delivery orders, automatically matches them with the nearest available driver through a real-time dispatch engine, and gives operations teams a live control tower to manage the entire platform.

The system is designed around three core participants — **customers** who need items delivered, **drivers** who fulfil those deliveries, and **administrators** who manage operations — each with a purpose-built interface, a dedicated API surface, and a role-enforced security boundary at every layer of the stack.

GoSwift ships as a **Progressive Web App (PWA)**, meaning it installs on Android and iOS home screens like a native application, works offline with a cached shell, and pushes a version-kill-switch on every deploy to ensure users never run stale code.

### The Problem It Solves

Logistics in emerging markets suffers from fragmented coordination: customers have no reliable way to book and track deliveries, drivers operate without tooling, and dispatch teams rely on manual communication. GoSwift replaces this with a single, real-time platform where booking, assignment, tracking, and management happen automatically and transparently.

### Target Scale

- **2,000–3,000 concurrent users** (production MVP)
- Real-time dispatch, persistent sessions, PWA install, offline resilience
- Database-level race-condition protection for high-contention operations

---

## Features

### Customer
- Register and log in with **email or phone number + password**
- Place delivery orders with pickup address, drop-off address, package type, weight, and receiver details
- Select from five **vehicle types** (bike, tricycle, car, pickup truck, cargo truck) with dynamic fare calculation
- Real-time **order status tracking** (pending → confirmed → in transit → delivered)
- View full **order history** with paginated list and per-order detail pages
- **Contact assigned driver** directly (call or SMS) from the order detail page
- **Persistent login** — stay signed in across app restarts and device sleep without re-authentication
- **Checkout flow** with payment method selection (card, cash, bank transfer)
- Access to help center, privacy policy, and terms of service

### Driver
- Submit a **multi-step driver application** (personal info → vehicle info → guarantor → document upload)
- Application enters a **review queue** visible to admins — driver is notified when approved or rejected
- Toggle **online/offline availability** from the driver dashboard
- Broadcast **live GPS coordinates** to the platform when online
- Receive **real-time dispatch offers** with a countdown timer — first driver to accept claims the order
- View **assigned orders** with full customer and route details
- Mark orders through their lifecycle (accepted → picked up → delivered)
- **Release orders** when a delivery cannot be completed
- Track **earnings** with breakdowns by today, this week, and this month

### Admin
- **Live dashboard** with platform-wide KPIs (orders today, active orders, drivers online, total revenue)
- **User management** — paginated list of all registered customers
- **Driver management** — paginated list of all approved drivers with status
- **Order management** — searchable, filterable table of all orders with manual override capability
- **Application review** — approve or reject driver applications with a review note; triggers email notification to the applicant
- **Manual order assignment** — directly assign an order to a specific driver from the admin panel
- **Platform settings** — configure business info, per-vehicle pricing, service fees, and notification preferences through a live settings editor
- **Live notifications** — real-time toast alerts for new driver applications and new orders

### Platform-Wide
- **Installable PWA** — add to home screen on Android (Chrome) and iOS (Safari)
- **Offline page** — served when the user has no internet connection
- **Version kill-switch** — deployed build ID is checked against the running service worker; stale clients auto-reload
- **Transactional email** — welcome emails for new customers, password reset links, and driver application status notifications via Resend
- **Idempotent order creation** — duplicate order submissions (e.g. on network retry) are deduplicated using an idempotency key
- **Structured server-side logging** — every API request logged with Pino (operation name, duration, errors)
- **Security headers** on all routes (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)

---

## Platform Capabilities

### Customer Journey

```
Register (email or phone + password)
        ↓
Land on dashboard (active order banner if in-flight order exists)
        ↓
New Order: select vehicle type → enter pickup + drop-off → describe package → add receiver info
        ↓
Review fare breakdown at checkout → select payment method → confirm order
        ↓
Order enters dispatch queue — real-time status updates appear immediately
        ↓
Driver accepts → customer sees driver name, vehicle, contact number
        ↓
Driver marks picked up → in transit → delivered
        ↓
Order summary available in history
```

### Driver Journey

```
Register as a customer → submit driver application (personal + vehicle + documents)
        ↓
Admin reviews and approves application
        ↓
Role upgraded to 'driver' — driver dashboard unlocked
        ↓
Go online → GPS tracking begins
        ↓
Dispatch offer arrives with pickup / drop-off preview and countdown timer
        ↓
Accept offer → order is atomically locked to this driver
        ↓
Navigate to pickup → mark picked up → deliver → mark delivered
        ↓
Earnings updated in real time
```

### Admin Workflow

```
Log in to admin dashboard → see live platform stats
        ↓
Review driver application queue → inspect documents → approve or reject with notes
        ↓
Monitor all active orders → manually intervene if needed (reassign driver, cancel order)
        ↓
Adjust platform pricing, business info, and notification settings live
```

---

## User Roles

| Role | Access Level | How Assigned |
|---|---|---|
| **Customer** | Own orders, profile, checkout | Default on registration |
| **Driver** | Driver dashboard, offers, earnings, GPS | Granted on admin approval of application |
| **Admin** | Full platform visibility and control | Manually set in database |

Role boundaries are enforced at three independent layers:
1. **Route proxy** — redirects unauthenticated or wrong-role users before the page renders
2. **API middleware** — `requireAuth()` and `requireAdmin()` validate the JWT on every API call
3. **Database RLS** — PostgreSQL Row-Level Security policies reject unauthorised data access at the query level

---

## Authentication & Authorization

### Overview

Authentication is powered by **Supabase Auth** using **email or phone number + password**. Sessions are stored in **server-managed HttpOnly cookies** via `@supabase/ssr`, not in `localStorage`. This is the correct architecture for iOS PWAs, where `localStorage` is silently cleared after approximately seven days of inactivity.

### Session Lifecycle

```
First login
  → Server signs in with Supabase Auth
  → Supabase issues access_token + refresh_token
  → Tokens written to HttpOnly Set-Cookie headers
  → Client never touches the raw tokens

Every subsequent page load
  → Route proxy reads the session cookie
  → Calls Supabase to refresh the token if near expiry
  → Issues fresh Set-Cookie headers
  → User stays signed in indefinitely

Explicit logout
  → Server calls Supabase signOut()
  → Cookies cleared on current device only
  → Other devices remain signed in
```

### Phone Number Resolution

Users may register with either an email address or a Nigerian E.164-format phone number (`+234...`). The backend maintains a **denormalized `email` column** in the `profiles` table for every user. On phone-number login, the server resolves the phone to the associated email before calling Supabase, providing a seamless UX without any custom auth provider.

### Password Reset

1. User submits the Forgot Password form with their email
2. Server calls Supabase to generate a password reset link
3. Resend delivers the email containing the link
4. User clicks the link → lands on `/reset-password`, which reads the recovery token from the URL
5. Server establishes a temporary session from the token and updates the password

### Route Protection

| Route group | Guard |
|---|---|
| `/dashboard/*` | Must be authenticated with role `customer` |
| `/driver/*` | Must be authenticated with role `driver` |
| `/admin/*` | Must be authenticated with role `admin` |
| `/profile/*` | Must be authenticated (any role) |
| `/api/admin/*` | `requireAdmin()` middleware — rejects non-admin JWT |
| `/api/driver/*` | `requireAuth()` middleware — rejects unauthenticated requests |
| `/api/orders/*` | `requireAuth()` middleware |

---

## Dispatch Engine

The dispatch engine is the operational core of GoSwift. When a customer places an order, the following sequence runs automatically:

### Tiered Radius Search

| Dispatch attempt | Search radius | Behaviour |
|---|---|---|
| 0 – 2 | 10 km | Nearest drivers first (hyperlocal) |
| 3 – 4 | 25 km | City-wide expansion |
| 5+ | 50 km | Metro-wide fallback |

### Offer Flow

1. Order is created with `status = 'pending'`
2. Dispatch service calls a PostgreSQL RPC (`find_and_offer_driver`) that selects the nearest available, online, non-busy driver within the current radius tier
3. An offer row is inserted into `dispatch_offers` with a 30-second TTL
4. The offer is broadcast to the driver over a **Supabase Realtime channel** (filtered by `driver_id`)
5. The driver sees an offer card with a live countdown timer
6. On accept, a second RPC runs:
   ```sql
   UPDATE orders SET driver_id = $driver, status = 'confirmed'
   WHERE id = $order AND status = 'pending'
   ```
   If `0 rows updated` → the order was already claimed — offer is gracefully invalidated
7. A cron endpoint (`/api/cron/expire-offers`) sweeps for TTL-expired offers and marks them `expired`
8. All offer activity (offered, accepted, rejected, expired) is permanently recorded in `dispatch_offers` for audit

### Race Condition Safety

Multiple drivers can receive offers simultaneously. The conditional `WHERE status = 'pending'` in the claim RPC ensures exactly one driver can claim any order, regardless of concurrent accept actions. This is enforced atomically at the database level — no application-layer locking required.

---

## Database Design

### Technology

- **PostgreSQL** via Supabase (managed, with automatic connection pooling)
- **Row-Level Security (RLS)** enabled on all tables
- **36 versioned SQL migration files** — complete, auditable schema history
- **Stored procedures (RPCs)** for atomic, high-contention operations
- **`SECURITY DEFINER` functions** for operations that require bypassing RLS safely

### Core Tables

| Table | Purpose |
|---|---|
| `profiles` | All user metadata — full name, phone, email (denormalized), role, timestamps |
| `orders` | Delivery orders — addresses, package details, fare, payment status, order lifecycle status, GPS coordinates, driver assignment |
| `driver_profiles` | Approved driver metadata — vehicle details, online status, rating, trip count |
| `driver_applications` | Onboarding submissions — personal info, vehicle info, guarantor info, document URLs, review status and notes |
| `dispatch_offers` | Audit trail for every dispatch offer — driver, order, status, distance, TTL, response timestamp |
| `driver_earnings` | Running earnings aggregates — total, weekly, monthly totals per driver |
| `admin_settings` | Singleton platform configuration — business info, vehicle pricing, notification toggles (JSONB) |
| `order_idempotency_keys` | Deduplication map — `(user_id, idempotency_key) → order_id` |

### Key Relationships

```
auth.users (Supabase Auth)
    └── profiles (1:1)
            ├── orders (1:many, as customer)
            ├── driver_applications (1:1)
            └── driver_profiles (1:1, after approval)
                    ├── orders (1:many, as assigned driver)
                    ├── dispatch_offers (1:many)
                    └── driver_earnings (1:1 aggregate)
```

### Data Integrity

- `updated_at` timestamps maintained by database triggers on all mutable tables
- Unique constraints prevent duplicate active offers per driver per order
- Idempotency table prevents duplicate order creation on network retry
- RLS `get_my_role()` helper function reads the caller's role in policy expressions, keeping policy logic clean and consistent

### Migration History

| Range | Milestone |
|---|---|
| 001 – 010 | Core schema: profiles, orders, driver_profiles with RLS |
| 011 – 020 | Driver applications, realtime grants, index optimisation |
| 021 – 025 | Dispatch system: dispatch_offers, TTL, offer RPC |
| 026 | Vehicle type system and dynamic per-vehicle pricing |
| 027 – 029 | Atomic claim RPC, driver auto-linking on first login |
| 030 – 031 | Password auth migration (removed OTP), phone→email resolution |
| 032 – 033 | Order cancellation RPC, driver order release RPC |
| 034 | Security hardening, composite indexes, RLS consolidation |
| 035 | Fix RPC variable conflict in dispatch stored procedure |
| 036 | Driver document storage: Supabase Storage bucket + RLS policies |

---

## Frontend Architecture

### Framework & Rendering

- **Next.js 16 (App Router)** — file-based routing with React Server Components as the default
- Server Components handle data fetching and layout; Client Components handle interactivity
- No unnecessary client-side JavaScript for static content

### State Management

| Concern | Solution |
|---|---|
| Auth state (user, role, profile) | `AuthContext` — React Context + Supabase `onAuthStateChange` listener |
| In-flight order draft | `OrderContext` — persisted to `localStorage` with auto-generated idempotency key |
| Server data | Direct `fetch` + Supabase SDK calls (no global state library) |
| Real-time updates | Supabase Realtime channel subscriptions, cleaned up on component unmount |

### Routing Architecture

```
/                         Landing page (public)
/login                    Login
/register                 Customer registration
/forgot-password          Password recovery request
/reset-password           Password reset (handles email link token)
/dashboard/*              Customer area (role-guarded)
/driver/*                 Driver area (role-guarded)
/admin/*                  Admin area (role-guarded)
/profile/*                User profile (auth-guarded)
/register/driver          Driver application flow
/offline                  PWA offline fallback
```

### Component Architecture

Components are organized by domain, not by technical category:

```
components/
├── landing/      Public-facing marketing sections
├── dashboard/    Customer dashboard widgets
├── driver/       Driver dashboard and onboarding form steps
├── admin/        Admin tables, application review, stats cards
├── orders/       Order cards, driver contact card, status tracker
├── order/        Multi-step order creation form components
├── payment/      Checkout summary, fare breakdown, payment selector
├── profile/      Profile view and edit forms
├── pwa/          Service worker registration and install prompt
└── shared/       Reusable primitives (buttons, badges, tables, toasts)
```

### Design System

GoSwift uses a hand-built component library on top of Tailwind CSS v4. There is no external component library (no MUI, Radix, shadcn) — every primitive is purpose-built and colocated under `components/shared/`.

| Component | Purpose |
|---|---|
| `Button` | Primary / secondary / ghost / danger variants, focus-visible keyboard rings, active:scale-95 feedback |
| `Badge` | 22 semantic status variants: `pending`, `in_transit`, `confirmed`, `delivered`, `cancelled`, `assigned`, `paid`, `failed`, `busy`, `available`, `online`, `offline` and more |
| `Card` | White surface with consistent rounded corners and layered shadow |
| `DataTable` | Generic sortable/filterable table with tab chips, visible row dividers, hover states |
| `DashboardLayout` | Responsive sidebar + mobile drawer + bottom nav for admin and driver dashboards |
| `EmptyState` | Consistent zero-data placeholder |
| `PageHeader` | Section header with optional back link, title, subtitle, and right-side actions slot |
| `Toast` | Success / error overlay notification with auto-dismiss |

**Color tokens (hardcoded in Tailwind utilities):**

| Token | Value | Usage |
|---|---|---|
| Primary dark | `#0F1923` | Text, dark surfaces, sidebar |
| Orange | `#ff6b35` | Primary CTA, active states |
| Orange dark | `#ab3500` | Button hover, active links |
| Surface | `#F7F8FA` | Dashboard background |

**Typography:** Plus Jakarta Sans, loaded from Google Fonts, weights 400–800.

### Data Fetching

- Customer-facing data: API route calls (`/api/*`) that execute server-side Supabase queries
- Admin data: same pattern — all queries run server-side with the service role client
- Real-time data: Supabase Realtime subscriptions per feature, scoped and unsubscribed on unmount
- No global polling; all live updates are event-driven

---

## Backend Architecture

### API Layer

All backend logic lives in Next.js API routes under `/app/api/`. Routes are thin — they validate input, call service functions, and return structured responses.

Every route is wrapped with a `withLogger(name, handler)` decorator that logs the operation name, duration, and any errors using **Pino**.

Every request body is validated with a **Zod schema** before any business logic runs.

### Service Layer

| Service | Responsibility |
|---|---|
| `sessionService` | Resolve phone→email, sign in via Supabase, read role, link driver on first login |
| `dispatchService` | Select radius tier, call dispatch RPC, track attempt count |
| `email/send` | Send transactional emails via Resend with dev-override and graceful failure |
| `email/templates` | Compose email HTML for each event type |
| `earnings` | Aggregate earnings calculations for the driver earnings endpoint |
| `adminGuard` | Verify admin role from JWT before allowing admin API access |
| `driverGuard` | Verify driver role from JWT |

### Supabase Client Strategy

| Context | Client | Key Used | Purpose |
|---|---|---|---|
| Browser | `createBrowserClient` | `anon` | Realtime subscriptions, auth state changes |
| API routes (user actions) | `createServerClient` (SSR) | `anon` + session cookie | Enforces RLS as the authenticated user |
| API routes (privileged) | `createAdminClient` | `service_role` | Bypasses RLS for admin operations |

### Shared Code (`/shared/`)

Vehicle rates, package labels, and fare calculation logic live in a dedicated `/shared/` package that is imported by both the web frontend and the API backend. This ensures the fare shown at checkout is computed by the same function that writes to the database.

---

## API Overview

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account (email/phone + full_name + password) |
| `POST` | `/api/auth/login` | Sign in (email or E.164 phone + password) |
| `POST` | `/api/auth/logout` | Sign out current device |
| `POST` | `/api/auth/forgot-password` | Send password reset email |
| `POST` | `/api/auth/password-reset` | Set new password using recovery token |

### Orders (Customer)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/orders` | List own orders (paginated) |
| `POST` | `/api/orders` | Create order (idempotency-key supported) |
| `POST` | `/api/orders/:id/status` | Update order status |
| `POST` | `/api/orders/:id/cancel` | Cancel an order |

### Driver

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/driver/dashboard` | Aggregated profile, stats, active order |
| `GET` | `/api/driver/orders` | Assigned orders (paginated) |
| `GET` | `/api/driver/earnings` | Earnings summary (total, week, month) |
| `POST` | `/api/driver/status` | Toggle online / offline |
| `POST` | `/api/driver/location` | Push GPS coordinates |
| `POST` | `/api/driver/apply` | Submit driver application |
| `POST` | `/api/driver/offers/:id/accept` | Accept a dispatch offer (atomic claim) |
| `POST` | `/api/driver/offers/:id/reject` | Reject a dispatch offer |
| `POST` | `/api/driver/orders/:id/release` | Release an assigned order |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Platform KPIs (orders, drivers, revenue) |
| `GET` | `/api/admin/users` | All users (paginated) |
| `GET` | `/api/admin/drivers` | All drivers |
| `GET` | `/api/admin/orders` | All orders (paginated, filterable) |
| `GET` | `/api/admin/orders/:id` | Single order detail |
| `POST` | `/api/admin/orders/:id/assign` | Manually assign driver to order |
| `POST` | `/api/admin/orders/:id/cancel` | Cancel order |
| `GET` | `/api/admin/applications` | Driver applications (paginated) |
| `GET` | `/api/admin/applications/:id` | Single application detail |
| `POST` | `/api/admin/applications/:id/review` | Approve or reject application |
| `GET` | `/api/admin/settings` | Read platform settings |
| `PATCH` | `/api/admin/settings` | Update platform settings |

### Utility

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pricing` | Compute fare for given vehicle type + weight |
| `GET` | `/api/profile` | Get authenticated user's profile |
| `GET` | `/api/version` | Return current build ID (PWA version check) |
| `POST` | `/api/cron/expire-offers` | Sweep expired dispatch offers (TTL cleanup) |

---

## Security Features

| Measure | Implementation |
|---|---|
| **Row-Level Security** | Enabled on every table. Users query only their own rows. Drivers access only assigned orders. Admin access routes through `SECURITY DEFINER` RPCs. |
| **JWT Validation** | Every API route calls `requireAuth()`, which verifies the Supabase JWT signature and expiry before processing the request. |
| **Admin Guard** | `/api/admin/*` routes additionally call `requireAdmin()`, which checks the role claim in the JWT. |
| **Input Validation** | All request bodies are parsed and validated with Zod schemas before any database operation. Invalid input returns `400 Bad Request`. |
| **No Credential Disclosure** | Login errors return a generic message regardless of whether the identifier exists, preventing account enumeration. |
| **Rate-Limit Transparency** | Supabase 429 responses (too many auth attempts) are caught and surfaced as a clear rate-limit message rather than a misleading wrong-password error. |
| **Idempotency** | Order creation accepts an `Idempotency-Key` header; duplicate requests within the TTL return the original order without re-inserting. |
| **Race Condition Protection** | Dispatch claim uses a conditional `UPDATE ... WHERE status = 'pending'` — exactly one driver can claim an order under any concurrency level. |
| **Service Role Isolation** | The Supabase `service_role` key is used only in server-side API routes. It is never exposed to the browser or included in any client bundle. |
| **Cookie-Based Sessions** | Session tokens live in HttpOnly server-managed cookies. They cannot be read or manipulated by client-side JavaScript. |
| **Security Headers** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` applied via `next.config.mjs` custom headers. |
| **Double-Submit Protection** | All mutation buttons are disabled on first click and re-enabled only after the server responds, preventing duplicate API calls from the UI. |

---

## PWA & Offline Support

GoSwift ships as a fully installable Progressive Web App.

### Installation

- **Android (Chrome):** "Add to Home Screen" from the browser menu
- **iOS (Safari):** Share → "Add to Home Screen"
- Launches in standalone mode — no browser chrome, full-screen experience

### Service Worker Strategy

| Asset Type | Cache Strategy | Rationale |
|---|---|---|
| `/_next/static/*` (content-hashed) | Cache-first, long TTL | These files have unique hashes — safe to cache indefinitely |
| Icons, manifest | Cache-first | Infrequently updated, safe to cache |
| HTML pages | Network-first, no cache | Prevents stale shell after deploys |
| API routes, Supabase, auth endpoints | Always bypass cache | Real-time data must never be served stale |
| `/offline` | Precached | Served when network is unavailable |

### Version Kill-Switch

On every production build, the Git commit SHA is baked into `NEXT_PUBLIC_BUILD_ID`. On startup, `ServiceWorkerRegister.js` compares this value with the build ID returned by `/api/version`. If they differ — meaning a new deploy has occurred — the service worker is immediately unregistered and the page reloads to ensure users run current code, eliminating the stale-PWA problem permanently.

---

## Monitoring & Reliability

### Structured Logging

Every API route is wrapped with `withLogger(operationName, handler)`, which emits a structured Pino log entry on every request containing:
- Operation name and method
- Response status code
- Request duration in milliseconds
- Full error details on exceptions (stack trace not surfaced to callers)

Logs are emitted as JSON, making them compatible with any log aggregation platform (Datadog, Logtail, CloudWatch, etc.).

### Non-Fatal Failure Isolation

Email delivery (Resend) is invoked asynchronously using Next.js 16's `after()` deferred execution API. Email failures do not block order creation, driver approval, or any other critical path. If the email service is unavailable, the primary operation completes successfully and the email failure is logged for investigation.

### Error Handling Philosophy

- Generic, safe messages to clients — no stack traces or internal details in API responses
- All errors logged server-side with full context
- No silent failures — every `catch` block either logs or re-throws
- No retry loops — failed operations fail fast and surface to the user cleanly

---

## CI/CD & Deployment

### GitHub Actions Pipeline

**File:** `.github/workflows/typecheck.yml`

| Trigger | Branch |
|---|---|
| Pull Request | Any → `main` |
| Push | `main` |

**Concurrency:** Superseded runs on the same branch are cancelled automatically, saving CI minutes.

**Pipeline Steps:**

```
Checkout repository (actions/checkout@v5)
        ↓
Setup Node.js 22 (actions/setup-node@v5, npm cache enabled)
        ↓
npm ci (clean install from lockfile)
        ↓
TypeScript type check (tsc --noEmit)
        ↓
Unit tests (vitest run)
        ↓
Production build (next build)
```

The build step validates that the application compiles cleanly for production — catching misconfigured imports, missing environment variables, and broken component trees before they reach deployment.

### Testing

**Framework:** Vitest

Test coverage targets core infrastructure (not UI):
- **`schemas.test.js`** — Validates all Zod schemas accept correct inputs and reject malformed data
- **`validate.test.js`** — Tests the request validation middleware wrapper
- **`withLogger.test.js`** — Tests that the logging decorator correctly wraps handlers and emits log entries

### Environment Variables

All secrets are stored in **GitHub Actions Secrets** and injected at build time. No secret is committed to the repository.

| Variable | Where Used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | Public — safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server | Public — enforced by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **Secret** — bypasses RLS |
| `SUPABASE_JWT_SECRET` | Server only | JWT signature verification |
| `RESEND_API_KEY` | Server only | Transactional email |
| `EMAIL_FROM` | Server only | Verified sender address |
| `CRON_SECRET` | Server only | Bearer token for cron endpoint |
| `NEXT_PUBLIC_SITE_URL` | Browser + Server | Canonical URL for email links |

---

## Project Structure

```
GoSwift/                                  ← Monorepo root
│
├── web/                                  ← Next.js application
│   ├── app/                              ← App Router (pages + API)
│   │   ├── layout.js                     ← Root layout, PWA manifest, font loading
│   │   ├── page.js                       ← Landing page (public marketing)
│   │   ├── manifest.js                   ← PWA manifest (Next.js native format)
│   │   ├── globals.css                   ← Tailwind v4 base + custom animations
│   │   ├── (auth)/
│   │   │   ├── login/page.js
│   │   │   ├── register/page.js
│   │   │   ├── forgot-password/page.js
│   │   │   └── reset-password/page.js
│   │   ├── dashboard/                    ← Customer dashboard
│   │   │   ├── page.js                   ← Home (greeting, active order, quick actions)
│   │   │   ├── new-order/                ← Multi-step order creation
│   │   │   │   ├── page.js               ← Vehicle type selector
│   │   │   │   └── receiver/page.js      ← Receiver contact details
│   │   │   ├── checkout/page.js          ← Fare review + payment method
│   │   │   ├── orders/
│   │   │   │   ├── page.js               ← Order history
│   │   │   │   └── [id]/
│   │   │   │       ├── page.js           ← Order detail + driver contact card
│   │   │   │       └── summary/page.js   ← Order receipt
│   │   │   ├── support/help-center/
│   │   │   └── legal/
│   │   │       ├── privacy/
│   │   │       └── terms/
│   │   ├── driver/                       ← Driver dashboard (role-guarded)
│   │   │   ├── dashboard/page.js         ← Online toggle, live offers, active order
│   │   │   ├── orders/
│   │   │   │   ├── page.js               ← Assigned orders list
│   │   │   │   └── [orderId]/page.js     ← Order detail with route info
│   │   │   ├── earnings/page.js          ← Earnings summary
│   │   │   ├── profile/page.js           ← Driver profile + vehicle details
│   │   │   └── settings/page.js
│   │   ├── admin/                        ← Admin dashboard (role-guarded)
│   │   │   ├── dashboard/page.js         ← Live KPIs + new-application notifications
│   │   │   ├── users/page.js
│   │   │   ├── drivers/
│   │   │   │   ├── page.js               ← All drivers
│   │   │   │   └── [applicationId]/page.js ← Application review
│   │   │   ├── orders/
│   │   │   │   ├── page.js
│   │   │   │   └── [orderId]/page.js     ← Order detail + manual assign
│   │   │   └── settings/page.js          ← Platform configuration
│   │   ├── register/
│   │   │   └── driver/
│   │   │       ├── page.js               ← Multi-step application form
│   │   │       └── pending/page.js       ← Application submitted confirmation
│   │   ├── profile/
│   │   │   ├── page.js
│   │   │   ├── edit/page.js
│   │   │   └── delete/page.js
│   │   ├── offline/page.js               ← PWA offline fallback
│   │   └── api/
│   │       ├── auth/                     ← register, login, logout, forgot-password, password-reset
│   │       ├── orders/                   ← create, list, status, cancel
│   │       ├── driver/                   ← dashboard, orders, earnings, status, location, apply, offers
│   │       ├── admin/                    ← stats, users, drivers, orders, applications, settings
│   │       ├── pricing/                  ← fare calculation
│   │       ├── profile/
│   │       ├── version/                  ← PWA build ID endpoint
│   │       └── cron/expire-offers/       ← TTL sweep for expired dispatch offers
│   │
│   ├── components/
│   │   ├── landing/                      ← Navbar, Hero, TrustBar, HowItWorks, Fleet, Features,
│   │   │                                    DriverCTA, Testimonials, CTA, Footer
│   │   ├── dashboard/                    ← DashboardHeader, HeroGreeting, ActiveOrderBanner,
│   │   │                                    QuickActions, RecentOrders, BottomNav
│   │   ├── driver/                       ← DispatchOfferCard, DriverOrderList, DriverStatsCard,
│   │   │                                    PersonalInfoStep, VehicleInfoStep, DocumentUploadStep,
│   │   │                                    StepIndicator, FormNavigationButtons
│   │   ├── admin/                        ← AdminStatsCard, AdminTable, AdminUsersTable,
│   │   │                                    AdminOrdersTable, ApplicationList, ApplicationDetails,
│   │   │                                    ReviewActions, StatusBadge
│   │   ├── orders/                       ← OrderCard, OrderList, ReceiptCard, DriverCard,
│   │   │                                    DeliveryTracker, StatusBadge
│   │   ├── order/                        ← OrderForm, LocationInput, PackageDetails,
│   │   │                                    ReceiverForm, SubmitButton
│   │   ├── payment/                      ← CheckoutSummary, OrderReviewCard, PriceBreakdown,
│   │   │                                    PaymentMethodSelector, PayButton
│   │   ├── profile/                      ← ProfileForm, ProfileCard, DangerZone
│   │   ├── pwa/                          ← ServiceWorkerRegister, InstallPrompt
│   │   └── shared/                       ← Button, Card, Badge, PageHeader, DashboardLayout,
│   │                                        DataTable, Paginator, EmptyState, Toast, PageShell
│   │
│   ├── context/
│   │   ├── AuthContext.js                ← Global auth state (user, role, profile, logout)
│   │   ├── OrderContext.js               ← Order draft state + idempotency key
│   │   └── Providers.js                  ← Root provider wrapper
│   │
│   ├── hooks/
│   │   ├── useAuthGuard.js               ← Role-based page protection
│   │   ├── useDashboardData.js           ← Customer dashboard data loader
│   │   ├── useDriverLocation.js          ← GPS tracking + location push
│   │   ├── useDriverOnlineStatus.js      ← Online/offline toggle
│   │   └── usePickupLocation.js          ← Pickup location state management
│   │
│   ├── lib/
│   │   ├── api/                          ← Client-side API wrapper functions
│   │   │   ├── auth.js
│   │   │   ├── orders.js
│   │   │   ├── drivers.js
│   │   │   ├── admin.js
│   │   │   ├── profile.js
│   │   │   ├── response.js               ← HTTP response helpers (ok, badRequest, etc.)
│   │   │   ├── validate.js               ← Request body validation wrapper
│   │   │   ├── withLogger.js             ← API route logging decorator
│   │   │   └── schemas/                  ← Zod schemas (auth, orders, drivers, admin, profile)
│   │   ├── server/
│   │   │   ├── supabase.server.js        ← SSR client + requireAuth()
│   │   │   ├── supabase.admin.js         ← Service-role client (bypasses RLS)
│   │   │   ├── adminGuard.js
│   │   │   ├── driverGuard.js
│   │   │   ├── dispatch/dispatchService.js
│   │   │   ├── auth/sessionService.js
│   │   │   ├── email/client.js
│   │   │   ├── email/send.js
│   │   │   ├── email/templates.js
│   │   │   ├── earnings.js
│   │   │   └── logger.js
│   │   └── utils/
│   │       ├── format.js                 ← formatCurrency, formatRelativeTime, formatPhone
│   │       ├── order.js                  ← VEHICLE_LABELS, VEHICLE_EMOJIS, PACKAGE_LABELS
│   │       ├── mapOrder.js               ← DB row → UI shape transformer
│   │       └── validation.js             ← Phone/email validators
│   │
│   ├── proxy.js                          ← Route middleware (auth gate + session refresh)
│   ├── next.config.mjs                   ← Build ID, image domains, security headers
│   ├── postcss.config.mjs                ← Tailwind v4 plugin
│   ├── vitest.config.mjs                 ← Test runner config
│   ├── tests/                            ← Unit tests (schemas, validation, logging)
│   └── public/
│       ├── sw.js                         ← Service worker (offline + cache strategy)
│       ├── icon-192.png
│       ├── icon-512.png
│       ├── icon-maskable-512.png
│       ├── apple-touch-icon-180.png
│       └── Images/
│           └── LandingpageImage/
│               └── Heroimage.jpg
│
├── supabase/
│   └── migrations/                       ← 34 versioned SQL migration files
│
├── shared/                               ← Shared code (web + future clients)
│   ├── constants/
│   │   ├── order.js                      ← Package type and vehicle labels/emojis
│   │   └── vehicleRates.js               ← Per-vehicle pricing + computeFare()
│   └── utils/
│       └── format.js                     ← Shared formatting utilities
│
└── .github/
    └── workflows/
        └── typecheck.yml                 ← CI pipeline (typecheck → test → build)
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm (bundled with Node.js)
- A [Supabase](https://supabase.com) project (free tier is sufficient)
- A [Resend](https://resend.com) account for transactional email (free tier is sufficient)

### 1 — Clone the repository

```bash
git clone https://github.com/your-username/goswift.git
cd goswift
```

### 2 — Install dependencies

```bash
cd web
npm install
```

### 3 — Configure environment variables

Create `web/.env.local`:

```env
# Supabase (get these from: Supabase Dashboard → Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Application
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email (get from: resend.com → API Keys)
RESEND_API_KEY=re_...your-resend-key
EMAIL_FROM=GoSwift <noreply@yourdomain.com>

# Cron job protection (any random secret string)
CRON_SECRET=your-random-cron-secret

# Development only — redirects all outbound emails to this address
EMAIL_DEV_OVERRIDE=your-email@example.com
```

> Never commit `.env.local` to version control. It is already in `.gitignore`.

### 4 — Run database migrations

The `supabase/migrations/` directory contains 34 SQL migration files. Apply them in order:

**Option A — Supabase CLI:**
```bash
supabase link --project-ref your-project-id
supabase db push
```

**Option B — Supabase Dashboard:**
1. Go to your project → SQL Editor
2. Open each file from `001_` to `034_` and run them in sequence

### 5 — Start the development server

```bash
# From the web/ directory
npm run dev
```

Visit **http://localhost:3000**

---

## Scripts Reference

Run these from the `web/` directory:

```bash
npm run dev          # Start the development server (with env pollution guards)
npm run build        # Production build
npm run start        # Start the production server
npm run lint         # ESLint code quality check
npm run test         # Run unit tests with Vitest
npm run test:watch   # Run tests in watch mode
npm run pwa:icons    # Regenerate PWA icon set from source image
```

---

## Performance Optimisations

### Database
- Composite indexes on high-frequency query patterns: `orders(status)`, `orders(user_id, created_at)`, `drivers(is_online)`, `dispatch_offers(order_id, status)`
- Pre-aggregated earnings totals in `driver_earnings` — no `SUM()` on the hot path for the driver dashboard
- Pagination enforced on every list endpoint (`LIMIT` + `OFFSET`) — no unbounded queries
- GPS-based driver sorting delegated to PostgreSQL using PostGIS-compatible arithmetic within RPCs

### Frontend
- Server Components as the default — client JavaScript only where interaction is required
- Content-hashed static assets (`/_next/static/*`) cached indefinitely in the service worker
- Supabase Realtime subscriptions scoped by `driver_id` or `user_id` filters — only relevant rows trigger re-renders
- Order draft persisted to `localStorage` so multi-step form state survives page refreshes

### Networking
- Session cookies refreshed server-side on every request — no client-side token management overhead
- Transactional emails sent with `after()` (Next.js 16 deferred execution) — email delivery is off the critical path
- Service worker intercepts static assets — repeat visits load from cache with zero network round-trips

---

## Scalability Considerations

| Consideration | Approach |
|---|---|
| **Concurrent sessions** | Stateless API routes; session state lives in Supabase — horizontally scalable with no shared server memory |
| **Database contention** | Dispatch claim uses a single conditional `UPDATE` atomic at the Postgres level — no application locks required |
| **Realtime load** | Subscriptions are filtered per user/driver — Supabase multiplexes connections efficiently; no broadcast storm |
| **Email delivery** | Resend is a dedicated transactional email service; failures are decoupled from order creation |
| **Build isolation** | Monorepo with `outputFileTracingRoot` configured — shared code is bundled correctly for serverless function deployment |
| **Schema evolution** | 34 versioned migration files provide a clean, repeatable path to upgrade any environment |

---

## Technical Highlights

This section documents the engineering decisions most relevant to production readiness and maintainability.

### Three-Layer Security Boundary
Security is enforced independently at the route proxy, the API middleware, and the database. Compromise of one layer does not expose the system — an attacker who bypasses the route guard still faces JWT validation at the API, and even a valid JWT for the wrong role is blocked by RLS policies in the database. Defense in depth is structural, not incidental.

### Atomic Dispatch With No Application Locking
The dispatch claim is a single conditional `UPDATE ... WHERE status = 'pending'`. Under any level of concurrency, exactly one driver can claim an order — enforced atomically by PostgreSQL without application-level mutexes, advisory locks, or distributed coordination. This is the correct solution for the problem and scales linearly with database capacity.

### Cookie-Based Sessions for PWA Correctness
iOS aggressively purges `localStorage` on Safari after extended inactivity. Using `@supabase/ssr` to store session tokens in server-managed HttpOnly cookies is not a preference — it is the technically correct choice for a PWA that must maintain sessions across device sleep and app backgrounding on iOS. The architecture was chosen to solve a real-world reliability problem, not for convention.

### Idempotent Order Creation
Mobile networks drop requests mid-flight. Without idempotency, a customer retrying a failed order placement could create duplicate orders. The platform supports an `Idempotency-Key` header; the server maps `(user_id, key) → order_id` and returns the existing order on duplicate submission. This is the industry standard approach used by Stripe, Twilio, and other production payment/logistics APIs.

### Non-Blocking Email Delivery
Email outages should never prevent orders from being placed. Using Next.js 16's `after()` API, email sending is deferred until after the HTTP response is sent to the client. The critical path (create order, return order ID) is never blocked by the email service.

### Version Kill-Switch for Stale PWAs
A long-running service worker can serve stale application code indefinitely. The platform solves this by baking the Git commit SHA into the build as `NEXT_PUBLIC_BUILD_ID` and comparing it against the live `/api/version` endpoint on startup. When a mismatch is detected, the service worker is unregistered and the page reloads. This ensures every user runs current code within one visit after a deploy.

### Shared Fare Calculation Logic
Vehicle rates and the `computeFare()` function live in `/shared/constants/vehicleRates.js`. Both the checkout UI and the order creation API import from the same module. The fare displayed to the customer at checkout is guaranteed to match the fare written to the database — there is no opportunity for a pricing discrepancy between frontend and backend.

---

## Development Approach

This project was developed using modern software engineering practices and leveraged AI-assisted development tools for productivity enhancement, debugging support, documentation generation, code review assistance, and development acceleration. All architectural decisions, database schema design, security model design, third-party integrations, implementation reviews, and final engineering decisions were validated and controlled by the developer. The platform architecture, security boundaries, dispatch logic, and production deployment configuration reflect deliberate, reasoned engineering choices.

---

## Future Roadmap

Based on the current architecture, the following capabilities are natural extensions:

| Feature | Foundation Already In Place |
|---|---|
| **Live map tracking** | Driver GPS coordinates are already being collected and stored; a map view requires a frontend map component and a realtime coordinate subscription |
| **In-app push notifications** | Service worker infrastructure is present; Web Push API implementation and a push subscription table are the remaining steps |
| **Paystack payment gateway** | ✅ Integrated — card payments initialize a Paystack hosted checkout; webhook verifies payment and updates order status. Cash and bank transfer flows also supported. |
| **Customer ratings for drivers** | `driver_profiles.rating` column exists; a rating submission flow requires a post-delivery prompt and an aggregation update |
| **Driver earnings payouts** | Earnings are tracked in `driver_earnings`; a payout flow requires a payout request model and integration with a transfer API |
| **Multi-city expansion** | `baseCity` is already a configurable admin setting; city-aware pricing and driver pools are the next step |
| **SMS notifications** | Resend handles email; the session service has prior OTP infrastructure that could be repurposed for delivery status SMS |
| **Mobile native app** | The `/shared/` package is isolated from the web app for this reason — it can be imported by a React Native application |

---

## Business Value

GoSwift demonstrates a complete, vertically integrated logistics platform viable for commercial deployment in the Nigerian and broader African market. Key commercial attributes:

- **Immediate deployability** — a Supabase project, a Resend account, and a Vercel deployment are the only infrastructure requirements to go live
- **Low operational overhead** — the automated dispatch engine eliminates the need for manual order routing; the admin dashboard provides full operational visibility without custom tooling
- **Driver supply acquisition** — the driver onboarding flow with document upload and admin review supports compliant driver acquisition at scale
- **Installable mobile experience** — PWA support eliminates the cost and complexity of a separate native app for MVP launch
- **Configurable pricing** — vehicle rates and service fees are adjustable through the admin settings UI without a code deploy
- **Auditable operations** — every dispatch offer, order lifecycle transition, and admin action is recorded in the database with full timestamps

---

## Author

<div align="center">

### Adeniran Israel

**Full Stack Developer**

I build production-grade web platforms with a focus on scalable architecture, real-world engineering constraints, and clean, maintainable code. My work spans full-stack product development — from database schema design and API architecture through to frontend UX and deployment pipelines.

Areas of expertise: Full Stack Web Development · Scalable System Design · Supabase & PostgreSQL · Next.js & React · Product Development for Emerging Markets · Startup Technology Solutions · Progressive Web Apps · API Design & Security

---

*GoSwift — Built with production intent, not prototype thinking.*

</div>

---

## License

Private repository. All rights reserved © 2025 Adeniran Israel.
