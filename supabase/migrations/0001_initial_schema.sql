-- ============================================================================
-- SHANKAR JEWELLERY ERP - 0001 INITIAL SCHEMA MIGRATION
-- Single source of truth for full Supabase PostgreSQL Database Setup
-- Safe, Non-Destructive, Idempotent Migration
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enum Types (Safely created)
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('admin', 'manager', 'billing_staff', 'inventory_staff', 'accountant', 'viewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE metal_type AS ENUM ('gold', 'silver', 'platinum', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE metal_purity AS ENUM ('24k', '22k', '18k', '14k', '925_silver', '999_silver', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE stock_status AS ENUM ('in_stock', 'reserved', 'wholesale_issued', 'sold', 'returned', 'under_manufacturing', 'damaged', 'lost', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('opening_stock', 'manufacturing_entry', 'purchase', 'retail_sale', 'wholesale_issue', 'wholesale_return', 'stock_adjustment', 'damage', 'loss', 'transfer', 'cancellation');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE wholesale_profit_model AS ENUM ('model_a_profit_percent', 'model_b_commission', 'model_c_fixed_margin', 'model_d_custom_formula');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft', 'finalized', 'cancelled', 'partially_refunded', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE settlement_status AS ENUM ('draft', 'pending_verification', 'approved', 'partially_paid', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE manufacturing_status AS ENUM ('draft', 'material_issued', 'in_progress', 'quality_check', 'completed', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Profiles & User Roles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name user_role_type UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 4. Business Settings & Metal Rates
CREATE TABLE IF NOT EXISTS business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_name TEXT NOT NULL DEFAULT 'Shankar Jewellery',
    owner_name TEXT DEFAULT 'Sampath Kumar',
    logo_url TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    pin_code TEXT,
    phone TEXT,
    whatsapp_number TEXT,
    email TEXT,
    gstin TEXT,
    pan TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    upi_id TEXT,
    signature_url TEXT,
    invoice_prefix TEXT DEFAULT 'SJ-INV-',
    next_invoice_number INT DEFAULT 1005,
    default_profit_sharing_model wholesale_profit_model DEFAULT 'model_a_profit_percent',
    default_profit_sharing_percent NUMERIC(5,2) DEFAULT 40.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metal_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rate_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    gold_24k_per_gram NUMERIC(12,2) NOT NULL,
    gold_22k_per_gram NUMERIC(12,2) NOT NULL,
    gold_18k_per_gram NUMERIC(12,2) NOT NULL,
    silver_per_gram NUMERIC(12,2) NOT NULL,
    silver_per_kg NUMERIC(12,2) NOT NULL,
    source TEXT DEFAULT 'manual',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Customers & Suppliers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    shop_name TEXT,
    customer_type TEXT CHECK (customer_type IN ('retail', 'wholesale', 'supplier', 'other')) DEFAULT 'retail',
    phone TEXT NOT NULL,
    whatsapp_number TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pin_code TEXT,
    gstin TEXT,
    pan TEXT,
    photo_url TEXT,
    id_doc_url TEXT,
    credit_limit NUMERIC(12,2) DEFAULT 0,
    agreed_profit_percent NUMERIC(5,2) DEFAULT 40.00,
    agreed_customer_touch NUMERIC(5,2) DEFAULT 40.00,
    default_actual_touch NUMERIC(5,2) DEFAULT 37.00,
    default_profit_touch NUMERIC(5,2) DEFAULT 10.00,
    default_billing_touch NUMERIC(5,2) DEFAULT 47.00,
    profit_sharing_model wholesale_profit_model DEFAULT 'model_a_profit_percent',
    payment_terms TEXT DEFAULT '30 Days',
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code TEXT UNIQUE NOT NULL,
    supplier_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    supplier_type TEXT,
    primary_metal metal_type DEFAULT 'gold',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Product Categories & Products (Stock & Inventory)
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT UNIQUE,
    qr_code TEXT UNIQUE,
    name TEXT NOT NULL,
    category_id UUID REFERENCES product_categories(id),
    category_name TEXT,
    metal_type metal_type NOT NULL DEFAULT 'gold',
    purity metal_purity NOT NULL DEFAULT '22k',
    actual_touch NUMERIC(5,2) DEFAULT 37.00,
    gross_weight_g NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    stone_weight_g NUMERIC(10,3) DEFAULT 0.000,
    other_weight_g NUMERIC(10,3) DEFAULT 0.000,
    net_weight_g NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    unit TEXT DEFAULT 'grams',
    quantity INT NOT NULL DEFAULT 1,
    making_charge_type TEXT CHECK (making_charge_type IN ('per_gram', 'per_piece', 'flat')) DEFAULT 'per_gram',
    making_charge_rate NUMERIC(10,2) DEFAULT 0.00,
    labour_charge NUMERIC(10,2) DEFAULT 0.00,
    wastage_percent NUMERIC(5,2) DEFAULT 0.00,
    wastage_weight_g NUMERIC(10,3) DEFAULT 0.000,
    purchase_cost NUMERIC(12,2) DEFAULT 0.00,
    manufacturing_cost NUMERIC(12,2) DEFAULT 0.00,
    retail_price NUMERIC(12,2) DEFAULT 0.00,
    wholesale_valuation NUMERIC(12,2) DEFAULT 0.00,
    minimum_stock INT DEFAULT 1,
    description TEXT,
    primary_photo_url TEXT,
    supplier_id UUID REFERENCES suppliers(id),
    status stock_status DEFAULT 'in_stock',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Inventory Movements & Manufacturing Jobs
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    movement_type movement_type NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    metal_type metal_type NOT NULL,
    purity metal_purity NOT NULL,
    gross_weight_g NUMERIC(10,3) NOT NULL,
    net_weight_g NUMERIC(10,3) NOT NULL,
    reference_id TEXT,
    reference_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manufacturing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_card_number TEXT UNIQUE NOT NULL,
    customer_name TEXT,
    product_category TEXT,
    metal_type metal_type NOT NULL DEFAULT 'gold',
    purity metal_purity NOT NULL DEFAULT '22k',
    raw_metal_weight_g NUMERIC(10,3) NOT NULL,
    expected_finished_weight_g NUMERIC(10,3) NOT NULL,
    actual_finished_weight_g NUMERIC(10,3) DEFAULT 0.000,
    stone_weight_g NUMERIC(10,3) DEFAULT 0.000,
    wastage_allowance_g NUMERIC(10,3) DEFAULT 0.000,
    actual_wastage_g NUMERIC(10,3) DEFAULT 0.000,
    labour_charge NUMERIC(10,2) DEFAULT 0.00,
    making_charge NUMERIC(10,2) DEFAULT 0.00,
    assigned_goldsmith TEXT,
    start_date DATE DEFAULT CURRENT_DATE,
    completion_date DATE,
    status manufacturing_status DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Retail POS & Invoices
CREATE TABLE IF NOT EXISTS retail_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal_metal_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_making_charges NUMERIC(12,2) DEFAULT 0.00,
    total_labour_charges NUMERIC(12,2) DEFAULT 0.00,
    total_wastage_value NUMERIC(12,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    tax_percent NUMERIC(5,2) DEFAULT 3.00,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    round_off NUMERIC(5,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_status TEXT CHECK (payment_status IN ('unpaid', 'partial', 'paid')) DEFAULT 'unpaid',
    status invoice_status DEFAULT 'finalized',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retail_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES retail_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name_snapshot TEXT NOT NULL,
    sku_snapshot TEXT,
    metal_type metal_type NOT NULL,
    purity metal_purity NOT NULL,
    gross_weight_g NUMERIC(10,3) NOT NULL,
    stone_weight_g NUMERIC(10,3) DEFAULT 0.000,
    net_weight_g NUMERIC(10,3) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    metal_rate_snapshot NUMERIC(12,2) NOT NULL,
    metal_value NUMERIC(12,2) NOT NULL,
    making_charge NUMERIC(12,2) DEFAULT 0.00,
    labour_charge NUMERIC(12,2) DEFAULT 0.00,
    wastage_percent NUMERIC(5,2) DEFAULT 0.00,
    wastage_weight_g NUMERIC(10,3) DEFAULT 0.000,
    wastage_value NUMERIC(12,2) DEFAULT 0.00,
    discount NUMERIC(12,2) DEFAULT 0.00,
    line_total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retail_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES retail_invoices(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL,
    payment_mode TEXT CHECK (payment_mode IN ('cash', 'card', 'upi', 'bank_transfer', 'cheque', 'exchange_gold')) NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retail_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number TEXT UNIQUE NOT NULL,
    invoice_id UUID REFERENCES retail_invoices(id),
    customer_id UUID REFERENCES customers(id),
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_refund_amount NUMERIC(12,2) NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Wholesale Consignment & Credit System
CREATE TABLE IF NOT EXISTS wholesale_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_shop TEXT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    total_items_issued INT NOT NULL DEFAULT 0,
    total_gross_weight_g NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    total_deduction_weight_g NUMERIC(10,3) DEFAULT 0.000,
    total_net_weight_g NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    total_fine_gold_g NUMERIC(10,3) DEFAULT 0.000,
    gold_rate_per_gram NUMERIC(12,2) NOT NULL,
    total_cash_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_valuation_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    agreed_profit_model wholesale_profit_model DEFAULT 'model_a_profit_percent',
    agreed_profit_percent NUMERIC(5,2) DEFAULT 40.00,
    cash_paid NUMERIC(12,2) DEFAULT 0.00,
    gold_916_weight_paid_g NUMERIC(10,3) DEFAULT 0.000,
    gold_916_rate NUMERIC(12,2) DEFAULT 0.00,
    gold_916_value_paid NUMERIC(12,2) DEFAULT 0.00,
    remaining_balance NUMERIC(12,2) DEFAULT 0.00,
    status TEXT CHECK (status IN ('active', 'partially_settled', 'fully_settled', 'cancelled')) DEFAULT 'active',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wholesale_issue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID REFERENCES wholesale_issues(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    metal_type metal_type NOT NULL,
    purity metal_purity NOT NULL,
    quantity_issued INT NOT NULL DEFAULT 1,
    gross_weight_g NUMERIC(10,3) NOT NULL,
    deduction_weight_g NUMERIC(10,3) DEFAULT 0.000,
    stone_weight_g NUMERIC(10,3) DEFAULT 0.000,
    net_weight_g NUMERIC(10,3) NOT NULL,
    actual_touch NUMERIC(5,2) NOT NULL DEFAULT 37.00,
    profit_touch NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    billing_touch NUMERIC(5,2) NOT NULL DEFAULT 47.00,
    fine_gold_g NUMERIC(10,3) NOT NULL,
    unit_cost_valuation NUMERIC(12,2) NOT NULL,
    total_issue_value NUMERIC(12,2) NOT NULL,
    quantity_sold INT DEFAULT 0,
    quantity_returned INT DEFAULT 0,
    quantity_remaining INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wholesale_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_number TEXT UNIQUE NOT NULL,
    issue_id UUID REFERENCES wholesale_issues(id),
    customer_id UUID REFERENCES customers(id) NOT NULL,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    buyer_shop_name TEXT,
    buyer_location TEXT,
    total_quantity_sold INT NOT NULL,
    total_weight_sold_g NUMERIC(10,3) NOT NULL,
    total_sale_value NUMERIC(12,2) NOT NULL,
    total_cost_valuation NUMERIC(12,2) NOT NULL,
    gross_profit NUMERIC(12,2) NOT NULL,
    customer_profit_share NUMERIC(12,2) NOT NULL,
    shop_profit_share NUMERIC(12,2) NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wholesale_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number TEXT UNIQUE NOT NULL,
    issue_id UUID REFERENCES wholesale_issues(id),
    customer_id UUID REFERENCES customers(id) NOT NULL,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_quantity_returned INT NOT NULL,
    total_weight_returned_g NUMERIC(10,3) NOT NULL,
    condition_notes TEXT,
    verified_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wholesale_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_start DATE,
    period_end DATE,
    total_gross_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_cost_valuation NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gross_profit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    customer_profit_share NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    shop_profit_share NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    adjustments_amount NUMERIC(12,2) DEFAULT 0.00,
    net_payable_to_customer NUMERIC(12,2) DEFAULT 0.00,
    net_payable_to_shop NUMERIC(12,2) DEFAULT 0.00,
    amount_paid NUMERIC(12,2) DEFAULT 0.00,
    balance_due NUMERIC(12,2) DEFAULT 0.00,
    status settlement_status DEFAULT 'draft',
    approved_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wholesale_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) NOT NULL,
    settlement_id UUID REFERENCES wholesale_settlements(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL,
    payment_mode TEXT CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'card', 'adjustment')) NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Purchases & Expenses
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_number TEXT UNIQUE NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name TEXT NOT NULL,
    supplier_phone TEXT,
    supplier_invoice_number TEXT,
    metal_type metal_type NOT NULL DEFAULT 'gold',
    purity metal_purity NOT NULL DEFAULT '24k',
    gross_weight_g NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    deduction_weight_g NUMERIC(10,3) DEFAULT 0.000,
    net_weight_g NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    purchase_rate_per_gram NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12,2) DEFAULT 0.00,
    balance_payable NUMERIC(12,2) DEFAULT 0.00,
    payment_status TEXT CHECK (payment_status IN ('unpaid', 'partial', 'paid')) DEFAULT 'unpaid',
    payment_method TEXT DEFAULT 'bank_transfer',
    notes TEXT,
    stock_added BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL,
    payment_mode TEXT DEFAULT 'bank_transfer',
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode TEXT DEFAULT 'cash',
    vendor_name TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. GRANT ALL PERMISSIONS TO ANON, AUTHENTICATED & SERVICE ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 12. CONFIGURE ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE metal_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_issue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies allowing full read/insert/update/delete for anon & authenticated roles
DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'profiles', 'business_settings', 'metal_rates', 'customers', 'suppliers',
        'product_categories', 'products', 'product_photos', 'inventory_movements',
        'manufacturing_jobs', 'retail_invoices', 'retail_invoice_items', 'retail_payments',
        'retail_returns', 'wholesale_issues', 'wholesale_issue_items', 'wholesale_sales',
        'wholesale_returns', 'wholesale_settlements', 'wholesale_payments', 'purchases',
        'purchase_payments', 'expenses', 'notifications', 'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow_public_select_%I" ON %I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow_public_insert_%I" ON %I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow_public_update_%I" ON %I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow_public_delete_%I" ON %I', tbl, tbl);

        EXECUTE format('CREATE POLICY "Allow_public_select_%I" ON %I FOR SELECT USING (true)', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow_public_insert_%I" ON %I FOR INSERT WITH CHECK (true)', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow_public_update_%I" ON %I FOR UPDATE USING (true) WITH CHECK (true)', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow_public_delete_%I" ON %I FOR DELETE USING (true)', tbl, tbl);
    END LOOP;
END $$;

-- 13. ENABLE REALTIME REPLICATION FOR CROSS-DEVICE SYNC
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE customers, products, retail_invoices, wholesale_issues;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Migration completed!
