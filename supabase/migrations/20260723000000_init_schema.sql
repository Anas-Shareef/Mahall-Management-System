-- 20260723000000_init_schema.sql
-- Up Migration for Mahallu Subscription & Member Management Portal

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drop old policies to avoid recursion errors
drop policy if exists "Allow admins full access to profiles" on public.profiles;
drop policy if exists "Allow users to read their own profile" on public.profiles;
drop policy if exists "Allow users to update their own profile language" on public.profiles;

drop policy if exists "Allow admins full access to households" on public.households;
drop policy if exists "Allow members to view their own household" on public.households;

drop policy if exists "Allow admins full access to members" on public.members;
drop policy if exists "Allow members to view household members" on public.members;

drop policy if exists "Allow admins full access to subscription_years" on public.subscription_years;
drop policy if exists "Allow everyone to read active subscription years" on public.subscription_years;

drop policy if exists "Allow admins full access to member_subscriptions" on public.member_subscriptions;
drop policy if exists "Allow members to view their own subscriptions" on public.member_subscriptions;

drop policy if exists "Allow admins full access to payments" on public.payments;
drop policy if exists "Allow members to view their own payments" on public.payments;

drop policy if exists "Allow admins full access to notifications" on public.notifications;
drop policy if exists "Allow members to view notifications they are recipients of" on public.notifications;

drop policy if exists "Allow admins full access to notification_recipients" on public.notification_recipients;
drop policy if exists "Allow users to view and update their own recipient status" on public.notification_recipients;

drop policy if exists "Allow admins full access to audit_logs" on public.audit_logs;

-- PROFILES
create table if not exists public.profiles (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text,
    email text,
    role text not null check (role in ('admin', 'member')),
    language text not null default 'en' check (language in ('en', 'ml')),
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- HOUSEHOLDS
create table if not exists public.households (
    id uuid primary key default gen_random_uuid(),
    house_number text not null unique,
    house_owner_name text not null,
    house_owner_phone text,
    address text,
    area text,
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MEMBERS
create table if not exists public.members (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete set null,
    household_id uuid references public.households(id) on delete cascade not null,
    name text not null,
    relationship text not null,
    phone text,
    email text,
    status text not null default 'active' check (status in ('active', 'inactive')),
    is_subscription_accountable boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ARREARS
create table if not exists public.arrears (
    id uuid primary key default gen_random_uuid(),
    member_id uuid references public.members(id) on delete cascade not null,
    subscription_year_id uuid references public.subscription_years(id) on delete cascade not null,
    amount numeric not null check (amount >= 0),
    reason text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SUBSCRIPTION YEARS
create table if not exists public.subscription_years (
    id uuid primary key default gen_random_uuid(),
    year integer not null unique check (year >= 2000 and year <= 2100),
    default_fee numeric not null default 0 check (default_fee >= 0),
    start_date date not null,
    end_date date not null,
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MEMBER SUBSCRIPTIONS
create table if not exists public.member_subscriptions (
    id uuid primary key default gen_random_uuid(),
    member_id uuid references public.members(id) on delete cascade not null,
    subscription_year_id uuid references public.subscription_years(id) on delete cascade not null,
    annual_fee numeric not null default 0 check (annual_fee >= 0),
    previous_arrears numeric not null default 0 check (previous_arrears >= 0),
    total_due numeric generated always as (annual_fee + previous_arrears) stored,
    total_paid numeric not null default 0 check (total_paid >= 0),
    balance numeric generated always as (annual_fee + previous_arrears - total_paid) stored,
    status text not null default 'unpaid' check (status in ('paid', 'partially_paid', 'unpaid')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (member_id, subscription_year_id)
);

-- PAYMENTS (Offline payment records)
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    member_id uuid references public.members(id) on delete cascade not null,
    subscription_id uuid references public.member_subscriptions(id) on delete cascade not null,
    amount numeric not null check (amount > 0),
    payment_method text not null check (payment_method in ('cash', 'upi', 'bank_transfer', 'other')),
    payment_date date not null default current_date,
    reference_number text,
    notes text,
    recorded_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- NOTIFICATIONS
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    title_en text not null,
    message_en text not null,
    title_ml text not null,
    message_ml text not null,
    type text not null check (type in ('payment_recorded', 'payment_reminder', 'arrears_reminder', 'announcement')),
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- NOTIFICATION RECIPIENTS
create table if not exists public.notification_recipients (
    id uuid primary key default gen_random_uuid(),
    notification_id uuid references public.notifications(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    read_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- AUDIT LOGS
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id uuid,
    old_data jsonb,
    new_data jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ENABLE ROW LEVEL SECURITY AND ADD NON-RECURSIVE ACCESS POLICIES
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.subscription_years enable row level security;
alter table public.member_subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.arrears enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.audit_logs enable row level security;

create policy "Allow all operations for profiles" on public.profiles for all using (true) with check (true);
create policy "Allow all operations for households" on public.households for all using (true) with check (true);
create policy "Allow all operations for members" on public.members for all using (true) with check (true);
create policy "Allow all operations for subscription_years" on public.subscription_years for all using (true) with check (true);
create policy "Allow all operations for member_subscriptions" on public.member_subscriptions for all using (true) with check (true);
create policy "Allow all operations for payments" on public.payments for all using (true) with check (true);
create policy "Allow all operations for arrears" on public.arrears for all using (true) with check (true);
create policy "Allow all operations for notifications" on public.notifications for all using (true) with check (true);
create policy "Allow all operations for notification_recipients" on public.notification_recipients for all using (true) with check (true);
create policy "Allow all operations for audit_logs" on public.audit_logs for all using (true) with check (true);

-- SEED INITIAL SUBSCRIPTION YEARS IF NOT EXISTS
insert into public.subscription_years (year, default_fee, start_date, end_date, status)
values
(2026, 1200, '2026-01-01', '2026-12-31', 'active'),
(2025, 1000, '2025-01-01', '2025-12-31', 'inactive'),
(2024, 1000, '2024-01-01', '2024-12-31', 'inactive')
on conflict (year) do nothing;
