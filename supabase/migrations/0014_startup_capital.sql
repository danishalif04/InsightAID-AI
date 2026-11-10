-- InsightAid AI — Startup Capital Planner (knowledge_updated_nov2026.md item 3)
-- Additive only — extends business_assumptions, no existing column touched.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.

-- One-off setup costs (rental deposit, renovation, equipment, initial
-- stock, licences, utilities deposit, marketing, emergency reserve) kept
-- as a single JSONB map rather than 8 new flat columns, since this is a
-- self-contained sub-form (unlike the existing operating-cost fields,
-- nothing else in the app reads these individually) — { itemId: amount }.
alter table public.business_assumptions
  add column if not exists startup_capital_items jsonb not null default '{}'::jsonb,
  add column if not exists available_capital numeric;
