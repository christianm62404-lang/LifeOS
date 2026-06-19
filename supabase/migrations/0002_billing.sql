-- =============================================================================
-- LifeOS — billing & entitlements
-- =============================================================================
-- Adds a per-user billing record that tracks the Stripe customer/subscription
-- and the entitlement tier (free | personal | pro).
--
-- SECURITY: this table is deliberately READ-ONLY for end users. Only the
-- Stripe webhook (running with the service-role key, which bypasses RLS) may
-- write to it. This prevents a user from escalating their own tier by calling
-- the database directly with their anon key.
-- =============================================================================

create table if not exists public.user_billing (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  tier text not null default 'free' check (tier in ('free', 'personal', 'pro')),
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_billing_customer_idx
  on public.user_billing (stripe_customer_id);

-- keep updated_at fresh
drop trigger if exists set_updated_at on public.user_billing;
create trigger set_updated_at before update on public.user_billing
  for each row execute function public.set_updated_at();

-- Seed a free-tier row whenever a new auth user is created.
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

  insert into public.user_billing (user_id, tier, status)
  values (new.id, 'free', 'inactive')
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Backfill billing rows for any users that pre-date this migration.
insert into public.user_billing (user_id, tier, status)
select id, 'free', 'inactive' from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security: owner may READ only. No insert/update/delete policies
-- exist for users, so the anon/auth key cannot modify entitlements. The
-- webhook writes with the service-role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.user_billing enable row level security;

drop policy if exists "billing_owner_select" on public.user_billing;
create policy "billing_owner_select" on public.user_billing
  for select using (auth.uid() = user_id);
