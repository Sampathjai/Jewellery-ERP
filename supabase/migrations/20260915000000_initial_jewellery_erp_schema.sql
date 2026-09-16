-- ============================================================================
-- SAMPATH JEWELLERY ERP & WHOLESALE CREDIT MANAGEMENT SYSTEM
-- PostgreSQL Database Schema & Migration Script
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum Types
CREATE TYPE user_role_type AS ENUM ('admin', 'manager', 'billing_staff', 'inventory_staff', 'accountant', 'viewer');
CREATE TYPE metal_type AS ENUM ('gold', 'silver', 'platinum', 'other');
CREATE TYPE metal_purity AS ENUM ('24k', '22k', '18k', '14k', '925_silver', '999_silver', 'other');
CREATE TYPE stock_status AS ENUM ('in_stock', 'reserved', 'wholesale_issued', 'sold', 'returned', 'under_manufacturing', 'damaged', 'lost', 'archived');
CREATE TYPE movement_type AS ENUM ('opening_stock', 'manufacturing_entry', 'purchase', 'retail_sale', 'wholesale_issue', 'wholesale_return', 'stock_adjustment', 'damage', 'loss', 'transfer', 'cancellation');
CREATE TYPE wholesale_profit_model AS ENUM ('model_a_profit_percent', 'model_b_commission', 'model_c_fixed_margin', 'model_d_custom_formula');
CREATE TYPE invoice_status AS ENUM ('draft', 'finalized', 'cancelled', 'partially_refunded', 'refunded');
CREATE TYPE settlement_status AS ENUM ('draft', 'pending_verification', 'approved', 'partially_paid', 'paid', 'cancelled');
CREATE TYPE manufacturing_status AS ENUM ('draft', 'material_issued', 'in_progress', 'quality_check', 'completed', 'delivered', 'cancelled');

-- 1. PROFILES & ROLES
CREATE TABLE profiles (
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

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name user_role_type UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 2. BUSINESS SETTINGS & METAL RATES
CREATE TABLE business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_name TEXT NOT NULL DEFAULT 'Sampath Jewellery',
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
    next_invoice_number INT DEFAULT 1001,
    default_profit_sharing_model wholesale_profit_model DEFAULT 'model_a_profit_percent',
    default_profit_sharing_percent NUMERIC(5,2) DEFAULT 40.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE metal_rates (
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

-- 3. CUSTOMERS & SUPPLIERS
CREATE TABLE customers (
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
    profit_sharing_model wholesale_profit_model DEFAULT 'model_a_profit_percent',
    payment_terms TEXT DEFAULT '30 Days',
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE suppliers (
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

-- 4. PRODUCTS & CATEGORIES
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT UNIQUE,
    qr_code TEXT UNIQUE,
    name TEXT NOT NULL,
    category_id UUID REFERENCES product_categories(id),
    metal_type metal_type NOT NULL DEFAULT 'gold',
    purity metal_purity NOT NULL DEFAULT '22k',
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

CREATE TABLE product_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INVENTORY MOVEMENTS
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    movement_type movement_type NOT NULL,
    quantity_change INT NOT NULL,
    weight_change_g NUMERIC(10,3) NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MANUFACTURING / GOLDSMITH WORK CARDS
CREATE TABLE manufacturing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_card_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    product_category TEXT NOT NULL,
    metal_type metal_type NOT NULL,
    purity metal_purity NOT NULL,
    raw_metal_weight_g NUMERIC(10,3) NOT NULL,
    expected_finished_weight_g NUMERIC(10,3) NOT NULL,
    actual_finished_weight_g NUMERIC(10,3),
    stone_weight_g NUMERIC(10,3) DEFAULT 0.000,
    wastage_allowance_g NUMERIC(10,3) DEFAULT 0.000,
    actual_wastage_g NUMERIC(10,3),
    labour_charge NUMERIC(10,2) DEFAULT 0.00,
    making_charge NUMERIC(10,2) DEFAULT 0.00,
    assigned_goldsmith TEXT NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    status manufacturing_status DEFAULT 'draft',
    before_photo_url TEXT,
    after_photo_url TEXT,
    linked_product_id UUID REFERENCES products(id),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. RETAIL INVOICES & POS
CREATE TABLE retail_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal_metal_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_making_charges NUMERIC(12,2) DEFAULT 0.00,
    total_labour_charges NUMERIC(12,2) DEFAULT 0.00,
    total_wastage_value NUMERIC(12,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    tax_percent NUMERIC(5,2) DEFAULT 3.00, -- GST for Gold/Silver
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    round_off NUMERIC(6,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_status TEXT CHECK (payment_status IN ('paid', 'partial', 'unpaid')) DEFAULT 'unpaid',
    status invoice_status DEFAULT 'finalized',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE retail_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES retail_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name_snapshot TEXT NOT NULL,
    sku_snapshot TEXT NOT NULL,
    metal_type metal_type NOT NULL,
    purity metal_purity NOT NULL,
    gross_weight_g NUMERIC(10,3) NOT NULL,
    stone_weight_g NUMERIC(10,3) DEFAULT 0.000,
    net_weight_g NUMERIC(10,3) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    metal_rate_snapshot NUMERIC(12,2) NOT NULL,
    metal_value NUMERIC(12,2) NOT NULL,
    making_charge NUMERIC(10,2) DEFAULT 0.00,
    labour_charge NUMERIC(10,2) DEFAULT 0.00,
    wastage_percent NUMERIC(5,2) DEFAULT 0.00,
    wastage_weight_g NUMERIC(10,3) DEFAULT 0.000,
    wastage_value NUMERIC(12,2) DEFAULT 0.00,
    discount NUMERIC(10,2) DEFAULT 0.00,
    line_total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE retail_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES retail_invoices(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL,
    payment_mode TEXT CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'card', 'credit', 'split')) NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE retail_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number TEXT UNIQUE NOT NULL,
    invoice_id UUID REFERENCES retail_invoices(id),
    customer_id UUID REFERENCES customers(id),
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    refund_amount NUMERIC(12,2) NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'approved',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WHOLESALE CREDIT & CONSIGNMENT ENGINE (Nose Rings & Ear Rings)
CREATE TABLE wholesale_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    total_items_issued INT NOT NULL DEFAULT 0,
    total_gross_weight_g NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    total_net_weight_g NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    total_valuation_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    agreed_profit_model wholesale_profit_model DEFAULT 'model_a_profit_percent',
    agreed_profit_percent NUMERIC(5,2) DEFAULT 40.00,
    notes TEXT,
    status TEXT CHECK (status IN ('active', 'partially_settled', 'settled', 'cancelled')) DEFAULT 'active',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wholesale_issue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID REFERENCES wholesale_issues(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity_issued INT NOT NULL,
    gross_weight_g NUMERIC(10,3) NOT NULL,
    stone_weight_g NUMERIC(10,3) DEFAULT 0.000,
    net_weight_g NUMERIC(10,3) NOT NULL,
    unit_cost_valuation NUMERIC(12,2) NOT NULL,
    total_issue_value NUMERIC(12,2) NOT NULL,
    quantity_sold INT DEFAULT 0,
    quantity_returned INT DEFAULT 0,
    quantity_remaining INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wholesale_sales (
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

CREATE TABLE wholesale_returns (
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

CREATE TABLE wholesale_settlements (
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

CREATE TABLE wholesale_payments (
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

-- 9. EXPENSES & ACCOUNTING
CREATE TABLE expenses (
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

-- 10. SYSTEM MASTERS & AUDIT LOGS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full access to customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow authenticated full access to products" ON products FOR ALL USING (true);
CREATE POLICY "Allow authenticated full access to invoices" ON retail_invoices FOR ALL USING (true);
CREATE POLICY "Allow authenticated full access to wholesale" ON wholesale_issues FOR ALL USING (true);
CREATE POLICY "Allow authenticated full access to settlements" ON wholesale_settlements FOR ALL USING (true);
CREATE POLICY "Allow authenticated full access to expenses" ON expenses FOR ALL USING (true);

