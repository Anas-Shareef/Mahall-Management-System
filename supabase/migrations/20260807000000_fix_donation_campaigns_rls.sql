-- 20260807000000_fix_donation_campaigns_rls.sql
-- Fix RLS policies on donation_campaigns AND donations so that all client requests (including anon / local admin sessions)
-- can insert, update, select, and delete campaign & donation records in Supabase without 401 Unauthorized errors.

-- 1. FIX DONATION_CAMPAIGNS POLICIES
DROP POLICY IF EXISTS "Admins have full access to donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Allow all operations for donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Admins full access donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Everyone can view donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Service role full access donation_campaigns" ON public.donation_campaigns;

CREATE POLICY "Allow all operations for donation_campaigns" ON public.donation_campaigns
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. FIX DONATIONS POLICIES
DROP POLICY IF EXISTS "Admins have full access to donations" ON public.donations;
DROP POLICY IF EXISTS "Allow all operations for donations" ON public.donations;
DROP POLICY IF EXISTS "Admins full access donations" ON public.donations;
DROP POLICY IF EXISTS "Everyone can view donations" ON public.donations;
DROP POLICY IF EXISTS "Service role full access donations" ON public.donations;

CREATE POLICY "Allow all operations for donations" ON public.donations
    FOR ALL
    USING (true)
    WITH CHECK (true);
