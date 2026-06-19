# Receipt Vault

A personal receipt & warranty management app. Upload receipts (PDF / PNG / JPG),
auto‑extract the details, categorize purchases, and track warranties and return
windows — all searchable from a clean dashboard.

Built with **Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui ·
Supabase (Auth, Postgres, Storage) · Zod**.

> The app runs fully **without any paid APIs**. When no AI key is configured it
> uses a deterministic **mock extractor** so you can try the whole flow locally.

---

## Features

- 🔐 **Auth** — email/password sign up, login, logout, protected dashboard routes
- 📤 **Upload** — drag & drop PDF/PNG/JPG receipts, stored in Supabase Storage
- 🤖 **Extraction** — AI extraction via any OpenAI‑compatible endpoint, with a
  mock fallback when no key is present; every field is manually editable
- 📊 **Dashboard** — spend this month, receipt count, upcoming warranties &
  returns, recent receipts
- 🧾 **Receipt management** — detail view, edit, delete, view original file,
  full‑text search (merchant, item, category, payment, notes) + category filter
- 🛡️ **Warranty tracker** — sorted by soonest expiration, "expiring soon"
  highlight (within 30 days)
- ↩️ **Return tracker** — sorted by soonest deadline with the same highlighting
- 🏷️ **Categories** — Groceries, Electronics, Clothing, Home, Auto, Health,
  Subscriptions, Business, Other
- 🎨 Modern responsive UI, sidebar nav, empty states, loading skeletons, toast
  notifications, error boundaries, dark mode

---

## Pages

| Route               | Description                              |
| ------------------- | ---------------------------------------- |
| `/login`            | Sign in                                  |
| `/signup`           | Create an account                        |
| `/dashboard`        | Summary metrics & recent activity        |
| `/receipts`         | Searchable / filterable receipt list     |
| `/receipts/new`     | Upload + review extracted details        |
| `/receipts/[id]`    | Receipt detail                           |
| `/receipts/[id]/edit` | Edit receipt metadata & items          |
| `/warranties`       | Warranty expiration tracker              |
| `/returns`          | Return deadline tracker                  |
| `/settings`         | Profile, AI status, sign out             |

---

## Getting started

### 1. Prerequisites

- Node.js 18.18+ (20+ recommended)
- A free [Supabase](https://supabase.com) project

### 2. Install

```bash
npm install
```

### 3. Configure Supabase

1. Create a Supabase project.
2. Open the **SQL Editor** and run the contents of
   [`supabase/schema.sql`](supabase/schema.sql). This creates the tables
   (`profiles`, `receipts`, `receipt_items`, `categories`), Row Level Security
   policies, the `receipts` storage bucket + its policies, and a trigger that
   creates a profile row on sign‑up.
3. *(Optional, for instant local testing)* Under **Authentication → Providers →
   Email**, turn **off** "Confirm email" so new accounts can sign in
   immediately. With it on, users must confirm via the email link first.

### 4. Environment variables

Copy the example file and fill in your project values:

```bash
cp .env.example .env.local
```

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | server‑only, for admin tasks |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | optional | defaults to `receipts` |
| `OPENAI_API_KEY` | optional | enables real AI extraction |
| `OPENAI_BASE_URL` | optional | any OpenAI‑compatible endpoint |
| `OPENAI_MODEL` | optional | defaults to `gpt-4o-mini` |

**No `OPENAI_API_KEY`?** The app automatically uses the mock extractor — no
configuration needed.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000, create an account, and upload your first receipt.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (no emit) |
| `npm run test` | Run unit tests (Vitest) |

---

## How AI extraction works

`src/lib/ai/extract.ts` is a thin abstraction:

- **With `OPENAI_API_KEY`** — sends the receipt (image receipts are passed as a
  base64 data URL) to an OpenAI‑compatible chat model and parses a strict JSON
  response. Override `OPENAI_BASE_URL` to point at a local/self‑hosted model.
- **Without a key** — `src/lib/ai/mock.ts` returns deterministic, plausible
  sample data derived from the file name.

Either way the extracted fields populate an editable form before anything is
saved, so the user is always in control.

---

## Project structure

```
src/
├── app/
│   ├── (auth)/            # login, signup, auth server actions
│   ├── (dashboard)/       # protected app (sidebar layout)
│   │   ├── dashboard/
│   │   ├── receipts/      # list, new, [id], [id]/edit, actions
│   │   ├── warranties/
│   │   ├── returns/
│   │   └── settings/
│   ├── auth/callback/     # email confirmation / OAuth exchange
│   └── layout.tsx
├── components/
│   ├── ui/                # shadcn/ui primitives
│   └── *.tsx              # app components (sidebar, forms, tables…)
└── lib/
    ├── ai/                # extraction abstraction + mock
    ├── supabase/          # browser / server / middleware clients
    ├── data.ts            # server-side queries
    ├── validations.ts     # Zod schemas
    ├── categories.ts
    ├── types.ts
    └── utils.ts
supabase/schema.sql        # full DB + RLS + storage setup
```

---

## Data model

- **profiles** — one row per auth user (`id`, `email`, `full_name`)
- **receipts** — `merchant_name`, `purchase_date`, `total_amount`, `category`,
  `payment_method`, `file_url`, `file_type`, `warranty_expiration`,
  `return_deadline`, `notes`, timestamps
- **receipt_items** — `name`, `quantity`, `price`, `warranty_months`
- **categories** — default global categories + optional user‑defined ones

All tables are protected by Row Level Security so users can only ever read and
write their own data. Storage objects are namespaced per user
(`<user_id>/<file>`) and guarded by matching storage policies.

---

## Security notes

- Row Level Security is enforced on every table and on the storage bucket.
- The anon key is safe to expose; the service‑role key must stay server‑side.
- Original files are served via short‑lived (10 min) signed URLs, never public.

---

## License

MIT — provided as an MVP starting point.
