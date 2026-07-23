-- 20260723000000_init_schema.sql
-- Up Migration for Mahallu Subscription & Member Management Portal

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table if not exists public.profiles (
    id uuid primary key,
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
    relationship text not null, -- Self, Spouse, Son, Daughter, Father, Mother, Brother, Sister, Other
    phone text,
    email text,
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
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

-- FUNCTIONS & TRIGGERS

-- Function to handle new user registration from Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
declare
    default_role text := 'member';
begin
    -- The first user to sign up or if custom metadata defines role
    if (select count(*) from public.profiles) = 0 then
        default_role := 'admin';
    end if;

    insert into public.profiles (id, name, phone, email, role, language, status)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', new.email, new.phone, 'User'),
        new.phone,
        new.email,
        coalesce(new.raw_user_meta_data->>'role', default_role),
        coalesce(new.raw_user_meta_data->>'language', 'en'),
        'active'
    );
    return new;
end;
$$ language plpgsql security definer;

-- Trigger to sync auth.users with public.profiles
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Function to recalculate subscription total_paid and status when payments change
create or replace function public.recalculate_subscription_payments()
returns trigger as $$
declare
    v_subscription_id uuid;
    v_total_paid numeric;
    v_total_due numeric;
    v_new_status text;
begin
    -- Determine which subscription was modified
    if (TG_OP = 'DELETE') then
        v_subscription_id := old.subscription_id;
    else
        v_subscription_id := new.subscription_id;
    end if;

    -- Calculate total paid
    select coalesce(sum(amount), 0) into v_total_paid
    from public.payments
    where subscription_id = v_subscription_id;

    -- Retrieve total due (annual_fee + previous_arrears)
    select (annual_fee + previous_arrears) into v_total_due
    from public.member_subscriptions
    where id = v_subscription_id;

    -- Determine new status
    if v_total_paid >= v_total_due then
        v_new_status := 'paid';
    elsif v_total_paid > 0 then
        v_new_status := 'partially_paid';
    else
        v_new_status := 'unpaid';
    end if;

    -- Update the member subscription record
    update public.member_subscriptions
    set total_paid = v_total_paid,
        status = v_new_status,
        updated_at = timezone('utc'::text, now())
    where id = v_subscription_id;

    return null;
end;
$$ language plpgsql security definer;

-- Trigger on payments to update subscription stats
create or replace trigger on_payment_change
    after insert or update or delete on public.payments
    for each row execute procedure public.recalculate_subscription_payments();

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.subscription_years enable row level security;
alter table public.member_subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.audit_logs enable row level security;

-- PROFILES Policies
create policy "Allow admins full access to profiles"
    on public.profiles for all
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Allow users to read their own profile"
    on public.profiles for select
    using (id = auth.uid());

create policy "Allow users to update their own profile language"
    on public.profiles for update
    using (id = auth.uid())
    with check (id = auth.uid());

-- HOUSEHOLDS Policies
create policy "Allow admins full access to households"
    on public.households for all
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Allow members to view their own household"
    on public.households for select
    using (
        exists (
            select 1 from public.members m
            where m.user_id = auth.uid() and m.household_id = public.households.id
        )
    );

-- MEMBERS Policies
create policy "Allow admins full access to members"
    on public.members for all
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Allow members to view household members"
    on public.members for select
    using (
        household_id in (
            select household_id from public.members where user_id = auth.uid()
        )
    );

-- SUBSCRIPTION YEARS Policies
create policy "Allow admins full access to subscription_years"
    on public.subscription_years for all
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Allow everyone to read active subscription years"
    on public.subscription_years for select
    using (true);

-- MEMBER SUBSCRIPTIONS Policies
create policy "Allow admins full access to member_subscriptions"
    on public.member_subscriptions for all
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Allow members to view their own subscriptions"
    on public.member_subscriptions for select
    using (
        member_id in (
            select id from public.members where user_id = auth.uid()
        )
    );

-- PAYMENTS Policies
create policy "Allow admins full access to payments"
    on public.payments for all
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Allow members to view their own payments"
    on public.payments for select
    using (
        member_id in (
            select id from public.members where user_id = auth.uid()
        )
    );

-- NOTIFICATIONS Policies
create policy "Allow admins full access to notifications"
    on public.notifications for all
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Allow members to view notifications they are recipients of"
    on public.notifications for select
    using (
        exists (
            select 1 from public.notification_recipients nr
            where nr.notification_id = public.notifications.id and nr.user_id = auth.uid()
        )
    );

-- NOTIFICATION RECIPIENTS Policies
create policy "Allow admins full access to notification_recipients"
    on public.notification_recipients for all
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Allow users to view and update their own recipient status"
    on public.notification_recipients for all
    using (user_id = auth.uid());

-- AUDIT LOGS Policies
create policy "Allow admins full access to audit_logs"
    on public.audit_logs for all
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
