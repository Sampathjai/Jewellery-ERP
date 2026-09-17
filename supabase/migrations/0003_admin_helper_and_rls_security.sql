-- ============================================================================
-- SHANKAR JEWELLERY ERP - ADMIN HELPER FUNCTION & RLS RECURSION FIX
-- Migration Version: 0003_admin_helper_and_rls_security.sql
-- Provides SECURITY DEFINER is_admin() helper and replaces recursive policies
-- ============================================================================

-- 1. Create SECURITY DEFINER is_admin() helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (user_id = auth.uid() OR id = auth.uid())
      AND role IN ('admin', 'owner')
      AND is_active = true
  );
$$;

-- 2. Dynamically drop ALL existing RLS policies on public.profiles
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- 3. Ensure RLS remains enabled on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create non-recursive policies on public.profiles
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "profiles_insert_policy"
ON public.profiles FOR INSERT
WITH CHECK (true);

CREATE POLICY "profiles_update_policy"
ON public.profiles FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "profiles_delete_policy"
ON public.profiles FOR DELETE
USING (true);

-- 5. Reload PostgREST API schema cache
NOTIFY pgrst, 'reload schema';

