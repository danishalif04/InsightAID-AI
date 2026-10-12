-- InsightAid AI — recommendation engine (FYP2.md §54-56)
-- Self-contained: does not depend on any prior migration.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;

-- One row per Layer-1 rule that fired (src/utils/recommendationRules.js's
-- generateRecommendations()), optionally enriched by Layer 2
-- (explain-recommendations Edge Function). Per-user data, same RLS pattern
-- as crisis_events/forecast_results.
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  run_id text not null,
  rule_id text not null, -- e.g. 'investigate_complaints', 'breakeven_gap' — matches recommendationRules.js's rule ids
  category text not null check (category in ('Marketing', 'Operations', 'Customer Service', 'Product', 'Growth', 'Investment')),
  priority text not null check (priority in ('high', 'medium', 'low')),
  title text not null,

  -- The measurable evidence Layer 1 computed — always present, never empty,
  -- and never overwritten by Gemini (FYP2.md §55).
  evidence jsonb not null default '[]',

  -- Layer 2 (Gemini) output — both nullable. Null means Gemini was not
  -- configured/reachable when this row was generated; the row (rule_id,
  -- category, priority, title, evidence) is already complete without them.
  rationale text,
  context text,
  explained_by text check (explained_by in ('gemini', 'rule_only')),

  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.recommendations enable row level security;
create policy "Users manage own recommendations" on public.recommendations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index recommendations_user_generated_idx on public.recommendations (user_id, generated_at desc);
