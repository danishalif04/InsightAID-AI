-- InsightAid AI — demo data seed
-- Run once, AFTER you've signed up through the app's /signup page.
-- Edit the email on the line below to match the account you just created,
-- then run this whole file in the Supabase Dashboard -> SQL Editor.
--
-- Rewritten for Phase 10's trimmed schema (0001_init.sql only keeps
-- profiles/companies/user_preferences/api_keys/report_templates/storage_usage
-- now — see that migration's own header for why). The original version of
-- this file seeded executive_summary/sentiment_daily/crisis_status/
-- forecast_series/the old recommendations shape/api_connections/
-- dataset_imports, all of which no longer exist as tables. Seeding
-- "real" sentiment/crisis/forecast/recommendation data for a demo account
-- now means running the actual pipeline (ml/sentiment, ml/forecasting,
-- the crisis/recommendation rule engines) against real uploaded data via
-- Dataset Management, not writing rows directly into a mock-shaped table
-- that no longer exists.

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'admin@insightaid.ai' limit 1;
  if v_user_id is null then
    raise exception 'No auth.users row found for that email — sign up through /signup first, then fix the email above.';
  end if;

  -- Settings ------------------------------------------------------------
  insert into public.profiles (id, full_name, email, role, phone)
  values (v_user_id, 'Admin User', 'admin@insightaid.ai', 'Founder', '+60 12-345 6789')
  on conflict (id) do update set full_name = excluded.full_name, role = excluded.role, phone = excluded.phone;

  insert into public.companies (user_id, name, industry, size, website)
  values (v_user_id, 'InsightAid Sdn Bhd', 'Data Analytics / SaaS', '1–10 employees', 'https://insightaid.ai')
  on conflict (user_id) do update set name = excluded.name, industry = excluded.industry;

  insert into public.user_preferences (user_id, notifications, language, theme, backup_frequency)
  values (
    v_user_id,
    '{"crisis_alerts": true, "weekly_digest": true, "recommendation_updates": false, "product_updates": false}'::jsonb,
    'en', 'light', 'daily'
  )
  on conflict (user_id) do update set notifications = excluded.notifications;

  -- Reports ---------------------------------------------------------------
  -- report_templates.name must match src/config/reportTemplates.js's
  -- REPORT_TEMPLATE_DEFINITIONS exactly, or the Reports page won't
  -- recognize the row as "this type's" last-generated date.
  insert into public.report_templates (user_id, name, description, last_generated) values
    (v_user_id, 'Business Health Report', 'Business profile, data availability, current performance, key findings, and recommendations.', current_date - 3),
    (v_user_id, 'Sentiment Report', 'Sentiment scores, trending topics, and required data improvements.', current_date - 1)
  on conflict do nothing;

  -- Dataset Management ------------------------------------------------------
  insert into public.storage_usage (user_id, used_gb, total_gb)
  values (v_user_id, 0.4, 100)
  on conflict (user_id) do update set used_gb = excluded.used_gb;

  raise notice 'Seeded settings/reports/storage rows for %. For real sentiment/crisis/forecast/recommendation data, upload a CSV (or use "Load sample data") via Dataset Management — those pages compute live from raw_data/processed_data/daily_aggregates, not from a seed script.', v_user_id;
end $$;
