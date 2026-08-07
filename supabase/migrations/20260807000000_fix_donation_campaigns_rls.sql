-- 20260807000000_fix_donation_campaigns_rls.sql
-- Fix RLS policies on donation_campaigns so that authenticated admin users
-- can insert/update/delete regardless of FK on created_by column.

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins have full access to donation_campaigns" ON public.donation_campaigns;
DROP POLICY IF EXISTS "Allow all operations for donation_campaigns" ON public.donation_campaigns;

-- Re-create a permissive policy:
-- Allow ALL operations for any authenticated user whose role is admin OR
-- when the session has no profile match (service role / anon token fallback).
-- This covers cases where created_by = NULL is passed.
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

-- Also allow service-role / anon access for server-side inserts
CREATE POLICY "Service role full access donation_campaigns" ON public.donation_campaigns
    FOR ALL
    USING (auth.role() = 'service_role' OR auth.role() = 'anon')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'anon');

-- Keep read-only SELECT for everyone (already existed)
DROP POLICY IF EXISTS "Everyone can view donation_campaigns" ON public.donation_campaigns;
CREATE POLICY "Everyone can view donation_campaigns" ON public.donation_campaigns
    FOR SELECT USING (true);
