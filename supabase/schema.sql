-- DawaiSathi (दवाई साथी) Database Schema
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/<id>/sql

-- ============================================================
-- 1. USERS TABLE (extends auth.users)
-- ============================================================
create table if not exists public.users (
  id          uuid        references auth.users(id) on delete cascade primary key,
  phone       text        unique,
  plan        text        not null default 'free'
                          check (plan in ('free', 'paid', 'subscription')),
  explanation_count integer not null default 0,
  subscription_end  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 2. EXPLANATIONS TABLE
-- ============================================================
create table if not exists public.explanations (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references public.users(id) on delete cascade not null,
  medicine_name    text        not null,
  language         text        not null
                              check (language in ('hindi', 'english', 'kannada', 'telugu', 'malayalam', 'tamil')),
  explanation_text text        not null,
  created_at       timestamptz not null default now()
);

-- Index for fast user history queries
create index if not exists explanations_user_id_created_at_idx
  on public.explanations(user_id, created_at desc);

-- ============================================================
-- 3. PAYMENTS TABLE
-- ============================================================
create table if not exists public.payments (
  id                   uuid        default gen_random_uuid() primary key,
  user_id              uuid        references public.users(id) on delete cascade not null,
  razorpay_order_id    text        unique not null,
  razorpay_payment_id  text,
  amount               integer     not null,   -- in paise (INR)
  payment_type         text        not null
                                   check (payment_type in ('one_time', 'subscription')),
  status               text        not null default 'pending'
                                   check (status in ('pending', 'completed', 'failed')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
alter table public.users        enable row level security;
alter table public.explanations enable row level security;
alter table public.payments     enable row level security;

-- Users: can only read/update their own profile
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Explanations: users can only see their own
create policy "Users can view own explanations"
  on public.explanations for select
  using (auth.uid() = user_id);

create policy "Users can insert own explanations"
  on public.explanations for insert
  with check (auth.uid() = user_id);

-- Payments: users can only see their own
create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "Users can insert own payments"
  on public.payments for insert
  with check (auth.uid() = user_id);

-- Service role (used by API routes via supabase-js) can do everything
-- This is granted automatically when using the anon key with service_role header
-- For API routes that need to write, we use the anon key + RLS (session-based)

-- ============================================================
-- 5. AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, phone, plan, explanation_count)
  values (
    new.id,
    new.phone,
    'free',
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 6. STORAGE (optional: for image uploads if needed)
-- ============================================================
-- Currently images are sent as base64 in the request body.
-- If you want to store them, create a bucket:
-- insert into storage.buckets (id, name, public) values ('medicine-images', 'medicine-images', false);
