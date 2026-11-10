-- InsightAid AI — AI Business Action Centre (knowledge_updated_nov2026.md item 6)
-- Additive only — extends recommendations, no existing column touched.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.

-- Lifecycle status for a saved recommendation. Deliberately a simple
-- 3-state set for this foundation slice (DETECT/RECOMMEND already exist
-- implicitly — a row only exists once Layer 1 has detected and
-- recommended something; INVESTIGATE/MONITOR/EVALUATE from the full
-- lifecycle in the spec are deferred). The app never auto-changes this —
-- only an explicit owner action does, and accepting a recommendation here
-- never triggers any automated change (e.g. it does not alter prices or
-- contact suppliers).
alter table public.recommendations
  add column if not exists status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed'));

create index if not exists recommendations_user_status_idx on public.recommendations (user_id, status);
