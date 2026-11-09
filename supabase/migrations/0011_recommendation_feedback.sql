-- InsightAid AI — FYP II Phase 5: "Was this useful?" recommendation feedback
-- Additive only — a new table, no existing schema touched.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;

-- One row per thumbs up/down click. Logged against `rule_id` (the stable
-- string id from src/utils/recommendationRules.js, e.g.
-- 'crisis_critical_response'), NOT a `recommendations.id` row — the
-- recommendation being rated may be shown live and never explicitly
-- "Saved", so feedback must not require that row to exist first.
create table public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  rule_id text not null,
  useful boolean not null,

  created_at timestamptz not null default now()
);

alter table public.recommendation_feedback enable row level security;
create policy "Users manage own recommendation_feedback" on public.recommendation_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index recommendation_feedback_user_rule_idx on public.recommendation_feedback (user_id, rule_id, created_at desc);
