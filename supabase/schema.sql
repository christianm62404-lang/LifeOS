-- =========================================================================
-- Receipt Vault — Database schema
-- Run this in the Supabase SQL editor (or via the CLI) for a fresh project.
-- =========================================================================

-- Extensions ------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- Profiles --------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Categories ------------------------------------------------------------
-- Default categories are global (user_id null). Users may add their own.
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.categories (name)
select unnest(array[
  'Groceries','Electronics','Clothing','Home','Auto',
  'Health','Subscriptions','Business','Other'
])
on conflict do nothing;

-- Receipts --------------------------------------------------------------
create table if not exists public.receipts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant_name text,
  purchase_date date,
  total_amount numeric(12, 2),
  category text,
  payment_method text,
  file_url text,
  file_type text,
  warranty_expiration date,
  return_deadline date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists receipts_user_id_idx on public.receipts (user_id);
create index if not exists receipts_purchase_date_idx on public.receipts (purchase_date);
create index if not exists receipts_warranty_idx on public.receipts (warranty_expiration);
create index if not exists receipts_return_idx on public.receipts (return_deadline);

-- Receipt items ---------------------------------------------------------
create table if not exists public.receipt_items (
  id uuid primary key default uuid_generate_v4(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  name text not null,
  quantity integer not null default 1,
  price numeric(12, 2),
  warranty_months integer,
  created_at timestamptz not null default now()
);

create index if not exists receipt_items_receipt_id_idx
  on public.receipt_items (receipt_id);

-- updated_at trigger ----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_receipts_updated_at on public.receipts;
create trigger set_receipts_updated_at
  before update on public.receipts
  for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up ---------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.categories enable row level security;

-- Profiles: a user can see and edit only their own profile.
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert with check (auth.uid() = id);

-- Receipts: full CRUD scoped to the owner.
drop policy if exists "Receipts select own" on public.receipts;
create policy "Receipts select own"
  on public.receipts for select using (auth.uid() = user_id);

drop policy if exists "Receipts insert own" on public.receipts;
create policy "Receipts insert own"
  on public.receipts for insert with check (auth.uid() = user_id);

drop policy if exists "Receipts update own" on public.receipts;
create policy "Receipts update own"
  on public.receipts for update using (auth.uid() = user_id);

drop policy if exists "Receipts delete own" on public.receipts;
create policy "Receipts delete own"
  on public.receipts for delete using (auth.uid() = user_id);

-- Receipt items: access controlled through the parent receipt's owner.
drop policy if exists "Receipt items select own" on public.receipt_items;
create policy "Receipt items select own"
  on public.receipt_items for select using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_items.receipt_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Receipt items insert own" on public.receipt_items;
create policy "Receipt items insert own"
  on public.receipt_items for insert with check (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_items.receipt_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Receipt items update own" on public.receipt_items;
create policy "Receipt items update own"
  on public.receipt_items for update using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_items.receipt_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Receipt items delete own" on public.receipt_items;
create policy "Receipt items delete own"
  on public.receipt_items for delete using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_items.receipt_id and r.user_id = auth.uid()
    )
  );

-- Categories: global defaults (user_id is null) are visible to everyone;
-- users can manage their own custom categories.
drop policy if exists "Categories select" on public.categories;
create policy "Categories select"
  on public.categories for select
  using (user_id is null or auth.uid() = user_id);

drop policy if exists "Categories insert own" on public.categories;
create policy "Categories insert own"
  on public.categories for insert with check (auth.uid() = user_id);

drop policy if exists "Categories delete own" on public.categories;
create policy "Categories delete own"
  on public.categories for delete using (auth.uid() = user_id);

-- =========================================================================
-- Storage bucket + policies (bucket name: 'receipts')
-- Files are stored under a per-user folder: <user_id>/<filename>
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "Receipt files select own" on storage.objects;
create policy "Receipt files select own"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Receipt files insert own" on storage.objects;
create policy "Receipt files insert own"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Receipt files delete own" on storage.objects;
create policy "Receipt files delete own"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
