-- 20260724000000_community_expansion.sql
-- Up Migration for Mahallu Community Records, Donations & Gallery Expansion

-- 1. DEATH RECORDS
create table if not exists public.death_records (
    id uuid primary key default gen_random_uuid(),
    deceased_name text not null,
    member_id uuid references public.members(id) on delete set null,
    father_or_husband_name text,
    date_of_death date not null,
    burial_date date,
    burial_time text,
    place_of_death text,
    age integer check (age >= 0),
    gender text check (gender in ('male', 'female', 'other')),
    address text,
    ward_or_area text,
    cause_of_death text,
    medically_certified boolean default false,
    certifier_name text,
    notes text,
    certificate_url text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. MARRIAGE RECORDS
create table if not exists public.marriage_records (
    id uuid primary key default gen_random_uuid(),
    groom_name text not null,
    groom_member_id uuid references public.members(id) on delete set null,
    groom_father_name text,
    groom_phone text,
    groom_house_number text,
    groom_ward text,
    groom_address text,
    
    bride_type text not null default 'external' check (bride_type in ('member', 'external')),
    bride_name text not null,
    bride_member_id uuid references public.members(id) on delete set null,
    bride_father_name text,
    bride_phone text,
    bride_address text,
    bride_ward text,

    nikah_date date not null,
    nikah_time text,
    nikah_venue text,
    registration_number text,
    conducted_by text,
    nikah_type text,

    wali_name text,
    wali_relationship text,
    wali_phone text,

    witness1_name text,
    witness1_phone text,
    witness2_name text,
    witness2_phone text,

    mahr_type text,
    mahr_description text,
    mahr_payment_status text,
    mahr_notes text,

    status text not null default 'completed' check (status in ('completed', 'cancelled')),
    certificate_url text,
    notes text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. DONATION CAMPAIGNS
create table if not exists public.donation_campaigns (
    id uuid primary key default gen_random_uuid(),
    campaign_name text not null,
    campaign_type text not null default 'general',
    description text,
    target_amount numeric not null default 0 check (target_amount >= 0),
    start_date date,
    end_date date,
    cover_image text,
    status text not null default 'active' check (status in ('draft', 'active', 'completed', 'cancelled')),
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. DONATIONS
create table if not exists public.donations (
    id uuid primary key default gen_random_uuid(),
    donation_type text not null default 'general' check (donation_type in ('general', 'campaign')),
    campaign_id uuid references public.donation_campaigns(id) on delete set null,
    donor_name text,
    donor_phone text,
    donor_member_id uuid references public.members(id) on delete set null,
    is_anonymous boolean default false,
    amount numeric not null check (amount > 0),
    payment_method text not null check (payment_method in ('cash', 'upi', 'bank_transfer', 'cheque', 'other')),
    donation_date date not null default current_date,
    receipt_number text,
    notes text,
    recorded_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. GALLERY ALBUMS
create table if not exists public.gallery_albums (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    programme_type text not null default 'community',
    event_date date not null,
    year integer not null default 2026,
    venue text,
    description text,
    cover_image text,
    visibility text not null default 'published' check (visibility in ('published', 'draft')),
    related_campaign_id uuid references public.donation_campaigns(id) on delete set null,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. GALLERY IMAGES
create table if not exists public.gallery_images (
    id uuid primary key default gen_random_uuid(),
    album_id uuid references public.gallery_albums(id) on delete cascade not null,
    image_url text not null,
    caption text,
    sort_order integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ENABLE ROW LEVEL SECURITY AND ADD ACCESS POLICIES
alter table public.death_records enable row level security;
alter table public.marriage_records enable row level security;
alter table public.donation_campaigns enable row level security;
alter table public.donations enable row level security;
alter table public.gallery_albums enable row level security;
alter table public.gallery_images enable row level security;

create policy "Allow all operations for death_records" on public.death_records for all using (true) with check (true);
create policy "Allow all operations for marriage_records" on public.marriage_records for all using (true) with check (true);
create policy "Allow all operations for donation_campaigns" on public.donation_campaigns for all using (true) with check (true);
create policy "Allow all operations for donations" on public.donations for all using (true) with check (true);
create policy "Allow all operations for gallery_albums" on public.gallery_albums for all using (true) with check (true);
create policy "Allow all operations for gallery_images" on public.gallery_images for all using (true) with check (true);
