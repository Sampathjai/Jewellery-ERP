-- ==============================================================================
-- SHANKAR JEWELLERY ERP - CLOUD SYNCHRONIZATION MASTER MIGRATION
-- Project Supabase URL: https://czrqgnoqdbzdlarslqlk.supabase.co
-- Run this script in: https://supabase.com/dashboard/project/czrqgnoqdbzdlarslqlk/sql
-- ==============================================================================

-- 1. Create estimations table
CREATE TABLE IF NOT EXISTS public.estimations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimation_number TEXT NOT NULL UNIQUE,
    version INT NOT NULL DEFAULT 1,
    parent_estimation_id UUID REFERENCES public.estimations(id) ON DELETE SET NULL,
    root_estimation_id UUID REFERENCES public.estimations(id) ON DELETE SET NULL,
    estimation_type TEXT NOT NULL DEFAULT 'reference_design', -- 'inventory_product' | 'custom_jewellery' | 'reference_design'
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

-- 2. Create estimation items table
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

-- 3. Create estimation reference images table
CREATE TABLE IF NOT EXISTS public.estimation_reference_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimation_id UUID REFERENCES public.estimations(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    storage_path TEXT,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INT NOT NULL DEFAULT 0,
    label TEXT DEFAULT 'Front View',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create custom orders table
CREATE TABLE IF NOT EXISTS public.custom_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    estimation_id UUID REFERENCES public.estimations(id) ON DELETE SET NULL,
    estimation_number TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status TEXT NOT NULL DEFAULT 'design_confirmed',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    reference_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    advance_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
    balance_due NUMERIC(14,2) NOT NULL DEFAULT 0,
    converted_invoice_id UUID,
    actual_gross_weight_g NUMERIC(10,3),
    actual_stone_weight_g NUMERIC(10,3),
    actual_net_weight_g NUMERIC(10,3),
    actual_metal_rate NUMERIC(12,2),
    actual_making_charges NUMERIC(14,2),
    actual_wastage_value NUMERIC(14,2),
    actual_stone_charges NUMERIC(14,2),
    actual_other_charges NUMERIC(14,2),
    final_invoice_amount NUMERIC(14,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create trusted_devices table (for Touch ID / Biometrics & PIN)
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

-- 6. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_estimations_customer_id ON public.estimations(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimations_status ON public.estimations(status);
CREATE INDEX IF NOT EXISTS idx_estimations_type ON public.estimations(estimation_type);
CREATE INDEX IF NOT EXISTS idx_estimations_root_id ON public.estimations(root_estimation_id);
CREATE INDEX IF NOT EXISTS idx_estimation_images_est_id ON public.estimation_reference_images(estimation_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_est_id ON public.custom_orders(estimation_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_customer_id ON public.custom_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_status ON public.custom_orders(status);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_cred_id ON public.trusted_devices(credential_id);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.estimations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimation_reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- 8. Idempotent RLS Policies
DROP POLICY IF EXISTS "estimations_policy" ON public.estimations;
CREATE POLICY "estimations_policy" ON public.estimations
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "estimation_items_policy" ON public.estimation_items;
CREATE POLICY "estimation_items_policy" ON public.estimation_items
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "estimation_images_policy" ON public.estimation_reference_images;
CREATE POLICY "estimation_images_policy" ON public.estimation_reference_images
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "custom_orders_policy" ON public.custom_orders;
CREATE POLICY "custom_orders_policy" ON public.custom_orders
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "trusted_devices_policy" ON public.trusted_devices;
CREATE POLICY "trusted_devices_policy" ON public.trusted_devices
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- 9. Permissions Grants
GRANT ALL ON public.estimations TO anon, authenticated, service_role;
GRANT ALL ON public.estimation_items TO anon, authenticated, service_role;
GRANT ALL ON public.estimation_reference_images TO anon, authenticated, service_role;
GRANT ALL ON public.custom_orders TO anon, authenticated, service_role;
GRANT ALL ON public.trusted_devices TO anon, authenticated, service_role;

-- 10. Enable Supabase Realtime Publication
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE estimations, custom_orders;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 11. Storage Bucket & Policies for Customer Reference Photos
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('estimation-designs', 'estimation-designs', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "estimation_designs_public_read" ON storage.objects;
    CREATE POLICY "estimation_designs_public_read" ON storage.objects
        FOR SELECT TO public USING (bucket_id = 'estimation-designs');

    DROP POLICY IF EXISTS "estimation_designs_public_insert" ON storage.objects;
    CREATE POLICY "estimation_designs_public_insert" ON storage.objects
        FOR INSERT TO public WITH CHECK (bucket_id = 'estimation-designs');

    DROP POLICY IF EXISTS "estimation_designs_public_update" ON storage.objects;
    CREATE POLICY "estimation_designs_public_update" ON storage.objects
        FOR UPDATE TO public USING (bucket_id = 'estimation-designs');

    DROP POLICY IF EXISTS "estimation_designs_public_delete" ON storage.objects;
    CREATE POLICY "estimation_designs_public_delete" ON storage.objects
        FOR DELETE TO public USING (bucket_id = 'estimation-designs');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
