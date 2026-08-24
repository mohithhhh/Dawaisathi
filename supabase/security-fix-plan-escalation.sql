-- ============================================================
-- SECURITY FIX: close the plan self-escalation gap on public.users
-- Safe to run standalone against a DB that already has fresh-schema.sql
-- applied — this only touches public.users (policy + new trigger), and
-- is idempotent (create-or-replace / drop-if-exists throughout).
--
-- Root cause: the "Users can update own profile" RLS policy only checked
-- row ownership (auth.uid() = id). It did not restrict which COLUMNS a
-- user could set on their own row, so any signed-in user could call
--   supabase.from('users').update({ plan: 'subscription', subscription_end: '2099-01-01' })
-- directly from the browser and grant themselves a paid plan for free.
-- This has now also been folded into supabase/fresh-schema.sql for new
-- installs — run this file only if your DB predates that change.
-- ============================================================

create or replace function public.prevent_plan_self_update()
returns trigger as $$
begin
  -- service_role (the admin client used by /api/explain and
  -- /api/payment/verify) bypasses this check — it's the only thing
  -- allowed to change these columns.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.explanation_count is distinct from old.explanation_count
     or new.subscription_end is distinct from old.subscription_end then
    raise exception 'plan, explanation_count, and subscription_end can only be changed by the server';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists users_prevent_plan_self_update on public.users;
create trigger users_prevent_plan_self_update
  before update on public.users
  for each row execute function public.prevent_plan_self_update();

-- Belt-and-suspenders: make the ownership check explicit on both sides of
-- the update (was implicit via USING before; WITH CHECK makes intent clear
-- and covers the case where USING is ever weakened later).
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id) with check (auth.uid() = id);
