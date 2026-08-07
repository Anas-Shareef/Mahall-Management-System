-- 20260807000000_fix_donation_campaigns_rls.sql
-- Fix RLS policies on donation_campaigns so that all client requests (including anon / local admin sessions)
-- can insert, update, select, and delete campaign records in Supabase without 401 Unauthorized errors.

-- Drop all existing policies on donation_campaigns
DROP POLICY IF EXISTS "Admins have full access to donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Allow all operations for donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Admins full access donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Everyone can view donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Service role full access donation_campaigns" ON public.donation_campaigns;

-- Allow all operations for donation_campaigns (matches death_records, marriage_records, donations)
CREATE POLICY "Allow all operations for donation_campaigns" ON public.donation_campaigns
    FOR ALL
    USING (true)
    WITH CHECK (true);
