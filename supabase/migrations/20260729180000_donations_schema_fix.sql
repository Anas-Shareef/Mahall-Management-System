-- 20260729180000_donations_schema_fix.sql
-- Migration for Donations Module Schema & Admin RLS Security

-- 1. ENSURE DONATION CAMPAIGNS TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.donation_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name TEXT NOT NULL,
    campaign_type TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    target_amount NUMERIC NOT NULL DEFAULT 0 CHECK (target_amount >= 0),
    start_date DATE,
    end_date DATE,
    cover_image TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ENSURE DONATIONS TABLE EXISTS & ADD ALL OPTIONAL COLUMNS
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_type TEXT NOT NULL DEFAULT 'general' CHECK (donation_type IN ('general', 'campaign')),
    campaign_id UUID REFERENCES public.donation_campaigns(id) ON DELETE SET NULL,
    donor_name TEXT,
    donor_phone TEXT,
    donor_email TEXT,
    donor_address TEXT,
    donor_type TEXT DEFAULT 'external',
    donor_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'other')),
    donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_number TEXT,
    reference_number TEXT,
    purpose TEXT,
    status TEXT DEFAULT 'received',
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add any missing columns if table already existed
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS donor_email TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS donor_address TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS donor_type TEXT DEFAULT 'external';
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'received';

-- 3. ENABLE RLS
ALTER TABLE public.donation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- 4. DROP OLD POLICIES IF PRESENT TO PREVENT CONFLICTS
DROP POLICY IF EXISTS "Allow all operations for donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Allow all operations for donations" ON public.donations;
DROP POLICY IF EXISTS "Admins have full access to donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Admins have full access to donations" ON public.donations;
DROP POLICY IF EXISTS "Everyone can view donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Everyone can view donations" ON public.donations;

-- 5. DEFINE TRUSTED RLS POLICIES
-- Admin full control
CREATE POLICY "Admins have full access to donation_campaigns" ON public.donation_campaigns
    FOR ALL USING (public.get_current_user_role() = 'admin') WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins have full access to donations" ON public.donations
    FOR ALL USING (public.get_current_user_role() = 'admin') WITH CHECK (public.get_current_user_role() = 'admin');

-- Read-only policy for authenticated & public users
CREATE POLICY "Everyone can view donation_campaigns" ON public.donation_campaigns
    FOR SELECT USING (true);

CREATE POLICY "Everyone can view donations" ON public.donations
    FOR SELECT USING (true);
