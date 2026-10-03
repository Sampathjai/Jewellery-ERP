-- ============================================================================
-- SHANKAR JEWELLERY ERP - ENHANCED USER PURGE & CASCADING DELETION
-- Migration: 20261003000001_enhance_delete_user_permanently.sql
-- ============================================================================

-- Update Trigger Function: Automatically cleanup auth.users & credentials on profile deletion
CREATE OR REPLACE FUNCTION public.on_profile_deleted_cleanup_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Remove passkeys, trusted devices, and roles
  DELETE FROM public.trusted_devices WHERE user_id = OLD.id OR (OLD.user_id IS NOT NULL AND user_id = OLD.user_id);
  DELETE FROM public.webauthn_credentials WHERE user_id = OLD.id OR (OLD.user_id IS NOT NULL AND user_id = OLD.user_id);
  DELETE FROM public.webauthn_challenges WHERE user_id = OLD.id OR (OLD.user_id IS NOT NULL AND user_id = OLD.user_id);
  DELETE FROM public.user_roles WHERE user_id = OLD.id OR (OLD.user_id IS NOT NULL AND user_id = OLD.user_id);

  -- 2. Nullify references in audit logs & notifications
  UPDATE public.audit_logs SET user_id = NULL WHERE user_id = OLD.id OR (OLD.user_id IS NOT NULL AND user_id = OLD.user_id);
  DELETE FROM public.notifications WHERE user_id = OLD.id OR (OLD.user_id IS NOT NULL AND user_id = OLD.user_id);

  -- 3. Delete from auth.users (cascades to auth.sessions, auth.refresh_tokens, auth.identities)
  IF OLD.user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = OLD.user_id;
  END IF;

  DELETE FROM auth.users WHERE id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.on_profile_deleted_cleanup_auth();

-- Dedicated Admin RPC Function: Delete User Permanently Across Auth, Profiles, and Tables
CREATE OR REPLACE FUNCTION public.delete_user_permanently(target_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_user_id UUID;
  v_target_email TEXT;
  v_profile_ids UUID[];
  v_auth_ids UUID[];
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

  SELECT COALESCE(ARRAY_AGG(DISTINCT id), ARRAY[]::UUID[]) INTO v_profile_ids
  FROM public.profiles
  WHERE id = target_id OR user_id = target_id OR (v_target_email IS NOT NULL AND LOWER(email) = LOWER(v_target_email));

  SELECT COALESCE(ARRAY_AGG(DISTINCT id), ARRAY[]::UUID[]) INTO v_auth_ids
  FROM auth.users
  WHERE id = target_id OR id = v_auth_user_id OR (v_target_email IS NOT NULL AND LOWER(email) = LOWER(v_target_email));

  -- Disassociate FK references on company data so foreign keys don't block deletion
  UPDATE public.audit_logs SET user_id = NULL WHERE user_id = target_id OR user_id = ANY(v_profile_ids) OR user_id = ANY(v_auth_ids);
  DELETE FROM public.notifications WHERE user_id = target_id OR user_id = ANY(v_profile_ids) OR user_id = ANY(v_auth_ids);
  UPDATE public.metal_rates SET created_by = NULL WHERE created_by = target_id OR created_by = ANY(v_profile_ids) OR created_by = ANY(v_auth_ids);
  UPDATE public.products SET created_by = NULL WHERE created_by = target_id OR created_by = ANY(v_profile_ids) OR created_by = ANY(v_auth_ids);
  UPDATE public.stock_movements SET created_by = NULL WHERE created_by = target_id OR created_by = ANY(v_profile_ids) OR created_by = ANY(v_auth_ids);
  UPDATE public.job_cards SET created_by = NULL WHERE created_by = target_id OR created_by = ANY(v_profile_ids) OR created_by = ANY(v_auth_ids);
  UPDATE public.retail_invoices SET created_by = NULL WHERE created_by = target_id OR created_by = ANY(v_profile_ids) OR created_by = ANY(v_auth_ids);
  UPDATE public.sales_returns SET created_by = NULL WHERE created_by = target_id OR created_by = ANY(v_profile_ids) OR created_by = ANY(v_auth_ids);
  UPDATE public.wholesale_issues SET created_by = NULL WHERE created_by = target_id OR created_by = ANY(v_profile_ids) OR created_by = ANY(v_auth_ids);
  UPDATE public.wholesale_sales SET created_by = NULL WHERE created_by = target_id OR created_by = ANY(v_profile_ids) OR created_by = ANY(v_auth_ids);
  UPDATE public.wholesale_returns SET verified_by = NULL WHERE verified_by = target_id OR verified_by = ANY(v_profile_ids) OR verified_by = ANY(v_auth_ids);
  UPDATE public.wholesale_settlements SET created_by = NULL WHERE created_by = target_id OR created_by = ANY(v_profile_ids) OR created_by = ANY(v_auth_ids);
  UPDATE public.wholesale_settlements SET approved_by = NULL WHERE approved_by = target_id OR approved_by = ANY(v_profile_ids) OR approved_by = ANY(v_auth_ids);
  UPDATE public.wholesale_payments SET created_by = NULL WHERE created_by = target_id OR created_by = ANY(v_profile_ids) OR created_by = ANY(v_auth_ids);
  UPDATE public.purchases SET created_by = NULL WHERE created_by = target_id OR created_by = ANY(v_profile_ids) OR created_by = ANY(v_auth_ids);
  UPDATE public.expenses SET created_by = NULL WHERE created_by = target_id OR created_by = ANY(v_profile_ids) OR created_by = ANY(v_auth_ids);

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimations') THEN
    EXECUTE 'UPDATE public.estimations SET created_by = NULL WHERE created_by = $1 OR created_by = ANY($2) OR created_by = ANY($3)'
    USING target_id, v_profile_ids, v_auth_ids;
  END IF;

  -- Delete credentials, roles, and passkeys
  DELETE FROM public.user_roles WHERE user_id = target_id OR user_id = ANY(v_profile_ids) OR user_id = ANY(v_auth_ids);
  DELETE FROM public.trusted_devices WHERE user_id = target_id OR user_id = ANY(v_profile_ids) OR user_id = ANY(v_auth_ids);
  DELETE FROM public.webauthn_credentials WHERE user_id = target_id OR user_id = ANY(v_profile_ids) OR user_id = ANY(v_auth_ids);
  DELETE FROM public.webauthn_challenges WHERE user_id = target_id OR user_id = ANY(v_profile_ids) OR user_id = ANY(v_auth_ids);

  -- Delete from public.profiles
  DELETE FROM public.profiles
  WHERE id = target_id OR user_id = target_id OR id = ANY(v_profile_ids) OR user_id = ANY(v_profile_ids);

  -- Purge sessions and auth user
  DELETE FROM auth.refresh_tokens WHERE session_id IN (
    SELECT id FROM auth.sessions WHERE user_id = target_id OR user_id = ANY(v_auth_ids)
  );
  DELETE FROM auth.sessions WHERE user_id = target_id OR user_id = ANY(v_auth_ids);
  DELETE FROM auth.identities WHERE user_id = target_id OR user_id = ANY(v_auth_ids);
  DELETE FROM auth.users WHERE id = target_id OR id = ANY(v_auth_ids) OR (v_target_email IS NOT NULL AND LOWER(email) = LOWER(v_target_email));

  RETURN jsonb_build_object('success', true, 'deleted_id', target_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_permanently(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
