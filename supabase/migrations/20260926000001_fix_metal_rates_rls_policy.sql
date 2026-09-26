-- ==============================================================================
-- Migration: 20260926000001_fix_metal_rates_rls_policy.sql
-- Description: Fix Row-Level Security (RLS) policy on metal_rates table and provide
--              a SECURITY DEFINER RPC function for seamless live and manual rate updates.
-- ==============================================================================

-- 1. Ensure metal_rates table exists with required structure
CREATE TABLE IF NOT EXISTS public.metal_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    gold_24k_per_gram NUMERIC(12,2) NOT NULL,
    gold_22k_per_gram NUMERIC(12,2) NOT NULL,
    gold_18k_per_gram NUMERIC(12,2) NOT NULL,
    silver_per_gram NUMERIC(12,2) NOT NULL,
    silver_per_kg NUMERIC(12,2) NOT NULL,
    source TEXT DEFAULT 'manual',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.metal_rates ENABLE ROW LEVEL SECURITY;

-- 3. Grant schema and table permissions to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.metal_rates TO anon, authenticated, service_role;

-- 4. Reconfigure RLS policies on metal_rates
-- Public read policy (allows all shop terminals and ticker to view latest rates)
DROP POLICY IF EXISTS "metal_rates_select_policy" ON public.metal_rates;
CREATE POLICY "metal_rates_select_policy" ON public.metal_rates
    FOR SELECT USING (true);

-- Permissive modify policy for metal rates:
-- Allows both authenticated staff and local biometric/PIN unlocked terminals (anon role)
-- to save live Chennai market rate fetches and shop manual overrides.
DROP POLICY IF EXISTS "metal_rates_modify_policy" ON public.metal_rates;
DROP POLICY IF EXISTS "Allow_public_metal_rates" ON public.metal_rates;

CREATE POLICY "metal_rates_modify_policy" ON public.metal_rates
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 5. Create a robust SECURITY DEFINER RPC function to save/upsert metal rates
CREATE OR REPLACE FUNCTION public.save_metal_rates(
    p_id UUID DEFAULT NULL,
    p_rate_date DATE DEFAULT CURRENT_DATE,
    p_gold_24k NUMERIC DEFAULT 0,
    p_gold_22k NUMERIC DEFAULT 0,
    p_gold_18k NUMERIC DEFAULT 0,
    p_silver_per_gram NUMERIC DEFAULT 0,
    p_silver_per_kg NUMERIC DEFAULT 0,
    p_source TEXT DEFAULT 'manual',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record RECORD;
BEGIN
    INSERT INTO public.metal_rates (
        id,
        rate_date,
        gold_24k_per_gram,
        gold_22k_per_gram,
        gold_18k_per_gram,
        silver_per_gram,
        silver_per_kg,
        source,
        notes,
        updated_at
    )
    VALUES (
        COALESCE(p_id, gen_random_uuid()),
        COALESCE(p_rate_date, CURRENT_DATE),
        COALESCE(p_gold_24k, 0),
        COALESCE(p_gold_22k, 0),
        COALESCE(p_gold_18k, 0),
        COALESCE(p_silver_per_gram, 0),
        COALESCE(p_silver_per_kg, 0),
        COALESCE(p_source, 'manual'),
        p_notes,
        NOW()
    )
    ON CONFLICT (rate_date) DO UPDATE SET
        gold_24k_per_gram = EXCLUDED.gold_24k_per_gram,
        gold_22k_per_gram = EXCLUDED.gold_22k_per_gram,
        gold_18k_per_gram = EXCLUDED.gold_18k_per_gram,
        silver_per_gram = EXCLUDED.silver_per_gram,
        silver_per_kg = EXCLUDED.silver_per_kg,
        source = EXCLUDED.source,
        notes = COALESCE(EXCLUDED.notes, metal_rates.notes),
        updated_at = NOW()
    RETURNING * INTO v_record;

    RETURN to_jsonb(v_record);
END;
$$;

-- 6. Grant execute on RPC function to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.save_metal_rates(
    UUID, DATE, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT
) TO anon, authenticated, service_role;
