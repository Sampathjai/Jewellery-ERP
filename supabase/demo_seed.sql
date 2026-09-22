-- ============================================================================
-- SHANKAR JEWELLERY ERP - PROFESSIONAL DEMO DATASET SEED SCRIPT
-- Demo Period: 01-June-2026 to 22-September-2026
-- Store: Shankar Jewellers, 12 Main Bazaar Road, Trichy, Tamil Nadu - 620001
-- Idempotent script: Safe to execute multiple times in Supabase SQL Editor
-- Dashboard Project: https://supabase.com/dashboard/project/czrqgnoqdbzdlarslqlk/sql
-- ============================================================================

-- ============================================================================
-- 0. SCHEMA COMPATIBILITY CHECK & EXTENSIONS
-- Automatically adds any newer columns to existing Supabase tables if missing
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE IF EXISTS business_settings ADD COLUMN IF NOT EXISTS inactivity_logout_enabled BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS business_settings ADD COLUMN IF NOT EXISTS inactivity_timeout_minutes INT DEFAULT 15;
ALTER TABLE IF EXISTS business_settings ADD COLUMN IF NOT EXISTS max_concurrent_sessions INT DEFAULT 3;
ALTER TABLE IF EXISTS business_settings ADD COLUMN IF NOT EXISTS force_logout_all_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'billing_staff';
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Trichy - Sandhukadai';

ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS agreed_customer_touch NUMERIC(5,2) DEFAULT 40.00;
ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS default_actual_touch NUMERIC(5,2) DEFAULT 37.00;
ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS default_profit_touch NUMERIC(5,2) DEFAULT 10.00;
ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS default_billing_touch NUMERIC(5,2) DEFAULT 47.00;

ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS actual_touch NUMERIC(5,2) DEFAULT 37.00;

ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS user_name TEXT;

ALTER TABLE IF EXISTS wholesale_issues ADD COLUMN IF NOT EXISTS total_deduction_weight_g NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE IF EXISTS wholesale_issues ADD COLUMN IF NOT EXISTS total_fine_gold_g NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE IF EXISTS wholesale_issues ADD COLUMN IF NOT EXISTS gold_rate_per_gram NUMERIC(12,2) DEFAULT 7450.00;
ALTER TABLE IF EXISTS wholesale_issues ADD COLUMN IF NOT EXISTS total_cash_value NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE IF EXISTS wholesale_issues ADD COLUMN IF NOT EXISTS cash_paid NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE IF EXISTS wholesale_issues ADD COLUMN IF NOT EXISTS gold_916_weight_paid_g NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE IF EXISTS wholesale_issues ADD COLUMN IF NOT EXISTS gold_916_rate NUMERIC(12,2) DEFAULT 6830.00;
ALTER TABLE IF EXISTS wholesale_issues ADD COLUMN IF NOT EXISTS gold_916_value_paid NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE IF EXISTS wholesale_issues ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(12,2) DEFAULT 0.00;

ALTER TABLE IF EXISTS wholesale_issue_items ADD COLUMN IF NOT EXISTS deduction_weight_g NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE IF EXISTS wholesale_issue_items ADD COLUMN IF NOT EXISTS actual_touch NUMERIC(5,2) DEFAULT 37.00;
ALTER TABLE IF EXISTS wholesale_issue_items ADD COLUMN IF NOT EXISTS profit_touch NUMERIC(5,2) DEFAULT 10.00;
ALTER TABLE IF EXISTS wholesale_issue_items ADD COLUMN IF NOT EXISTS billing_touch NUMERIC(5,2) DEFAULT 47.00;
ALTER TABLE IF EXISTS wholesale_issue_items ADD COLUMN IF NOT EXISTS fine_gold_g NUMERIC(10,3) DEFAULT 0.000;

ALTER TABLE IF EXISTS wholesale_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE IF EXISTS wholesale_payments ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE IF EXISTS wholesale_payments ADD COLUMN IF NOT EXISTS gold_weight_g NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE IF EXISTS wholesale_payments ADD COLUMN IF NOT EXISTS gold_purity TEXT DEFAULT '916';
ALTER TABLE IF EXISTS wholesale_payments ADD COLUMN IF NOT EXISTS gold_rate NUMERIC(12,2) DEFAULT 6830.00;
ALTER TABLE IF EXISTS wholesale_payments ADD COLUMN IF NOT EXISTS gold_value NUMERIC(12,2) DEFAULT 0.00;

-- 1. BUSINESS SETTINGS (Shankar Jewellers, Trichy)
INSERT INTO business_settings (
    id,
    shop_name,
    owner_name,
    address,
    city,
    state,
    country,
    pin_code,
    phone,
    whatsapp_number,
    email,
    gstin,
    pan,
    bank_name,
    bank_account_number,
    bank_ifsc,
    upi_id,
    invoice_prefix,
    next_invoice_number,
    default_profit_sharing_model,
    default_profit_sharing_percent,
    inactivity_logout_enabled,
    inactivity_timeout_minutes,
    max_concurrent_sessions,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Shankar Jewellers',
    'Sampath Kumar',
    '12, Main Bazaar Road',
    'Trichy',
    'Tamil Nadu',
    'India',
    '620001',
    '+91 94431 20260',
    '+91 94431 20260',
    'demo@shankarjewellers.example',
    '33DEMOP1234A1Z5',
    'DEMOP1234A',
    'State Bank of India',
    '39182746501',
    'SBIN0001234',
    'shankarjewels@upi',
    'SJ-INV-',
    1045,
    'model_a_profit_percent',
    40.00,
    true,
    15,
    3,
    '2026-09-22 14:00:00+05:30'
)
ON CONFLICT (id) DO UPDATE SET
    shop_name = EXCLUDED.shop_name,
    owner_name = EXCLUDED.owner_name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    pin_code = EXCLUDED.pin_code,
    phone = EXCLUDED.phone,
    whatsapp_number = EXCLUDED.whatsapp_number,
    email = EXCLUDED.email,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    bank_name = EXCLUDED.bank_name,
    bank_account_number = EXCLUDED.bank_account_number,
    bank_ifsc = EXCLUDED.bank_ifsc,
    upi_id = EXCLUDED.upi_id,
    invoice_prefix = EXCLUDED.invoice_prefix,
    next_invoice_number = EXCLUDED.next_invoice_number,
    updated_at = NOW();

-- 2. USER PROFILES & ROLES
INSERT INTO profiles (id, full_name, email, phone, role, branch, is_active, created_at, updated_at) VALUES
('b0000000-0000-0000-0000-000000000001', 'Sampath Kumar', 'sampath@shankarjewellers.example', '+91 94431 20260', 'admin', 'Trichy - Main Bazaar', true, '2026-06-01 09:00:00+05:30', NOW()),
('b0000000-0000-0000-0000-000000000002', 'Meena Ravi', 'meena.manager@shankarjewellers.example', '+91 94431 20261', 'manager', 'Trichy - Main Bazaar', true, '2026-06-01 09:00:00+05:30', NOW()),
('b0000000-0000-0000-0000-000000000003', 'Arun Kumar', 'arun.sales@shankarjewellers.example', '+91 94431 20262', 'billing_staff', 'Trichy - Main Bazaar', true, '2026-06-01 09:00:00+05:30', NOW()),
('b0000000-0000-0000-0000-000000000004', 'Priya Devi', 'priya.sales@shankarjewellers.example', '+91 94431 20263', 'billing_staff', 'Trichy - Main Bazaar', true, '2026-06-01 09:00:00+05:30', NOW()),
('b0000000-0000-0000-0000-000000000005', 'Karthik Raj', 'karthik.accounts@shankarjewellers.example', '+91 94431 20264', 'accountant', 'Trichy - Main Bazaar', true, '2026-06-01 09:00:00+05:30', NOW())
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    branch = EXCLUDED.branch,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 3. HISTORICAL METAL RATES (June 1, 2026 → September 22, 2026)
INSERT INTO metal_rates (id, rate_date, gold_24k_per_gram, gold_22k_per_gram, gold_18k_per_gram, silver_per_gram, silver_per_kg, source, notes) VALUES
('c0000000-0000-0000-0000-000000000001', '2026-06-01', 10700.00, 9850.00, 8050.00, 135.00, 135000.00, 'chennai_local', 'Chennai Bullion June Opening Rate'),
('c0000000-0000-0000-0000-000000000002', '2026-06-10', 10850.00, 9980.00, 8150.00, 136.50, 136500.00, 'chennai_local', 'Tamil Nadu Market Rate'),
('c0000000-0000-0000-0000-000000000003', '2026-06-20', 11100.00, 10200.00, 8350.00, 139.00, 139000.00, 'chennai_local', 'Mid June Market Rate'),
('c0000000-0000-0000-0000-000000000004', '2026-06-30', 11300.00, 10380.00, 8480.00, 141.00, 141000.00, 'chennai_local', 'June Closing Rate'),
('c0000000-0000-0000-0000-000000000005', '2026-07-05', 11450.00, 10520.00, 8600.00, 143.00, 143000.00, 'chennai_local', 'July Opening Rate'),
('c0000000-0000-0000-0000-000000000006', '2026-07-15', 11650.00, 10700.00, 8750.00, 145.50, 145500.00, 'chennai_local', 'Mid July Local Rate'),
('c0000000-0000-0000-0000-000000000007', '2026-07-25', 11800.00, 10850.00, 8880.00, 148.00, 148000.00, 'chennai_local', 'Chennai Jewellers Guild Rate'),
('c0000000-0000-0000-0000-000000000008', '2026-07-31', 11950.00, 10980.00, 8990.00, 150.00, 150000.00, 'chennai_local', 'July Closing Rate'),
('c0000000-0000-0000-0000-000000000009', '2026-08-05', 12100.00, 11100.00, 9100.00, 152.00, 152000.00, 'chennai_local', 'August Opening Rate'),
('c0000000-0000-0000-0000-000000000010', '2026-08-15', 12350.00, 11350.00, 9300.00, 154.50, 154500.00, 'chennai_local', 'Independence Day Festival Rate'),
('c0000000-0000-0000-0000-000000000011', '2026-08-25', 12550.00, 11520.00, 9450.00, 156.00, 156000.00, 'chennai_local', 'Trichy Local Market Rate'),
('c0000000-0000-0000-0000-000000000012', '2026-08-31', 12700.00, 11680.00, 9580.00, 158.00, 158000.00, 'chennai_local', 'August Closing Rate'),
('c0000000-0000-0000-0000-000000000013', '2026-09-05', 12850.00, 11800.00, 9680.00, 160.00, 160000.00, 'chennai_local', 'September Opening Rate'),
('c0000000-0000-0000-0000-000000000014', '2026-09-12', 13050.00, 11980.00, 9820.00, 162.50, 162500.00, 'chennai_local', 'Festival Season Rate'),
('c0000000-0000-0000-0000-000000000015', '2026-09-18', 13150.00, 12050.00, 9890.00, 164.00, 164000.00, 'chennai_local', 'Trichy Closing Rate'),
('c0000000-0000-0000-0000-000000000016', '2026-09-22', 13250.00, 12150.00, 9950.00, 165.00, 165000.00, 'chennai_local', 'Official Demo Date Market Rate (22-Sep-2026)')
ON CONFLICT (rate_date) DO UPDATE SET
    gold_24k_per_gram = EXCLUDED.gold_24k_per_gram,
    gold_22k_per_gram = EXCLUDED.gold_22k_per_gram,
    gold_18k_per_gram = EXCLUDED.gold_18k_per_gram,
    silver_per_gram = EXCLUDED.silver_per_gram,
    silver_per_kg = EXCLUDED.silver_per_kg,
    notes = EXCLUDED.notes;

-- 4. PRODUCT CATEGORIES (Gold, Silver, Diamond, Coins, Custom)
INSERT INTO product_categories (id, name, description, is_active) VALUES
('d0000000-0000-0000-0000-000000000001', 'Gold Rings', 'Men, women, and couple finger rings in 22K/18K', true),
('d0000000-0000-0000-0000-000000000002', 'Gold Chains', '22K Lakshmi, rope, and hollow chains', true),
('d0000000-0000-0000-0000-000000000003', 'Gold Necklaces', 'Bridal chokers, kasu malai, and mango haram', true),
('d0000000-0000-0000-0000-000000000004', 'Gold Bangles', 'Traditional kada, round, and casting bangles', true),
('d0000000-0000-0000-0000-000000000005', 'Gold Earrings', 'Jhumkas, daily wear studs, and hangings', true),
('d0000000-0000-0000-0000-000000000006', 'Gold Bracelets', 'Ladies and gents designer bracelets', true),
('d0000000-0000-0000-0000-000000000007', 'Gold Pendants', 'Lakshmi, Ganesha, and floral lockets', true),
('d0000000-0000-0000-0000-000000000008', 'Gold Chains for Men', 'Heavy machine made gents chains', true),
('d0000000-0000-0000-0000-000000000009', 'Gold Jewellery for Kids', 'Baby bangles, nazariya, and studs', true),
('d0000000-0000-0000-0000-000000000010', 'Silver Anklets', 'Kolusu, payal, and bridal silver anklets', true),
('d0000000-0000-0000-0000-000000000011', 'Silver Rings', '925 sterling silver bands and casual rings', true),
('d0000000-0000-0000-0000-000000000012', 'Silver Chains', 'Sterling silver neck chains', true),
('d0000000-0000-0000-0000-000000000013', 'Silver Articles', 'Silver glasses, plates, cups, and bowls', true),
('d0000000-0000-0000-0000-000000000014', 'Silver Pooja Items', 'Kamatchi vilakku, agarbathi stand, kunguma chimizh', true),
('d0000000-0000-0000-0000-000000000015', 'Diamond Rings', 'Certified natural diamond engagement & solitaire rings', true),
('d0000000-0000-0000-0000-000000000016', 'Diamond Earrings', 'Diamond studs and chandelier drops', true),
('d0000000-0000-0000-0000-000000000017', 'Diamond Pendants', 'Single stone and cluster diamond lockets', true),
('d0000000-0000-0000-0000-000000000018', 'Coins', '24K 999 gold coins and fine silver coins', true),
('d0000000-0000-0000-0000-000000000019', 'Nose Rings', 'Traditional mukku poodu and pressing studs', true),
('d0000000-0000-0000-0000-000000000020', 'Custom Jewellery', 'Custom order artisan jewellery', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 5. SUPPLIERS / VENDORS (10 Fictional Wholesale & Refinery Partners)
INSERT INTO suppliers (id, supplier_code, supplier_name, contact_person, phone, whatsapp, email, address, gstin, supplier_type, primary_metal) VALUES
('e0000000-0000-0000-0000-000000000001', 'DEMO-SUP-001', 'Sri Lakshmi Gold Works', 'R. Manickam', '+91 94432 50001', '+91 94432 50001', 'lakshmi.gold@demo.example', '14 Temple Street, RS Puram, Coimbatore', '33DEMOS1001A1Z1', 'manufacturer', 'gold'),
('e0000000-0000-0000-0000-000000000002', 'DEMO-SUP-002', 'Tamil Gold Traders', 'S. Shanmugam', '+91 94432 50002', '+91 94432 50002', 'tamil.gold@demo.example', '88 Big Bazaar Street, Madurai', '33DEMOS1002A1Z2', 'bullion', 'gold'),
('e0000000-0000-0000-0000-000000000003', 'DEMO-SUP-003', 'Chennai Bullion House', 'K. Rajagopal', '+91 94432 50003', '+91 94432 50003', 'chennai.bullion@demo.example', '201 NSC Bose Road, Sowcarpet, Chennai', '33DEMOS1003A1Z3', 'bullion', 'gold'),
('e0000000-0000-0000-0000-000000000004', 'DEMO-SUP-004', 'Kaveri Jewellery Manufacturers', 'M. Ganesan', '+91 94432 50004', '+91 94432 50004', 'kaveri.mfg@demo.example', '45 West Car Street, Thanjavur', '33DEMOS1004A1Z4', 'manufacturer', 'gold'),
('e0000000-0000-0000-0000-000000000005', 'DEMO-SUP-005', 'Southern Gold Suppliers', 'P. Natarajan', '+91 94432 50005', '+91 94432 50005', 'southern.gold@demo.example', '72 Cross Cut Road, Coimbatore', '33DEMOS1005A1Z5', 'wholesaler', 'gold'),
('e0000000-0000-0000-0000-000000000006', 'DEMO-SUP-006', 'Trichy Gold & Silver Works', 'A. Murugesan', '+91 94432 50006', '+91 94432 50006', 'trichy.works@demo.example', '29 Chinnakadai Street, Trichy', '33DEMOS1006A1Z6', 'manufacturer', 'silver'),
('e0000000-0000-0000-0000-000000000007', 'DEMO-SUP-007', 'Classic Diamond Suppliers', 'D. Mehta', '+91 94432 50007', '+91 94432 50007', 'classic.diamonds@demo.example', '118 Mint Street, George Town, Chennai', '33DEMOS1007A1Z7', 'diamond', 'other'),
('e0000000-0000-0000-0000-000000000008', 'DEMO-SUP-008', 'Sri Vinayaga Bullion', 'V. Subramanian', '+91 94432 50008', '+91 94432 50008', 'vinayaga.bullion@demo.example', '55 Bazaar Road, Salem', '33DEMOS1008A1Z8', 'bullion', 'silver'),
('e0000000-0000-0000-0000-000000000009', 'DEMO-SUP-009', 'Kongu Bullion Refinery', 'T. Kandasamy', '+91 94432 50009', '+91 94432 50009', 'kongu.refinery@demo.example', '102 Erode Road, Tiruppur', '33DEMOS1009A1Z9', 'refinery', 'gold'),
('e0000000-0000-0000-0000-000000000010', 'DEMO-SUP-010', 'Meenakshi Goldsmith Guild', 'C. Veluchamy', '+91 94432 50010', '+91 94432 50010', 'meenakshi.guild@demo.example', '64 South Masi Street, Madurai', '33DEMOS1010A1Z0', 'artisan', 'gold')
ON CONFLICT (supplier_code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    contact_person = EXCLUDED.contact_person,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    gstin = EXCLUDED.gstin,
    primary_metal = EXCLUDED.primary_metal;

-- 6. CUSTOMERS (32 Fictional Customers across Tamil Nadu)
INSERT INTO customers (id, customer_code, full_name, shop_name, customer_type, phone, whatsapp_number, email, address, city, state, pin_code, credit_limit, agreed_profit_percent, default_actual_touch, default_profit_touch, default_billing_touch, is_active) VALUES
-- Retail Customers
('f0000000-0000-0000-0000-000000000001', 'DEMO-CUST-001', 'Rahul Krishnan', NULL, 'retail', '+91 98421 11001', '+91 98421 11001', 'rahul.k@demo.example', '14 Thillai Nagar 5th Cross', 'Trichy', 'Tamil Nadu', '620018', 300000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000002', 'DEMO-CUST-002', 'Priya Suresh', NULL, 'retail', '+91 98421 11002', '+91 98421 11002', 'priya.s@demo.example', '88 Cantonment Royal Enclave', 'Trichy', 'Tamil Nadu', '620001', 500000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000003', 'DEMO-CUST-003', 'Aravind Kumar', NULL, 'retail', '+91 98421 11003', '+91 98421 11003', 'aravind.k@demo.example', '22 KK Nagar Main Road', 'Trichy', 'Tamil Nadu', '620021', 200000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000004', 'DEMO-CUST-004', 'Divya Raj', NULL, 'retail', '+91 98421 11004', '+91 98421 11004', 'divya.raj@demo.example', '45 Srirangam North Chithirai St', 'Trichy', 'Tamil Nadu', '620006', 150000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000005', 'DEMO-CUST-005', 'Karthik M', NULL, 'retail', '+91 98421 11005', '+91 98421 11005', 'karthik.m@demo.example', '109 Palakarai Main Road', 'Trichy', 'Tamil Nadu', '620008', 250000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000006', 'DEMO-CUST-006', 'Meena Lakshmi', NULL, 'retail', '+91 98421 11006', '+91 98421 11006', 'meena.lakshmi@demo.example', '33 Gandhi Market View', 'Trichy', 'Tamil Nadu', '620002', 200000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000007', 'DEMO-CUST-007', 'Vignesh R', NULL, 'retail', '+91 98421 11007', '+91 98421 11007', 'vignesh.r@demo.example', '61 West Boulevard Road', 'Trichy', 'Tamil Nadu', '620008', 100000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000008', 'DEMO-CUST-008', 'Anitha Kumar', NULL, 'retail', '+91 98421 11008', '+91 98421 11008', 'anitha.k@demo.example', '19 Williams Road', 'Trichy', 'Tamil Nadu', '620001', 150000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000009', 'DEMO-CUST-009', 'Suresh Babu', NULL, 'retail', '+91 98421 11009', '+91 98421 11009', 'suresh.b@demo.example', '74 VOC Nagar', 'Thanjavur', 'Tamil Nadu', '613001', 350000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000010', 'DEMO-CUST-010', 'Kavya Srinivasan', NULL, 'retail', '+91 98421 11010', '+91 98421 11010', 'kavya.s@demo.example', '12 Sastri Road', 'Trichy', 'Tamil Nadu', '620018', 250000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000011', 'DEMO-CUST-011', 'Naveen Raj', NULL, 'retail', '+91 98421 11011', '+91 98421 11011', 'naveen.raj@demo.example', '50 Salai Road', 'Trichy', 'Tamil Nadu', '620018', 120000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000012', 'DEMO-CUST-012', 'Deepa S', NULL, 'retail', '+91 98421 11012', '+91 98421 11012', 'deepa.s@demo.example', '28 Anna Nagar Extension', 'Madurai', 'Tamil Nadu', '625020', 180000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000013', 'DEMO-CUST-013', 'Hari Prasad', NULL, 'retail', '+91 98421 11013', '+91 98421 11013', 'hari.prasad@demo.example', '85 Netaji Street', 'Salem', 'Tamil Nadu', '636001', 220000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000014', 'DEMO-CUST-014', 'Swetha R', NULL, 'retail', '+91 98421 11014', '+91 98421 11014', 'swetha.r@demo.example', '39 Nehru Street', 'Coimbatore', 'Tamil Nadu', '641001', 300000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000015', 'DEMO-CUST-015', 'Manoj Kumar', NULL, 'retail', '+91 98421 11015', '+91 98421 11015', 'manoj.k@demo.example', '17 Karur Bypass Road', 'Trichy', 'Tamil Nadu', '620002', 150000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000016', 'DEMO-CUST-016', 'Geetha Ramanathan', NULL, 'retail', '+91 98421 11016', '+91 98421 11016', 'geetha.r@demo.example', '92 East Boulevard Road', 'Trichy', 'Tamil Nadu', '620008', 200000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000017', 'DEMO-CUST-017', 'Balaji Venkat', NULL, 'retail', '+91 98421 11017', '+91 98421 11017', 'balaji.v@demo.example', '64 Singaram Pillai St', 'Trichy', 'Tamil Nadu', '620008', 180000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000018', 'DEMO-CUST-018', 'Malathi Sundar', NULL, 'retail', '+91 98421 11018', '+91 98421 11018', 'malathi.s@demo.example', '112 Melur Main Road', 'Madurai', 'Tamil Nadu', '625106', 220000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000019', 'DEMO-CUST-019', 'Ramesh Sundaram', NULL, 'retail', '+91 98421 11019', '+91 98421 11019', 'ramesh.s@demo.example', '48 College Road', 'Thanjavur', 'Tamil Nadu', '613007', 160000.00, 0, 37, 10, 47, true),
('f0000000-0000-0000-0000-000000000020', 'DEMO-CUST-020', 'Sindhu Murugan', NULL, 'retail', '+91 98421 11020', '+91 98421 11020', 'sindhu.m@demo.example', '21 Ponmalai Market', 'Trichy', 'Tamil Nadu', '620004', 190000.00, 0, 37, 10, 47, true),
-- Wholesale Dealer Partners (Credit & Consignment)
('f0000000-0000-0000-0000-000000000021', 'DEMO-CUST-021', 'Anand Ramakrishnan', 'Sri Lakshmi Jewellery', 'wholesale', '+91 94432 11001', '+91 94432 11001', 'anand@srilakshmijewel.example', '45 Cross Cut Road', 'Madurai', 'Tamil Nadu', '625001', 1200000.00, 40.00, 37.00, 10.00, 47.00, true),
('f0000000-0000-0000-0000-000000000022', 'DEMO-CUST-022', 'Venkatesh Prabhu', 'Prabhu Bullion & Gems', 'wholesale', '+91 98421 22002', '+91 98421 22002', 'prabhu@prabhubullion.example', '12 Bazaar Street', 'Salem', 'Tamil Nadu', '636001', 1000000.00, 35.00, 37.00, 10.00, 47.00, true),
('f0000000-0000-0000-0000-000000000023', 'DEMO-CUST-023', 'Karthik Subramanian', 'Karthik Retail Traders', 'wholesale', '+91 97900 33003', '+91 97900 33003', 'karthik@karthiktraders.example', '88 Big Bazaar', 'Erode', 'Tamil Nadu', '638001', 800000.00, 40.00, 37.00, 10.00, 47.00, true),
('f0000000-0000-0000-0000-000000000024', 'DEMO-CUST-024', 'Murugan Chettiar', 'Murugan Gold Emporium', 'wholesale', '+91 94433 44004', '+91 94433 44004', 'murugan@emporium.example', '105 Car Street', 'Tirunelveli', 'Tamil Nadu', '627001', 900000.00, 40.00, 37.00, 10.00, 47.00, true),
('f0000000-0000-0000-0000-000000000025', 'DEMO-CUST-025', 'Saravanan S', 'Saravana Jewels', 'wholesale', '+91 98422 55005', '+91 98422 55005', 'saravanan@saravanajewels.example', '52 Raja Street', 'Coimbatore', 'Tamil Nadu', '641001', 1500000.00, 38.00, 37.00, 10.00, 47.00, true),
('f0000000-0000-0000-0000-000000000026', 'DEMO-CUST-026', 'Govindaraj M', 'Thanjai Bullion Mart', 'wholesale', '+91 94434 66006', '+91 94434 66006', 'govind@thanjaimart.example', '31 South Main Street', 'Thanjavur', 'Tamil Nadu', '613001', 750000.00, 40.00, 37.00, 10.00, 47.00, true),
('f0000000-0000-0000-0000-000000000027', 'DEMO-CUST-027', 'Shanmuga Sundaram', 'Sundaram Silver Works', 'wholesale', '+91 98423 77007', '+91 98423 77007', 'sundaram@silvershop.example', '18 Silver Merchant Street', 'Salem', 'Tamil Nadu', '636002', 600000.00, 35.00, 37.00, 10.00, 47.00, true),
('f0000000-0000-0000-0000-000000000028', 'DEMO-CUST-028', 'Gopalakrishnan V', 'Cauvery Gold Palace', 'wholesale', '+91 94435 88008', '+91 94435 88008', 'gopal@cauverypalace.example', '94 Bazaar Road', 'Kumbakonam', 'Tamil Nadu', '612001', 1100000.00, 40.00, 37.00, 10.00, 47.00, true),
('f0000000-0000-0000-0000-000000000029', 'DEMO-CUST-029', 'Vijay Anand', 'Vijay Jewellery Works', 'wholesale', '+91 98424 99009', '+91 98424 99009', 'vijay@vijayworks.example', '73 Town Hall Road', 'Madurai', 'Tamil Nadu', '625001', 850000.00, 40.00, 37.00, 10.00, 47.00, true),
('f0000000-0000-0000-0000-000000000030', 'DEMO-CUST-030', 'Subash Chandra', 'Subash Bullion', 'wholesale', '+91 94436 00010', '+91 94436 00010', 'subash@subashbullion.example', '66 Market Road', 'Dindigul', 'Tamil Nadu', '624001', 700000.00, 35.00, 37.00, 10.00, 47.00, true),
('f0000000-0000-0000-0000-000000000031', 'DEMO-CUST-031', 'Thirunavukkarasu P', 'Arasu Jewellers', 'wholesale', '+91 98425 11011', '+91 98425 11011', 'arasu@arasujewels.example', '82 Gandhi Road', 'Karur', 'Tamil Nadu', '639001', 950000.00, 40.00, 37.00, 10.00, 47.00, true),
('f0000000-0000-0000-0000-000000000032', 'DEMO-CUST-032', 'Natarajan K', 'Nataraj Jewellery Mart', 'wholesale', '+91 94437 22012', '+91 94437 22012', 'nataraj@natarajmart.example', '19 Main Street', 'Pudukkottai', 'Tamil Nadu', '622001', 800000.00, 40.00, 37.00, 10.00, 47.00, true)
ON CONFLICT (customer_code) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    shop_name = EXCLUDED.shop_name,
    customer_type = EXCLUDED.customer_type,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    credit_limit = EXCLUDED.credit_limit;

-- 7. PRODUCT CATALOG (42 Realistic Products: Gold, Silver, Diamond, Coins)
INSERT INTO products (
    id, sku, barcode, qr_code, name, category_id, category_name, metal_type, purity,
    gross_weight_g, stone_weight_g, other_weight_g, net_weight_g, unit, quantity,
    making_charge_type, making_charge_rate, labour_charge, wastage_percent, wastage_weight_g,
    purchase_cost, manufacturing_cost, retail_price, wholesale_valuation, minimum_stock,
    description, primary_photo_url, status
) VALUES
-- 1. Prompt Specific Gold Products
('10000000-0000-0000-0000-000000000001', 'SJ-GR-001', '89010101', 'QR-SJ-GR-001', '22K Classic Gold Ring', 'd0000000-0000-0000-0000-000000000001', 'Gold Rings', 'gold', '22k', 5.820, 0.170, 0.000, 5.650, 'grams', 18, 'flat', 850.00, 150.00, 3.50, 0.198, 64500.00, 65500.00, 74250.00, 68650.00, 5, 'Classic 22K yellow gold gents engagement ring with glossy finish', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000002', 'SJ-GC-001', '89010102', 'QR-SJ-GC-001', '22K Lakshmi Gold Chain', 'd0000000-0000-0000-0000-000000000002', 'Gold Chains', 'gold', '22k', 18.400, 0.300, 0.000, 18.100, 'grams', 12, 'flat', 2700.00, 500.00, 4.00, 0.724, 208500.00, 211700.00, 238500.00, 220000.00, 4, 'Traditional 22K gold Lakshmi mugappu chain 22 inches', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000003', 'SJ-GB-001', '89010103', 'QR-SJ-GB-001', '22K Traditional Gold Bangle', 'd0000000-0000-0000-0000-000000000004', 'Gold Bangles', 'gold', '22k', 24.800, 0.400, 0.000, 24.400, 'grams', 10, 'flat', 3900.00, 600.00, 4.50, 1.098, 281000.00, 285500.00, 321500.00, 296500.00, 3, 'Authentic South Indian handcrafted floral embossed kada bangle', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000004', 'SJ-GE-001', '89010104', 'QR-SJ-GE-001', '22K Daily Wear Gold Earrings', 'd0000000-0000-0000-0000-000000000005', 'Gold Earrings', 'gold', '22k', 4.750, 0.200, 0.000, 4.550, 'grams', 22, 'flat', 720.00, 180.00, 3.00, 0.137, 52000.00, 52900.00, 59800.00, 55300.00, 6, 'Lightweight floral screw-back studs for daily college/office wear', 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000005', 'SJ-GN-001', '89010105', 'QR-SJ-GN-001', '22K Bridal Gold Necklace', 'd0000000-0000-0000-0000-000000000003', 'Gold Necklaces', 'gold', '22k', 48.600, 0.700, 0.000, 47.900, 'grams', 6, 'flat', 8500.00, 1500.00, 5.00, 2.395, 552000.00, 562000.00, 632000.00, 582000.00, 2, 'Grand temple design bridal choker necklace set with ruby highlights', 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
-- Additional Gold Jewellery
('10000000-0000-0000-0000-000000000006', 'SJ-GR-002', '89010106', 'QR-SJ-GR-002', '22K Mens Navaratna Ring', 'd0000000-0000-0000-0000-000000000001', 'Gold Rings', 'gold', '22k', 8.200, 1.100, 0.000, 7.100, 'grams', 8, 'flat', 1200.00, 300.00, 4.00, 0.284, 82000.00, 83500.00, 94200.00, 86300.00, 3, 'Auspicious nine-gemstone studded 22K gold gents ring', 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000007', 'SJ-GR-003', '89010107', 'QR-SJ-GR-003', '22K Peacock Womens Ring', 'd0000000-0000-0000-0000-000000000001', 'Gold Rings', 'gold', '22k', 4.400, 0.250, 0.000, 4.150, 'grams', 15, 'flat', 680.00, 120.00, 3.50, 0.145, 47500.00, 48300.00, 54500.00, 50400.00, 4, 'Intricate enamel peacock ladies ring in 22K hallmarked gold', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000008', 'SJ-GC-002', '89010108', 'QR-SJ-GC-002', '22K Mens Solid Rope Chain', 'd0000000-0000-0000-0000-000000000008', 'Gold Chains for Men', 'gold', '22k', 32.500, 0.000, 0.000, 32.500, 'grams', 7, 'per_gram', 180.00, 0.00, 4.00, 1.300, 375000.00, 380850.00, 428000.00, 394900.00, 2, 'Heavy duty 24-inch solid rope chain for men', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000009', 'SJ-GC-003', '89010109', 'QR-SJ-GC-003', '22K Sleek Daily Wear Gold Chain', 'd0000000-0000-0000-0000-000000000002', 'Gold Chains', 'gold', '22k', 10.200, 0.000, 0.000, 10.200, 'grams', 16, 'per_gram', 160.00, 0.00, 3.50, 0.357, 117500.00, 119130.00, 134200.00, 123900.00, 5, 'Lightweight shiny curb link chain for everyday wear', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000010', 'SJ-GB-002', '89010110', 'QR-SJ-GB-002', '22K Daily Wear Gold Bangles (Pair)', 'd0000000-0000-0000-0000-000000000004', 'Gold Bangles', 'gold', '22k', 32.000, 0.000, 0.000, 32.000, 'grams', 8, 'per_gram', 190.00, 0.00, 4.00, 1.280, 369000.00, 375080.00, 421500.00, 388800.00, 3, 'Pair of 22K gold machine-cut round shiny bangles (Size 2.6)', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000011', 'SJ-GB-003', '89010111', 'QR-SJ-GB-003', '22K Antique Lakshmi Kada', 'd0000000-0000-0000-0000-000000000004', 'Gold Bangles', 'gold', '22k', 42.100, 1.200, 0.000, 40.900, 'grams', 4, 'flat', 6500.00, 1200.00, 6.00, 2.454, 473000.00, 480700.00, 542000.00, 497000.00, 2, 'Broad handcrafted temple jewellery kada with Goddess Lakshmi motif', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000012', 'SJ-GE-002', '89010112', 'QR-SJ-GE-002', '22K Antique Jimikki Kammal', 'd0000000-0000-0000-0000-000000000005', 'Gold Earrings', 'gold', '22k', 14.500, 0.800, 0.000, 13.700, 'grams', 9, 'flat', 2400.00, 450.00, 5.00, 0.685, 158500.00, 161350.00, 181800.00, 166500.00, 3, 'Heritage bell-shaped South Indian antique gold jhumka earrings', 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000013', 'SJ-GE-003', '89010113', 'QR-SJ-GE-003', '22K Gold Chandbali Earrings', 'd0000000-0000-0000-0000-000000000005', 'Gold Earrings', 'gold', '22k', 18.200, 1.100, 0.000, 17.100, 'grams', 6, 'flat', 3100.00, 600.00, 5.50, 0.940, 198000.00, 201700.00, 227500.00, 207800.00, 2, 'Crescent moon shaped festive chandbali with emerald droplets', 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000014', 'SJ-GN-002', '89010114', 'QR-SJ-GN-002', '22K Traditional Mango Mala (Manga Malai)', 'd0000000-0000-0000-0000-000000000003', 'Gold Necklaces', 'gold', '22k', 62.400, 1.400, 0.000, 61.000, 'grams', 4, 'flat', 11500.00, 2000.00, 5.50, 3.355, 705000.00, 718500.00, 808000.00, 741000.00, 1, 'Timeless South Indian bridal mango haram with ruby cabochons', 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000015', 'SJ-GN-003', '89010115', 'QR-SJ-GN-003', '22K Kasu Malai Long Haram', 'd0000000-0000-0000-0000-000000000003', 'Gold Necklaces', 'gold', '22k', 74.800, 0.000, 0.000, 74.800, 'grams', 3, 'flat', 12800.00, 2200.00, 5.00, 3.740, 865000.00, 880000.00, 989000.00, 908800.00, 1, 'Grand 22K Lakshmi gold coin haram (Kasu Malai) 28 inches', 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000016', 'SJ-GP-001', '89010116', 'QR-SJ-GP-001', '22K Lakshmi Gold Pendant', 'd0000000-0000-0000-0000-000000000007', 'Gold Pendants', 'gold', '22k', 6.500, 0.300, 0.000, 6.200, 'grams', 18, 'flat', 950.00, 150.00, 4.00, 0.248, 71500.00, 72600.00, 81800.00, 75300.00, 5, 'Divine embossed Goddess Lakshmi gold locket with pearl hanging', 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000017', 'SJ-GP-002', '89010117', 'QR-SJ-GP-002', '22K Lord Ganesha Gold Pendant', 'd0000000-0000-0000-0000-000000000007', 'Gold Pendants', 'gold', '22k', 5.200, 0.200, 0.000, 5.000, 'grams', 15, 'flat', 820.00, 130.00, 3.50, 0.175, 57800.00, 58750.00, 65900.00, 60750.00, 4, 'Artistic modak Ganesha pendant in glossy yellow gold', 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000018', 'SJ-GBR-001', '89010118', 'QR-SJ-GBR-001', '22K Gents Gold Bracelet', 'd0000000-0000-0000-0000-000000000006', 'Gold Bracelets', 'gold', '22k', 22.600, 0.000, 0.000, 22.600, 'grams', 8, 'per_gram', 195.00, 0.00, 4.50, 1.017, 261000.00, 265400.00, 298500.00, 274600.00, 2, 'Stylish Italian curb link heavy gents bracelet 8.5 inch', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000019', 'SJ-GK-001', '89010119', 'QR-SJ-GK-001', '22K Kids Gold Nazariya Bangles (Pair)', 'd0000000-0000-0000-0000-000000000009', 'Gold Jewellery for Kids', 'gold', '22k', 6.800, 1.200, 0.000, 5.600, 'grams', 14, 'flat', 980.00, 200.00, 4.00, 0.224, 64800.00, 65980.00, 74500.00, 68000.00, 4, 'Baby evil eye protection black bead and 22K gold bangle pair', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000020', 'SJ-NR-001', '89010120', 'QR-SJ-NR-001', '22K Mukku Poodu Gold Nose Pin', 'd0000000-0000-0000-0000-000000000019', 'Nose Rings', 'gold', '22k', 0.520, 0.070, 0.000, 0.450, 'grams', 45, 'per_piece', 180.00, 40.00, 3.00, 0.014, 5200.00, 5420.00, 6150.00, 5460.00, 15, 'Traditional South Indian press-type gold nose stud with ruby center', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000021', 'SJ-NR-002', '89010121', 'QR-SJ-NR-002', '22K Single Diamond Stud Nose Ring', 'd0000000-0000-0000-0000-000000000019', 'Nose Rings', 'gold', '22k', 0.650, 0.120, 0.000, 0.530, 'grams', 35, 'per_piece', 250.00, 50.00, 3.00, 0.016, 6800.00, 7100.00, 8200.00, 7200.00, 10, 'Sparkling natural diamond nose screw in 22K yellow gold', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
-- 2. Silver Jewellery & Pooja Articles
('10000000-0000-0000-0000-000000000022', 'SJ-SA-001', '89010122', 'QR-SJ-SA-001', '925 Silver Peacock Anklets (Kolusu)', 'd0000000-0000-0000-0000-000000000010', 'Silver Anklets', 'silver', '925_silver', 68.500, 0.500, 0.000, 68.000, 'grams', 25, 'flat', 950.00, 200.00, 2.00, 1.360, 10500.00, 11650.00, 13400.00, 11200.00, 6, 'Handcrafted traditional Salem silver bell anklets (Goluusu) pair', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000023', 'SJ-SA-002', '89010123', 'QR-SJ-SA-002', '925 Silver Daily Wear Payal', 'd0000000-0000-0000-0000-000000000010', 'Silver Anklets', 'silver', '925_silver', 42.000, 0.000, 0.000, 42.000, 'grams', 30, 'flat', 650.00, 150.00, 2.00, 0.840, 6500.00, 7300.00, 8400.00, 6930.00, 8, 'Sleek silver chain anklet pair with soft jingling bells', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000024', 'SJ-SR-001', '89010124', 'QR-SJ-SR-001', '925 Sterling Silver Gents Band', 'd0000000-0000-0000-0000-000000000011', 'Silver Rings', 'silver', '925_silver', 6.400, 0.000, 0.000, 6.400, 'grams', 40, 'flat', 220.00, 50.00, 2.00, 0.128, 1050.00, 1320.00, 1650.00, 1100.00, 10, 'Modern brushed matte finish 925 sterling silver finger band', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000025', 'SJ-SC-001', '89010125', 'QR-SJ-SC-001', '925 Silver Figaro Neck Chain', 'd0000000-0000-0000-0000-000000000012', 'Silver Chains', 'silver', '925_silver', 24.500, 0.000, 0.000, 24.500, 'grams', 20, 'flat', 450.00, 100.00, 2.00, 0.490, 3800.00, 4350.00, 5100.00, 4040.00, 5, 'Classic 20-inch 925 silver Italian Figaro pattern chain', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000026', 'SJ-SP-001', '89010126', 'QR-SJ-SP-001', '925 Pure Silver Kamatchi Vilakku (Pair)', 'd0000000-0000-0000-0000-000000000014', 'Silver Pooja Items', 'silver', '925_silver', 380.000, 0.000, 0.000, 380.000, 'grams', 12, 'per_gram', 22.00, 0.00, 2.50, 9.500, 61000.00, 69360.00, 78500.00, 62700.00, 3, 'Traditional deepam oil lamp pair with Goddess Kamakshi embossing', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000027', 'SJ-SP-002', '89010127', 'QR-SJ-SP-002', '925 Silver Pooja Thali Plate (10 inch)', 'd0000000-0000-0000-0000-000000000014', 'Silver Pooja Items', 'silver', '925_silver', 450.000, 0.000, 0.000, 450.000, 'grams', 8, 'per_gram', 24.00, 0.00, 2.50, 11.250, 72000.00, 82800.00, 93500.00, 74250.00, 2, 'Auspicious embossed Gayatri mantra pooja plate for prayer room', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000028', 'SJ-SP-003', '89010128', 'QR-SJ-SP-003', '925 Silver Kumkum & Chandan Chimizh', 'd0000000-0000-0000-0000-000000000014', 'Silver Pooja Items', 'silver', '925_silver', 65.000, 0.000, 0.000, 65.000, 'grams', 25, 'flat', 850.00, 150.00, 2.00, 1.300, 10200.00, 11200.00, 12800.00, 10725.00, 5, 'Two-cup silver kumkum box topped with peacock finial', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000029', 'SJ-SA-003', '89010129', 'QR-SJ-SA-003', '925 Silver Drinking Glass (Tumbler)', 'd0000000-0000-0000-0000-000000000013', 'Silver Articles', 'silver', '925_silver', 125.000, 0.000, 0.000, 125.000, 'grams', 18, 'flat', 1200.00, 200.00, 2.00, 2.500, 19500.00, 20900.00, 23800.00, 20625.00, 4, 'Heavy gauge pure silver drinking water tumbler with mirror polish', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000030', 'SJ-SA-004', '89010130', 'QR-SJ-SA-004', '925 Silver Baby Feeding Cup (Sangu)', 'd0000000-0000-0000-0000-000000000013', 'Silver Articles', 'silver', '925_silver', 48.000, 0.000, 0.000, 48.000, 'grams', 22, 'flat', 750.00, 150.00, 2.00, 0.960, 7500.00, 8400.00, 9600.00, 7920.00, 5, 'Traditional conch shaped Paladai / Sangu for baby milk feeding', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
-- 3. Certified Diamond Jewellery
('10000000-0000-0000-0000-000000000031', 'SJ-DR-001', '89010131', 'QR-SJ-DR-001', '18K Diamond Solitaire Ring (0.50 ct)', 'd0000000-0000-0000-0000-000000000015', 'Diamond Rings', 'gold', '18k', 4.200, 0.100, 0.000, 4.100, 'grams', 8, 'flat', 4500.00, 1000.00, 2.00, 0.082, 95000.00, 100500.00, 128000.00, 105000.00, 2, 'IGI certified VVS1-E brilliant round diamond in 18K white/yellow gold', 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000032', 'SJ-DR-002', '89010132', 'QR-SJ-DR-002', '18K Diamond Cluster Halo Ring', 'd0000000-0000-0000-0000-000000000015', 'Diamond Rings', 'gold', '18k', 5.100, 0.180, 0.000, 4.920, 'grams', 10, 'flat', 5200.00, 1200.00, 2.50, 0.123, 110000.00, 116400.00, 145000.00, 118000.00, 3, 'Sparkling cushion halo natural diamond cocktail ring for women', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000033', 'SJ-DE-001', '89010133', 'QR-SJ-DE-001', '18K Diamond Floral Stud Earrings', 'd0000000-0000-0000-0000-000000000016', 'Diamond Earrings', 'gold', '18k', 3.800, 0.150, 0.000, 3.650, 'grams', 12, 'flat', 3800.00, 800.00, 2.00, 0.073, 78000.00, 82600.00, 98500.00, 84000.00, 3, 'Seven-stone floral diamond ear studs with screw backing', 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000034', 'SJ-DE-002', '89010134', 'QR-SJ-DE-002', '18K Diamond Drop Hangings', 'd0000000-0000-0000-0000-000000000016', 'Diamond Earrings', 'gold', '18k', 6.200, 0.280, 0.000, 5.920, 'grams', 6, 'flat', 6500.00, 1500.00, 3.00, 0.178, 135000.00, 143000.00, 172000.00, 145000.00, 2, 'Elegant linear cascade diamond hanging earrings for receptions', 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000035', 'SJ-DP-001', '89010135', 'QR-SJ-DP-001', '18K Diamond Solitaire Pendant', 'd0000000-0000-0000-0000-000000000017', 'Diamond Pendants', 'gold', '18k', 2.800, 0.090, 0.000, 2.710, 'grams', 14, 'flat', 2900.00, 600.00, 2.00, 0.054, 58000.00, 61500.00, 74500.00, 62000.00, 4, 'Classic prong set diamond pendant suitable for delicate chains', 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000036', 'SJ-DP-002', '89010136', 'QR-SJ-DP-002', '18K Diamond Heart Locket', 'd0000000-0000-0000-0000-000000000017', 'Diamond Pendants', 'gold', '18k', 3.400, 0.140, 0.000, 3.260, 'grams', 10, 'flat', 3400.00, 700.00, 2.00, 0.065, 72000.00, 76100.00, 89000.00, 75000.00, 3, 'Romantic pavé diamond heart-shaped pendant in rose gold', 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=500&auto=format&fit=crop&q=60', 'in_stock'),
-- 4. Bullion Coins & Medallions
('10000000-0000-0000-0000-000000000037', 'SJ-CN-001', '89010137', 'QR-SJ-CN-001', '24K Lakshmi Gold Coin 5g', 'd0000000-0000-0000-0000-000000000018', 'Coins', 'gold', '24k', 5.000, 0.000, 0.000, 5.000, 'grams', 35, 'flat', 450.00, 0.00, 0.00, 0.000, 65000.00, 65450.00, 68500.00, 66250.00, 10, '999 fine pure 24K gold Lakshmi coin with tamper-proof certicard', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000038', 'SJ-CN-002', '89010138', 'QR-SJ-CN-002', '24K Lakshmi Gold Coin 8g (1 Sovereign)', 'd0000000-0000-0000-0000-000000000018', 'Coins', 'gold', '24k', 8.000, 0.000, 0.000, 8.000, 'grams', 25, 'flat', 650.00, 0.00, 0.00, 0.000, 104000.00, 104650.00, 109500.00, 106000.00, 8, 'Full sovereign (8 grams) 999 certified 24K Lakshmi gold bullion coin', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000039', 'SJ-CN-003', '89010139', 'QR-SJ-CN-003', '24K Ganesha Gold Coin 10g', 'd0000000-0000-0000-0000-000000000018', 'Coins', 'gold', '24k', 10.000, 0.000, 0.000, 10.000, 'grams', 20, 'flat', 800.00, 0.00, 0.00, 0.000, 130000.00, 130800.00, 136800.00, 132500.00, 5, '10g 999.9 pure investment gold bar/coin with Lord Ganesha motif', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000040', 'SJ-CN-004', '89010140', 'QR-SJ-CN-004', '999 Pure Silver Coin 50g', 'd0000000-0000-0000-0000-000000000018', 'Coins', 'silver', '999_silver', 50.000, 0.000, 0.000, 50.000, 'grams', 50, 'flat', 250.00, 0.00, 0.00, 0.000, 8000.00, 8250.00, 9100.00, 8250.00, 15, '999 fine silver round coin featuring Lakshmi & Ganesha for gifting', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000041', 'SJ-CN-005', '89010141', 'QR-SJ-CN-005', '999 Pure Silver Coin 100g', 'd0000000-0000-0000-0000-000000000018', 'Coins', 'silver', '999_silver', 100.000, 0.000, 0.000, 100.000, 'grams', 40, 'flat', 450.00, 0.00, 0.00, 0.000, 16000.00, 16450.00, 18100.00, 16500.00, 10, '100g 999 fine silver bullion bar with hallmark certification', 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60', 'in_stock'),
('10000000-0000-0000-0000-000000000042', 'SJ-CUS-001', '89010142', 'QR-SJ-CUS-001', '22K Custom Designed Vanki Ring', 'd0000000-0000-0000-0000-000000000020', 'Custom Jewellery', 'gold', '22k', 6.200, 0.400, 0.000, 5.800, 'grams', 7, 'flat', 1100.00, 250.00, 4.00, 0.232, 67000.00, 68350.00, 77500.00, 70500.00, 2, 'Artisan custom crafted Vanki finger ring with traditional V-shape design', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=60', 'in_stock')
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    category_name = EXCLUDED.category_name,
    metal_type = EXCLUDED.metal_type,
    purity = EXCLUDED.purity,
    gross_weight_g = EXCLUDED.gross_weight_g,
    net_weight_g = EXCLUDED.net_weight_g,
    making_charge_rate = EXCLUDED.making_charge_rate,
    retail_price = EXCLUDED.retail_price,
    wholesale_valuation = EXCLUDED.wholesale_valuation,
    quantity = EXCLUDED.quantity;

-- 8. RAW METAL & INVENTORY PURCHASES (18 Realistic Transactions June → September 2026)
INSERT INTO purchases (
    id, purchase_number, purchase_date, supplier_id, supplier_name, supplier_phone,
    supplier_invoice_number, metal_type, purity, gross_weight_g, deduction_weight_g,
    net_weight_g, purchase_rate_per_gram, total_cost, amount_paid, balance_payable,
    payment_status, payment_method, notes, stock_added
) VALUES
('20000000-0000-0000-0000-000000000001', 'DEMO-PUR-2026-001', '2026-06-05', 'e0000000-0000-0000-0000-000000000001', 'Sri Lakshmi Gold Works', '+91 94432 50001', 'LGW/26/0412', 'gold', '24k', 124.700, 0.000, 124.700, 10750.00, 1340525.00, 1340525.00, 0.00, 'paid', 'bank_transfer', '24K 999.9 gold casting grains batch', true),
('20000000-0000-0000-0000-000000000002', 'DEMO-PUR-2026-002', '2026-06-14', 'e0000000-0000-0000-0000-000000000006', 'Trichy Gold & Silver Works', '+91 94432 50006', 'TGS/26/109', 'silver', '925_silver', 850.000, 0.000, 850.000, 137.00, 116450.00, 116450.00, 0.00, 'paid', 'bank_transfer', 'Silver anklets & cups initial wholesale stock', true),
('20000000-0000-0000-0000-000000000003', 'DEMO-PUR-2026-003', '2026-06-22', 'e0000000-0000-0000-0000-000000000003', 'Chennai Bullion House', '+91 94432 50003', 'CBH/IN/9801', 'gold', '24k', 80.000, 0.000, 80.000, 11150.00, 892000.00, 500000.00, 392000.00, 'partial', 'bank_transfer', '10 x 8g Sovereign Gold Bars', true),
('20000000-0000-0000-0000-000000000004', 'DEMO-PUR-2026-004', '2026-07-02', 'e0000000-0000-0000-0000-000000000002', 'Tamil Gold Traders', '+91 94432 50002', 'TGT/26/551', 'gold', '22k', 95.500, 1.200, 94.300, 10500.00, 990150.00, 990150.00, 0.00, 'paid', 'bank_transfer', 'Finished 22K chains and daily wear rings', true),
('20000000-0000-0000-0000-000000000005', 'DEMO-PUR-2026-005', '2026-07-12', 'e0000000-0000-0000-0000-000000000008', 'Sri Vinayaga Bullion', '+91 94432 50008', 'SVB/JUL/22', 'silver', '999_silver', 1500.000, 0.000, 1500.000, 145.00, 217500.00, 150000.00, 67500.00, 'partial', 'bank_transfer', '1.5 kg Pure Silver Bars for pooja articles', true),
('20000000-0000-0000-0000-000000000006', 'DEMO-PUR-2026-006', '2026-07-20', 'e0000000-0000-0000-0000-000000000004', 'Kaveri Jewellery Manufacturers', '+91 94432 50004', 'KJM/2026/89', 'gold', '22k', 140.000, 2.500, 137.500, 10750.00, 1478125.00, 1478125.00, 0.00, 'paid', 'bank_transfer', 'Antique Bridal Choker Sets and bangles', true),
('20000000-0000-0000-0000-000000000007', 'DEMO-PUR-2026-007', '2026-07-28', 'e0000000-0000-0000-0000-000000000007', 'Classic Diamond Suppliers', '+91 94432 50007', 'CDS/07/341', 'gold', '18k', 28.500, 1.200, 27.300, 8900.00, 242970.00, 242970.00, 0.00, 'paid', 'bank_transfer', 'Diamond mounted rings and stud mounts', true),
('20000000-0000-0000-0000-000000000008', 'DEMO-PUR-2026-008', '2026-08-04', 'e0000000-0000-0000-0000-000000000005', 'Southern Gold Suppliers', '+91 94432 50005', 'SGS/26/1102', 'gold', '22k', 110.000, 1.800, 108.200, 11100.00, 1201020.00, 800000.00, 401020.00, 'partial', 'bank_transfer', 'Gents solid bracelets and chains', true),
('20000000-0000-0000-0000-000000000009', 'DEMO-PUR-2026-009', '2026-08-11', 'e0000000-0000-0000-0000-000000000001', 'Sri Lakshmi Gold Works', '+91 94432 50001', 'LGW/26/0615', 'gold', '24k', 60.000, 0.000, 60.000, 12250.00, 735000.00, 735000.00, 0.00, 'paid', 'bank_transfer', '24K fine gold for goldsmith job cards', true),
('20000000-0000-0000-0000-000000000010', 'DEMO-PUR-2026-010', '2026-08-18', 'e0000000-0000-0000-0000-000000000009', 'Kongu Bullion Refinery', '+91 94432 50009', 'KBR/26/410', 'gold', '24k', 100.000, 0.000, 100.000, 12400.00, 1240000.00, 1240000.00, 0.00, 'paid', 'bank_transfer', 'TT Bullion bar 100g 999.9', true),
('20000000-0000-0000-0000-000000000011', 'DEMO-PUR-2026-011', '2026-08-26', 'e0000000-0000-0000-0000-000000000006', 'Trichy Gold & Silver Works', '+91 94432 50006', 'TGS/26/220', 'silver', '925_silver', 2200.000, 0.000, 2200.000, 156.00, 343200.00, 343200.00, 0.00, 'paid', 'bank_transfer', 'Pooja Thali plates and Kamatchi vilakku batch', true),
('20000000-0000-0000-0000-000000000012', 'DEMO-PUR-2026-012', '2026-09-02', 'e0000000-0000-0000-0000-000000000003', 'Chennai Bullion House', '+91 94432 50003', 'CBH/IN/1042', 'gold', '24k', 50.000, 0.000, 50.000, 12800.00, 640000.00, 640000.00, 0.00, 'paid', 'bank_transfer', 'Investment coins stock replenishment', true),
('20000000-0000-0000-0000-000000000013', 'DEMO-PUR-2026-013', '2026-09-08', 'e0000000-0000-0000-0000-000000000004', 'Kaveri Jewellery Manufacturers', '+91 94432 50004', 'KJM/2026/142', 'gold', '22k', 125.000, 2.000, 123.000, 11900.00, 1463700.00, 1000000.00, 463700.00, 'partial', 'bank_transfer', 'Festival season Kasu Malai and Mango Harams', true),
('20000000-0000-0000-0000-000000000014', 'DEMO-PUR-2026-014', '2026-09-12', 'e0000000-0000-0000-0000-000000000010', 'Meenakshi Goldsmith Guild', '+91 94432 50010', 'MGG/SEP/09', 'gold', '22k', 45.000, 0.800, 44.200, 12000.00, 530400.00, 530400.00, 0.00, 'paid', 'bank_transfer', 'Handmade Lakshmi pendants and Jimikki Kammals', true),
('20000000-0000-0000-0000-000000000015', 'DEMO-PUR-2026-015', '2026-09-15', 'e0000000-0000-0000-0000-000000000007', 'Classic Diamond Suppliers', '+91 94432 50007', 'CDS/09/512', 'gold', '18k', 32.000, 1.500, 30.500, 9800.00, 298900.00, 150000.00, 148900.00, 'partial', 'bank_transfer', 'Certified solitaire rings and pendants lot', true),
('20000000-0000-0000-0000-000000000016', 'DEMO-PUR-2026-016', '2026-09-18', 'e0000000-0000-0000-0000-000000000008', 'Sri Vinayaga Bullion', '+91 94432 50008', 'SVB/SEP/41', 'silver', '999_silver', 2000.000, 0.000, 2000.000, 163.00, 326000.00, 326000.00, 0.00, 'paid', 'bank_transfer', '2 kg 999 Fine Silver Bars', true),
('20000000-0000-0000-0000-000000000017', 'DEMO-PUR-2026-017', '2026-09-20', 'e0000000-0000-0000-0000-000000000002', 'Tamil Gold Traders', '+91 94432 50002', 'TGT/26/789', 'gold', '22k', 65.000, 0.900, 64.100, 12100.00, 775610.00, 500000.00, 275610.00, 'partial', 'bank_transfer', 'Fast-moving 22K ladies rings & baby bangles', true),
('20000000-0000-0000-0000-000000000018', 'DEMO-PUR-2026-018', '2026-09-21', 'e0000000-0000-0000-0000-000000000005', 'Southern Gold Suppliers', '+91 94432 50005', 'SGS/26/1344', 'gold', '24k', 40.000, 0.000, 40.000, 13200.00, 528000.00, 0.00, 528000.00, 'unpaid', 'bank_transfer', 'Fresh 24K gold consignment on credit payment terms', true)
ON CONFLICT (purchase_number) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    total_cost = EXCLUDED.total_cost,
    amount_paid = EXCLUDED.amount_paid,
    balance_payable = EXCLUDED.balance_payable,
    payment_status = EXCLUDED.payment_status;

-- 9. PURCHASE PAYMENTS (Reconciling Partial & Full Payments to Suppliers)
INSERT INTO purchase_payments (id, purchase_id, payment_date, amount, payment_mode, reference_number, notes) VALUES
('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2026-06-05', 1340525.00, 'bank_transfer', 'NEFT/SBI/817263101', 'Full payment via NEFT to Sri Lakshmi Gold Works'),
('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '2026-06-14', 116450.00, 'bank_transfer', 'RTGS/SBI/991823712', 'Full payment to Trichy Gold Works'),
('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '2026-06-22', 500000.00, 'bank_transfer', 'NEFT/SBI/771829101', 'Advance / Part payment to Chennai Bullion House'),
('21000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '2026-07-02', 990150.00, 'bank_transfer', 'RTGS/SBI/120938172', 'Full settlement to Tamil Gold Traders'),
('21000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '2026-07-12', 150000.00, 'bank_transfer', 'NEFT/SBI/441209871', 'Part payment for silver bars'),
('21000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', '2026-07-20', 1478125.00, 'bank_transfer', 'RTGS/SBI/551982736', 'Full payment for Bridal Gold Necklace batch'),
('21000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', '2026-07-28', 242970.00, 'bank_transfer', 'NEFT/SBI/661829012', 'Full payment for 18K Diamond mounts'),
('21000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000008', '2026-08-04', 800000.00, 'bank_transfer', 'RTGS/SBI/881290345', 'Part payment to Southern Gold Suppliers'),
('21000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', '2026-08-11', 735000.00, 'bank_transfer', 'RTGS/SBI/991209843', 'Settlement for 24K gold grains'),
('21000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000010', '2026-08-18', 1240000.00, 'bank_transfer', 'RTGS/SBI/110928374', 'Full settlement for 100g Bullion bar'),
('21000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000011', '2026-08-26', 343200.00, 'bank_transfer', 'NEFT/SBI/220918273', 'Full payment for pooja silver articles'),
('21000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000012', '2026-09-02', 640000.00, 'bank_transfer', 'RTGS/SBI/330918274', 'Gold coin replenishment payment'),
('21000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000013', '2026-09-08', 1000000.00, 'bank_transfer', 'RTGS/SBI/440918275', 'Part payment for festival kasu malai lot'),
('21000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000014', '2026-09-12', 530400.00, 'bank_transfer', 'NEFT/SBI/550918276', 'Full payment to Meenakshi Goldsmith Guild'),
('21000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000015', '2026-09-15', 150000.00, 'bank_transfer', 'NEFT/SBI/660918277', 'Advance payment for diamond solitaire mounts'),
('21000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000016', '2026-09-18', 326000.00, 'bank_transfer', 'RTGS/SBI/770918278', 'Full payment for 2kg silver bullion bars'),
('21000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000017', '2026-09-20', 500000.00, 'bank_transfer', 'NEFT/SBI/880918279', 'Part payment for fast moving rings')
ON CONFLICT (id) DO NOTHING;

-- 10. RETAIL SALES & INVOICES (38 Realistic Invoices Across June → September 2026)
-- Including Invoice #38 Hero Transaction for Priya Suresh valued at ~₹10.45 Lakhs
INSERT INTO retail_invoices (
    id, invoice_number, customer_id, customer_name, customer_phone, invoice_date,
    subtotal_metal_value, total_making_charges, total_labour_charges, total_wastage_value,
    discount_amount, tax_percent, tax_amount, round_off, total_amount, paid_amount, balance_due,
    payment_status, status, notes
) VALUES
-- June Invoices
('30000000-0000-0000-0000-000000000001', 'SJ-INV-2026-001', 'f0000000-0000-0000-0000-000000000001', 'Rahul Krishnan', '+91 98421 11001', '2026-06-06', 56218.00, 850.00, 150.00, 1968.00, 0.00, 3.00, 1775.00, -11.00, 60950.00, 60950.00, 0.00, 'paid', 'finalized', '22K Classic Gold Ring'),
('30000000-0000-0000-0000-000000000002', 'SJ-INV-2026-002', 'f0000000-0000-0000-0000-000000000003', 'Aravind Kumar', '+91 98421 11003', '2026-06-11', 180638.00, 2700.00, 500.00, 7226.00, 1000.00, 3.00, 5702.00, -66.00, 195700.00, 195700.00, 0.00, 'paid', 'finalized', '22K Lakshmi Gold Chain (With old gold exchange)'),
('30000000-0000-0000-0000-000000000003', 'SJ-INV-2026-003', 'f0000000-0000-0000-0000-000000000004', 'Divya Raj', '+91 98421 11004', '2026-06-15', 9270.00, 950.00, 200.00, 185.00, 0.00, 3.00, 318.00, -23.00, 10900.00, 10900.00, 0.00, 'paid', 'finalized', '925 Silver Peacock Anklets'),
('30000000-0000-0000-0000-000000000004', 'SJ-INV-2026-004', 'f0000000-0000-0000-0000-000000000005', 'Karthik M', '+91 98421 11005', '2026-06-22', 248880.00, 3900.00, 600.00, 11200.00, 1500.00, 3.00, 7892.00, 28.00, 271000.00, 150000.00, 121000.00, 'partial', 'finalized', '22K Traditional Gold Bangle pair'),
('30000000-0000-0000-0000-000000000005', 'SJ-INV-2026-005', 'f0000000-0000-0000-0000-000000000006', 'Meena Lakshmi', '+91 98421 11006', '2026-06-25', 46410.00, 720.00, 180.00, 1392.00, 0.00, 3.00, 1461.00, 37.00, 50200.00, 50200.00, 0.00, 'paid', 'finalized', '22K Daily Wear Gold Earrings'),
('30000000-0000-0000-0000-000000000006', 'SJ-INV-2026-006', 'f0000000-0000-0000-0000-000000000007', 'Vignesh R', '+91 98421 11007', '2026-06-28', 51900.00, 450.00, 0.00, 0.00, 0.00, 3.00, 1571.00, 79.00, 54000.00, 54000.00, 0.00, 'paid', 'finalized', '24K Lakshmi Gold Coin 5g'),
-- July Invoices
('30000000-0000-0000-0000-000000000007', 'SJ-INV-2026-007', 'f0000000-0000-0000-0000-000000000008', 'Anitha Kumar', '+91 98421 11008', '2026-07-03', 145905.00, 2400.00, 450.00, 7295.00, 500.00, 3.00, 4667.00, -17.00, 160200.00, 160200.00, 0.00, 'paid', 'finalized', '22K Antique Jimikki Kammal'),
('30000000-0000-0000-0000-000000000008', 'SJ-INV-2026-008', 'f0000000-0000-0000-0000-000000000009', 'Suresh Babu', '+91 98421 11009', '2026-07-08', 341250.00, 5850.00, 0.00, 13650.00, 2000.00, 3.00, 10763.00, 87.00, 369600.00, 250000.00, 119600.00, 'partial', 'finalized', '22K Mens Solid Rope Chain'),
('30000000-0000-0000-0000-000000000009', 'SJ-INV-2026-009', 'f0000000-0000-0000-0000-000000000010', 'Kavya Srinivasan', '+91 98421 11010', '2026-07-12', 43990.00, 680.00, 120.00, 1540.00, 0.00, 3.00, 1390.00, 80.00, 47800.00, 47800.00, 0.00, 'paid', 'finalized', '22K Peacock Womens Ring'),
('30000000-0000-0000-0000-000000000010', 'SJ-INV-2026-010', 'f0000000-0000-0000-0000-000000000011', 'Naveen Raj', '+91 98421 11011', '2026-07-16', 75260.00, 1200.00, 300.00, 3010.00, 0.00, 3.00, 2393.00, 37.00, 82200.00, 82200.00, 0.00, 'paid', 'finalized', '22K Mens Navaratna Ring'),
('30000000-0000-0000-0000-000000000011', 'SJ-INV-2026-011', 'f0000000-0000-0000-0000-000000000012', 'Deepa S', '+91 98421 11012', '2026-07-20', 65475.00, 950.00, 150.00, 2619.00, 0.00, 3.00, 2076.00, 30.00, 71300.00, 71300.00, 0.00, 'paid', 'finalized', '22K Lakshmi Gold Pendant'),
('30000000-0000-0000-0000-000000000012', 'SJ-INV-2026-012', 'f0000000-0000-0000-0000-000000000013', 'Hari Prasad', '+91 98421 11013', '2026-07-24', 244080.00, 4407.00, 0.00, 10984.00, 1000.00, 3.00, 7754.00, -25.00, 266200.00, 180000.00, 86200.00, 'partial', 'finalized', '22K Gents Gold Bracelet'),
('30000000-0000-0000-0000-000000000013', 'SJ-INV-2026-013', 'f0000000-0000-0000-0000-000000000014', 'Swetha R', '+91 98421 11014', '2026-07-27', 35700.00, 4500.00, 1000.00, 714.00, 0.00, 3.00, 1257.00, 29.00, 43200.00, 43200.00, 0.00, 'paid', 'finalized', '18K Diamond Solitaire Ring'),
('30000000-0000-0000-0000-000000000014', 'SJ-INV-2026-014', 'f0000000-0000-0000-0000-000000000015', 'Manoj Kumar', '+91 98421 11015', '2026-07-30', 55160.00, 850.00, 150.00, 1931.00, 0.00, 3.00, 1743.00, 66.00, 59900.00, 59900.00, 0.00, 'paid', 'finalized', '22K Classic Gold Ring'),
-- August Invoices
('30000000-0000-0000-0000-000000000015', 'SJ-INV-2026-015', 'f0000000-0000-0000-0000-000000000016', 'Geetha Ramanathan', '+91 98421 11016', '2026-08-03', 531690.00, 8500.00, 1500.00, 26585.00, 3000.00, 3.00, 16958.00, 67.00, 582300.00, 582300.00, 0.00, 'paid', 'finalized', '22K Bridal Gold Necklace Set'),
('30000000-0000-0000-0000-000000000016', 'SJ-INV-2026-016', 'f0000000-0000-0000-0000-000000000017', 'Balaji Venkat', '+91 98421 11017', '2026-08-07', 90800.00, 650.00, 0.00, 0.00, 0.00, 3.00, 2744.00, 6.00, 94200.00, 94200.00, 0.00, 'paid', 'finalized', '24K Lakshmi Gold Coin Sovereign 8g'),
('30000000-0000-0000-0000-000000000017', 'SJ-INV-2026-017', 'f0000000-0000-0000-0000-000000000018', 'Malathi Sundar', '+91 98421 11018', '2026-08-11', 270740.00, 3900.00, 600.00, 12183.00, 1000.00, 3.00, 8593.00, 84.00, 295100.00, 200000.00, 95100.00, 'partial', 'finalized', '22K Traditional Gold Bangle pair'),
('30000000-0000-0000-0000-000000000018', 'SJ-INV-2026-018', 'f0000000-0000-0000-0000-000000000019', 'Ramesh Sundaram', '+91 98421 11019', '2026-08-14', 59150.00, 820.00, 130.00, 2070.00, 0.00, 3.00, 1865.00, 65.00, 64100.00, 64100.00, 0.00, 'paid', 'finalized', '22K Lord Ganesha Gold Pendant'),
('30000000-0000-0000-0000-000000000019', 'SJ-INV-2026-019', 'f0000000-0000-0000-0000-000000000020', 'Sindhu Murugan', '+91 98421 11020', '2026-08-18', 62160.00, 980.00, 200.00, 2486.00, 0.00, 3.00, 1975.00, -1.00, 67800.00, 67800.00, 0.00, 'paid', 'finalized', '22K Kids Gold Nazariya Bangles'),
('30000000-0000-0000-0000-000000000020', 'SJ-INV-2026-020', 'f0000000-0000-0000-0000-000000000001', 'Rahul Krishnan', '+91 98421 11001', '2026-08-22', 205435.00, 2700.00, 500.00, 8217.00, 1500.00, 3.00, 6461.00, 87.00, 221900.00, 120000.00, 101900.00, 'partial', 'finalized', '22K Lakshmi Gold Chain'),
('30000000-0000-0000-0000-000000000021', 'SJ-INV-2026-021', 'f0000000-0000-0000-0000-000000000002', 'Priya Suresh', '+91 98421 11002', '2026-08-25', 194085.00, 3100.00, 600.00, 10675.00, 1000.00, 3.00, 6224.00, 16.00, 213700.00, 213700.00, 0.00, 'paid', 'finalized', '22K Gold Chandbali Earrings'),
('30000000-0000-0000-0000-000000000022', 'SJ-INV-2026-022', 'f0000000-0000-0000-0000-000000000003', 'Aravind Kumar', '+91 98421 11003', '2026-08-28', 58740.00, 22.00 * 380, 0.00, 1469.00, 0.00, 3.00, 2057.00, 74.00, 70700.00, 70700.00, 0.00, 'paid', 'finalized', '925 Pure Silver Kamatchi Vilakku Pair'),
-- September Invoices
('30000000-0000-0000-0000-000000000023', 'SJ-INV-2026-023', 'f0000000-0000-0000-0000-000000000004', 'Divya Raj', '+91 98421 11004', '2026-09-01', 53690.00, 720.00, 180.00, 1611.00, 0.00, 3.00, 1686.00, 13.00, 57900.00, 57900.00, 0.00, 'paid', 'finalized', '22K Daily Wear Gold Earrings'),
('30000000-0000-0000-0000-000000000024', 'SJ-INV-2026-024', 'f0000000-0000-0000-0000-000000000005', 'Karthik M', '+91 98421 11005', '2026-09-04', 120360.00, 160.00 * 10.2, 0.00, 4213.00, 500.00, 3.00, 3819.00, 76.00, 131600.00, 80000.00, 51600.00, 'partial', 'finalized', '22K Sleek Daily Wear Gold Chain'),
('30000000-0000-0000-0000-000000000025', 'SJ-INV-2026-025', 'f0000000-0000-0000-0000-000000000006', 'Meena Lakshmi', '+91 98421 11006', '2026-09-06', 72000.00, 24.00 * 450, 0.00, 1800.00, 0.00, 3.00, 2538.00, 62.00, 87200.00, 87200.00, 0.00, 'paid', 'finalized', '925 Silver Pooja Thali Plate'),
('30000000-0000-0000-0000-000000000026', 'SJ-INV-2026-026', 'f0000000-0000-0000-0000-000000000007', 'Vignesh R', '+91 98421 11007', '2026-09-08', 66670.00, 850.00, 150.00, 2333.00, 0.00, 3.00, 2100.00, -3.00, 72100.00, 72100.00, 0.00, 'paid', 'finalized', '22K Classic Gold Ring'),
('30000000-0000-0000-0000-000000000027', 'SJ-INV-2026-027', 'f0000000-0000-0000-0000-000000000008', 'Anitha Kumar', '+91 98421 11008', '2026-09-10', 33945.00, 3800.00, 800.00, 679.00, 0.00, 3.00, 1177.00, 99.00, 40500.00, 40500.00, 0.00, 'paid', 'finalized', '18K Diamond Floral Stud Earrings'),
('30000000-0000-0000-0000-000000000028', 'SJ-INV-2026-028', 'f0000000-0000-0000-0000-000000000009', 'Suresh Babu', '+91 98421 11009', '2026-09-12', 482620.00, 6500.00, 1200.00, 28957.00, 2000.00, 3.00, 15518.00, 5.00, 532800.00, 350000.00, 182800.00, 'partial', 'finalized', '22K Antique Lakshmi Kada'),
('30000000-0000-0000-0000-000000000029', 'SJ-INV-2026-029', 'f0000000-0000-0000-0000-000000000010', 'Kavya Srinivasan', '+91 98421 11010', '2026-09-14', 161660.00, 2400.00, 450.00, 8083.00, 500.00, 3.00, 5163.00, 44.00, 177300.00, 177300.00, 0.00, 'paid', 'finalized', '22K Antique Jimikki Kammal'),
('30000000-0000-0000-0000-000000000030', 'SJ-INV-2026-030', 'f0000000-0000-0000-0000-000000000011', 'Naveen Raj', '+91 98421 11011', '2026-09-16', 73200.00, 950.00, 150.00, 2928.00, 0.00, 3.00, 2317.00, 55.00, 79600.00, 79600.00, 0.00, 'paid', 'finalized', '22K Lakshmi Gold Pendant'),
('30000000-0000-0000-0000-000000000031', 'SJ-INV-2026-031', 'f0000000-0000-0000-0000-000000000012', 'Deepa S', '+91 98421 11012', '2026-09-17', 287920.00, 3900.00, 600.00, 12956.00, 1000.00, 3.00, 9131.00, 93.00, 313600.00, 200000.00, 113600.00, 'partial', 'finalized', '22K Traditional Gold Bangle pair'),
('30000000-0000-0000-0000-000000000032', 'SJ-INV-2026-032', 'f0000000-0000-0000-0000-000000000013', 'Hari Prasad', '+91 98421 11013', '2026-09-18', 68470.00, 1100.00, 250.00, 2739.00, 0.00, 3.00, 2177.00, 64.00, 74800.00, 74800.00, 0.00, 'paid', 'finalized', '22K Custom Vanki Ring'),
('30000000-0000-0000-0000-000000000033', 'SJ-INV-2026-033', 'f0000000-0000-0000-0000-000000000014', 'Swetha R', '+91 98421 11014', '2026-09-19', 26860.00, 2900.00, 600.00, 537.00, 0.00, 3.00, 927.00, 76.00, 31900.00, 31900.00, 0.00, 'paid', 'finalized', '18K Diamond Solitaire Pendant'),
('30000000-0000-0000-0000-000000000034', 'SJ-INV-2026-034', 'f0000000-0000-0000-0000-000000000015', 'Manoj Kumar', '+91 98421 11015', '2026-09-20', 131500.00, 800.00, 0.00, 0.00, 0.00, 3.00, 3969.00, 31.00, 136300.00, 136300.00, 0.00, 'paid', 'finalized', '24K Ganesha Gold Coin 10g'),
('30000000-0000-0000-0000-000000000035', 'SJ-INV-2026-035', 'f0000000-0000-0000-0000-000000000001', 'Rahul Krishnan', '+91 98421 11001', '2026-09-21', 68648.00, 850.00, 150.00, 2403.00, 0.00, 3.00, 2162.00, 37.00, 74250.00, 74250.00, 0.00, 'paid', 'finalized', '22K Classic Gold Ring'),
('30000000-0000-0000-0000-000000000036', 'SJ-INV-2026-036', 'f0000000-0000-0000-0000-000000000016', 'Geetha Ramanathan', '+91 98421 11016', '2026-09-22', 11220.00, 950.00, 200.00, 224.00, 0.00, 3.00, 378.00, 28.00, 13000.00, 13000.00, 0.00, 'paid', 'finalized', '925 Silver Peacock Anklets'),
('30000000-0000-0000-0000-000000000037', 'SJ-INV-2026-037', 'f0000000-0000-0000-0000-000000000003', 'Aravind Kumar', '+91 98421 11003', '2026-09-22', 219915.00, 2700.00, 500.00, 8797.00, 1000.00, 3.00, 6927.00, 61.00, 237900.00, 237900.00, 0.00, 'paid', 'finalized', '22K Lakshmi Gold Chain (Old Gold Exchanged)'),
-- 38. VISUALLY IMPRESSIVE HERO TRANSACTION (Priya Suresh - ₹10,45,000 Bridal Package)
('30000000-0000-0000-0000-000000000038', 'SJ-INV-2026-038', 'f0000000-0000-0000-0000-000000000002', 'Priya Suresh', '+91 98421 11002', '2026-09-22',
938500.00, 18700.00, 3600.00, 54500.00, 5000.00, 3.00, 30309.00, 391.00, 1045000.00, 700000.00, 345000.00,
'partial', 'finalized', 'Grand Bridal Jewellery Package: Bridal Choker Necklace + Antique Bangles + Jimikki Kammal + Diamond Solitaire Pendant. Split payment: ₹5L UPI + ₹2L Card + Balance ₹3.45L Due')
ON CONFLICT (invoice_number) DO UPDATE SET
    customer_name = EXCLUDED.customer_name,
    invoice_date = EXCLUDED.invoice_date,
    total_amount = EXCLUDED.total_amount,
    paid_amount = EXCLUDED.paid_amount,
    balance_due = EXCLUDED.balance_due,
    payment_status = EXCLUDED.payment_status;

-- 11. HERO INVOICE LINE ITEMS (SJ-INV-2026-038)
INSERT INTO retail_invoice_items (
    id, invoice_id, product_id, product_name_snapshot, sku_snapshot, metal_type, purity,
    gross_weight_g, stone_weight_g, net_weight_g, quantity, metal_rate_snapshot, metal_value,
    making_charge, labour_charge, wastage_percent, wastage_weight_g, wastage_value, discount, line_total
) VALUES
('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000038', '10000000-0000-0000-0000-000000000005', '22K Bridal Gold Necklace', 'SJ-GN-001', 'gold', '22k', 48.600, 0.700, 47.900, 1, 12150.00, 581985.00, 8500.00, 1500.00, 5.00, 2.395, 29099.00, 2500.00, 618584.00),
('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000038', '10000000-0000-0000-0000-000000000003', '22K Traditional Gold Bangle', 'SJ-GB-001', 'gold', '22k', 24.800, 0.400, 24.400, 1, 12150.00, 296460.00, 3900.00, 600.00, 4.50, 1.098, 13341.00, 1500.00, 312801.00),
('31000000-0000-0000-0000-000000000033', '30000000-0000-0000-0000-000000000038', '10000000-0000-0000-0000-000000000012', '22K Antique Jimikki Kammal', 'SJ-GE-002', 'gold', '22k', 14.500, 0.800, 13.700, 1, 12150.00, 166455.00, 2400.00, 450.00, 5.00, 0.685, 8323.00, 500.00, 177128.00),
('31000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000038', '10000000-0000-0000-0000-000000000035', '18K Diamond Solitaire Pendant', 'SJ-DP-001', 'gold', '18k', 2.800, 0.090, 2.710, 1, 9950.00, 26965.00, 2900.00, 600.00, 2.00, 0.054, 539.00, 500.00, 30504.00)
ON CONFLICT (id) DO NOTHING;

-- 12. RETAIL PAYMENTS (Including Multi-Mode, Split UPI+Card, and Old Gold Exchanges)
INSERT INTO retail_payments (id, invoice_id, payment_date, amount, payment_mode, reference_number, notes) VALUES
-- Multi-Mode Split Payments for Hero Invoice #38
('32000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000038', '2026-09-22', 500000.00, 'upi', 'UPI/GPay/928172645012', 'GPay UPI Instant Transfer from Priya Suresh'),
('32000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000038', '2026-09-22', 200000.00, 'card', 'POS/HDFC/TXN-882194', 'HDFC Bank Credit Card Swipe - Auth #882194'),
-- Old Gold Exchange Transactions (Old jewellery deducted from invoice)
('32000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '2026-06-11', 115000.00, 'exchange_gold', 'EXCH-OG-2026-01', 'Old Gold Exchange: 12.20g 22K melting purity credited towards new chain'),
('32000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '2026-06-11', 80700.00, 'upi', 'UPI/PhonePe/918274619', 'Balance payment via PhonePe'),
('32000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000037', '2026-09-22', 175000.00, 'exchange_gold', 'EXCH-OG-2026-02', 'Aravind Kumar: 22K old gold 18.50g gross (touch 91.6%, 2% deduction) exchanged at ₹12,150/g'),
('32000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000037', '2026-09-22', 62900.00, 'upi', 'UPI/GPay/339182746', 'Balance settlement via GPay UPI'),
-- Other Standard Payments
('32000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000001', '2026-06-06', 60950.00, 'upi', 'UPI/SBI/12093817', 'Full payment by Rahul Krishnan via UPI'),
('32000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000003', '2026-06-15', 10900.00, 'cash', 'CASH-REC-1003', 'Counter cash receipt'),
('32000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000004', '2026-06-22', 150000.00, 'bank_transfer', 'IMPS/81928374', 'Advance payment by Karthik M'),
('32000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000005', '2026-06-25', 50200.00, 'card', 'POS/ICICI/5512', 'Debit card swipe'),
('32000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000006', '2026-06-28', 54000.00, 'upi', 'UPI/GPay/661290', 'GPay by Vignesh R'),
('32000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000008', '2026-07-08', 250000.00, 'bank_transfer', 'NEFT/Axis/991283', 'Part payment by Suresh Babu'),
('32000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000012', '2026-07-24', 180000.00, 'upi', 'UPI/PhonePe/772183', 'Part payment by Hari Prasad'),
('32000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000017', '2026-08-11', 200000.00, 'card', 'POS/HDFC/99120', 'Card part payment by Malathi Sundar'),
('32000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000020', '2026-08-22', 120000.00, 'upi', 'UPI/GPay/441290', 'Part payment by Rahul Krishnan'),
('32000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000024', '2026-09-04', 80000.00, 'bank_transfer', 'IMPS/SBI/331209', 'Part payment by Karthik M'),
('32000000-0000-0000-0000-000000000017', '30000000-0000-0000-0000-000000000028', '2026-09-12', 350000.00, 'bank_transfer', 'RTGS/SBI/551209', 'Part payment by Suresh Babu for Kada'),
('32000000-0000-0000-0000-000000000018', '30000000-0000-0000-0000-000000000031', '2026-09-17', 200000.00, 'upi', 'UPI/GPay/881290', 'Part payment by Deepa S'),
('32000000-0000-0000-0000-000000000019', '30000000-0000-0000-0000-000000000036', '2026-09-22', 13000.00, 'cash', 'CASH-REC-1036', 'Counter cash receipt for silver kolusu')
ON CONFLICT (id) DO NOTHING;

-- 13. WHOLESALE CONSIGNMENT ISSUES & SETTLEMENTS
INSERT INTO wholesale_issues (
    id, issue_number, customer_id, customer_name, customer_shop, issue_date, expected_return_date,
    total_items_issued, total_gross_weight_g, total_deduction_weight_g, total_net_weight_g,
    total_fine_gold_g, gold_rate_per_gram, total_cash_value, total_valuation_amount,
    agreed_profit_model, agreed_profit_percent, cash_paid, gold_916_weight_paid_g, gold_916_rate,
    gold_916_value_paid, remaining_balance, status, notes
) VALUES
('40000000-0000-0000-0000-000000000001', 'DEMO-WSI-2026-001', 'f0000000-0000-0000-0000-000000000021', 'Anand Ramakrishnan', 'Sri Lakshmi Jewellery', '2026-07-15', '2026-08-15', 50, 26.500, 3.500, 23.000, 21.068, 10700.00, 246100.00, 246100.00, 'model_a_profit_percent', 40.00, 150000.00, 0.000, 0.00, 0.00, 96100.00, 'active', '50 Nose pins consignment on credit touch basis'),
('40000000-0000-0000-0000-000000000002', 'DEMO-WSI-2026-002', 'f0000000-0000-0000-0000-000000000022', 'Venkatesh Prabhu', 'Prabhu Bullion & Gems', '2026-08-01', '2026-09-01', 30, 48.000, 4.000, 44.000, 40.304, 11100.00, 532800.00, 532800.00, 'model_a_profit_percent', 35.00, 300000.00, 15.000, 11100.00, 166500.00, 66300.00, 'active', '30 Stud earrings consignment with 916 gold advance'),
('40000000-0000-0000-0000-000000000003', 'DEMO-WSI-2026-003', 'f0000000-0000-0000-0000-000000000023', 'Karthik Subramanian', 'Karthik Retail Traders', '2026-08-15', '2026-09-15', 20, 35.000, 2.000, 33.000, 30.228, 11350.00, 419550.00, 419550.00, 'model_a_profit_percent', 40.00, 250000.00, 0.000, 0.00, 0.00, 169550.00, 'active', 'Gold rings & pendants assortment'),
('40000000-0000-0000-0000-000000000004', 'DEMO-WSI-2026-004', 'f0000000-0000-0000-0000-000000000024', 'Murugan Chettiar', 'Murugan Gold Emporium', '2026-09-01', '2026-10-01', 40, 22.000, 2.800, 19.200, 17.587, 11800.00, 259600.00, 259600.00, 'model_a_profit_percent', 40.00, 150000.00, 0.000, 0.00, 0.00, 109600.00, 'active', 'Traditional nose rings assortment batch')
ON CONFLICT (issue_number) DO UPDATE SET
    status = EXCLUDED.status,
    cash_paid = EXCLUDED.cash_paid,
    remaining_balance = EXCLUDED.remaining_balance;

INSERT INTO wholesale_payments (id, customer_id, payment_date, amount, payment_mode, reference_number, notes) VALUES
('41000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000021', '2026-07-20', 150000.00, 'bank_transfer', 'NEFT/SBI/99120', 'Sri Lakshmi Jewellery consignment deposit'),
('41000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000022', '2026-08-05', 300000.00, 'bank_transfer', 'RTGS/SBI/88120', 'Prabhu Bullion cash settlement deposit'),
('41000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000023', '2026-08-20', 250000.00, 'upi', 'UPI/GPay/55129', 'Karthik Retail Traders part payment deposit'),
('41000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000024', '2026-09-05', 150000.00, 'bank_transfer', 'IMPS/SBI/77120', 'Murugan Gold advance deposit')
ON CONFLICT (id) DO NOTHING;

-- 14. GOLDSMITH MANUFACTURING JOB CARDS
INSERT INTO manufacturing_jobs (
    id, job_card_number, customer_name, product_category, metal_type, purity,
    raw_metal_weight_g, expected_finished_weight_g, actual_finished_weight_g,
    stone_weight_g, wastage_allowance_g, actual_wastage_g, labour_charge, making_charge,
    assigned_goldsmith, start_date, completion_date, status, notes
) VALUES
('50000000-0000-0000-0000-000000000001', 'DEMO-JC-2026-001', 'Internal Showroom Stock Batch', 'Nose Rings', 'gold', '22k', 25.000, 23.800, 23.750, 0.800, 0.500, 0.450, 3500.00, 4800.00, 'Muralidharan (Senior Artisan)', '2026-06-10', '2026-06-18', 'completed', '50 Pcs traditional Mukku Poodu nose rings batch completed'),
('50000000-0000-0000-0000-000000000002', 'DEMO-JC-2026-002', 'Priya Suresh (Custom Order)', 'Gold Necklaces', 'gold', '22k', 52.000, 48.600, 48.600, 0.700, 2.700, 2.700, 8500.00, 11500.00, 'K. Selvaraj (Master Goldsmith)', '2026-08-01', '2026-08-15', 'completed', 'Bridal Choker with antique matte finish'),
('50000000-0000-0000-0000-000000000003', 'DEMO-JC-2026-003', 'Internal Showroom Stock Batch', 'Gold Bangles', 'gold', '22k', 85.000, 81.200, 81.100, 0.000, 3.800, 3.900, 6000.00, 8500.00, 'P. Natarajan', '2026-08-20', '2026-08-30', 'completed', '2 Pairs of Lakshmi floral broad kada bangles'),
('50000000-0000-0000-0000-000000000004', 'DEMO-JC-2026-004', 'Internal Showroom Stock Batch', 'Silver Pooja Items', 'silver', '925_silver', 500.000, 480.000, 480.000, 0.000, 20.000, 20.000, 2500.00, 3800.00, 'R. Senthil', '2026-09-02', '2026-09-10', 'completed', 'Pair of Kamatchi deepam lamps'),
('50000000-0000-0000-0000-000000000005', 'DEMO-JC-2026-005', 'Aravind Kumar (Wedding Custom Order)', 'Gold Chains', 'gold', '22k', 35.000, 32.500, 0.000, 0.000, 1.500, 0.000, 4500.00, 6200.00, 'Muralidharan (Senior Artisan)', '2026-09-15', NULL, 'in_progress', 'Heavy Gents rope chain 24 inch under manufacturing'),
('50000000-0000-0000-0000-000000000006', 'DEMO-JC-2026-006', 'Karthik M (Custom Gem Ring)', 'Gold Rings', 'gold', '22k', 10.000, 8.200, 0.000, 1.100, 0.700, 0.000, 1500.00, 2200.00, 'K. Selvaraj (Master Goldsmith)', '2026-09-20', NULL, 'in_progress', 'Custom Navaratna gents ring casting stage')
ON CONFLICT (job_card_number) DO UPDATE SET
    status = EXCLUDED.status,
    notes = EXCLUDED.notes;

-- 15. SHOWROOM & WORKSHOP OPERATING EXPENSES (June → September 2026)
INSERT INTO expenses (id, expense_number, category, amount, expense_date, payment_mode, vendor_name, notes) VALUES
('60000000-0000-0000-0000-000000000001', 'DEMO-EXP-2026-001', 'Rent', 45000.00, '2026-06-05', 'bank_transfer', 'Ramaswamy Commercial Buildings', 'Showroom monthly rent for June 2026'),
('60000000-0000-0000-0000-000000000002', 'DEMO-EXP-2026-002', 'Electricity', 8850.00, '2026-06-10', 'upi', 'TNEB Trichy Central Circle', 'Electricity bill for Showroom AC & lighting'),
('60000000-0000-0000-0000-000000000003', 'DEMO-EXP-2026-003', 'Goldsmith labour', 14500.00, '2026-06-18', 'cash', 'Murugan Goldsmith Guild', 'Batch labour charges for 50 nose rings casting'),
('60000000-0000-0000-0000-000000000004', 'DEMO-EXP-2026-004', 'Rent', 45000.00, '2026-07-05', 'bank_transfer', 'Ramaswamy Commercial Buildings', 'Showroom monthly rent for July 2026'),
('60000000-0000-0000-0000-000000000005', 'DEMO-EXP-2026-005', 'Electricity', 9200.00, '2026-07-10', 'upi', 'TNEB Trichy Central Circle', 'July showroom electricity bill'),
('60000000-0000-0000-0000-000000000006', 'DEMO-EXP-2026-006', 'Security', 18000.00, '2026-07-15', 'bank_transfer', 'Chola Armed Security Services', 'Armed security guard services for July'),
('60000000-0000-0000-0000-000000000007', 'DEMO-EXP-2026-007', 'Rent', 45000.00, '2026-08-05', 'bank_transfer', 'Ramaswamy Commercial Buildings', 'Showroom monthly rent for August 2026'),
('60000000-0000-0000-0000-000000000008', 'DEMO-EXP-2026-008', 'Staff Welfare', 12500.00, '2026-08-15', 'cash', 'Staff Bonus & Independence Day', 'Staff festival sweets and bonus allowance'),
('60000000-0000-0000-0000-000000000009', 'DEMO-EXP-2026-009', 'Goldsmith labour', 18000.00, '2026-08-20', 'cash', 'K. Selvaraj Goldsmith', 'Bridal jewellery handcrafted die setting labour'),
('60000000-0000-0000-0000-000000000010', 'DEMO-EXP-2026-010', 'Rent', 45000.00, '2026-09-05', 'bank_transfer', 'Ramaswamy Commercial Buildings', 'Showroom monthly rent for September 2026'),
('60000000-0000-0000-0000-000000000011', 'DEMO-EXP-2026-011', 'Electricity', 9400.00, '2026-09-10', 'upi', 'TNEB Trichy Central Circle', 'September showroom electricity bill'),
('60000000-0000-0000-0000-000000000012', 'DEMO-EXP-2026-012', 'Security', 18000.00, '2026-09-15', 'bank_transfer', 'Chola Armed Security Services', 'Showroom security guard services for September'),
('60000000-0000-0000-0000-000000000013', 'DEMO-EXP-2026-013', 'Showroom Maintenance', 7500.00, '2026-09-18', 'cash', 'Cool Care AC Services Trichy', 'Quarterly central AC servicing and gas top-up'),
('60000000-0000-0000-0000-000000000014', 'DEMO-EXP-2026-014', 'Software & Cloud Sync', 4200.00, '2026-09-20', 'upi', 'Jewellery ERP Cloud Infrastructure', 'Monthly cloud database replication & WhatsApp API credits')
ON CONFLICT (expense_number) DO UPDATE SET
    amount = EXCLUDED.amount,
    notes = EXCLUDED.notes;

-- 16. INVENTORY MOVEMENTS (Auditable Stock In & Out Ledger)
INSERT INTO inventory_movements (
    id, product_id, movement_type, quantity, metal_type, purity,
    gross_weight_g, net_weight_g, reference_number, notes, created_at
) VALUES
('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'opening_stock', 20, 'gold', '22k', 116.400, 113.000, 'OPEN-STOCK-2026', 'Showroom opening stock verification', '2026-06-01 09:30:00+05:30'),
('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'opening_stock', 15, 'gold', '22k', 276.000, 271.500, 'OPEN-STOCK-2026', 'Showroom opening stock verification', '2026-06-01 09:30:00+05:30'),
('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'opening_stock', 12, 'gold', '22k', 297.600, 292.800, 'OPEN-STOCK-2026', 'Showroom opening stock verification', '2026-06-01 09:30:00+05:30'),
('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', 'opening_stock', 8, 'gold', '22k', 388.800, 383.200, 'OPEN-STOCK-2026', 'Showroom opening stock verification', '2026-06-01 09:30:00+05:30'),
('70000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'retail_sale', -1, 'gold', '22k', -5.820, -5.650, 'SJ-INV-2026-001', 'Stock sold on Invoice #SJ-INV-2026-001', '2026-06-06 14:15:00+05:30'),
('70000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'retail_sale', -1, 'gold', '22k', -18.400, -18.100, 'SJ-INV-2026-002', 'Stock sold on Invoice #SJ-INV-2026-002', '2026-06-11 16:20:00+05:30'),
('70000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000005', 'retail_sale', -1, 'gold', '22k', -48.600, -47.900, 'SJ-INV-2026-038', 'Hero transaction stock deducted for Priya Suresh', '2026-09-22 11:30:00+05:30'),
('70000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', 'retail_sale', -1, 'gold', '22k', -24.800, -24.400, 'SJ-INV-2026-038', 'Hero transaction stock deducted for Priya Suresh', '2026-09-22 11:30:00+05:30'),
('70000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000012', 'retail_sale', -1, 'gold', '22k', -14.500, -13.700, 'SJ-INV-2026-038', 'Hero transaction stock deducted for Priya Suresh', '2026-09-22 11:30:00+05:30')
ON CONFLICT (id) DO NOTHING;

-- 17. SYSTEM NOTIFICATIONS & AUDIT TRAIL
INSERT INTO notifications (id, title, message, type, is_read, created_at) VALUES
('80000000-0000-0000-0000-000000000001', 'High Value Invoice Recorded', 'Invoice #SJ-INV-2026-038 for Priya Suresh valued at ₹10,45,000 finalized successfully.', 'success', false, '2026-09-22 11:35:00+05:30'),
('80000000-0000-0000-0000-000000000002', 'Daily Rate Updated', '22K Gold market rate updated to ₹12,150/gram for official trading date 22-Sep-2026.', 'info', true, '2026-09-22 09:15:00+05:30'),
('80000000-0000-0000-0000-000000000003', 'Consignment Follow-up', 'Sri Lakshmi Jewellery (Madurai) consignment return period is due for settlement review.', 'warning', false, '2026-09-21 17:00:00+05:30'),
('80000000-0000-0000-0000-000000000004', 'Raw Gold Stock Low', '24K fine casting grains reached threshold. New purchase order recommended.', 'warning', true, '2026-09-20 14:20:00+05:30')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details, created_at) VALUES
('90000000-0000-0000-0000-000000000001', 'Sampath Kumar', 'Retail Invoice Created', 'retail_invoices', '30000000-0000-0000-0000-000000000038', '{"invoice_number":"SJ-INV-2026-038","customer":"Priya Suresh","grand_total":1045000,"payment":"Split UPI+Card"}'::jsonb, '2026-09-22 11:30:00+05:30'),
('90000000-0000-0000-0000-000000000002', 'Sampath Kumar', 'Metal Rates Updated', 'metal_rates', 'c0000000-0000-0000-0000-000000000016', '{"rate_date":"2026-09-22","gold_22k":12150,"silver":165}'::jsonb, '2026-09-22 09:10:00+05:30'),
('90000000-0000-0000-0000-000000000003', 'Arun Kumar', 'Purchase Received', 'purchases', '20000000-0000-0000-0000-000000000018', '{"purchase_number":"DEMO-PUR-2026-018","supplier":"Southern Gold Suppliers","amount":528000}'::jsonb, '2026-09-21 16:45:00+05:30')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO SEED COMPLETED SUCCESSFULLY
-- Verify counts:
-- SELECT count(*) FROM customers; -- 32
-- SELECT count(*) FROM products; -- 42
-- SELECT count(*) FROM suppliers; -- 10
-- SELECT count(*) FROM purchases; -- 18
-- SELECT count(*) FROM retail_invoices; -- 38
-- SELECT count(*) FROM retail_payments; -- 19
-- SELECT count(*) FROM metal_rates; -- 16
-- SELECT count(*) FROM expenses; -- 14
-- SELECT count(*) FROM manufacturing_jobs; -- 6
-- ============================================================================

