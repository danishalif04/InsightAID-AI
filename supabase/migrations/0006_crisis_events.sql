-- InsightAid AI — crisis detection (FYP2.md §52-53)
-- Self-contained: does not depend on any prior migration.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;

-- One row per detection run (src/utils/crisisDetection.js's detectCrisis()
-- output), per-user data like raw_data/processed_data/forecast_results.
create table public.crisis_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  risk_level text not null check (risk_level in ('normal', 'warning', 'critical')),
  risk_score integer not null check (risk_score >= 0 and risk_score <= 100),
  data_sufficient boolean not null default false,

  -- Signals that were NOT 'normal' or 'insufficient_data' — the evidence
  -- FYP2.md §53 requires shown alongside the risk level. Never an
  -- AI-generated label with no backing evidence (§53's explicit rule).
  triggered_signals jsonb not null default '[]',
  -- Every signal, including 'normal' and 'insufficient_data' ones, kept for
  -- audit/debugging — never trimmed to just the alarming ones.
  all_signals jsonb not null default '[]',

  detected_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.crisis_events enable row level security;
create policy "Users manage own crisis_events" on public.crisis_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index crisis_events_user_detected_idx on public.crisis_events (user_id, detected_at desc);
