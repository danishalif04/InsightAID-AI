-- SPARK_AUDIT.md Phase 1 item 7: AI Recommendations missed the < 3 s target
-- (median 3429 ms on 25 Nov) because every visit waited ~2.3 s for the AI
-- to reword recommendations that had not changed.
--
-- This table keeps the AI's wording for one recommendation, keyed by a
-- SHA-256 hash of EXACTLY what was sent to the AI (rule id, category,
-- priority, title, evidence and the business context factors; see
-- src/utils/explanationCache.js). If any of those inputs changes, the key
-- changes and the AI is asked again. The AI never decides anything; this
-- only stores its wording.
--
-- Additive only: one new table, no existing table, column, policy or row
-- is touched. Dropping the table returns the app to calling the AI every
-- time (the app treats a missing table as an empty cache).
-- Run once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists public.recommendation_explanations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cache_key text not null,
  rule_id text not null,
  rationale text not null,
  context text not null,
  created_at timestamptz not null default now(),
  unique (user_id, cache_key)
);

alter table public.recommendation_explanations enable row level security;

create policy "Users manage own recommendation_explanations" on public.recommendation_explanations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
