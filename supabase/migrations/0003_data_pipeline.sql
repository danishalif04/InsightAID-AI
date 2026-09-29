-- InsightAid AI — data pipeline (FYP2.md §35, §41-45)
-- Self-contained: does not depend on 0001_init.sql or 0002_business_planning.sql.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;

-- Every uploaded (or fixture-seeded) row, exactly as parsed. Never modified
-- after insert — this is the "preserve raw" record §44 requires.
create table public.raw_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  source text not null check (source in ('csv_upload', 'json_upload', 'fixture_seed')),
  template_id text not null check (template_id in ('sales', 'reviews', 'social', 'product', 'expenses')),
  original_filename text,
  row_index integer not null,
  payload jsonb not null,
  is_duplicate boolean not null default false,

  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.raw_data enable row level security;
create policy "Users manage own raw_data" on public.raw_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Normalized text-bearing records (§42), populated only for text-bearing
-- templates (reviews, social) after preprocessing. Sentiment fields stay
-- null until a real model exists, except rows scored by the documented
-- rating-heuristic (model_name = 'rating_heuristic_v1'), which is a weak
-- proxy label per §37, never a real ML result.
create table public.processed_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  raw_data_id uuid references public.raw_data (id) on delete cascade,

  source text not null,
  platform text,
  original_id text,
  collected_at timestamptz,
  published_at timestamptz,

  raw_text text not null,
  cleaned_text text,
  language text, -- 'en' | 'ms' | 'zh' | 'ms-en' | 'unknown'

  author_id_hash text,
  product text,
  category text,
  rating numeric,
  engagement integer,
  sales numeric,
  revenue numeric,

  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  sentiment_score numeric,
  sentiment_confidence numeric,
  model_name text,
  model_version text,
  predicted_at timestamptz,

  features jsonb not null default '{}'::jsonb,

  -- §43 provenance
  collection_timestamp timestamptz not null default now(),
  processing_timestamp timestamptz not null default now(),
  dataset_version text,

  created_at timestamptz not null default now()
);

alter table public.processed_data enable row level security;
create policy "Users manage own processed_data" on public.processed_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- §45 time-series rollups, derived from processed_data.
create table public.daily_aggregates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  date date not null,
  source text not null,
  platform text,

  mention_volume integer,
  comment_volume integer,
  avg_rating_sentiment numeric,
  positive_ratio numeric,
  negative_ratio numeric,

  created_at timestamptz not null default now(),
  unique (user_id, date, source, platform)
);

alter table public.daily_aggregates enable row level security;
create policy "Users manage own daily_aggregates" on public.daily_aggregates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
