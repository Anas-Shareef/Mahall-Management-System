-- 20260915000000_expenses_module.sql
-- Standalone Migration for Expenses Management Module

-- 1. EXPENSE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number TEXT NOT NULL UNIQUE,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL,
    description TEXT NOT NULL,
    paid_to TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque', 'other')),
    fund_id TEXT NOT NULL DEFAULT 'general_fund',
    reference_number TEXT,
    bank_account TEXT,
    transaction_reference TEXT,
    cheque_number TEXT,
    bank_name TEXT,
    upi_reference_id TEXT,
    notes TEXT,
    attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'voided')),
    approved_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    voided_by TEXT,
    voided_at TIMESTAMP WITH TIME ZONE,
    void_reason TEXT,
    created_by TEXT NOT NULL DEFAULT 'admin',
    updated_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. EXPENSE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.expense_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    performed_by TEXT NOT NULL DEFAULT 'admin',
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ENABLE RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES (AUTHENTICATED / PERMISSIVE READ-WRITE FOR ADMINS)
DROP POLICY IF EXISTS "Allow read expense_categories" ON public.expense_categories;
CREATE POLICY "Allow read expense_categories" ON public.expense_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write expense_categories" ON public.expense_categories;
CREATE POLICY "Allow write expense_categories" ON public.expense_categories FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow read expenses" ON public.expenses;
CREATE POLICY "Allow read expenses" ON public.expenses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write expenses" ON public.expenses;
CREATE POLICY "Allow write expenses" ON public.expenses FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow read expense_audit_logs" ON public.expense_audit_logs;
CREATE POLICY "Allow read expense_audit_logs" ON public.expense_audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write expense_audit_logs" ON public.expense_audit_logs;
CREATE POLICY "Allow write expense_audit_logs" ON public.expense_audit_logs FOR ALL USING (true);

-- 6. SEED DEFAULT EXPENSE CATEGORIES IF NOT EXISTS
INSERT INTO public.expense_categories (name, description, is_active)
VALUES
    ('Electricity', 'Utility bills for Mosque, Madrasa, and campus electricity', true),
    ('Water', 'Water supply, tanker, and filtration maintenance', true),
    ('Maintenance', 'General plumbing, electrical, carpentry and structural maintenance', true),
    ('Construction', 'New infrastructure, renovation and expansion projects', true),
    ('Cleaning', 'Sanitation, waste disposal and cleaning supplies', true),
    ('Staff Salary', 'Monthly salary for office and maintenance staff', true),
    ('Imam Salary', 'Salary and allowances for Imam and Muazzin', true),
    ('Madrasa', 'Madrasa teaching materials, salaries and educational expenses', true),
    ('Mosque', 'Regular Mosque operations and daily necessities', true),
    ('Office', 'Office stationery, software, phone and administration', true),
    ('Events / Programmes', 'Religious gatherings, lectures, Iftar and special functions', true),
    ('Food', 'Catering and food arrangements for programmes and guests', true),
    ('Transportation', 'Vehicle fuel, travel and local transport allowances', true),
    ('Stationery', 'Printing, registers, paper and office supplies', true),
    ('Equipment', 'Audio systems, carpets, air conditioning and hardware', true),
    ('Rent', 'Property or equipment rental expenses', true),
    ('Internet / Phone', 'Broadband internet connections and telephone bills', true),
    ('Charity / Welfare', 'Financial assistance to needy, medical aid and relief', true),
    ('Bank Charges', 'Bank service fees, chequebook and transaction charges', true),
    ('Other', 'Miscellaneous and unclassified expenses', true)
ON CONFLICT (name) DO NOTHING;
