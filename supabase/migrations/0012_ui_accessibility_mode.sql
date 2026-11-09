-- InsightAid AI — FYP II Phase 7: persist the UI accessibility mode per user
-- (Standard / Low-Sensory / Senior), not just localStorage.
-- Additive only — widens an existing table, no data loss.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.

alter table public.user_preferences
  add column if not exists ui_accessibility_mode text not null default 'standard'
  check (ui_accessibility_mode in ('standard', 'low_sensory', 'senior'));

comment on column public.user_preferences.ui_accessibility_mode is
  'FYP II Phase 7: ''standard'' = default post-Tufte-redesign UI, ''low_sensory'' = autism-friendly/W3C-COGA-informed mode, ''senior'' = Mod Warga Emas (elderly Malaysian shop owner) mode. Switchable from the header and Settings (src/constants/uiModes.js UI_MODES keys).';
