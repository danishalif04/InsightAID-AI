-- InsightAid AI — sentiment model versioning (FYP2.md §46-49)
-- Self-contained: does not depend on any prior migration.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;

-- Metadata about each offline training run (ml/sentiment/), never populated
-- by this app's frontend. Unlike every other table in this project, this is
-- NOT per-user data — it's a shared record of what models exist and how
-- well they scored, so RLS here intentionally differs from the
-- auth.uid() = user_id pattern used everywhere else.
create table public.model_versions (
  id uuid primary key default gen_random_uuid(),

  model_name text not null,
  model_version text not null,
  model_type text not null check (model_type in ('xlmr', 'mbert', 'tfidf_lr')),
  eval_path text not null check (eval_path in ('original_language', 'translate_to_english')),

  trained_at timestamptz not null,
  dataset_version text,

  training_samples integer not null check (training_samples >= 0),
  validation_samples integer not null check (validation_samples >= 0),
  test_samples integer not null check (test_samples >= 0),

  -- Macro-averaged over the 3 classes (positive/neutral/negative). Never
  -- fabricated — see ml/sentiment/src/metrics.py, which is the only code
  -- path that should ever produce these numbers.
  accuracy numeric check (accuracy between 0 and 1),
  precision numeric check (precision between 0 and 1),
  recall numeric check (recall between 0 and 1),
  f1 numeric check (f1 between 0 and 1),

  per_language_metrics jsonb not null default '{}',
  confusion_matrix jsonb,
  notes text,

  created_at timestamptz not null default now(),

  unique (model_type, model_version, eval_path)
);

alter table public.model_versions enable row level security;

-- Any signed-in user can see which model versions exist and how they
-- performed (e.g. for a future "current model" indicator in Settings).
create policy "Authenticated users can read model_versions" on public.model_versions
  for select using (auth.role() = 'authenticated');

-- Deliberately no insert/update/delete policy for anon or authenticated:
-- only the Supabase service role (used by whoever runs the training
-- notebook/scripts, never the frontend) can write rows here.
