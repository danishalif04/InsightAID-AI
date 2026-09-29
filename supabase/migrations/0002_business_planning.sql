-- InsightAid AI — business planning onboarding (FYP2.md §10, §23-27)
-- Self-contained: does not depend on 0001_init.sql having been run.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;

-- One row per user. Descriptive business identity + the free-text "I have
-- data / I don't have data yet" choice + a single provenance map covering
-- every field in both this table and business_assumptions.
create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,

  business_name text,
  business_type text,
  industry text,
  business_stage text,
  location text,
  business_model text,

  product_category text,
  product_type text,

  target_customer text,
  target_age_group text,
  target_location text,
  customer_segment text,

  marketing_channels text[],

  revenue_target numeric,
  sales_target numeric,
  customer_target numeric,
  launch_date date,
  growth_target text,

  data_availability_path text check (data_availability_path in ('has_data', 'no_data')),

  -- { fieldName: 'user_provided' | 'ai_extracted' | 'default_assumption' }
  -- fieldName keys are the logical field names used by the frontend schema,
  -- regardless of which of the two tables physically holds the value.
  provenance jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;
create policy "Users manage own business_profiles" on public.business_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- One row per user, 1:1 with business_profiles. The numeric planning inputs
-- (§24 Sales Assumptions / Operating Costs) that Part 2's scenario engine
-- will read from — not yet driving any scenario UI in this phase.
create table public.business_assumptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,

  selling_price numeric,
  cost_per_unit numeric,
  expected_margin numeric,
  number_of_products integer,

  expected_monthly_units numeric,
  expected_monthly_revenue numeric,
  expected_growth_rate numeric,
  expected_conversion_rate numeric,
  expected_repeat_purchase_rate numeric,

  marketing_cost numeric,
  platform_fees numeric,
  shipping_cost numeric,
  labour_cost numeric,
  fixed_costs numeric,
  other_expenses numeric,

  updated_at timestamptz not null default now()
);

alter table public.business_assumptions enable row level security;
create policy "Users manage own business_assumptions" on public.business_assumptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
