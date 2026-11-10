-- InsightAid AI — FYP II Agentic direction, backlog item 5 (minimal
-- foundation slice): a Manager Agent that can call ONE controlled tool
-- (financial_summary) and persists a real, inspectable investigation log.
-- See docs/AUDIT_v3_agentic_direction.md and supabase/functions/agent-manager
-- for what this deliberately is and isn't (not the full multi-agent/
-- multi-tool architecture from knowledge_updated_nov2026.md §14.6-14.9).
-- Additive only — no existing schema touched.
-- Run once in the Supabase Dashboard: Project -> SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;

-- One row per question asked to the Manager Agent.
create table public.agent_investigations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  question text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  final_answer text,

  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.agent_investigations enable row level security;
create policy "Users manage own agent_investigations" on public.agent_investigations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index agent_investigations_user_idx on public.agent_investigations (user_id, created_at desc);

-- One row per step the Manager Agent took while handling an investigation
-- (e.g. "decide tool relevance", "execute financial_summary tool", "phrase
-- final answer") — makes the agent's reasoning path inspectable, not a
-- black box.
create table public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.agent_investigations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  step_number integer not null,
  description text not null,
  status text not null default 'completed' check (status in ('completed', 'skipped', 'failed')),

  created_at timestamptz not null default now()
);

alter table public.agent_tasks enable row level security;
create policy "Users manage own agent_tasks" on public.agent_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index agent_tasks_investigation_idx on public.agent_tasks (investigation_id, step_number);

-- One row per actual tool call the Manager Agent executed — the real
-- input/output, so a tool call can never be claimed without evidence.
create table public.agent_tool_logs (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.agent_investigations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  tool_name text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

alter table public.agent_tool_logs enable row level security;
create policy "Users manage own agent_tool_logs" on public.agent_tool_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index agent_tool_logs_investigation_idx on public.agent_tool_logs (investigation_id, created_at);
