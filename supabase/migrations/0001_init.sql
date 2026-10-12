-- InsightAid AI — initial schema (Settings + Reports; trimmed Phase 10)
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.
-- Every table is scoped per authenticated user via Row Level Security (RLS):
-- each row carries a user_id defaulting to auth.uid(), and a single
-- "owner can do everything, nobody else can see it" policy is applied uniformly.
--
-- Phase 10 (FYP2.md §40/§61/§65) removed this file's original Dashboard/
-- Sentiment/Social/Crisis/Forecast/Recommendations tables. This migration
-- was never deployed, so trimming it directly (not a new migration) was
-- safe — no live data to preserve. Those tables were unpopulated shells
-- mirroring the ORIGINAL mock data's shape, superseded by real, already-
-- populated pipelines and services from later phases:
--   sentiment_daily, sentiment_posts, emotion_breakdown, region_sentiment,
--   platform_metrics, mention_volume_daily, trending_keywords, influencers,
--   social_posts, executive_summary
--     -> derived live from processed_data/daily_aggregates (0003) via
--        src/utils/socialAnalytics.js
--   crisis_status, anomaly_hourly, crisis_root_cause, crisis_log
--     -> crisis_events (0006) + src/services/crisisService.js
--   forecast_series, forecast_metrics, forecast_scenarios
--     -> forecast_results (0005) + src/services/forecastResultsService.js
--   recommendations, recommendation_actions
--     -> recommendations (0007, a different/real shape) + recommendationService.js
--   api_connections, dataset_imports
--     -> src/adapters/registry.js (Phase 5) + raw_data (0003)

create extension if not exists pgcrypto;

-- ============================================================================
-- Settings: profiles, companies, preferences, API keys
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'Founder',
  phone text not null default '',
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile row the moment someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '',
  industry text not null default '',
  size text not null default '',
  website text not null default ''
);

alter table public.companies enable row level security;
create policy "Users manage own company" on public.companies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  notifications jsonb not null default '{}'::jsonb,
  language text not null default 'en',
  theme text not null default 'light',
  model_config jsonb not null default '{}'::jsonb,
  backup_frequency text not null default 'daily',
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
create policy "Users manage own preferences" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  masked_value text not null,
  updated_at timestamptz not null default now()
);

alter table public.api_keys enable row level security;
create policy "Users manage own api keys" on public.api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Reports
-- ============================================================================

create table public.report_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  description text not null,
  last_generated date
);

alter table public.report_templates enable row level security;
create policy "Users manage own report_templates" on public.report_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Dataset Management
-- ============================================================================

create table public.storage_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  used_gb numeric not null default 0,
  total_gb numeric not null default 100,
  language_breakdown jsonb not null default '[]'::jsonb
);

alter table public.storage_usage enable row level security;
create policy "Users manage own storage_usage" on public.storage_usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
