-- ============================================================================
-- SHANKAR JEWELLERY ERP - PERMANENT USER PURGE SCRIPT
-- TARGET USER:
--   Full Name: Sumathy
--   User ID:   43e7026c-1a5f-46f9-9403-91ead6b41467
--   Email:     sumathy@shankarjewellery.com
--   Role:      admin
--   Branch:    Trichy - Sandhukadai
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Open the Supabase Dashboard SQL Editor:
--    https://supabase.com/dashboard/project/czrqgnoqdbzdlarslqlk/sql
-- 2. Paste this entire script into the SQL Editor and click "RUN".
-- 3. This permanently purges the user from:
--    - auth.users (Supabase Authentication)
--    - auth.sessions & auth.refresh_tokens (Active logins)
--    - auth.identities (Auth credentials)
--    - public.profiles (Application profile & user directory)
--    - public.trusted_devices (Device bindings & biometric tokens)
--    - public.webauthn_credentials (FIDO2 / Passkeys)
--    - public.webauthn_challenges (Pending challenges)
--    - public.user_roles (Role mapping)
--    and safely cleans up all foreign key references to preserve transaction integrity.
-- ============================================================================

DO $$
DECLARE
  v_target_id UUID := '43e7026c-1a5f-46f9-9403-91ead6b41467'::UUID;
  v_target_email TEXT := 'sumathy@shankarjewellery.com';
  v_auth_ids UUID[] := ARRAY[]::UUID[];
  v_profile_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- 1. Collect all matching profile and auth user UUIDs
  SELECT COALESCE(ARRAY_AGG(DISTINCT id), ARRAY[]::UUID[]) INTO v_profile_ids
  FROM public.profiles
  WHERE id = v_target_id 
     OR user_id = v_target_id 
     OR LOWER(email) = LOWER(v_target_email);

  SELECT COALESCE(ARRAY_AGG(DISTINCT id), ARRAY[]::UUID[]) INTO v_auth_ids
  FROM auth.users
  WHERE id = v_target_id 
     OR LOWER(email) = LOWER(v_target_email)
     OR id IN (SELECT user_id FROM public.profiles WHERE id = v_target_id OR LOWER(email) = LOWER(v_target_email));

  RAISE NOTICE 'Target profile IDs: %', v_profile_ids;
  RAISE NOTICE 'Target auth IDs: %', v_auth_ids;

  -- 2. Disassociate foreign key references in business/audit tables
  -- This preserves company records (invoices, products, rates) while removing user link
  
  -- Audit Logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    UPDATE public.audit_logs 
    SET user_id = NULL 
    WHERE user_id = v_target_id 
       OR user_id = ANY(v_profile_ids) 
       OR user_id = ANY(v_auth_ids);
  END IF;

  -- Notifications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    DELETE FROM public.notifications 
    WHERE user_id = v_target_id 
       OR user_id = ANY(v_profile_ids) 
       OR user_id = ANY(v_auth_ids);
  END IF;

  -- Metal Rates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'metal_rates') THEN
    UPDATE public.metal_rates 
    SET created_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids);
  END IF;

  -- Products
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    UPDATE public.products 
    SET created_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids);
  END IF;

  -- Stock Movements
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_movements') THEN
    UPDATE public.stock_movements 
    SET created_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids);
  END IF;

  -- Job Cards (Manufacturing)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_cards') THEN
    UPDATE public.job_cards 
    SET created_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids);
  END IF;

  -- Retail Invoices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_invoices') THEN
    UPDATE public.retail_invoices 
    SET created_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids);
  END IF;

  -- Sales Returns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales_returns') THEN
    UPDATE public.sales_returns 
    SET created_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids);
  END IF;

  -- Wholesale Issues
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wholesale_issues') THEN
    UPDATE public.wholesale_issues 
    SET created_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids);
  END IF;

  -- Wholesale Sales
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wholesale_sales') THEN
    UPDATE public.wholesale_sales 
    SET created_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids);
  END IF;

  -- Wholesale Returns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wholesale_returns') THEN
    UPDATE public.wholesale_returns 
    SET verified_by = NULL 
    WHERE verified_by = v_target_id 
       OR verified_by = ANY(v_profile_ids) 
       OR verified_by = ANY(v_auth_ids);
  END IF;

  -- Wholesale Settlements
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wholesale_settlements') THEN
    UPDATE public.wholesale_settlements 
    SET created_by = NULL, approved_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids)
       OR approved_by = v_target_id 
       OR approved_by = ANY(v_profile_ids) 
       OR approved_by = ANY(v_auth_ids);
  END IF;

  -- Wholesale Payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wholesale_payments') THEN
    UPDATE public.wholesale_payments 
    SET created_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids);
  END IF;

  -- Purchases
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchases') THEN
    UPDATE public.purchases 
    SET created_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids);
  END IF;

  -- Expenses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    UPDATE public.expenses 
    SET created_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids);
  END IF;

  -- Estimations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimations') THEN
    UPDATE public.estimations 
    SET created_by = NULL 
    WHERE created_by = v_target_id 
       OR created_by = ANY(v_profile_ids) 
       OR created_by = ANY(v_auth_ids);
  END IF;

  -- 3. Delete Security Credentials, Passkeys, Roles, and Devices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    DELETE FROM public.user_roles 
    WHERE user_id = v_target_id 
       OR user_id = ANY(v_profile_ids) 
       OR user_id = ANY(v_auth_ids);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trusted_devices') THEN
    DELETE FROM public.trusted_devices 
    WHERE user_id = v_target_id 
       OR user_id = ANY(v_profile_ids) 
       OR user_id = ANY(v_auth_ids);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webauthn_credentials') THEN
    DELETE FROM public.webauthn_credentials 
    WHERE user_id = v_target_id 
       OR user_id = ANY(v_profile_ids) 
       OR user_id = ANY(v_auth_ids);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webauthn_challenges') THEN
    DELETE FROM public.webauthn_challenges 
    WHERE user_id = v_target_id 
       OR user_id = ANY(v_profile_ids) 
       OR user_id = ANY(v_auth_ids);
  END IF;

  -- 4. Purge Profile from public.profiles
  DELETE FROM public.profiles 
  WHERE id = v_target_id 
     OR user_id = v_target_id 
     OR id = ANY(v_profile_ids)
     OR user_id = ANY(v_profile_ids)
     OR LOWER(email) = LOWER(v_target_email);

  -- 5. Purge Auth Sessions, Tokens, Identities & User from auth schema
  DELETE FROM auth.refresh_tokens 
  WHERE session_id IN (
    SELECT id FROM auth.sessions 
    WHERE user_id = v_target_id 
       OR user_id = ANY(v_profile_ids) 
       OR user_id = ANY(v_auth_ids)
  );

  DELETE FROM auth.sessions 
  WHERE user_id = v_target_id 
     OR user_id = ANY(v_profile_ids) 
     OR user_id = ANY(v_auth_ids);

  DELETE FROM auth.identities 
  WHERE user_id = v_target_id 
     OR user_id = ANY(v_profile_ids) 
     OR user_id = ANY(v_auth_ids);

  DELETE FROM auth.users 
  WHERE id = v_target_id 
     OR id = ANY(v_profile_ids) 
     OR id = ANY(v_auth_ids) 
     OR LOWER(email) = LOWER(v_target_email);

  -- Broadcast real-time change to all connected ERP clients
  PERFORM pg_notify('pgrst', 'reload schema');

  RAISE NOTICE 'SUCCESS: User Sumathy (43e7026c-1a5f-46f9-9403-91ead6b41467 / sumathy@shankarjewellery.com) has been completely and permanently deleted.';
END $$;
