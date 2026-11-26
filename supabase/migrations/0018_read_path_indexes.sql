-- SPARK_AUDIT.md P0-1: raw_data and processed_data had no index apart
-- from their primary keys, so every page-load read (always filtered by
-- user_id through RLS) scanned the whole table. daily_aggregates already
-- has a unique key starting (user_id, date), so it needs nothing.
-- Additive only: no table, column, policy or row is changed, and each
-- index can be dropped again without data loss.

-- Sales rows read in row_index order, 1000 at a time (salesService.js).
create index if not exists raw_data_user_template_row_idx
  on public.raw_data (user_id, template_id, row_index);

-- Earliest / latest comment lookups (recommendationService.js) and
-- date-ordered comment reads.
create index if not exists processed_data_user_collected_idx
  on public.processed_data (user_id, collected_at);
