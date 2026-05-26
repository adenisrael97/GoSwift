@AGENTS.md

## Local environment

Two unrelated shell traps can break `npm run dev` on this project. Both are documented here so future-you (or anyone else booting the project from a fresh terminal) doesn't lose hours rediscovering them.

### Trap 1 — `__NEXT_PRIVATE_STANDALONE_CONFIG` pollution

VS Code's Electron renderer runs a bundled `next-server (v15.5.12)` as a child process for its own internal use. That process exports `__NEXT_PRIVATE_STANDALONE_CONFIG` (a frozen JSON Next.js config from some unrelated project, e.g. `C:\Users\tomas\OneDrive\Desktop\CodeGPT\codegpt-nextjs`) into its environment. **Every terminal spawned from VS Code inherits this env var.**

When you then run `next dev` in *this* project, Next.js's [config loader](node_modules/next/dist/server/config.js#L1165) sees the env var and uses *that* config verbatim — bypassing `next.config.mjs`, `assignDefaults`, and the rootDir detection. Symptoms include:

- `Turbopack Internal Error: Invalid distDirRoot: "". distDirRoot should not navigate out of the projectPath.`
- `Cannot find module '@tailwindcss/postcss'` (because the leaked config doesn't reference your installed plugins)
- Random Windows-style paths in error messages on a Mac

The npm scripts (`dev`, `build`, `start`) defensively `unset __NEXT_PRIVATE_STANDALONE_CONFIG __NEXT_PRIVATE_ORIGIN` before invoking `next`, so the trap is neutralized for the canonical commands. If you run `npx next dev` directly, or your own wrapper, unset them yourself first.

### Trap 2 — `NODE_ENV=production` + `npm config omit=dev`

This project's build tooling (`tailwindcss`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`) lives in `devDependencies`. `npm install` will silently skip those packages — and the dev server will fail with `Cannot find module '@tailwindcss/postcss'` — if **either** of these is true in your shell:

- `NODE_ENV=production` is exported, or
- `npm config get omit` returns `dev` (npm derives this automatically from `NODE_ENV=production`).

Fix in your shell once:
```sh
unset NODE_ENV                  # and remove any `export NODE_ENV=production` from ~/.zshrc / ~/.zprofile / etc.
```
Or override per-command:
```sh
NODE_ENV=development npm install --include=dev
```
# CLAUDE.md — Production MVP Architecture Standard (JavaScript + Supabase)

## 1. Project Overview

This is a production-ready MVP platform with three roles:

- Users (customers placing orders)
- Drivers (service providers)
- Admin (system control dashboard)

### Tech Stack
- Next.js (App Router)
- JavaScript (NO TypeScript)
- Supabase (Auth, Database, Realtime, RLS)
- Chrome DevTools MCP (debugging enabled)

### Target
- 5,000 concurrent users MVP
- Real-time driver assignment system
- Scalable, production-grade architecture

---

# 2. SYSTEM ARCHITECTURE (CRITICAL)

## FULL FLOW: FRONTEND → BACKEND → REALTIME

```
USER ACTION (Frontend)
        ↓
Next.js Client Component
        ↓
API Route OR Supabase Client
        ↓
Supabase Database (Source of Truth)
        ↓
Realtime Subscription / Listener
        ↓
UI State Update
        ↓
UI Re-render
```

---

## RULE:
Frontend NEVER directly controls business logic.

Supabase is the ONLY backend authority.

---

# 3. AUTHENTICATION SYSTEM (CRITICAL)

## Persistent Login Rules

### REQUIREMENT:
- User should NOT sign in again on same device
- Session persists automatically
- Only new device requires login

---

## IMPLEMENTATION RULES:

### Supabase Auth Behavior:
- Use persistent session storage (DEFAULT Supabase behavior)
- DO NOT manually clear session unless logout is intentional
- DO NOT force sign-in redirects on reload

---

## SESSION FLOW:

```
First login:
  → Supabase creates session
  → Stored in secure storage

Page reload:
  → Supabase auto-restores session
  → NO login required

New device:
  → No session found
  → Redirect to login
```

---

## AUTH GUARD RULES:

- ONE auth listener only (useAuthGuard.js)
- No duplicate listeners
- No redirect during loading state

---

## FORBIDDEN:

- Signing out inside SIGNED_OUT event
- Forcing router redirects during session loading
- Clearing session automatically on page load

---

# 4. FRONTEND → BACKEND FLOW RULES

## User Flow Example (Order Creation)

```
User clicks "Place Order"
        ↓
Disable button immediately (prevent double click)
        ↓
Call Supabase insert (orders table)
        ↓
Return success response
        ↓
Trigger realtime update
        ↓
Update UI state
```

---

## DRIVER FLOW

```
Driver goes online
        ↓
Update drivers.is_online = true
        ↓
Realtime channel broadcasts availability
        ↓
System assigns nearest driver
        ↓
Driver receives request
```

---

## ADMIN FLOW

```
Admin opens dashboard
        ↓
Fetch users, drivers, orders
        ↓
Subscribe to realtime changes
        ↓
Live updates displayed
```

---

# 5. IDENTITY & SESSION SAFETY (CRITICAL)

## RULE:
- One user = one active session per device
- Multiple devices allowed
- Each session is independent

---

## SECURITY RULES:
- Supabase handles session encryption
- Never store tokens in localStorage manually
- Never override session manually

---

# 6. IDEMPOTENCY RULES (IMPORTANT)

## Prevent double actions:

### Every mutation must be idempotent:

Examples:
- Place order
- Accept order
- Delete account

---

## RULE:

Every critical action must include:

### 1. Request locking
```js
if (isLoading) return;
```

### 2. Server-side protection
```sql
WHERE status = 'pending'
```

### 3. Unique constraints in DB
(e.g. one active order per user if needed)

---

# 7. DOUBLE CLICK PROTECTION

Every button must:

- Disable immediately on click
- Show loading state
- Prevent re-submission

```js
if (loading) return;
setLoading(true);
```

---

# 8. DRIVER MATCHING SYSTEM (CORE LOGIC)

## Flow:

1. User creates order
2. Order status = "pending"
3. Fetch available drivers:
   - is_online = true
   - is_busy = false
4. Sort by distance (nearest first)
5. Send request to top drivers
6. First accept wins

---

## RACE CONDITION PROTECTION:

ONLY ONE DRIVER CAN CLAIM ORDER:

```sql
UPDATE orders
SET driver_id = ?
WHERE id = ?
AND status = 'pending'
```

If 0 rows updated → already taken

---

# 9. REALTIME SYSTEM RULES

Allowed:
- Order updates
- Driver status changes
- Admin dashboard updates

Rules:
- ONE subscription per table per feature
- Always unsubscribe on unmount
- No duplicate channels
- No global listeners

---

# 10. SUPABASE RULES

- Supabase = SINGLE SOURCE OF TRUTH
- Always enforce RLS
- Never expose service role key on frontend

---

## RLS RULES:

- Users → only own data
- Drivers → only assigned orders
- Admin → server-only access

---

# 11. BACKEND RULES (API ROUTES)

- Validate all inputs
- Never trust client data
- Keep API routes thin
- Prefer Supabase logic over custom backend logic

---

# 12. FRONTEND RULES (NEXT.JS)

- Default: Server Components
- Client Components only when needed
- No business logic inside UI components

---

# 13. NAVIGATION RULES

NEVER:
- Navigate inside Supabase listener
- Navigate inside API response
- Navigate inside realtime event

ONLY:
- Navigate based on UI state

---

# 14. ADMIN DASHBOARD RULES

Admin can:
- View users
- View drivers
- View orders
- Approve/reject drivers
- Monitor system logs

---

# 15. PERFORMANCE RULES (5,000 USERS MVP)

- Pagination required everywhere
- Use LIMIT in all queries
- Add DB indexes:
  - orders.status
  - drivers.is_online
  - created_at fields

- Minimize realtime channels

---

# 16. ERROR HANDLING RULES

- Always try/catch
- Never silent fail
- Log errors clearly
- Avoid retry loops

---

# 17. DEBUGGING RULES (CHROME DEVTOOLS MCP)

Claude Code can inspect:

- Network request loops
- Repeated /phone-auth calls
- RSC (_rsc) requests
- Initiator chains (sw.js)
- Supabase auth events
- Realtime subscriptions

---

# 18. CRITICAL ANTI-PATTERNS

DO NOT:

- ❌ signOut inside SIGNED_OUT event
- ❌ multiple Supabase clients
- ❌ infinite redirect loops
- ❌ uncontrolled realtime subscriptions
- ❌ missing RLS policies
- ❌ frontend-only security logic

---

# 19. SYSTEM DESIGN GOAL

System must be:

- Fast under load (5K users)
- Secure by default
- Predictable
- Scalable
- Easy to debug

---

# 20. FINAL ARCHITECTURE SUMMARY

Frontend:
→ UI only
→ State handling only

Backend (Supabase):
→ Auth
→ Database
→ Realtime
→ Security (RLS)

System behavior:
→ Event-driven
→ Stateless frontend
→ Centralized backend logic

---

END OF CLAUDE.md