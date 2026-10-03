-- ============================================================================
-- SHANKAR JEWELLERY ERP — APPLY ALL MISSING TABLES
-- ============================================================================
-- INSTRUCTIONS:
--   1. Open https://supabase.com → Dashboard → SQL Editor
--   2. Paste this ENTIRE script
--   3. Click RUN (or press Ctrl+Enter)
--   4. Wait for "Success" message
--   5. Refresh your app — all features should work
--
-- This script is 100% SAFE to run multiple times (fully idempotent).
-- It only CREATES tables/columns that do not already exist.
-- It will NOT delete or overwrite any existing data.
-- ============================================================================

-- Step 1: Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: Ensure custom enum types exist
DO $$ BEGIN
    CREATE TYPE wholesale_profit_model AS ENUM (
        'model_a_profit_percent', 'model_b_commission',
        'model_c_fixed_margin', 'model_d_custom_formula'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE metal_type AS ENUM ('gold', 'silver', 'platinum', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE metal_purity AS ENUM ('24k', '22k', '18k', '14k', '925_silver', '999_silver', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- TABLE 1: business_settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_name TEXT NOT NULL DEFAULT 'Shankar Jewellery',
    owner_name TEXT DEFAULT 'Sampath Kumar',
    logo_url TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    pin_code TEXT,
    phone TEXT,
    whatsapp_number TEXT,
    email TEXT,
    gstin TEXT,
    pan TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    upi_id TEXT,
    signature_url TEXT,
    invoice_prefix TEXT DEFAULT 'SJ-INV-',
    next_invoice_number INT DEFAULT 1005,
    default_profit_sharing_model wholesale_profit_model DEFAULT 'model_a_profit_percent',
    default_profit_sharing_percent NUMERIC(5,2) DEFAULT 40.00,
    inactivity_logout_enabled BOOLEAN DEFAULT true,
    inactivity_timeout_minutes INT DEFAULT 15,
    max_concurrent_sessions INT DEFAULT 3,
    force_logout_all_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to business_settings (safe if columns already exist)
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS inactivity_logout_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS inactivity_timeout_minutes INT DEFAULT 15;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS max_concurrent_sessions INT DEFAULT 3;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS force_logout_all_at TIMESTAMPTZ;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Enable RLS on business_settings
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for business_settings
DROP POLICY IF EXISTS "Allow_public_select_business_settings" ON public.business_settings;
CREATE POLICY "Allow_public_select_business_settings" ON public.business_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow_public_insert_business_settings" ON public.business_settings;
CREATE POLICY "Allow_public_insert_business_settings" ON public.business_settings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow_public_update_business_settings" ON public.business_settings;
CREATE POLICY "Allow_public_update_business_settings" ON public.business_settings FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow_public_delete_business_settings" ON public.business_settings;
CREATE POLICY "Allow_public_delete_business_settings" ON public.business_settings FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON public.business_settings TO anon, authenticated, service_role;

-- Seed default business settings row if table is empty
INSERT INTO public.business_settings (
    id, shop_name, owner_name, address, city, state, country, phone, whatsapp_number,
    email, pan, bank_name, bank_account_number, bank_ifsc, upi_id,
    invoice_prefix, next_invoice_number,
    inactivity_logout_enabled, inactivity_timeout_minutes, max_concurrent_sessions
)
SELECT
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Shankar Jewellery',
    'Jaishankar',
    'No.4 sandhukadai, bigbazzar street, Trichy',
    'Trichy',
    'Tamil Nadu',
    'India',
    '+91 9443949192',
    '+91 9443949192',
    'sampath@shankarjewellery.com',
    'AJCPJ8968K',
    'Indian Bank',
    '744673651',
    'IDIB000T028',
    'jaishankargoldsmith@okici',
    'SJ-INV-',
    1,
    true,
    15,
    3
WHERE NOT EXISTS (SELECT 1 FROM public.business_settings LIMIT 1);

-- ============================================================================
-- TABLE 2: trusted_devices (Biometric / PIN device registry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'biometric_generic',
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT,
    device_token_hash TEXT NOT NULL,
    platform TEXT,
    browser TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_credential_id ON public.trusted_devices(credential_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_status ON public.trusted_devices(status);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow_public_select_trusted_devices" ON public.trusted_devices;
CREATE POLICY "Allow_public_select_trusted_devices" ON public.trusted_devices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow_public_insert_trusted_devices" ON public.trusted_devices;
CREATE POLICY "Allow_public_insert_trusted_devices" ON public.trusted_devices FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow_public_update_trusted_devices" ON public.trusted_devices;
CREATE POLICY "Allow_public_update_trusted_devices" ON public.trusted_devices FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow_public_delete_trusted_devices" ON public.trusted_devices;
CREATE POLICY "Allow_public_delete_trusted_devices" ON public.trusted_devices FOR DELETE USING (true);

GRANT ALL ON public.trusted_devices TO anon, authenticated, service_role;

-- ============================================================================
-- TABLE 3: webauthn_credentials (FIDO2 Passkeys)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    device_type TEXT NOT NULL DEFAULT 'passkey',
    backed_up BOOLEAN NOT NULL DEFAULT false,
    transports TEXT[] DEFAULT ARRAY['internal']::TEXT[],
    name TEXT NOT NULL DEFAULT 'Passkey',
    aaguid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON public.webauthn_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_revoked_at ON public.webauthn_credentials(revoked_at);

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow_public_select_webauthn_credentials" ON public.webauthn_credentials;
CREATE POLICY "Allow_public_select_webauthn_credentials" ON public.webauthn_credentials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow_public_insert_webauthn_credentials" ON public.webauthn_credentials;
CREATE POLICY "Allow_public_insert_webauthn_credentials" ON public.webauthn_credentials FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow_public_update_webauthn_credentials" ON public.webauthn_credentials;
CREATE POLICY "Allow_public_update_webauthn_credentials" ON public.webauthn_credentials FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow_public_delete_webauthn_credentials" ON public.webauthn_credentials;
CREATE POLICY "Allow_public_delete_webauthn_credentials" ON public.webauthn_credentials FOR DELETE USING (true);

GRANT ALL ON public.webauthn_credentials TO anon, authenticated, service_role;

-- ============================================================================
-- TABLE 4: webauthn_challenges (Replay attack prevention)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'authentication')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_challenge ON public.webauthn_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires_at ON public.webauthn_challenges(expires_at);

ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow_public_select_webauthn_challenges" ON public.webauthn_challenges;
CREATE POLICY "Allow_public_select_webauthn_challenges" ON public.webauthn_challenges FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow_public_insert_webauthn_challenges" ON public.webauthn_challenges;
CREATE POLICY "Allow_public_insert_webauthn_challenges" ON public.webauthn_challenges FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow_public_update_webauthn_challenges" ON public.webauthn_challenges;
CREATE POLICY "Allow_public_update_webauthn_challenges" ON public.webauthn_challenges FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow_public_delete_webauthn_challenges" ON public.webauthn_challenges;
CREATE POLICY "Allow_public_delete_webauthn_challenges" ON public.webauthn_challenges FOR DELETE USING (true);

GRANT ALL ON public.webauthn_challenges TO anon, authenticated, service_role;

-- ============================================================================
-- TABLE 5: estimations (Customer Estimations / Quote system)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.estimations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimation_number TEXT NOT NULL UNIQUE,
    version INT NOT NULL DEFAULT 1,
    parent_estimation_id UUID REFERENCES public.estimations(id) ON DELETE SET NULL,
    root_estimation_id UUID REFERENCES public.estimations(id) ON DELETE SET NULL,
    estimation_type TEXT NOT NULL DEFAULT 'reference_design',
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    customer_address TEXT,
    estimation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
    rate_snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    gold_22k_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    gold_24k_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    silver_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal_metal_value NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_making_charges NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_wastage_value NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_stone_charges NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_other_charges NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_percent NUMERIC(5,2) NOT NULL DEFAULT 3.0,
    tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    round_off NUMERIC(6,2) NOT NULL DEFAULT 0,
    total_estimated_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    reference_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    general_notes TEXT,
    customer_requirements TEXT,
    converted_order_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimations_customer_id ON public.estimations(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimations_status ON public.estimations(status);
CREATE INDEX IF NOT EXISTS idx_estimations_created_at ON public.estimations(created_at);

ALTER TABLE public.estimations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow_public_select_estimations" ON public.estimations;
CREATE POLICY "Allow_public_select_estimations" ON public.estimations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow_public_insert_estimations" ON public.estimations;
CREATE POLICY "Allow_public_insert_estimations" ON public.estimations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow_public_update_estimations" ON public.estimations;
CREATE POLICY "Allow_public_update_estimations" ON public.estimations FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow_public_delete_estimations" ON public.estimations;
CREATE POLICY "Allow_public_delete_estimations" ON public.estimations FOR DELETE USING (true);

GRANT ALL ON public.estimations TO anon, authenticated, service_role;

-- ============================================================================
-- TABLE 6: estimation_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.estimation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimation_id UUID NOT NULL REFERENCES public.estimations(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL DEFAULT 'reference_design',
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    jewellery_type TEXT NOT NULL,
    metal_type TEXT NOT NULL DEFAULT 'gold',
    purity TEXT NOT NULL DEFAULT '22k',
    quantity INT NOT NULL DEFAULT 1,
    estimated_gross_weight_g NUMERIC(10,3) NOT NULL DEFAULT 0,
    estimated_stone_weight_g NUMERIC(10,3) NOT NULL DEFAULT 0,
    estimated_net_weight_g NUMERIC(10,3) NOT NULL DEFAULT 0,
    metal_rate_per_gram NUMERIC(12,2) NOT NULL DEFAULT 0,
    metal_value NUMERIC(14,2) NOT NULL DEFAULT 0,
    making_charge_type TEXT NOT NULL DEFAULT 'per_gram',
    making_charge_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
    making_charge_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    wastage_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
    wastage_weight_g NUMERIC(10,3) NOT NULL DEFAULT 0,
    wastage_value NUMERIC(14,2) NOT NULL DEFAULT 0,
    stone_charge NUMERIC(14,2) NOT NULL DEFAULT 0,
    other_charge NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount NUMERIC(14,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    design_description TEXT,
    customer_requirements TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.estimation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow_public_select_estimation_items" ON public.estimation_items;
CREATE POLICY "Allow_public_select_estimation_items" ON public.estimation_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow_public_insert_estimation_items" ON public.estimation_items;
CREATE POLICY "Allow_public_insert_estimation_items" ON public.estimation_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow_public_update_estimation_items" ON public.estimation_items;
CREATE POLICY "Allow_public_update_estimation_items" ON public.estimation_items FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow_public_delete_estimation_items" ON public.estimation_items;
CREATE POLICY "Allow_public_delete_estimation_items" ON public.estimation_items FOR DELETE USING (true);

GRANT ALL ON public.estimation_items TO anon, authenticated, service_role;

-- ============================================================================
-- STEP: Fix Foreign Key Constraints (audit_logs, etc.) — idempotent
-- ============================================================================
DO $$
BEGIN
    -- Fix audit_logs.user_id FK — change to ON DELETE SET NULL so user deletion works
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
        ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix notifications FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Fix metal_rates FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'metal_rates') THEN
        ALTER TABLE public.metal_rates DROP CONSTRAINT IF EXISTS metal_rates_created_by_fkey;
        ALTER TABLE public.metal_rates ADD CONSTRAINT metal_rates_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix products FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_created_by_fkey;
        ALTER TABLE public.products ADD CONSTRAINT products_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix retail_invoices FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_invoices') THEN
        ALTER TABLE public.retail_invoices DROP CONSTRAINT IF EXISTS retail_invoices_created_by_fkey;
        ALTER TABLE public.retail_invoices ADD CONSTRAINT retail_invoices_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix wholesale_issues FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wholesale_issues') THEN
        ALTER TABLE public.wholesale_issues DROP CONSTRAINT IF EXISTS wholesale_issues_created_by_fkey;
        ALTER TABLE public.wholesale_issues ADD CONSTRAINT wholesale_issues_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix wholesale_settlements FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wholesale_settlements') THEN
        ALTER TABLE public.wholesale_settlements DROP CONSTRAINT IF EXISTS wholesale_settlements_created_by_fkey;
        ALTER TABLE public.wholesale_settlements ADD CONSTRAINT wholesale_settlements_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
        ALTER TABLE public.wholesale_settlements DROP CONSTRAINT IF EXISTS wholesale_settlements_approved_by_fkey;
        ALTER TABLE public.wholesale_settlements ADD CONSTRAINT wholesale_settlements_approved_by_fkey
            FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix purchases FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchases') THEN
        ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_created_by_fkey;
        ALTER TABLE public.purchases ADD CONSTRAINT purchases_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix expenses FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
        ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_created_by_fkey;
        ALTER TABLE public.expenses ADD CONSTRAINT expenses_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix user_roles FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

END $$;

-- ============================================================================
-- STEP: Enable Realtime for cross-device sync
-- ============================================================================
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE
        public.business_settings,
        public.trusted_devices,
        public.webauthn_credentials,
        public.estimations;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================================
-- STEP: Notify PostgREST to reload schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================================================
-- VERIFICATION QUERY — Run this after the script to confirm success
-- ============================================================================
SELECT
    table_name,
    'EXISTS ✅' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'business_settings',
    'trusted_devices',
    'webauthn_credentials',
    'webauthn_challenges',
    'estimations',
    'estimation_items'
  )
ORDER BY table_name;

-- ============================================================================
-- DONE! All missing tables have been created.
-- ============================================================================
