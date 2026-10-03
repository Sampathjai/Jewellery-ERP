-- ============================================================================
-- SHANKAR JEWELLERY ERP - WEBAUTHN / FIDO2 PASSKEYS MIGRATION
-- Migration: 20261003000000_webauthn_fido2_passkeys.sql
-- ============================================================================

-- 1. Create webauthn_credentials Table
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    device_type TEXT NOT NULL DEFAULT 'passkey', -- 'single_device' | 'multi_device' | 'passkey'
    backed_up BOOLEAN NOT NULL DEFAULT false,
    transports TEXT[] DEFAULT ARRAY['internal']::TEXT[],
    name TEXT NOT NULL DEFAULT 'Passkey',
    aaguid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON public.webauthn_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_revoked_at ON public.webauthn_credentials(revoked_at);

-- 2. Create webauthn_challenges Table for Replay Attack Prevention
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

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies for webauthn_credentials
DROP POLICY IF EXISTS "webauthn_credentials_select_policy" ON public.webauthn_credentials;
CREATE POLICY "webauthn_credentials_select_policy" ON public.webauthn_credentials
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "webauthn_credentials_insert_policy" ON public.webauthn_credentials;
CREATE POLICY "webauthn_credentials_insert_policy" ON public.webauthn_credentials
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "webauthn_credentials_update_policy" ON public.webauthn_credentials;
CREATE POLICY "webauthn_credentials_update_policy" ON public.webauthn_credentials
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "webauthn_credentials_delete_policy" ON public.webauthn_credentials;
CREATE POLICY "webauthn_credentials_delete_policy" ON public.webauthn_credentials
    FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- Allow anon read/verify via secure RPC functions only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webauthn_credentials TO authenticated;
GRANT ALL ON public.webauthn_credentials TO service_role;
GRANT ALL ON public.webauthn_challenges TO service_role;

-- 4. Secure RPC Function: Store Single-Use WebAuthn Challenge
CREATE OR REPLACE FUNCTION public.store_webauthn_challenge(
    p_challenge TEXT,
    p_user_id UUID,
    p_purpose TEXT,
    p_expires_in_seconds INT DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Purge any expired challenges first
    DELETE FROM public.webauthn_challenges WHERE expires_at < NOW();

    INSERT INTO public.webauthn_challenges (
        challenge,
        user_id,
        purpose,
        expires_at
    ) VALUES (
        p_challenge,
        p_user_id,
        p_purpose,
        NOW() + (p_expires_in_seconds || ' seconds')::INTERVAL
    );

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Secure RPC Function: Consume Single-Use WebAuthn Challenge (Atomic One-Time Use)
CREATE OR REPLACE FUNCTION public.consume_webauthn_challenge(
    p_challenge TEXT,
    p_purpose TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT * INTO v_record
    FROM public.webauthn_challenges
    WHERE challenge = p_challenge
      AND purpose = p_purpose
      AND expires_at >= NOW()
    FOR UPDATE;

    IF v_record.id IS NULL THEN
        -- Check if it was expired
        DELETE FROM public.webauthn_challenges WHERE challenge = p_challenge;
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Authentication challenge is invalid, expired, or already used.'
        );
    END IF;

    -- Invalidate immediately (single-use anti-replay defense)
    DELETE FROM public.webauthn_challenges WHERE id = v_record.id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_record.user_id
    );
END;
$$;

-- 6. Secure RPC Function: Register WebAuthn Credential
CREATE OR REPLACE FUNCTION public.register_webauthn_credential(
    p_user_id UUID,
    p_credential_id TEXT,
    p_public_key TEXT,
    p_counter BIGINT,
    p_device_type TEXT,
    p_backed_up BOOLEAN,
    p_transports TEXT[],
    p_name TEXT,
    p_aaguid TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_new_id UUID;
BEGIN
    -- Check if credential already exists and active
    IF EXISTS (
        SELECT 1 FROM public.webauthn_credentials
        WHERE credential_id = p_credential_id
          AND revoked_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This passkey credential is already registered.'
        );
    END IF;

    INSERT INTO public.webauthn_credentials (
        user_id,
        credential_id,
        public_key,
        counter,
        device_type,
        backed_up,
        transports,
        name,
        aaguid,
        created_at,
        last_used_at
    ) VALUES (
        p_user_id,
        p_credential_id,
        p_public_key,
        p_counter,
        COALESCE(p_device_type, 'passkey'),
        COALESCE(p_backed_up, false),
        COALESCE(p_transports, ARRAY['internal']::TEXT[]),
        COALESCE(p_name, 'Passkey'),
        p_aaguid,
        NOW(),
        NOW()
    )
    ON CONFLICT (credential_id) DO UPDATE SET
        public_key = EXCLUDED.public_key,
        counter = EXCLUDED.counter,
        device_type = EXCLUDED.device_type,
        backed_up = EXCLUDED.backed_up,
        transports = EXCLUDED.transports,
        name = EXCLUDED.name,
        aaguid = EXCLUDED.aaguid,
        revoked_at = NULL,
        last_used_at = NOW()
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_new_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7. Secure RPC Function: Authenticate WebAuthn Credential
CREATE OR REPLACE FUNCTION public.authenticate_webauthn_credential(
    p_credential_id TEXT,
    p_new_counter BIGINT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_cred RECORD;
    v_profile RECORD;
BEGIN
    -- Find active credential
    SELECT * INTO v_cred
    FROM public.webauthn_credentials
    WHERE credential_id = p_credential_id
      AND revoked_at IS NULL
    LIMIT 1;

    IF v_cred.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Passkey credential not recognized or has been revoked.'
        );
    END IF;

    -- Lookup user profile
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_cred.user_id
    LIMIT 1;

    IF v_profile.id IS NULL OR v_profile.deleted_at IS NOT NULL OR v_profile.status = 'deleted' THEN
        -- Auto-revoke credential if user account was deleted
        UPDATE public.webauthn_credentials
        SET revoked_at = NOW()
        WHERE id = v_cred.id;

        RETURN jsonb_build_object(
            'success', false,
            'message', 'User account associated with this passkey has been deactivated or deleted.'
        );
    END IF;

    IF v_profile.is_active = false OR v_profile.status = 'disabled' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User account is inactive. Please contact the administrator.'
        );
    END IF;

    -- Update credential counter and last_used_at
    UPDATE public.webauthn_credentials
    SET counter = GREATEST(counter, p_new_counter),
        last_used_at = NOW()
    WHERE id = v_cred.id;

    RETURN jsonb_build_object(
        'success', true,
        'user_profile', jsonb_build_object(
            'id', v_profile.id,
            'user_id', COALESCE(v_profile.user_id, v_profile.id),
            'full_name', v_profile.full_name,
            'email', v_profile.email,
            'phone', v_profile.phone,
            'role', v_profile.role,
            'branch', v_profile.branch,
            'avatar_url', v_profile.avatar_url,
            'is_active', true,
            'last_login_at', NOW()
        )
    );
END;
$$;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.store_webauthn_challenge(TEXT, UUID, TEXT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_webauthn_challenge(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_webauthn_credential(UUID, TEXT, TEXT, BIGINT, TEXT, BOOLEAN, TEXT[], TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.authenticate_webauthn_credential(TEXT, BIGINT) TO anon, authenticated, service_role;
