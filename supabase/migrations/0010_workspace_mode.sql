-- InsightAid AI — FYP II Phase 1: persist the workspace mode per user
-- (Local Malaysian Shop vs E-commerce Startup), not just in localStorage.
-- Additive only — widens an existing table, no data loss.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.

alter table public.user_preferences
  add column if not exists workspace_mode text not null default 'ecommerce'
  check (workspace_mode in ('startup', 'ecommerce'));

comment on column public.user_preferences.workspace_mode is
  'FYP II Phase 1: ''startup'' = Local Malaysian Shop mode, ''ecommerce'' = E-commerce Startup mode (src/constants/modes.js MODES keys). Switchable in Settings, chosen at onboarding.';
