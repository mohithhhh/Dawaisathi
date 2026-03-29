-- ============================================================
-- PAYMENTS SCHEMA UPDATE
-- Self-contained — safe to run even if schema.sql wasn't run.
-- ============================================================

-- 1. Ensure updated_at trigger function exists
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 2. Ensure users table has subscription_end column
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_end timestamptz;

-- 3. Create payments table if it doesn't exist (with all 3 types)
create table if not exists public.payments (
  id                   uuid        default gen_random_uuid() primary key,
  user_id              uuid        references public.users(id) on delete cascade not null,
  razorpay_order_id    text        unique not null,
  razorpay_payment_id  text,
  amount               integer     not null,
  payment_type         text        not null
                                   check (payment_type in ('one_time', 'subscription', 'pharmacist')),
  status               text        not null default 'pending'
                                   check (status in ('pending', 'completed', 'failed')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- 4. If payments already existed with the old constraint, update it
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_payment_type_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_type_check
  CHECK (payment_type IN ('one_time', 'subscription', 'pharmacist'));

-- 5. RLS
alter table public.payments enable row level security;

create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "Users can insert own payments"
  on public.payments for insert
  with check (auth.uid() = user_id);

-- 6. updated_at trigger
drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.handle_updated_at();

-- ============================================================
-- DONE
-- ============================================================
