-- ============================================================
-- PHARMACIST DASHBOARD SCHEMA
-- Run this in Supabase SQL Editor AFTER running schema.sql
-- ============================================================

-- 1. PROFILES TABLE (role-based access for pharmacists/admins)
-- ============================================================
create table if not exists public.profiles (
  id          uuid        references auth.users(id) on delete cascade primary key,
  role        text        not null default 'patient' check (role in ('patient', 'pharmacist', 'admin')),
  full_name   text,
  phone       text,
  languages   text[]      default '{}',
  is_available boolean    not null default false,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- 2. CALLBACK REQUESTS TABLE
-- ============================================================
create table if not exists public.callback_requests (
  id           uuid        default gen_random_uuid() primary key,
  patient_id   uuid        references auth.users(id),
  patient_phone text,
  medicine_name text       not null,
  language     text        not null,
  explanation  text,
  status       text        not null default 'pending'
                           check (status in ('pending', 'accepted', 'completed', 'cancelled')),
  pharmacist_id uuid       references auth.users(id),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  called_at    timestamptz
);

alter table public.callback_requests enable row level security;

-- Patients can see and create their own requests
create policy "Patients can view own requests"
  on public.callback_requests for select
  using (auth.uid() = patient_id);

create policy "Patients can insert own requests"
  on public.callback_requests for insert
  with check (auth.uid() = patient_id);

-- Pharmacists can see pending requests matching their languages AND requests they've accepted
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

-- Pharmacists can accept / complete requests
create policy "Pharmacists can update requests"
  on public.callback_requests for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'pharmacist'
    )
  );

-- Indexes
create index if not exists callback_requests_status_language_idx
  on public.callback_requests(status, language);
create index if not exists callback_requests_pharmacist_id_idx
  on public.callback_requests(pharmacist_id);

-- ============================================================
-- 3. CHATS TABLE
-- ============================================================
create table if not exists public.chats (
  id                    uuid        default gen_random_uuid() primary key,
  callback_request_id   uuid        references public.callback_requests(id) on delete cascade,
  sender_id             uuid        references auth.users(id),
  sender_role           text        not null check (sender_role in ('patient', 'pharmacist')),
  message               text        not null,
  created_at            timestamptz not null default now()
);

alter table public.chats enable row level security;

-- Both the patient and the pharmacist on a request can read all messages
create policy "Chat participants can read"
  on public.chats for select
  using (
    exists (
      select 1 from public.callback_requests cr
      where cr.id = callback_request_id
        and (cr.patient_id = auth.uid() or cr.pharmacist_id = auth.uid())
    )
  );

create policy "Authenticated users can insert"
  on public.chats for insert
  with check (auth.uid() = sender_id);

create index if not exists chats_callback_request_id_idx
  on public.chats(callback_request_id, created_at asc);

-- ============================================================
-- 4. ENABLE REALTIME
-- Run these in Supabase Dashboard → Database → Replication,
-- or uncomment and run here (requires superuser):
-- ============================================================
-- alter publication supabase_realtime add table public.callback_requests;
-- alter publication supabase_realtime add table public.chats;

-- ============================================================
-- 5. ONBOARD A PHARMACIST
-- After the pharmacist signs in with Google, run:
-- ============================================================
-- Step 1: find their UUID
-- select id, email from auth.users where email = 'pharmacist@gmail.com';

-- Step 2: insert their pharmacist profile
-- insert into public.profiles (id, role, full_name, languages, is_available)
-- values (
--   'uuid-from-step-1',
--   'pharmacist',
--   'Dr. Pharmacist Name',
--   array['Kannada', 'Hindi'],
--   false
-- );
