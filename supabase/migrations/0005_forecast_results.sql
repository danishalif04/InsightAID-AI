-- InsightAid AI — sentiment-enhanced forecasting (FYP2.md §50-51)
-- Self-contained: does not depend on any prior migration.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;

-- Output of one offline forecasting run (ml/forecasting/) for one user's
-- sales history — unlike model_versions (0004), this IS per-user data
-- (each user forecasts their own sales, there is no single shared
-- "the forecast"), so RLS follows the same auth.uid() = user_id pattern as
-- raw_data/processed_data/daily_aggregates, not model_versions' shared/
-- read-only-to-everyone pattern.
create table public.forecast_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  run_id text not null,
  model_type text not null check (model_type in ('moving_average', 'arima', 'prophet', 'xgboost', 'lstm')),
  variant text not null check (variant in ('sales_only', 'sentiment_enhanced')),

  generated_at timestamptz not null default now(),
  horizon_days integer not null check (horizon_days > 0),
  dataset_version text,

  evaluation_period_start date,
  evaluation_period_end date,

  -- Rolling-origin-averaged error metrics (§51) — never fabricated, see
  -- ml/forecasting/src/metrics.py, the only code path that should produce
  -- these numbers.
  mae numeric not null check (mae >= 0),
  rmse numeric not null check (rmse >= 0),
  mape numeric check (mape >= 0), -- null when every actual in the window was 0

  forecast_points jsonb not null default '[]', -- [{date, predicted, lower, upper}]

  -- Exactly one row per (user_id, run_id) should have is_best = true — set
  -- by metrics.select_best() from the real MAE/RMSE/MAPE above, never
  -- hardcoded. The frontend must render whichever row has is_best = true,
  -- not assume any particular model_type "wins".
  is_best boolean not null default false,
  notes text,

  created_at timestamptz not null default now(),

  unique (user_id, run_id, model_type, variant)
);

alter table public.forecast_results enable row level security;
create policy "Users manage own forecast_results" on public.forecast_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Helps the frontend's "give me this user's latest run's best model" query.
create index forecast_results_user_best_idx
  on public.forecast_results (user_id, generated_at desc)
  where is_best = true;
