-- ============================================================
-- DawaiSathi — COMPLETE FRESH SCHEMA
-- Run this ONCE in Supabase SQL Editor.
-- Creates everything: users, explanations, payments,
-- profiles, callback_requests, chats.
-- ============================================================


-- ============================================================
-- SHARED: updated_at trigger function
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================
-- 1. USERS (plan + billing info for every user)
-- ============================================================
create table if not exists public.users (
  id                uuid        references auth.users(id) on delete cascade primary key,
  phone             text        unique,
  plan              text        not null default 'free'
                                check (plan in ('free', 'paid', 'subscription')),
  explanation_count integer     not null default 0,
  subscription_end  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users for insert with check (auth.uid() = id);

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();


-- ============================================================
-- 2. AUTO-CREATE USER ROW ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, phone, plan, explanation_count)
  values (new.id, new.phone, 'free', 0)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- 3. EXPLANATIONS (history of medicine lookups)
-- ============================================================
create table if not exists public.explanations (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references public.users(id) on delete cascade not null,
  medicine_name    text        not null,
  language         text        not null,
  explanation_text text        not null,
  created_at       timestamptz not null default now()
);

alter table public.explanations enable row level security;

drop policy if exists "Users can view own explanations" on public.explanations;
create policy "Users can view own explanations"
  on public.explanations for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own explanations" on public.explanations;
create policy "Users can insert own explanations"
  on public.explanations for insert with check (auth.uid() = user_id);

create index if not exists explanations_user_id_created_at_idx
  on public.explanations(user_id, created_at desc);


-- ============================================================
-- 4. PAYMENTS (Razorpay transaction log)
-- ============================================================
create table if not exists public.payments (
  id                   uuid        default gen_random_uuid() primary key,
  user_id              uuid        references public.users(id) on delete cascade not null,
  razorpay_order_id    text        unique not null,
  razorpay_payment_id  text,
  amount               integer     not null,   -- in paise
  payment_type         text        not null
                                   check (payment_type in ('one_time', 'subscription', 'pharmacist')),
  status               text        not null default 'pending'
                                   check (status in ('pending', 'completed', 'failed')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
  on public.payments for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own payments" on public.payments;
create policy "Users can insert own payments"
  on public.payments for insert with check (auth.uid() = user_id);

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.handle_updated_at();


-- ============================================================
-- 5. PROFILES (pharmacist / admin role data)
-- ============================================================
create table if not exists public.profiles (
  id           uuid      references auth.users(id) on delete cascade primary key,
  role         text      not null default 'patient'
                         check (role in ('patient', 'pharmacist', 'admin')),
  full_name    text,
  phone        text,
  languages    text[]    default '{}',
  is_available boolean   not null default false,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);


-- ============================================================
-- 6. CALLBACK REQUESTS (patient ↔ pharmacist)
-- ============================================================
create table if not exists public.callback_requests (
  id            uuid        default gen_random_uuid() primary key,
  patient_id    uuid        references auth.users(id),
  patient_phone text,
  medicine_name text        not null,
  language      text        not null,
  explanation   text,
  status        text        not null default 'pending'
                            check (status in ('pending', 'accepted', 'completed', 'cancelled')),
  pharmacist_id uuid        references auth.users(id),
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  called_at     timestamptz
);

alter table public.callback_requests enable row level security;

drop policy if exists "Patients can view own requests" on public.callback_requests;
create policy "Patients can view own requests"
  on public.callback_requests for select using (auth.uid() = patient_id);

drop policy if exists "Patients can insert own requests" on public.callback_requests;
create policy "Patients can insert own requests"
  on public.callback_requests for insert with check (auth.uid() = patient_id);

drop policy if exists "Pharmacists can view relevant requests" on public.callback_requests;
create policy "Pharmacists can view relevant requests"
  on public.callback_requests for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'pharmacist'
        and (
          (status = 'pending' and language = any(p.languages))
          or pharmacist_id = auth.uid()
        )
    )
  );

drop policy if exists "Pharmacists can update requests" on public.callback_requests;
create policy "Pharmacists can update requests"
  on public.callback_requests for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'pharmacist'
    )
  );

create index if not exists callback_requests_status_language_idx
  on public.callback_requests(status, language);
create index if not exists callback_requests_pharmacist_id_idx
  on public.callback_requests(pharmacist_id);


-- ============================================================
-- 7. CHATS (pharmacist ↔ patient messages)
-- ============================================================
create table if not exists public.chats (
  id                  uuid        default gen_random_uuid() primary key,
  callback_request_id uuid        references public.callback_requests(id) on delete cascade,
  sender_id           uuid        references auth.users(id),
  sender_role         text        not null check (sender_role in ('patient', 'pharmacist')),
  message             text        not null,
  created_at          timestamptz not null default now()
);

alter table public.chats enable row level security;

drop policy if exists "Chat participants can read" on public.chats;
create policy "Chat participants can read"
  on public.chats for select
  using (
    exists (
      select 1 from public.callback_requests cr
      where cr.id = callback_request_id
        and (cr.patient_id = auth.uid() or cr.pharmacist_id = auth.uid())
    )
  );

drop policy if exists "Authenticated users can insert" on public.chats;
create policy "Authenticated users can insert"
  on public.chats for insert with check (auth.uid() = sender_id);

create index if not exists chats_callback_request_id_idx
  on public.chats(callback_request_id, created_at asc);


-- ============================================================
-- 8. REALTIME
-- Enable in Supabase Dashboard → Database → Replication
-- OR uncomment below (requires superuser):
-- alter publication supabase_realtime add table public.callback_requests;
-- alter publication supabase_realtime add table public.chats;
-- ============================================================


-- ============================================================
-- 9. ONBOARD A PHARMACIST (run after they sign in)
-- Step 1: find their UUID
--   select id, email from auth.users where email = 'pharmacist@example.com';
-- Step 2:
--   insert into public.profiles (id, role, full_name, languages, is_available)
--   values ('their-uuid', 'pharmacist', 'Dr. Name', array['Kannada','Hindi'], false);
-- ============================================================
