-- 20260807000000_fix_donation_campaigns_rls.sql
-- Fix RLS policies on donation_campaigns so that authenticated admin users
-- can insert/update/delete regardless of FK on created_by column.

-- Drop ALL existing policies on donation_campaigns (safe - IF EXISTS prevents errors)
DROP POLICY IF EXISTS "Admins have full access to donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Allow all operations for donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Admins full access donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Everyone can view donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Service role full access donation_campaigns" ON public.donation_campaigns;

-- Create permissive admin policy (covers FK violations when created_by = null)
CREATE POLICY "Admins full access donation_campaigns" ON public.donation_campaigns
    FOR ALL
    USING (
        auth.uid() IS NOT NULL AND (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
            OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
            OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
        )
    );

-- Keep read access for everyone
CREATE POLICY "Everyone can view donation_campaigns" ON public.donation_campaigns
    FOR SELECT USING (true);
