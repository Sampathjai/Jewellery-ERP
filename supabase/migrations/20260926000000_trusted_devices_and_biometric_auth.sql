-- ============================================================================
-- SHANKAR JEWELLERY ERP - TRUSTED DEVICES & BIOMETRIC/PIN AUTHENTICATION
-- Migration: 20260926000000_trusted_devices_and_biometric_auth.sql
-- ============================================================================

-- 1. Create trusted_devices Table
CREATE TABLE IF NOT EXISTS public.trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'biometric_generic', -- 'touch_id', 'face_id', 'windows_hello', 'fingerprint', 'tauri_desktop', 'biometric_generic'
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

-- Index for high performance credential lookups
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_credential_id ON public.trusted_devices(credential_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_status ON public.trusted_devices(status);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- 3. Idempotent RLS Policies
DROP POLICY IF EXISTS "trusted_devices_select_policy" ON public.trusted_devices;
CREATE POLICY "trusted_devices_select_policy" ON public.trusted_devices
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "trusted_devices_insert_policy" ON public.trusted_devices;
CREATE POLICY "trusted_devices_insert_policy" ON public.trusted_devices
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "trusted_devices_update_policy" ON public.trusted_devices;
CREATE POLICY "trusted_devices_update_policy" ON public.trusted_devices
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "trusted_devices_delete_policy" ON public.trusted_devices;
CREATE POLICY "trusted_devices_delete_policy" ON public.trusted_devices
    FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- Allow anonymous unlock verification via secure RPC only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_devices TO authenticated;
GRANT ALL ON public.trusted_devices TO service_role;

-- 4. Secure RPC Function: Verify Device Credential & Return Authenticated User Profile
CREATE OR REPLACE FUNCTION public.verify_device_unlock_and_authenticate(
    p_credential_id TEXT,
    p_device_token_hash TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_device RECORD;
    v_profile RECORD;
BEGIN
    -- 1. Find the active trusted device matching credential_id and token hash
    SELECT * INTO v_device
    FROM public.trusted_devices
    WHERE credential_id = p_credential_id
      AND device_token_hash = p_device_token_hash
      AND status = 'active'
      AND revoked_at IS NULL
    LIMIT 1;

    IF v_device.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Device credential is invalid or has been revoked.'
        );
    END IF;

    -- 2. Lookup user profile and verify active status (Defense-in-depth)
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_device.user_id
    LIMIT 1;

    IF v_profile.id IS NULL OR v_profile.deleted_at IS NOT NULL OR v_profile.status = 'deleted' THEN
        -- Auto-revoke device if user is deleted
        UPDATE public.trusted_devices
        SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
        WHERE id = v_device.id;

        RETURN jsonb_build_object(
            'success', false,
            'message', 'User account does not exist or has been removed.'
        );
    END IF;

    IF v_profile.is_active = false OR v_profile.status = 'disabled' THEN
        -- Auto-revoke device if user is disabled
        UPDATE public.trusted_devices
        SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
        WHERE id = v_device.id;

        RETURN jsonb_build_object(
            'success', false,
            'message', 'User account is disabled. Please contact your administrator.'
        );
    END IF;

    -- 3. Touch device last_used_at timestamp
    UPDATE public.trusted_devices
    SET last_used_at = NOW(), updated_at = NOW()
    WHERE id = v_device.id;

    -- 4. Return user profile payload
    RETURN jsonb_build_object(
        'success', true,
        'device_id', v_device.id,
        'device_name', v_device.device_name,
        'user_profile', jsonb_build_object(
            'id', v_profile.id,
            'user_id', v_profile.user_id,
            'email', v_profile.email,
            'full_name', v_profile.full_name,
            'role', v_profile.role,
            'phone', v_profile.phone,
            'is_active', v_profile.is_active,
            'avatar_url', v_profile.avatar_url,
            'last_login_at', NOW()
        )
    );
END;
$$;

-- 5. RPC Function: Revoke a single trusted device
CREATE OR REPLACE FUNCTION public.revoke_trusted_device(
    p_device_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_device RECORD;
BEGIN
    SELECT * INTO v_device FROM public.trusted_devices WHERE id = p_device_id;
    IF v_device.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Device not found.');
    END IF;

    -- Verify authorization: Caller must be the device owner or an administrator
    IF v_device.user_id != auth.uid() AND NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized to revoke this device.');
    END IF;

    UPDATE public.trusted_devices
    SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
    WHERE id = p_device_id;

    RETURN jsonb_build_object('success', true, 'revoked_id', p_device_id);
END;
$$;

-- 6. RPC Function: Revoke all trusted devices for a user
CREATE OR REPLACE FUNCTION public.revoke_all_trusted_devices_for_user(
    p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Verify authorization: Caller must be the target user or an administrator
    IF p_user_id != auth.uid() AND NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized to revoke devices.');
    END IF;

    UPDATE public.trusted_devices
    SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
    WHERE user_id = p_user_id AND status = 'active';

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$$;

-- 7. Update Session Deactivation RPC to also Revoke Trusted Devices
CREATE OR REPLACE FUNCTION public.deactivate_user_sessions(target_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Administrative privileges required to deactivate accounts';
  END IF;

  -- Find auth user_id
  SELECT user_id INTO v_auth_user_id
  FROM public.profiles
  WHERE id = target_id OR user_id = target_id
  LIMIT 1;

  -- Mark profile inactive in public.profiles
  UPDATE public.profiles
  SET is_active = false, status = 'disabled', updated_at = NOW()
  WHERE id = target_id OR user_id = target_id;

  -- Revoke all active trusted devices for this user
  UPDATE public.trusted_devices
  SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
  WHERE user_id = target_id OR (v_auth_user_id IS NOT NULL AND user_id = v_auth_user_id);

  -- Purge all active browser sessions & refresh tokens in auth schema
  IF v_auth_user_id IS NOT NULL THEN
    DELETE FROM auth.sessions WHERE user_id = v_auth_user_id;
    DELETE FROM auth.refresh_tokens WHERE session_id IN (
      SELECT id FROM auth.sessions WHERE user_id = v_auth_user_id
    );
  END IF;

  DELETE FROM auth.sessions WHERE user_id = target_id;

  RETURN jsonb_build_object('success', true, 'deactivated_id', target_id);
END;
$$;

-- 8. Update Cascade Trigger for Permanent User Deletion to Clean Up Trusted Devices
CREATE OR REPLACE FUNCTION public.on_profile_deleted_cleanup_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Cleanup all trusted devices for this profile
  DELETE FROM public.trusted_devices WHERE user_id = OLD.id;

  -- If user_id is set, delete from auth.users (cascades to auth.sessions, auth.refresh_tokens, auth.identities)
  IF OLD.user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = OLD.user_id;
  END IF;

  -- Also check if OLD.id was an auth user id
  DELETE FROM auth.users WHERE id = OLD.id;

  RETURN OLD;
END;
$$;

-- Grant EXECUTE permissions
GRANT EXECUTE ON FUNCTION public.verify_device_unlock_and_authenticate(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_trusted_device(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_all_trusted_devices_for_user(UUID) TO authenticated;

-- Enable Supabase Realtime replication on trusted_devices
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE trusted_devices;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
