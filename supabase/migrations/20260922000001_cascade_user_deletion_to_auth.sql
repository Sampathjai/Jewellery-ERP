-- ============================================================================
-- SHANKAR JEWELLERY ERP - CASCADE USER DELETION & SESSION REVOCATION
-- Migration: 20260922000001_cascade_user_deletion_to_auth.sql
-- ============================================================================

-- 1. Ensure deleted_at and status columns exist on profiles table for soft-delete & tracking
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Trigger Function: Automatically cleanup auth.users whenever public.profiles is deleted
CREATE OR REPLACE FUNCTION public.on_profile_deleted_cleanup_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- If user_id is set, delete from auth.users (cascades to auth.sessions, auth.refresh_tokens, auth.identities)
  IF OLD.user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = OLD.user_id;
  END IF;

  -- Also check if OLD.id was an auth user id
  DELETE FROM auth.users WHERE id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.on_profile_deleted_cleanup_auth();

-- 3. Dedicated Admin RPC Function: Delete User Permanently Across Auth & Profiles
CREATE OR REPLACE FUNCTION public.delete_user_permanently(target_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_user_id UUID;
  v_target_email TEXT;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Administrative privileges required to delete accounts';
  END IF;

  -- Find target profile and its associated auth user_id
  SELECT user_id, email INTO v_auth_user_id, v_target_email
  FROM public.profiles
  WHERE id = target_id OR user_id = target_id
  LIMIT 1;

  -- Protect the primary owner/admin account from deletion
  IF v_target_email ILIKE '%owner%' OR v_target_email = 'sampath@shankarjewellery.com' THEN
    RAISE EXCEPTION 'Forbidden: Primary store administrator account cannot be deleted';
  END IF;

  -- Delete from public.profiles
  DELETE FROM public.profiles
  WHERE id = target_id OR user_id = target_id OR (v_auth_user_id IS NOT NULL AND user_id = v_auth_user_id);

  -- Delete from auth.users (this automatically purges sessions, tokens, and identities in auth schema)
  IF v_auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_user_id;
  END IF;

  -- Also delete if target_id itself was an auth user id
  DELETE FROM auth.users WHERE id = target_id;

  RETURN jsonb_build_object('success', true, 'deleted_id', target_id);
END;
$$;

-- 4. Dedicated Admin RPC Function: Deactivate User & Revoke All Active Sessions
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

GRANT EXECUTE ON FUNCTION public.delete_user_permanently(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user_sessions(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

