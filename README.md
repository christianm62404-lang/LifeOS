# LifeOS

> Your personal operating system — manage bills, subscriptions, documents, reminders and goals in one clean dashboard.

LifeOS is an MVP web app that helps you stay on top of recurring life
responsibilities. It surfaces what needs attention soon (overdue bills,
expiring documents, upcoming renewals and reminders) so nothing slips through
the cracks.

![Tech](https://img.shields.io/badge/Next.js-16-black) ![TS](https://img.shields.io/badge/TypeScript-strict-blue) ![Supabase](https://img.shields.io/badge/Supabase-Auth%20%7C%20DB%20%7C%20Storage-3FCF8E)

---

## ✨ Features

- **Authentication** — email/password sign up, login, logout and a protected dashboard (Supabase Auth).
- **Dashboard** — at-a-glance metrics plus upcoming bills, reminders, expiring documents, active subscriptions, in-progress goals and a recent-activity feed, with a 30-day "upcoming" calendar view.
- **Bills** — track amount, due date, recurrence, autopay, category and notes. Mark paid, see overdue/due-soon and an estimated monthly total.
- **Subscriptions** — track billing cycle, next billing date, category and cancellation link. See normalised monthly & yearly totals.
- **Documents** — upload files to private Supabase Storage with type, expiration date and notes. Surfaces documents expiring soon and generates short-lived signed download links.
- **Reminders** — recurring/one-off tasks with priority. Mark complete. (Notification delivery is **mocked** for the MVP — no real emails/SMS.)
- **Goals** — track category, target date, progress % and status with progress bars.
- **Calendar** — an agenda view of every dated item (bills, reminders, renewals, expiries).
- **Global search** — search across bills, subscriptions, documents, reminders and goals.
- **Plans & billing** — Free / Personal / Pro tiers with **Stripe** hosted Checkout & Customer Portal, server-side feature gating, and a pricing page.
- **Polished UX** — sidebar navigation, mobile-responsive layout, summary cards, empty states, loading skeletons, toast notifications and error handling, built with **shadcn/ui**.

## 💳 Plans & feature gating

| Plan         | Price        | Includes                                                                                 |
| ------------ | ------------ | ---------------------------------------------------------------------------------------- |
| **Free**     | $0           | Basic reminders, dashboard, global search                                                |
| **Personal** | $7.99 / mo   | Everything in Free **+** Bills, Documents, Goals, Calendar                                |
| **Pro**      | $14.99 / mo  | Everything in Personal **+** Subscription tracking, Smart recurring reminders, Home & Vehicle maintenance, AI suggestions |

Gating is enforced **server-side** (gated pages and Server Actions both check
entitlements), not just hidden in the UI — see [`SECURITY.md`](./SECURITY.md).
Tiers are stored in a read-only `user_billing` table that only the Stripe
webhook can write, so users can't grant themselves a plan.

> **Runs free locally.** With `BILLING_ENABLED=false` (the default) every user
> is treated as Pro, so you can explore the whole app without setting up Stripe.

## 🧱 Tech stack

| Layer        | Choice                                             |
| ------------ | -------------------------------------------------- |
| Framework    | Next.js (App Router) + React 19                    |
| Language     | TypeScript (strict)                                |
| Styling      | Tailwind CSS + shadcn/ui (Radix primitives)        |
| Validation   | Zod                                                |
| Forms        | React Hook Form                                     |
| Auth         | Supabase Auth (`@supabase/ssr`)                    |
| Database     | Supabase Postgres (with Row Level Security)        |
| File storage | Supabase Storage (private `documents` bucket)      |
| Payments     | Stripe (hosted Checkout + Customer Portal, test mode) |

## 📦 Data models

`Profile`, `Bill`, `Subscription`, `Document`, `Reminder`, `Goal`,
`ActivityLog` and `UserBilling` — all scoped per-user and protected with RLS.
The full schema lives in
[`supabase/migrations/`](./supabase/migrations/).

---

## 🚀 Getting started

### Prerequisites

- Node.js 18.18+ (Node 20+ recommended)
- A free [Supabase](https://supabase.com) project

### 1. Clone & install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values from your Supabase project (**Project Settings → API**):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET=documents
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> Only the public anon key is needed — LifeOS relies entirely on Row Level
> Security, so no service-role key is required. The app runs fully on the
> Supabase free tier with **no paid APIs**.

### 3. Provision the database

Open the **SQL Editor** in your Supabase dashboard and run both migrations in
order:

1. [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) —
   tables, indexes, triggers, RLS policies and the private `documents` storage
   bucket.
2. [`supabase/migrations/0002_billing.sql`](./supabase/migrations/0002_billing.sql) —
   the read-only `user_billing` entitlements table.

> Prefer the CLI? With the [Supabase CLI](https://supabase.com/docs/guides/cli)
> linked to your project you can run `supabase db push`.

### 4. Configure auth (optional but recommended for local dev)

In **Authentication → Providers → Email**, you can disable "Confirm email" for
the smoothest local experience — sign-up then logs you straight in. If you keep
confirmation on, users confirm via the email link which redirects to
`/auth/callback`.

### 5. (Optional) Enable Stripe billing

LifeOS works without Stripe — leave `BILLING_ENABLED=false` and everyone gets
all features. To turn on real, **free-to-develop** billing using Stripe **test
mode**:

1. Create a [Stripe](https://dashboard.stripe.com) account and switch to **Test
   mode**.
2. Create two recurring **Products/Prices**: Personal ($7.99/mo) and Pro
   ($14.99/mo). Copy each Price ID (`price_…`).
3. In `.env.local` set:
   ```bash
   BILLING_ENABLED=true
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PERSONAL_PRICE_ID=price_...
   STRIPE_PRO_PRICE_ID=price_...
   SUPABASE_SERVICE_ROLE_KEY=...   # Project Settings → API → service_role
   ```
4. Forward webhooks locally with the [Stripe CLI](https://docs.stripe.com/stripe-cli):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the printed signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Restart `npm run dev`, visit **/billing**, and upgrade using Stripe's test
   card `4242 4242 4242 4242` (any future expiry/CVC).

Card data never touches LifeOS — checkout and plan management happen on Stripe's
hosted pages. See [`SECURITY.md`](./SECURITY.md) for the full posture.

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account and
you're in.

---

## 📜 Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the dev server                 |
| `npm run build`     | Production build                     |
| `npm run start`     | Run the production build             |
| `npm run lint`      | Lint with ESLint                     |
| `npm run typecheck` | Type-check with `tsc --noEmit`       |

## 🗂️ Project structure

```
src/
├── app/
│   ├── (auth)/            # login, signup (public)
│   ├── (app)/             # protected app shell + feature pages
│   │   ├── dashboard/
│   │   ├── bills/
│   │   ├── subscriptions/
│   │   ├── documents/
│   │   ├── reminders/
│   │   ├── goals/
│   │   ├── calendar/
│   │   ├── billing/      # plans page + Stripe checkout/portal actions
│   │   ├── home-maintenance/ vehicle-maintenance/ ai-suggestions/  (Pro)
│   │   ├── search/
│   │   └── settings/
│   ├── api/stripe/webhook # signature-verified Stripe webhook
│   └── auth/              # server actions + OAuth/email callback
├── components/
│   ├── ui/                # shadcn/ui components
│   └── ...                # sidebar, stat cards, empty states, skeletons
├── hooks/                 # use-toast
└── lib/                   # supabase clients, zod schemas, types, utils
supabase/migrations/       # SQL schema + RLS + storage policies
middleware.ts              # session refresh + route protection
```

Each feature folder follows the same pattern: a server `page.tsx` that fetches
data, an `actions.ts` with Zod-validated server actions, a client form
`*-dialog.tsx`, a client `*-list.tsx`, and a `loading.tsx` skeleton.

## 🔒 Security notes

Full details in [`SECURITY.md`](./SECURITY.md). Highlights:

- Every table enforces **Row Level Security** — users can only read/write their own rows; Server Actions re-scope queries to the user as defense-in-depth.
- **Entitlements can't be self-granted**: `user_billing` is read-only under RLS; only the signature-verified Stripe webhook (service-role) can change a tier. Paid features are blocked server-side, not just hidden.
- Document files live in a **private** bucket under `{user_id}/…`, served via short-lived signed URLs; uploads are size- and type-restricted server-side.
- Server-only secrets (service-role key, Stripe keys) are guarded by `import "server-only"` and never shipped to the client.
- Security **headers + CSP**, auth **rate limiting**, and a stronger password policy are applied across the app.
- Middleware refreshes the session on every request and guards protected routes.

## 🧭 MVP scope & notes

- **Reminder notifications are mocked.** Toggling notification preferences in
  Settings is a no-op stored in component state — no emails or texts are sent.
  This keeps the MVP free of paid messaging APIs.
- Monthly totals normalise different recurrences/billing cycles to a comparable
  monthly figure (e.g. a yearly subscription contributes 1/12 of its amount).

## 📄 License

MIT — built as an MVP demo.
