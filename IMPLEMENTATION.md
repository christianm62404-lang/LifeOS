# Receipt Vault — Implementation Manifest

> A complete record of everything implemented for **Receipt Vault**, written so
> the project can be transferred cleanly into another repository. If you copy
> the source, copy this file too — it documents intent, structure, and the
> external setup the code depends on.

- **Last verified commit on origin branch:** `claude/exciting-brahmagupta-cc674h`
- **Status:** MVP complete. `tsc --noEmit`, `next build`, `next lint`, and
  `vitest` all pass.

---

## 1. What this app is

A personal receipt & warranty manager. Users sign up, upload receipts
(PDF/PNG/JPG), have the details auto-extracted (AI or a deterministic mock),
then categorize, search, and track warranty expirations and return windows
from a dashboard.

Runs **fully without paid APIs** — when no AI key is set, a mock extractor
produces editable sample data.

---

## 2. Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 + `tailwindcss-animate` |
| UI kit | shadcn/ui primitives (hand-vendored under `src/components/ui`) |
| Icons | lucide-react |
| Auth / DB / Storage | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Forms | react-hook-form + `@hookform/resolvers` |
| Validation | Zod |
| Toasts | sonner |
| Theming | next-themes (light/dark) |
| AI | `openai` SDK, OpenAI-compatible, lazy-imported; mock fallback |
| Tests | Vitest |
| Data access | Supabase client directly (no Prisma/ORM) |

---

## 3. Features implemented

### Authentication
- Email/password **sign up**, **login**, **logout** (Supabase Auth).
- Server Actions in `src/app/(auth)/actions.ts`.
- Route protection via `middleware.ts` → `src/lib/supabase/middleware.ts`:
  - Unauthenticated users hitting protected routes redirect to `/login?redirectTo=…`.
  - Authenticated users on `/login` or `/signup` redirect to `/dashboard`.
- `src/app/auth/callback/route.ts` exchanges an email-confirmation/OAuth `code`
  for a session.
- A DB trigger auto-creates a `profiles` row on sign-up (see schema).

### Receipt upload
- Drag-and-drop dropzone (`src/components/file-dropzone.tsx`) with type/size
  validation (PDF/PNG/JPG, max 10 MB — `src/lib/constants.ts`).
- Browser uploads directly to Supabase Storage under a per-user path
  `"<user_id>/<timestamp>_<filename>"` (`src/app/(dashboard)/receipts/new/new-receipt.tsx`).
- A `receipts` row is created with `file_url` (storage path) + `file_type`.

### AI extraction (with mock fallback)
- Abstraction in `src/lib/ai/extract.ts`:
  - With `OPENAI_API_KEY`: calls an OpenAI-compatible chat model
    (`OPENAI_BASE_URL`, `OPENAI_MODEL` overridable); image receipts sent as a
    base64 data URL; strict JSON response; `normalize()` hardens the output.
  - Without a key: `src/lib/ai/mock.ts` returns deterministic, plausible data
    derived from the filename (hash-based, stable per filename).
- Triggered by the `extractFromStorage` server action; result pre-fills an
  **editable** form — the user always reviews before saving.

### Dashboard (`/dashboard`)
- Stat cards: **spend this month**, **total receipts**, **upcoming warranties**,
  **upcoming returns**.
- "Warranties expiring soon" and "Return windows closing" lists.
- "Recent receipts" list. Empty state when no receipts.
- Aggregation in `getDashboardStats()` (`src/lib/data.ts`).

### Receipt management
- **List** `/receipts`: searchable + category filter, desktop table / mobile cards.
- **Search** spans merchant, category, payment method, notes, **and line-item
  names** (`getReceipts()` does a second query for item-name matches and merges).
- **Detail** `/receipts/[id]`: all fields, line items, deadline badges, notes,
  file-attached indicator.
- **Edit** `/receipts/[id]/edit`: full metadata + items via shared `ReceiptForm`.
- **Delete**: confirmation dialog; deletes DB row (cascade items) + storage file.
- **View original file**: short-lived (10 min) signed URL via `getFileUrl`.
- Mutations in `src/app/(dashboard)/receipts/actions.ts`.

### Warranty tracker (`/warranties`)
- Receipts with a `warranty_expiration`, soonest first.
- Rows within 30 days highlighted; per-row urgency badge (past / soon / ok).

### Return tracker (`/returns`)
- Same as warranties but on `return_deadline`.
- Both use the shared `src/components/deadline-table.tsx`.

### Categories
- Defaults: **Groceries, Electronics, Clothing, Home, Auto, Health,
  Subscriptions, Business, Other** (`src/lib/categories.ts`), each with a
  consistent badge color. Schema seeds these as global rows and allows
  per-user custom categories.

### Settings (`/settings`)
- Edit profile full name (`updateProfile` action), read-only email.
- AI status panel (shows "enabled" vs "mock / no API key").
- Sign out.

### UX / cross-cutting
- Sidebar nav + topbar shell (`src/components/dashboard-shell.tsx`), mobile drawer.
- Loading skeletons (`loading.tsx` for dashboard & receipts).
- Error boundary (`src/app/(dashboard)/error.tsx`), global `not-found.tsx`.
- Toasts (sonner), dark mode, responsive throughout.
- All forms validated with Zod schemas in `src/lib/validations.ts`.

---

## 4. Routes / pages

| Route | File | Type |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | redirect (auth-aware) |
| `/login` | `src/app/(auth)/login/page.tsx` | public |
| `/signup` | `src/app/(auth)/signup/page.tsx` | public |
| `/auth/callback` | `src/app/auth/callback/route.ts` | route handler |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | protected |
| `/receipts` | `src/app/(dashboard)/receipts/page.tsx` | protected |
| `/receipts/new` | `src/app/(dashboard)/receipts/new/page.tsx` | protected |
| `/receipts/[id]` | `src/app/(dashboard)/receipts/[id]/page.tsx` | protected |
| `/receipts/[id]/edit` | `src/app/(dashboard)/receipts/[id]/edit/page.tsx` | protected |
| `/warranties` | `src/app/(dashboard)/warranties/page.tsx` | protected |
| `/returns` | `src/app/(dashboard)/returns/page.tsx` | protected |
| `/settings` | `src/app/(dashboard)/settings/page.tsx` | protected |

Route groups: `(auth)` for public auth pages, `(dashboard)` for the protected
sidebar layout (`src/app/(dashboard)/layout.tsx` fetches the user + profile).

---

## 5. Data model (see `supabase/schema.sql`)

- **profiles** — `id` (= `auth.users.id`), `email`, `full_name`, timestamps.
- **receipts** — `id`, `user_id`, `merchant_name`, `purchase_date`,
  `total_amount`, `category`, `payment_method`, `file_url`, `file_type`,
  `warranty_expiration`, `return_deadline`, `notes`, `created_at`, `updated_at`.
- **receipt_items** — `id`, `receipt_id`, `name`, `quantity`, `price`,
  `warranty_months`, `created_at`.
- **categories** — `id`, `user_id` (null = global default), `name`, `created_at`.

The schema file also includes:
- Indexes on `user_id`, `purchase_date`, `warranty_expiration`, `return_deadline`.
- `updated_at` triggers; `handle_new_user()` trigger to seed `profiles`.
- **Row Level Security** on every table (owner-scoped CRUD; globals readable).
- A private **`receipts` storage bucket** + storage policies keyed on the
  `"<user_id>/…"` path prefix.

TypeScript mirrors of these live in `src/lib/types.ts`.

---

## 6. Source layout

```
middleware.ts                  # session refresh + route guard
supabase/schema.sql            # DB + RLS + storage setup (run once per project)
src/
├── app/
│   ├── (auth)/                # login, signup, auth actions
│   ├── (dashboard)/           # protected app (sidebar layout)
│   │   ├── dashboard/         # page + loading skeleton
│   │   ├── receipts/          # list, new, [id], [id]/edit, actions, loading
│   │   ├── warranties/        # page
│   │   ├── returns/           # page
│   │   ├── settings/          # page, form, actions, logout button
│   │   ├── layout.tsx
│   │   └── error.tsx
│   ├── auth/callback/route.ts
│   ├── layout.tsx             # root: ThemeProvider + Toaster
│   ├── page.tsx               # auth-aware redirect
│   ├── not-found.tsx
│   └── globals.css            # Tailwind + shadcn CSS variables
├── components/
│   ├── ui/                    # shadcn primitives (button, card, dialog, form,
│   │                          #   input, select, table, badge, skeleton, etc.)
│   ├── dashboard-shell.tsx    # sidebar + topbar + mobile drawer
│   ├── sidebar-nav.tsx, user-menu.tsx
│   ├── receipt-form.tsx       # shared create/edit form
│   ├── receipt-items-field.tsx# line-items field array
│   ├── receipts-table.tsx, receipt-search.tsx, receipt-actions.tsx
│   ├── deadline-table.tsx, deadline-badge.tsx, category-badge.tsx
│   ├── file-dropzone.tsx, stat-card.tsx, page-header.tsx, empty-state.tsx
│   └── theme-provider.tsx
└── lib/
    ├── ai/extract.ts, ai/mock.ts          # extraction + deterministic mock
    ├── supabase/client.ts, server.ts, middleware.ts
    ├── data.ts                            # server-side queries (server-only)
    ├── validations.ts                     # Zod schemas
    ├── categories.ts, constants.ts, nav.ts, types.ts, utils.ts
```

---

## 7. Environment variables (`.env.example`)

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | server-only |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | optional | defaults to `receipts` |
| `OPENAI_API_KEY` | optional | enables real AI extraction |
| `OPENAI_BASE_URL` | optional | any OpenAI-compatible endpoint |
| `OPENAI_MODEL` | optional | defaults to `gpt-4o-mini` |

---

## 8. Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run start` | production server |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (`src/lib/utils.test.ts`, `src/lib/ai/mock.test.ts`) |

---

## 9. Transfer checklist (moving to a new repo)

1. Copy **all tracked files** (full list in §6; `git ls-files` gives the exact set).
   - Do **not** carry over `.env.local` — recreate it from `.env.example` and
     use fresh credentials.
2. In the destination Supabase project, run `supabase/schema.sql` (creates
   tables, RLS, triggers, the `receipts` bucket + storage policies).
3. `cp .env.example .env.local` and fill in the new project's values.
4. `npm install`, then `npm run dev`.
5. Optional: disable "Confirm email" in Supabase Auth for instant local sign-in.
6. Re-run `npm run typecheck && npm run lint && npm run test && npm run build`
   to confirm parity.

### ⚠️ Security note
`.env.local` was committed to this branch's history. If it ever held real
Supabase/OpenAI credentials, **rotate them** and keep `.env.local` out of the
new repo (it is already covered by `.gitignore`).

---

## 10. Known scope notes (intentional MVP simplifications)

- "Forward receipt emails later" is **planned, not built** — only the upload
  path exists today.
- Update-receipt replaces line items wholesale (delete + re-insert) rather than
  diffing — simplest correct approach for the MVP.
- An empty `total_amount` coerces to `0` on save (Zod `coerce.number`).
- No pagination on the receipts list yet.
- Categories UI uses the static defaults; the schema supports custom categories
  but there is no add-category UI yet.
