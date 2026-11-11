-- InsightAid AI — Malaysian Local Shop pathway (no-dataset planning)
-- Additive only. Run once in the Supabase Dashboard: SQL Editor -> paste -> Run.
--
-- Scope note (the build plan says "add only what is missing"): the repo
-- already has agent_investigations / agent_tasks / agent_tool_logs
-- (migration 0013), which are exactly the plan's `shop_investigations`
-- concept — question, tool trace, answer. Those are REUSED rather than
-- duplicated here. What genuinely has no equivalent is a per-shop product
-- catalogue, itemised expenses, startup items, saved scenarios, and a
-- planning-sourced action list (the existing `recommendations` table is
-- written by the dataset-driven rule engine and keyed by its rule_id, a
-- different source with a different shape).

create extension if not exists pgcrypto;

-- One shop per user for now (unique user_id), matching how
-- business_profiles/business_assumptions already work.
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,

  name text,
  category text,
  location text,
  model text,
  currency text not null default 'MYR',
  language text not null default 'en' check (language in ('en', 'ms')),

  -- True for the seeded "Kedai Makmur" demo, so the UI can ribbon every
  -- figure as illustrative and never present it as the owner's own data.
  is_illustrative boolean not null default false,

  available_capital numeric,
  cash numeric,
  monthly_outflow numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  name text not null,
  unit text,
  cost numeric,
  price numeric,

  created_at timestamptz not null default now()
);

create table if not exists public.shop_expenses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  category text not null,
  amount numeric,
  kind text not null default 'fixed' check (kind in ('fixed', 'variable')),
  controllable boolean not null default false,

  created_at timestamptz not null default now()
);

create table if not exists public.shop_startup_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- Matches STARTUP_CATEGORIES in the engine.
  category text not null,
  amount numeric,

  unique (shop_id, category)
);

create table if not exists public.shop_scenarios (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  label text not null,
  -- { units, price, varCost, fixed, factors } — the inputs, so a saved
  -- scenario can always be recomputed by the engine rather than trusting
  -- a stored result.
  inputs jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

-- Planning-sourced actions (DETECT -> INVESTIGATE -> RECOMMEND -> OWNER
-- APPROVES -> MONITOR -> EVALUATE). Accepting one only records the
-- decision and schedules a review; nothing is ever applied automatically.
create table if not exists public.shop_actions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  title text not null,
  body text,
  -- Human-readable provenance, e.g. "User's updated product cost · Pricing calculation".
  source text,
  status text not null default 'pending'
    check (status in ('pending', 'recommended', 'accepted', 'rejected', 'monitoring', 'completed')),
  payload jsonb not null default '{}'::jsonb,
  -- Set when an owner accepts and a review is scheduled.
  due_at timestamptz,

  -- Links an action back to the investigation that produced it, when it
  -- came from one (migration 0013's table).
  investigation_id uuid references public.agent_investigations (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shops enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_expenses enable row level security;
alter table public.shop_startup_items enable row level security;
alter table public.shop_scenarios enable row level security;
alter table public.shop_actions enable row level security;

create policy "Users manage own shops" on public.shops
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own shop_products" on public.shop_products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own shop_expenses" on public.shop_expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own shop_startup_items" on public.shop_startup_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own shop_scenarios" on public.shop_scenarios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own shop_actions" on public.shop_actions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists shop_products_shop_idx on public.shop_products (shop_id);
create index if not exists shop_expenses_shop_idx on public.shop_expenses (shop_id);
create index if not exists shop_startup_items_shop_idx on public.shop_startup_items (shop_id);
create index if not exists shop_scenarios_shop_idx on public.shop_scenarios (shop_id);
create index if not exists shop_actions_user_status_idx on public.shop_actions (user_id, status, created_at desc);
