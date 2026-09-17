-- ============================================================================
-- SHANKAR JEWELLERY ERP - ADMIN ACCOUNT SEED SCRIPT
-- Execute this script in your Supabase SQL Editor to instantly create the Admin account:
-- https://supabase.com/dashboard/project/czrqgnoqdbzdlarslqlk/sql
-- ============================================================================

-- 1. Enable required pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Insert Admin Account into auth.users (Email: owner@shankarjewellery.com / Password: Admin@123456)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'owner@shankarjewellery.com',
  crypt('Admin@123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Sampath Kumar","role":"admin","branch":"Trichy - Sandhukadai"}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('Admin@123456', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW();

-- 3. Insert auth identity record
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at,
  provider_id
)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"owner@shankarjewellery.com"}'::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW(),
  'owner@shankarjewellery.com'
)
ON CONFLICT (id, provider) DO UPDATE SET
  last_sign_in_at = NOW(),
  updated_at = NOW();

-- 4. Insert corresponding Admin Profile into public.profiles
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
)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  'Sampath Kumar',
  'owner@shankarjewellery.com',
  '+91 98765 43210',
  'admin',
  'Trichy - Sandhukadai',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = 'admin',
  is_active = true,
  updated_at = NOW();

-- 5. Insert Secondary Admin (sampath@shankarjewellery.com / Admin@123456)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111112',
  'authenticated',
  'authenticated',
  'sampath@shankarjewellery.com',
  crypt('Admin@123456', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Sampath Kumar","role":"admin","branch":"Trichy - Sandhukadai"}'::jsonb,
  NOW(), NOW(), '', '', '', ''
) ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('Admin@123456', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW();

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
) VALUES (
  '11111111-1111-4111-8111-111111111112',
  '11111111-1111-4111-8111-111111111112',
  '{"sub":"11111111-1111-4111-8111-111111111112","email":"sampath@shankarjewellery.com"}'::jsonb,
  'email', NOW(), NOW(), NOW(), 'sampath@shankarjewellery.com'
) ON CONFLICT (id, provider) DO UPDATE SET
  last_sign_in_at = NOW(), updated_at = NOW();

INSERT INTO public.profiles (
  id, user_id, full_name, email, phone, role, branch, is_active, created_at, updated_at
) VALUES (
  '11111111-1111-4111-8111-111111111112',
  '11111111-1111-4111-8111-111111111112',
  'Sampath Kumar',
  'sampath@shankarjewellery.com',
  '+91 98765 43210',
  'admin',
  'Trichy - Sandhukadai',
  true, NOW(), NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = 'admin', is_active = true, updated_at = NOW();
