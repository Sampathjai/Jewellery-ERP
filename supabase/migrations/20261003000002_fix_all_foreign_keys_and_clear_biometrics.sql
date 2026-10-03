-- ============================================================================
-- SHANKAR JEWELLERY ERP - MASTER FIX & BIOMETRIC RESET
-- Migration: 20261003000002_fix_all_foreign_keys_and_clear_biometrics.sql
-- ============================================================================

-- STEP 1: Ensure trusted_devices and webauthn tables exist
CREATE TABLE IF NOT EXISTS public.trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'other',
    credential_id TEXT,
    public_key TEXT,
    device_token_hash TEXT,
    pin_hash TEXT,
    biometric_type TEXT DEFAULT 'fingerprint',
    status TEXT NOT NULL DEFAULT 'active',
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    device_name TEXT NOT NULL,
    device_type TEXT DEFAULT 'platform',
    aaguid TEXT,
    transports JSONB DEFAULT '[]'::jsonb,
    is_backup_eligible BOOLEAN DEFAULT true,
    is_backed_up BOOLEAN DEFAULT false,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    challenge TEXT NOT NULL UNIQUE,
    purpose TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and permissions
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trusted_devices_policy" ON public.trusted_devices;
CREATE POLICY "trusted_devices_policy" ON public.trusted_devices FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "trusted_devices_anon_read" ON public.trusted_devices;
CREATE POLICY "trusted_devices_anon_read" ON public.trusted_devices FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "webauthn_credentials_policy" ON public.webauthn_credentials;
CREATE POLICY "webauthn_credentials_policy" ON public.webauthn_credentials FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "webauthn_anon_read" ON public.webauthn_credentials;
CREATE POLICY "webauthn_anon_read" ON public.webauthn_credentials FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "webauthn_challenges_policy" ON public.webauthn_challenges;
CREATE POLICY "webauthn_challenges_policy" ON public.webauthn_challenges FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON public.trusted_devices TO anon, authenticated, service_role;
GRANT ALL ON public.webauthn_credentials TO anon, authenticated, service_role;
GRANT ALL ON public.webauthn_challenges TO anon, authenticated, service_role;

-- STEP 2: Fix foreign key constraints on audit_logs & transactional tables
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.metal_rates DROP CONSTRAINT IF EXISTS metal_rates_created_by_fkey;
ALTER TABLE public.metal_rates ADD CONSTRAINT metal_rates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_created_by_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.retail_invoices DROP CONSTRAINT IF EXISTS retail_invoices_created_by_fkey;
ALTER TABLE public.retail_invoices ADD CONSTRAINT retail_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- STEP 3: Clear all biometric data across all devices
DELETE FROM public.trusted_devices;
DELETE FROM public.webauthn_credentials;
DELETE FROM public.webauthn_challenges;
DELETE FROM public.metal_rates WHERE rate_date = '1970-01-02' OR id = '00000000-0000-0000-0000-000000000088';

NOTIFY pgrst, 'reload schema';
