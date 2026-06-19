# Security overview

LifeOS is built so that, by default, a user can only ever access their own
data, and entitlements cannot be self-granted. This document summarises the
controls in place and the trade-offs made for the MVP.

## Authentication & sessions

- Email/password auth via Supabase Auth (`@supabase/ssr`), with sessions stored
  in `httpOnly` cookies managed by Supabase.
- `middleware.ts` refreshes the session on every request and redirects
  unauthenticated users away from protected routes; signed-in users are kept out
  of the auth pages.
- Every Server Action and protected page calls `supabase.auth.getUser()` and
  rejects unauthenticated requests — the UI is never the only gate.
- Sign-up passwords require ≥ 8 chars with at least one letter and one number
  (`src/lib/validations.ts`). Tune the policy further in the Supabase dashboard.
- A best-effort in-memory **rate limiter** (`src/lib/rate-limit.ts`) throttles
  login (10/min) and sign-up (5/min) per IP. For multi-instance/serverless
  deployments, back this with Redis/Upstash for shared state.

## Authorization & data isolation

- **Row Level Security is enabled on every table.** Policies restrict
  `select/insert/update/delete` to rows where `auth.uid() = user_id`
  (`supabase/migrations/0001_init.sql`).
- Server Actions additionally scope every query with `.eq("user_id", user.id)`
  as defense-in-depth.
- **Entitlements cannot be escalated by users.** The `user_billing` table is
  *read-only* under RLS (owner `select` only, no write policies). Only the
  Stripe webhook — running with the service-role key, which bypasses RLS — may
  change a user's tier (`supabase/migrations/0002_billing.sql`).
- Paid features are enforced **server-side**: gated pages check `hasFeature()`
  before fetching data, and gated Server Actions call `ensureFeature()` before
  any write. The client UI (locks, upgrade prompts) is purely cosmetic on top.

## File uploads (documents)

- Files are stored in a **private** Supabase Storage bucket under a
  `{user_id}/…` path; storage policies restrict access to the owning user.
- Downloads use short-lived (60s) **signed URLs** — objects are never public.
- Uploads are validated server-side: a 10 MB size cap, an **allowlist** of safe
  types (PDF, common images, Word, text), and filename sanitisation. HTML/SVG
  and executables are rejected to avoid stored-XSS vectors.

## Secrets handling

- The Supabase **service-role key** and all **Stripe secrets** are server-only.
  They have no `NEXT_PUBLIC_` prefix and live behind `import "server-only"`
  modules (`src/lib/supabase/admin.ts`, `src/lib/stripe.ts`), so they can never
  be bundled into client code.
- `.env*` files are git-ignored.

## Payments (Stripe)

- Uses **hosted Stripe Checkout + Customer Portal** (redirect flows), so card
  data never touches LifeOS — minimal PCI scope, no Stripe.js in the client.
- The webhook (`/api/stripe/webhook`) verifies every event against
  `STRIPE_WEBHOOK_SECRET` using the raw request body; forged calls are rejected.
- `/api/*` routes are excluded from the auth-redirect middleware so the webhook
  is reachable, and each route does its own authorization.

## Transport & headers

`next.config.mjs` sets security headers on every response:

- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` (anti-clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera/mic/geolocation/topics
- A baseline **Content-Security-Policy** restricting `connect-src` to the app +
  Supabase, and locking down `object-src`, `base-uri` and `form-action`.

### Known trade-offs (MVP)

- The CSP allows `'unsafe-inline'`/`'unsafe-eval'` for scripts because Next.js
  injects inline runtime code; this can be tightened to nonces in production.
- The rate limiter is in-memory (per instance). Use a shared store in
  production.

## Reporting

This is an MVP/demo. For a real deployment, report vulnerabilities privately to
the maintainer before public disclosure.
