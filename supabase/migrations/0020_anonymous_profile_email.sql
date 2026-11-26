-- SPARK Phase 1 item 5 (anonymous "Try demo"): Supabase anonymous users have
-- no email, but handle_new_user() copied new.email into profiles.email,
-- which is NOT NULL. The insert failed, so every anonymous sign-in returned
-- "unexpected_failure". Store '' instead (the column's own default).
--
-- Behaviour for email sign-ups is unchanged: coalesce() returns their email.
-- No table, column, policy or row is changed; only the function body.
-- Run once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;
