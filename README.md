# GoSwift — Logistics & Delivery Platform

**GoSwift** is a full-stack logistics and delivery web platform built for the African market. It connects customers who need items delivered with drivers who can fulfil those deliveries — all managed through a powerful admin dashboard. It works as a regular website and also as a **PWA (Progressive Web App)**, meaning users can install it on their phone like a native app.

**Author:** Adeniran Israel  
**Stack:** Next.js 16 · Supabase · Tailwind CSS · JavaScript  
**Target:** 2,000–3,000 concurrent users (production-grade MVP)

---

## Table of Contents

1. [What the App Does](#what-the-app-does)
2. [Three User Roles](#three-user-roles)
3. [Key Features](#key-features)
4. [Tech Stack Explained](#tech-stack-explained)
5. [Project Structure](#project-structure)
6. [Getting Started (Local Setup)](#getting-started-local-setup)
7. [Environment Variables](#environment-variables)
8. [Database Migrations](#database-migrations)
9. [How the Auth System Works](#how-the-auth-system-works)
10. [How the Dispatch System Works](#how-the-dispatch-system-works)
11. [PWA Support](#pwa-support)
12. [Security](#security)
13. [Scripts Reference](#scripts-reference)

---

## What the App Does

A customer visits GoSwift, enters a pickup and drop-off location, selects their package type, and places an order. The system automatically finds the nearest available driver, sends them an offer, and the first driver to accept claims the order. The customer can track the status in real time. Once delivered, both sides see the completed record.

---

## Three User Roles

| Role | What they can do |
|---|---|
| **Customer** | Register, place orders, track deliveries, view order history, contact assigned driver |
| **Driver** | Apply to become a driver, go online/offline, accept order offers, track earnings |
| **Admin** | View all users, drivers and orders; approve/reject driver applications; monitor the platform |

---

## Key Features

### Customer
- Register and log in with **email or phone number + password**
- Place a delivery order with pickup location, drop-off, and package details
- Real-time order status updates (pending → assigned → in transit → delivered)
- View full order history
- **Call or SMS the assigned driver directly** from the order detail page
- Persistent login — stay logged in across sessions without re-entering a password

### Driver
- Apply to become a driver (requires admin approval)
- Toggle online/offline availability
- Receive order offers with a countdown timer — first to accept wins
- View assigned orders and mark them as picked up / delivered
- Track earnings history

### Admin
- Full dashboard with live stats
- Approve or reject driver applications
- View all customers, drivers, and orders
- Monitor system activity

### Platform-wide
- **PWA support** — installable on Android and iOS home screen
- **Offline page** — shown when the user has no internet connection
- **Per-device persistent login** — logging out on one device does not affect other devices
- **Welcome email** sent to new customers on registration
- **Password reset** via email link
- **Rate limiting** handled gracefully (no confusing wrong-password messages during throttling)

---

## Tech Stack Explained

> If you are new to some of these tools, here is a plain-language explanation of each.

| Tool | What it is | Why GoSwift uses it |
|---|---|---|
| **Next.js 16** | A React framework for building web apps. Handles pages, routing, and the server. | Gives both a fast frontend and a backend API in one project |
| **React 19** | The UI library that powers the interactive parts of the page | Industry standard for building component-based UIs |
| **Supabase** | A hosted database + auth + real-time service (think Firebase but open source) | Handles user accounts, the database, live updates, and row-level security |
| **Tailwind CSS v4** | A CSS utility framework — you style elements directly in HTML/JSX with short class names | Fast, consistent styling without writing separate CSS files |
| **@supabase/ssr** | A Supabase add-on that stores the login session in a cookie instead of the browser's local storage | Makes sessions survive browser restarts and work on iOS PWA without expiring |
| **Zod** | A validation library — checks that form data or API input is the right shape before processing it | Prevents bad data from reaching the database |
| **Resend** | An email-sending service | Sends welcome emails and password reset links |
| **Pino** | A fast logging library | Records what happens on the server for debugging |
| **Vitest** | A testing framework | Runs automated tests to catch bugs early |
| **LightningCSS** | A fast CSS compiler used by Tailwind v4 | Makes CSS builds faster |

---

## Project Structure

```
GoSwift/                        ← repository root
├── web/                        ← Next.js application
│   ├── app/                    ← Pages and API routes (App Router)
│   │   ├── page.js             ← Landing page (auto-redirects logged-in users)
│   │   ├── layout.js           ← Root layout, PWA manifest link
│   │   ├── login/              ← Login page
│   │   ├── register/           ← Registration page
│   │   ├── forgot-password/    ← Forgot password page
│   │   ├── reset-password/     ← Password reset page (handles email link)
│   │   ├── dashboard/          ← Customer dashboard
│   │   │   ├── page.js         ← Home / order summary
│   │   │   ├── new-order/      ← Place a new order
│   │   │   └── orders/[id]/    ← Order detail + driver contact
│   │   ├── driver/             ← Driver dashboard
│   │   │   ├── dashboard/
│   │   │   ├── orders/
│   │   │   └── earnings/
│   │   ├── admin/              ← Admin dashboard
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── drivers/
│   │   │   └── orders/
│   │   └── api/                ← Server-side API routes
│   │       ├── auth/           ← register, login, logout, forgot-password
│   │       ├── orders/         ← create, fetch, cancel orders
│   │       ├── driver/         ← offers, status, location, earnings
│   │       ├── admin/          ← user/driver/order management
│   │       ├── pricing/        ← fare calculation
│   │       └── cron/           ← background cleanup jobs
│   ├── components/             ← Reusable UI components
│   │   ├── landing/            ← Landing page sections (Hero, Navbar, etc.)
│   │   ├── dashboard/          ← Customer UI components
│   │   ├── driver/             ← Driver UI components
│   │   ├── admin/              ← Admin UI components
│   │   ├── orders/             ← Order cards, driver contact card
│   │   └── shared/             ← Buttons, modals, loaders used everywhere
│   ├── context/                ← React context (AuthContext — global auth state)
│   ├── hooks/                  ← Custom React hooks (useAuthGuard, etc.)
│   ├── lib/                    ← Core logic and helpers
│   │   ├── supabase.js         ← Browser Supabase client (cookie-based)
│   │   ├── api/                ← Client-side API wrappers (auth, orders, etc.)
│   │   ├── server/             ← Server-only helpers (session, email, RLS)
│   │   └── utils/              ← Shared utilities (validation, formatting)
│   ├── proxy.js                ← Auth gate — protects dashboard/driver/admin routes
│   └── public/                 ← Static files (icons, service worker)
├── supabase/
│   └── migrations/             ← 34 SQL migration files (full DB schema history)
├── shared/                     ← Code shared across web and other future clients
│   ├── config/
│   ├── constants/
│   └── utils/
└── .github/                    ← GitHub Actions CI/CD workflows
```

---

## Getting Started (Local Setup)

Follow these steps exactly if you are setting this project up for the first time.

### Prerequisites

Make sure you have these installed on your computer:

- [Node.js](https://nodejs.org/) version 18 or higher
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A [Supabase](https://supabase.com) account (free tier is fine)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/adenisrael97/GoSwift.git
cd GoSwift
```

---

### Step 2 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once it is ready, go to **Project Settings → API**
3. Copy these three values — you will need them in the next step:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ`)
   - **service_role key** (long string — keep this secret, never share it)

---

### Step 3 — Set up environment variables

Inside the `web/` folder, create a file called `.env.local`:

```bash
cd web
```

Create a new file named `.env.local` and fill in your values:

```env
# Your Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Your Supabase public (anon) key — safe to expose to the browser
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJyour-anon-key

# Your Supabase service role key — SERVER ONLY, never put this in the browser
SUPABASE_SERVICE_ROLE_KEY=eyJyour-service-role-key

# Your app's public URL (use localhost for local development)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend API key for sending emails (get one free at resend.com)
RESEND_API_KEY=re_your-resend-key

# The email address that sends system emails (must be verified in Resend)
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

> **Important:** Never commit `.env.local` to GitHub. It is already listed in `.gitignore` and will be ignored automatically.

---

### Step 4 — Run the database migrations

The `supabase/migrations/` folder contains 34 SQL files that create every table, index, RLS policy, and function the app needs.

Run them in order through the Supabase dashboard:

1. Go to your Supabase project → **SQL Editor**
2. Open each file in `supabase/migrations/` starting from `001_...` up to the latest
3. Paste the contents and click **Run**

Or if you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed:

```bash
supabase link --project-ref your-project-id
supabase db push
```

---

### Step 5 — Install dependencies and run

```bash
# From inside the web/ folder
cd web
npm install
npm run dev
```

The app will be available at **http://localhost:3000**

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Secret service role key (server only) |
| `NEXT_PUBLIC_APP_URL` | Yes | The app's public URL |
| `RESEND_API_KEY` | Yes | API key from resend.com |
| `RESEND_FROM_EMAIL` | Yes | Sender email address for system emails |

---

## Database Migrations

All 34 migrations live in `supabase/migrations/`. Each file is numbered and describes what it does. Here is a summary of the major milestones:

| Migration range | What it sets up |
|---|---|
| 001–010 | Core tables: profiles, orders, drivers |
| 011–020 | RLS policies, realtime subscriptions, driver applications |
| 021–025 | Dispatch system, offer TTL, driver assignment |
| 026 | Vehicle types and dynamic pricing |
| 027–029 | Atomic dispatch RPCs, driver linking on login |
| 030–031 | Password auth migration, removal of OTP |
| 032–033 | Order cancellation and driver release RPCs |
| 034 | Security hardening, performance indexes, RLS consolidation |

---

## How the Auth System Works

GoSwift uses **email or phone number + password** authentication, powered by Supabase Auth.

### Login flow (plain language)

1. User types their email (or phone) and password
2. The server resolves the phone to an email if needed, then asks Supabase to verify the password
3. Supabase returns a session (two tokens: `access_token` and `refresh_token`)
4. The browser stores these tokens in a **secure cookie** (not localStorage)
5. On every page load, the server reads the cookie and refreshes the token if it is about to expire
6. The user stays logged in indefinitely without re-entering their password

### Why cookies and not localStorage?

- **localStorage** gets wiped after ~7 days on iOS when the app is not used — users get logged out unexpectedly
- **Cookies** managed by the server survive browser restarts, device sleep, and iOS storage cleanup

### Per-device logout

When a user logs out, only **their current device** is signed out. Other devices they are logged into remain active. This is the expected behaviour for a "Stay logged in" experience.

### Password reset flow

1. User requests a reset link via the Forgot Password page
2. Supabase sends an email with a reset link
3. The link opens the `/reset-password` page, which reads the token from the URL and establishes a temporary session
4. User sets a new password — done

---

## How the Dispatch System Works

When a customer places an order, the platform automatically finds and assigns a driver using a tiered radius search:

1. **Search within 10 km** for available online drivers
2. If none found, **expand to 25 km**
3. If still none, **expand to 50 km**

Once drivers are found, the system sends them an **offer with a countdown timer**. The **first driver to accept** claims the order atomically — the database ensures only one driver can claim any single order, even if multiple drivers tap "Accept" at the same moment.

If no driver accepts before the timer expires, the offer is cleaned up and the order remains in a pending state.

All of this logic runs through PostgreSQL stored procedures (RPCs) for correctness and speed — no race conditions, no double assignments.

---

## PWA Support

GoSwift is a **Progressive Web App**. This means:

- On Android: tap the browser menu → "Add to Home Screen" to install it like an app
- On iOS (Safari): tap the Share button → "Add to Home Screen"
- Once installed, it opens full-screen without the browser address bar
- An **offline page** is shown if the user loses their internet connection

The service worker (`public/sw.js`) handles offline detection and caching.

---

## Security

| Measure | Detail |
|---|---|
| **Row Level Security (RLS)** | Every Supabase table has RLS enabled. Users can only read and write their own data. Drivers can only see orders assigned to them. Only admins bypass RLS. |
| **Service role key** | Used only on the server inside API routes. Never sent to the browser. |
| **Input validation** | Every API route validates its input with Zod before touching the database. |
| **No credential disclosure** | Login errors never reveal whether an email or phone number exists in the system. |
| **Rate limit handling** | Supabase throttle errors (429) are caught and shown as a clear "too many attempts" message instead of a wrong-password message. |
| **Idempotency** | Critical actions (place order, accept order) are protected against double-submission at both the UI level and the database level. |
| **Security headers** | `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` are set on all routes. |
| **Cookie-based sessions** | Session management is fully delegated to Supabase's secure cookie system — no custom token signing. |

---

## Scripts Reference

Run these from inside the `web/` folder:

```bash
npm run dev          # Start the development server
npm run build        # Build for production
npm run start        # Start the production server
npm run lint         # Check for code style issues
npm run test         # Run the automated test suite
npm run test:watch   # Run tests and re-run on file changes
npm run pwa:icons    # Regenerate PWA icon set from source image
```

---

## Contributing

This is a private MVP project. If you have been given access:

1. Create a branch from `main`
2. Make your changes
3. Open a Pull Request with a clear description of what you changed and why
4. Do not push directly to `main`

---

## License

Private repository. All rights reserved © 2025 Adeniran Israel.

---

*Built with focus and attention to production quality — GoSwift.*
