-- InsightAid AI — marketplace product tracking (Shopee/Lazada/TikTok Shop)
-- Self-contained: does not depend on any prior migration.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.
--
-- Separate from raw_data/processed_data (0003) on purpose: those model
-- text-bearing rows (reviews/social posts) ingested by file upload.
-- Marketplace products are a different shape entirely (price/stock/rating
-- that change over time for the SAME external product), and need their
-- own identity (external_id) and history (snapshots), not a one-row-per-
-- upload model.

create extension if not exists pgcrypto;

-- One row per real product the account is tracking, identified by the
-- marketplace's own stable id (never InsightAid-generated) so repeated
-- syncs update the same row instead of creating duplicates.
create table public.marketplace_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  source_platform text not null check (source_platform in ('shopee', 'lazada', 'tiktok_shop')),
  external_product_id text not null,

  title text,
  category text,
  shop_name text,

  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz,

  created_at timestamptz not null default now(),
  unique (user_id, source_platform, external_product_id)
);

alter table public.marketplace_products enable row level security;
create policy "Users manage own marketplace_products" on public.marketplace_products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- One row per sync observation of a product — INSERT-only, never updated
-- or overwritten. "Do not overwrite the last successful snapshot when a
-- refresh fails" (the plan's own requirement) falls out naturally from
-- this: a failed refresh just never inserts a new row, so the previous
-- snapshot stays the latest one by observed_at, untouched.
create table public.marketplace_product_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null references public.marketplace_products (id) on delete cascade,

  price numeric,
  currency text,
  discount_percent numeric,
  rating numeric,
  rating_count integer,
  stock integer,

  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.marketplace_product_snapshots enable row level security;
create policy "Users manage own marketplace_product_snapshots" on public.marketplace_product_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index marketplace_product_snapshots_product_observed_idx
  on public.marketplace_product_snapshots (product_id, observed_at desc);

-- One row per sync attempt (not per product) - bookkeeping for the
-- source-status page: last successful sync time, whether the most recent
-- attempt actually succeeded, and why if it didn't.
create table public.marketplace_sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  source_platform text not null check (source_platform in ('shopee', 'lazada', 'tiktok_shop')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null check (status in ('running', 'success', 'auth_required', 'rate_limited', 'error')),

  products_fetched integer,
  error_detail text,

  created_at timestamptz not null default now()
);

alter table public.marketplace_sync_log enable row level security;
create policy "Users manage own marketplace_sync_log" on public.marketplace_sync_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index marketplace_sync_log_platform_started_idx
  on public.marketplace_sync_log (user_id, source_platform, started_at desc);
