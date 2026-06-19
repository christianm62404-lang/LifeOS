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
- **Global search** — search across bills, subscriptions, documents, reminders and goals.
- **Polished UX** — sidebar navigation, mobile-responsive layout, summary cards, empty states, loading skeletons, toast notifications and error handling, built with **shadcn/ui**.

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

## 📦 Data models

`Profile`, `Bill`, `Subscription`, `Document`, `Reminder`, `Goal`,
`ActivityLog` — all scoped per-user and protected with RLS. The full schema
lives in [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).

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

Open the **SQL Editor** in your Supabase dashboard, paste the contents of
[`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) and
run it. This creates all tables, indexes, triggers, RLS policies **and** the
private `documents` storage bucket with its access policies.

> Prefer the CLI? With the [Supabase CLI](https://supabase.com/docs/guides/cli)
> linked to your project you can run `supabase db push`.

### 4. Configure auth (optional but recommended for local dev)

In **Authentication → Providers → Email**, you can disable "Confirm email" for
the smoothest local experience — sign-up then logs you straight in. If you keep
confirmation on, users confirm via the email link which redirects to
`/auth/callback`.

### 5. Run

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
│   │   ├── search/
│   │   └── settings/
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

- Every table enforces **Row Level Security** — users can only read/write their own rows.
- Document files are stored in a **private** bucket under a `{user_id}/…` path; access is gated by storage policies and served via short-lived signed URLs.
- The middleware refreshes the auth session on every request and redirects unauthenticated users away from protected routes.

## 🧭 MVP scope & notes

- **Reminder notifications are mocked.** Toggling notification preferences in
  Settings is a no-op stored in component state — no emails or texts are sent.
  This keeps the MVP free of paid messaging APIs.
- Monthly totals normalise different recurrences/billing cycles to a comparable
  monthly figure (e.g. a yearly subscription contributes 1/12 of its amount).

## 📄 License

MIT — built as an MVP demo.
