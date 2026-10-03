-- ============================================================================
-- SHANKAR JEWELLERY ERP - MIGRATION: FIX ALL FOREIGN KEY CONSTRAINTS & CASCADES
-- Migration: 20261003000002_fix_all_foreign_keys_and_clear_biometrics.sql
-- ============================================================================

DO $$
BEGIN
  -- audit_logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
    ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- notifications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- metal_rates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'metal_rates') THEN
    ALTER TABLE public.metal_rates DROP CONSTRAINT IF EXISTS metal_rates_created_by_fkey;
    ALTER TABLE public.metal_rates ADD CONSTRAINT metal_rates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- products
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_created_by_fkey;
    ALTER TABLE public.products ADD CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- stock_movements
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_movements') THEN
    ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_created_by_fkey;
    ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- job_cards
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_cards') THEN
    ALTER TABLE public.job_cards DROP CONSTRAINT IF EXISTS job_cards_created_by_fkey;
    ALTER TABLE public.job_cards ADD CONSTRAINT job_cards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- retail_invoices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_invoices') THEN
    ALTER TABLE public.retail_invoices DROP CONSTRAINT IF EXISTS retail_invoices_created_by_fkey;
    ALTER TABLE public.retail_invoices ADD CONSTRAINT retail_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- sales_returns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales_returns') THEN
    ALTER TABLE public.sales_returns DROP CONSTRAINT IF EXISTS sales_returns_created_by_fkey;
    ALTER TABLE public.sales_returns ADD CONSTRAINT sales_returns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- wholesale_issues
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wholesale_issues') THEN
    ALTER TABLE public.wholesale_issues DROP CONSTRAINT IF EXISTS wholesale_issues_created_by_fkey;
    ALTER TABLE public.wholesale_issues ADD CONSTRAINT wholesale_issues_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- wholesale_sales
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wholesale_sales') THEN
    ALTER TABLE public.wholesale_sales DROP CONSTRAINT IF EXISTS wholesale_sales_created_by_fkey;
    ALTER TABLE public.wholesale_sales ADD CONSTRAINT wholesale_sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- wholesale_returns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wholesale_returns') THEN
    ALTER TABLE public.wholesale_returns DROP CONSTRAINT IF EXISTS wholesale_returns_verified_by_fkey;
    ALTER TABLE public.wholesale_returns ADD CONSTRAINT wholesale_returns_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- wholesale_settlements
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wholesale_settlements') THEN
    ALTER TABLE public.wholesale_settlements DROP CONSTRAINT IF EXISTS wholesale_settlements_created_by_fkey;
    ALTER TABLE public.wholesale_settlements ADD CONSTRAINT wholesale_settlements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

    ALTER TABLE public.wholesale_settlements DROP CONSTRAINT IF EXISTS wholesale_settlements_approved_by_fkey;
    ALTER TABLE public.wholesale_settlements ADD CONSTRAINT wholesale_settlements_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- wholesale_payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wholesale_payments') THEN
    ALTER TABLE public.wholesale_payments DROP CONSTRAINT IF EXISTS wholesale_payments_created_by_fkey;
    ALTER TABLE public.wholesale_payments ADD CONSTRAINT wholesale_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- purchases
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchases') THEN
    ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_created_by_fkey;
    ALTER TABLE public.purchases ADD CONSTRAINT purchases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- expenses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_created_by_fkey;
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- user_roles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- trusted_devices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trusted_devices') THEN
    ALTER TABLE public.trusted_devices DROP CONSTRAINT IF EXISTS trusted_devices_user_id_fkey;
    ALTER TABLE public.trusted_devices ADD CONSTRAINT trusted_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- webauthn_credentials
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webauthn_credentials') THEN
    ALTER TABLE public.webauthn_credentials DROP CONSTRAINT IF EXISTS webauthn_credentials_user_id_fkey;
    ALTER TABLE public.webauthn_credentials ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  PERFORM pg_notify('pgrst', 'reload schema');
END $$;
