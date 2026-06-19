-- =============================================================================
-- LifeOS — initial schema
-- =============================================================================
-- Run this in the Supabase SQL editor (or via the Supabase CLI) to provision
-- all tables, row level security policies and helper triggers.
--
-- Every table is scoped to the authenticated user via `user_id` and protected
-- with RLS so users can only ever read/write their own data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Profiles (mirrors auth.users, holds app-level user metadata)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bills
-- ---------------------------------------------------------------------------
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null default 0,
  due_date date not null,
  recurrence text not null default 'monthly',
  autopay boolean not null default false,
  category text not null default 'other',
  notes text,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null default 0,
  billing_cycle text not null default 'monthly',
  next_billing_date date not null,
  category text not null default 'other',
  cancellation_link text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Documents (file stored in Supabase Storage, metadata here)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  document_type text not null default 'other',
  expiration_date date,
  notes text,
  file_path text,
  file_name text,
  file_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  due_date date not null,
  recurrence text not null default 'none',
  priority text not null default 'medium',
  notes text,
  is_complete boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null default 'personal',
  target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  status text not null default 'not-started',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Activity log (recent activity feed)
-- ---------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  description text not null,
  created_at timestamptz not null default now()
);

-- Helpful indexes for dashboard queries.
create index if not exists bills_user_due_idx on public.bills (user_id, due_date);
create index if not exists subscriptions_user_next_idx on public.subscriptions (user_id, next_billing_date);
create index if not exists documents_user_exp_idx on public.documents (user_id, expiration_date);
create index if not exists reminders_user_due_idx on public.reminders (user_id, due_date);
create index if not exists goals_user_idx on public.goals (user_id);
create index if not exists activity_user_created_idx on public.activity_logs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'bills', 'subscriptions', 'documents', 'reminders', 'goals']
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.bills enable row level security;
alter table public.subscriptions enable row level security;
alter table public.documents enable row level security;
alter table public.reminders enable row level security;
alter table public.goals enable row level security;
alter table public.activity_logs enable row level security;

-- Profiles: a user can manage their own profile.
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);

-- Generic owner policies for the data tables.
do $$
declare
  t text;
begin
  foreach t in array array['bills', 'subscriptions', 'documents', 'reminders', 'goals', 'activity_logs']
  loop
    execute format('drop policy if exists "owner_select" on public.%I;', t);
    execute format(
      'create policy "owner_select" on public.%I for select using (auth.uid() = user_id);',
      t
    );
    execute format('drop policy if exists "owner_insert" on public.%I;', t);
    execute format(
      'create policy "owner_insert" on public.%I for insert with check (auth.uid() = user_id);',
      t
    );
    execute format('drop policy if exists "owner_update" on public.%I;', t);
    execute format(
      'create policy "owner_update" on public.%I for update using (auth.uid() = user_id);',
      t
    );
    execute format('drop policy if exists "owner_delete" on public.%I;', t);
    execute format(
      'create policy "owner_delete" on public.%I for delete using (auth.uid() = user_id);',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket + policies for documents
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Users may only access files inside a folder named after their user id.
drop policy if exists "documents_owner_select" on storage.objects;
create policy "documents_owner_select" on storage.objects
  for select using (
    bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "documents_owner_insert" on storage.objects;
create policy "documents_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "documents_owner_delete" on storage.objects;
create policy "documents_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
  );
