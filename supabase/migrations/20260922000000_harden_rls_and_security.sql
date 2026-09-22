-- ============================================================================
-- SHANKAR JEWELLERY ERP - PRODUCTION ROW LEVEL SECURITY (RLS) HARDENING
-- Migration: 20260922000000_harden_rls_and_security.sql
-- Closes public anon exposure, enforces authenticated access, and RBAC
-- ============================================================================

-- 1. Helper Function: Check if current authenticated user has Admin / Owner privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (user_id = auth.uid() OR id = auth.uid())
      AND role IN ('admin', 'super_admin', 'owner')
      AND is_active = true
  );
$$;

-- 2. Drop all insecure "Allow_public_*" wildcard policies
DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'profiles', 'business_settings', 'metal_rates', 'customers', 'suppliers',
        'product_categories', 'products', 'product_photos', 'inventory_movements',
        'manufacturing_jobs', 'retail_invoices', 'retail_invoice_items', 'retail_payments',
        'retail_returns', 'wholesale_issues', 'wholesale_issue_items', 'wholesale_sales',
        'wholesale_returns', 'wholesale_settlements', 'wholesale_payments', 'purchases',
        'purchase_payments', 'expenses', 'notifications', 'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow_public_select_%I" ON %I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow_public_insert_%I" ON %I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow_public_update_%I" ON %I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow_public_delete_%I" ON %I', tbl, tbl);
    END LOOP;
END $$;

-- 3. Enable RLS on all core tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.metal_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.manufacturing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.retail_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.retail_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.retail_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.retail_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wholesale_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wholesale_issue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wholesale_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wholesale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wholesale_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wholesale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. HARDENED ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- BUSINESS SETTINGS: Public read for store name/branding; Admin only for update
CREATE POLICY "settings_select_policy" ON public.business_settings
    FOR SELECT USING (true);

CREATE POLICY "settings_modify_policy" ON public.business_settings
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- METAL RATES: Public read for live rate display; Authenticated staff for insert/update
CREATE POLICY "metal_rates_select_policy" ON public.metal_rates
    FOR SELECT USING (true);

CREATE POLICY "metal_rates_modify_policy" ON public.metal_rates
    FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- PRODUCT CATEGORIES: Public read; Authenticated staff for management
CREATE POLICY "categories_select_policy" ON public.product_categories
    FOR SELECT USING (true);

CREATE POLICY "categories_modify_policy" ON public.product_categories
    FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- PROFILES: Authenticated staff can view all active profiles; Users can update own; Admin can manage all
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR user_id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR user_id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_insert_delete_policy" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- AUDIT LOGS: Append-only for tracking; Admin read-only; Delete prohibited
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- SENSITIVE BUSINESS MODULES: Strictly Authenticated Users Only; Deletion Restricted to Admins
DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'customers', 'suppliers', 'products', 'product_photos', 'inventory_movements',
        'manufacturing_jobs', 'retail_invoices', 'retail_invoice_items', 'retail_payments',
        'retail_returns', 'wholesale_issues', 'wholesale_issue_items', 'wholesale_sales',
        'wholesale_returns', 'wholesale_settlements', 'wholesale_payments', 'purchases',
        'purchase_payments', 'expenses', 'notifications'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Select: Authenticated users only
        EXECUTE format('DROP POLICY IF EXISTS "%I_auth_select" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%I_auth_select" ON %I FOR SELECT TO authenticated USING (true)', tbl, tbl);

        -- Insert: Authenticated users only
        EXECUTE format('DROP POLICY IF EXISTS "%I_auth_insert" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%I_auth_insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)', tbl, tbl);

        -- Update: Authenticated users only
        EXECUTE format('DROP POLICY IF EXISTS "%I_auth_update" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%I_auth_update" ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);

        -- Delete: Admin only for critical financial and inventory protection
        EXECUTE format('DROP POLICY IF EXISTS "%I_admin_delete" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%I_admin_delete" ON %I FOR DELETE TO authenticated USING (public.is_admin())', tbl, tbl);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

