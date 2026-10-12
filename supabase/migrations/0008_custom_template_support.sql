-- InsightAid AI — "any file format" uploads + real API-synced sources
-- (FYP2.md §35, §37-39)
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.
--
-- 0003_data_pipeline.sql is already deployed (per this project's own
-- history), so this adds to its raw_data check constraints rather than
-- editing that file directly — editing an already-applied migration file
-- would do nothing against a live database.
--
-- Part 1: src/utils/datasetValidation.js's inferTemplateId() now returns
-- 'custom' instead of null when an uploaded file's headers don't match any
-- of the five known templates (even fuzzily, via
-- src/utils/csvTemplates.js's COLUMN_SYNONYMS) — no upload is hard-rejected
-- anymore. This is what lets that 'custom' value actually be stored.
--
-- Part 2: src/adapters/xAdapter.js's real sync() (reading real X API data)
-- tags rows with source = 'api_sync', distinguishing a real API-fetched
-- row from a csv_upload/json_upload/fixture_seed one.

do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.raw_data'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%template_id%';

  if v_constraint_name is not null then
    execute format('alter table public.raw_data drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.raw_data add constraint raw_data_template_id_check
  check (template_id in ('sales', 'reviews', 'social', 'product', 'expenses', 'custom'));

do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.raw_data'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%source%'
    and pg_get_constraintdef(oid) not like '%template_id%';

  if v_constraint_name is not null then
    execute format('alter table public.raw_data drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.raw_data add constraint raw_data_source_check
  check (source in ('csv_upload', 'json_upload', 'fixture_seed', 'api_sync'));
