-- ============================================================================
-- Migration 0004: Fix Products Actual Touch and Metal Purity Enum Alignment
-- ============================================================================

-- 1. Ensure actual_touch column exists on products table as NUMERIC(5,2)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS actual_touch NUMERIC(5,2) DEFAULT 37.00;

-- 2. Safely update any legacy products table rows where purity string might contain pseudo values
DO $$
BEGIN
    -- Update actual_touch if purity was stored as pseudo string in legacy data
    UPDATE public.products 
    SET actual_touch = 37.00 
    WHERE purity::text = '37_touch' AND (actual_touch IS NULL OR actual_touch = 0);

    UPDATE public.products 
    SET actual_touch = 40.00 
    WHERE purity::text = '40_touch' AND (actual_touch IS NULL OR actual_touch = 0);

    UPDATE public.products 
    SET actual_touch = 70.00 
    WHERE purity::text = '70_touch' AND (actual_touch IS NULL OR actual_touch = 0);

    -- Normalize purity to valid enum 'other' for custom touch values
    UPDATE public.products
    SET purity = 'other'::metal_purity
    WHERE purity::text IN ('37_touch', '40_touch', '70_touch');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';
