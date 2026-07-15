-- InsightAid AI — initial schema
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.
-- Every table is scoped per authenticated user via Row Level Security (RLS):
-- each row carries a user_id defaulting to auth.uid(), and a single
-- "owner can do everything, nobody else can see it" policy is applied uniformly.

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
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
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
-- Dashboard + Sentiment Analysis
-- ============================================================================

create table public.executive_summary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  headline text not null default '',
  generated_at timestamptz not null default now()
);

alter table public.executive_summary enable row level security;
create policy "Users manage own executive summary" on public.executive_summary
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shared by Dashboard's 14-day trend and Sentiment Analysis's 7-day trend (query with a date range).
create table public.sentiment_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  positive numeric not null,
  neutral numeric not null,
  negative numeric not null
);

alter table public.sentiment_daily enable row level security;
create policy "Users manage own sentiment_daily" on public.sentiment_daily
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.sentiment_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'x')),
  language text not null check (language in ('en', 'ms', 'zh')),
  text text not null,
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative')),
  confidence numeric not null,
  engagement integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sentiment_posts enable row level security;
create policy "Users manage own sentiment_posts" on public.sentiment_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.emotion_breakdown (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  emotion text not null,
  value numeric not null
);

alter table public.emotion_breakdown enable row level security;
create policy "Users manage own emotion_breakdown" on public.emotion_breakdown
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.region_sentiment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  state text not null,
  score numeric not null,
  mentions integer not null default 0
);

alter table public.region_sentiment enable row level security;
create policy "Users manage own region_sentiment" on public.region_sentiment
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Social Intelligence (shared platform_metrics/mention_volume_daily/trending_keywords
-- also feed Dashboard's platform-distribution and mention-volume widgets)
-- ============================================================================

create table public.platform_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'x')),
  mention_volume integer not null default 0,
  virality numeric not null default 0,
  engagement numeric not null default 0,
  top_language text not null default '',
  sentiment_score numeric not null default 0
);

alter table public.platform_metrics enable row level security;
create policy "Users manage own platform_metrics" on public.platform_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.mention_volume_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'x')),
  date date not null,
  mentions integer not null default 0
);

alter table public.mention_volume_daily enable row level security;
create policy "Users manage own mention_volume_daily" on public.mention_volume_daily
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- platform = null means a generic/dashboard keyword; set means a platform-specific hashtag.
create table public.trending_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  keyword text not null,
  mentions integer not null default 0,
  platform text check (platform in ('tiktok', 'x'))
);

alter table public.trending_keywords enable row level security;
create policy "Users manage own trending_keywords" on public.trending_keywords
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.influencers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  handle text not null,
  platform text not null check (platform in ('tiktok', 'x')),
  followers integer not null default 0,
  virality numeric not null default 0,
  engagement numeric not null default 0,
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative'))
);

alter table public.influencers enable row level security;
create policy "Users manage own influencers" on public.influencers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'x')),
  text text not null,
  likes integer not null default 0,
  shares integer not null default 0
);

alter table public.social_posts enable row level security;
create policy "Users manage own social_posts" on public.social_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Crisis Detection
-- ============================================================================

create table public.crisis_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  level text not null check (level in ('low', 'medium', 'high', 'critical')),
  risk_score numeric not null default 0,
  negative_spike text not null default '',
  mention_spike text not null default '',
  anomaly_score text not null default '',
  affected_platforms text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.crisis_status enable row level security;
create policy "Users manage own crisis_status" on public.crisis_status
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.anomaly_hourly (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recorded_date date not null default current_date,
  hour text not null,
  mentions integer not null default 0,
  threshold integer not null default 0
);

alter table public.anomaly_hourly enable row level security;
create policy "Users manage own anomaly_hourly" on public.anomaly_hourly
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.crisis_root_cause (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  summary text not null default '',
  recommended_actions text[] not null default '{}',
  generated_at timestamptz not null default now()
);

alter table public.crisis_root_cause enable row level security;
create policy "Users manage own crisis_root_cause" on public.crisis_root_cause
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.crisis_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  level text not null check (level in ('low', 'medium', 'high', 'critical')),
  trigger text not null,
  duration text not null,
  resolution text not null
);

alter table public.crisis_log enable row level security;
create policy "Users manage own crisis_log" on public.crisis_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Forecasting
-- ============================================================================

create table public.forecast_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  horizon_days integer not null,
  date date not null,
  actual numeric,
  forecast numeric,
  low numeric,
  band numeric
);

alter table public.forecast_series enable row level security;
create policy "Users manage own forecast_series" on public.forecast_series
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.forecast_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  display text not null,
  delta numeric not null,
  accuracy numeric not null
);

alter table public.forecast_metrics enable row level security;
create policy "Users manage own forecast_metrics" on public.forecast_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.forecast_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null check (label in ('best', 'expected', 'worst')),
  revenue text not null,
  change_pct numeric not null,
  description text not null
);

alter table public.forecast_scenarios enable row level security;
create policy "Users manage own forecast_scenarios" on public.forecast_scenarios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- AI Recommendations
-- ============================================================================

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  title text not null,
  impact_score numeric not null,
  confidence numeric not null,
  roi numeric not null,
  timeframe text not null,
  reasoning text not null,
  created_at timestamptz not null default now()
);

alter table public.recommendations enable row level security;
create policy "Users manage own recommendations" on public.recommendations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.recommendation_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recommendation_id uuid not null references public.recommendations (id) on delete cascade,
  label text not null,
  done boolean not null default false
);

alter table public.recommendation_actions enable row level security;
create policy "Users manage own recommendation_actions" on public.recommendation_actions
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

create table public.api_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  status text not null default 'connected' check (status in ('connected', 'disconnected')),
  last_sync timestamptz not null default now()
);

alter table public.api_connections enable row level security;
create policy "Users manage own api_connections" on public.api_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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

create table public.dataset_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file text not null,
  size bigint not null default 0,
  records integer not null default 0,
  quality numeric not null default 0,
  status text not null default 'processing' check (status in ('processing', 'success', 'warning', 'error')),
  created_at timestamptz not null default now()
);

alter table public.dataset_imports enable row level security;
create policy "Users manage own dataset_imports" on public.dataset_imports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
