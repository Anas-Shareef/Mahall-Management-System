-- -----------------------------------------------------------------------------
-- SUPABASE MIGRATION: MEMBER AUTHENTICATION ARCHITECTURE & ROW LEVEL SECURITY (RLS)
-- PRD Version 2.0 / 3.0 Compliance
-- -----------------------------------------------------------------------------

-- 1. ENHANCE MEMBERS TABLE SCHEMA
ALTER TABLE IF EXISTS public.members 
  ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS portal_status TEXT DEFAULT 'not_granted' 
    CHECK (portal_status IN ('not_granted', 'pending', 'active', 'suspended', 'revoked'));

-- 2. ENHANCE PROFILES TABLE SCHEMA
ALTER TABLE IF EXISTS public.profiles 
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.members(id) ON DELETE SET NULL;

-- 3. ENABLE ROW LEVEL SECURITY ON ALL MAHALL TABLES
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. HELPER FUNCTION TO GET CURRENT USER ROLE
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  u_role TEXT;
BEGIN
  SELECT role INTO u_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(u_role, 'member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. HELPER FUNCTION TO GET CURRENT MEMBER HOUSEHOLD ID
CREATE OR REPLACE FUNCTION public.get_current_member_household_id()
RETURNS UUID AS $$
DECLARE
  h_id UUID;
BEGIN
  SELECT m.household_id INTO h_id
  FROM public.members m
  JOIN public.profiles p ON p.member_id = m.id OR m.user_id = p.id
  WHERE p.id = auth.uid()
  LIMIT 1;
  
  RETURN h_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- ADMIN RLS POLICIES (FULL ACCESS)
-- -----------------------------------------------------------------------------

CREATE POLICY "Admins have full access to households" ON public.households
  FOR ALL USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins have full access to members" ON public.members
  FOR ALL USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins have full access to subscriptions" ON public.subscriptions
  FOR ALL USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins have full access to payments" ON public.payments
  FOR ALL USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL USING (public.get_current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- MEMBER RLS POLICIES (READ-ONLY HOUSEHOLD & SELF ACCESS ONLY)
-- -----------------------------------------------------------------------------

-- Profiles: Members can view their own profile
CREATE POLICY "Members can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Members: Members can view members of their own household
CREATE POLICY "Members can view family members in own household" ON public.members
  FOR SELECT USING (household_id = public.get_current_member_household_id());

-- Households: Members can view their own household only
CREATE POLICY "Members can view own household" ON public.households
  FOR SELECT USING (id = public.get_current_member_household_id());

-- Subscriptions: Members can view subscriptions for members in their household
CREATE POLICY "Members can view household subscriptions" ON public.subscriptions
  FOR SELECT USING (
    member_id IN (
      SELECT id FROM public.members WHERE household_id = public.get_current_member_household_id()
    )
  );

-- Payments: Members can view payments for members in their household
CREATE POLICY "Members can view household payments" ON public.payments
  FOR SELECT USING (
    member_id IN (
      SELECT id FROM public.members WHERE household_id = public.get_current_member_household_id()
    )
  );
