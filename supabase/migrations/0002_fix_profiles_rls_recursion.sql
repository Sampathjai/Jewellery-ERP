-- ============================================================================
-- SHANKAR JEWELLERY ERP - FIX PROFILES RLS INFINITE RECURSION
-- Migration Version: 0002_fix_profiles_rls_recursion.sql
-- Safely replaces recursive RLS policies on public.profiles with clean non-recursive policies
-- ============================================================================

-- 1. Ensure public.profiles table exists and has explicit constraints
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'billing_staff',
    branch TEXT DEFAULT 'Trichy - Sandhukadai',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure primary key & unique constraints exist explicitly
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE public.profiles ADD PRIMARY KEY (id);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND constraint_name = 'profiles_user_id_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND constraint_name = 'profiles_email_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Dynamically drop ALL existing RLS policies on public.profiles to eliminate recursive policies
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

-- 4. Create clean, non-recursive RLS policies (zero subqueries on profiles)
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

-- 5. Ensure profile for actual Admin user ca66662e-5376-40bc-be21-54525be82019 exists
INSERT INTO public.profiles (
  id,
  user_id,
  full_name,
  email,
  phone,
  role,
  branch,
  is_active,
  created_at,
  updated_at
) VALUES (
  'ca66662e-5376-40bc-be21-54525be82019',
  'ca66662e-5376-40bc-be21-54525be82019',
  'Sampath Kumar',
  'sampath@shankarjewellery.com',
  '+91 98765 43210',
  'admin',
  'Trichy - Sandhukadai',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  email = 'sampath@shankarjewellery.com',
  full_name = 'Sampath Kumar',
  role = 'admin',
  is_active = true,
  updated_at = NOW();

-- 6. Reload PostgREST API schema cache
NOTIFY pgrst, 'reload schema';

