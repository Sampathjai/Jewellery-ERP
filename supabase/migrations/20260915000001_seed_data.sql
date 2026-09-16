-- ============================================================================
-- SAMPATH JEWELLERY ERP & WHOLESALE CREDIT MANAGEMENT SYSTEM
-- Seed Data SQL Script
-- ============================================================================

-- Seed Business Settings
INSERT INTO business_settings (
    shop_name, owner_name, address, city, state, pin_code, phone, whatsapp_number, email, gstin, pan, bank_name, bank_account_number, bank_ifsc, upi_id, invoice_prefix, next_invoice_number
) VALUES (
    'Sampath Jewellery', 'Sampath Kumar', '142 Temple Street, Near Main Market', 'Coimbatore', 'Tamil Nadu', '641001', '+91 98765 43210', '+91 98765 43210', 'contact@sampathjewellery.com', '33AAAAA0000A1Z5', 'ABCDE1234F', 'State Bank of India', '39182746501', 'SBIN0001234', 'sampath@upi', 'SJ-INV-', 1005
) ON CONFLICT DO NOTHING;

-- Seed Roles & Permissions
INSERT INTO roles (name, description) VALUES
('admin', 'Full access to all system features and settings'),
('manager', 'Management access without critical settings authorization'),
('billing_staff', 'Access to POS billing, customers, and invoice receipts'),
('inventory_staff', 'Access to product catalog, stock movements, and manufacturing'),
('accountant', 'Access to invoices, payments, expenses, and P&L financial reports'),
('viewer', 'Read-only access across system modules')
ON CONFLICT (name) DO NOTHING;

-- Seed Today's Metal Rates
INSERT INTO metal_rates (rate_date, gold_24k_per_gram, gold_22k_per_gram, gold_18k_per_gram, silver_per_gram, silver_per_kg, source, notes) VALUES
(CURRENT_DATE, 7450.00, 6830.00, 5600.00, 89.50, 89500.00, 'manual', 'Today official market closing rate')
ON CONFLICT (rate_date) DO UPDATE SET 
gold_24k_per_gram = EXCLUDED.gold_24k_per_gram,
gold_22k_per_gram = EXCLUDED.gold_22k_per_gram,
gold_18k_per_gram = EXCLUDED.gold_18k_per_gram,
silver_per_gram = EXCLUDED.silver_per_gram,
silver_per_kg = EXCLUDED.silver_per_kg;

-- Seed Product Categories
INSERT INTO product_categories (name, description) VALUES
('Nose Rings', 'Gold and Silver nose pins, press studs, and rings'),
('Ear Rings', 'Gold and Silver earrings, studs, jhumkas, and hoops'),
('Rings', 'Gold and silver finger rings for men and women'),
('Chains', '22K and 18K gold chains and silver rope chains'),
('Bangles', 'Gold bangles, kada, and silver bangles'),
('Bracelets', 'Gold and silver wrist bracelets'),
('Necklaces', 'Designer gold bridal necklaces'),
('Silver Items', 'Silver lamps, coins, plates, and kumkum boxes'),
('Custom Orders', 'Custom designed jewellery pieces')
ON CONFLICT (name) DO NOTHING;

-- Seed Customers (Retail & Wholesale)
INSERT INTO customers (customer_code, full_name, shop_name, customer_type, phone, whatsapp_number, city, address, agreed_profit_percent, profit_sharing_model, credit_limit) VALUES
('CUST-101', 'Anand Ramakrishnan', 'Sri Lakshmi Jewellery', 'wholesale', '+91 94432 11001', '+91 94432 11001', 'Madurai', '45 Cross Cut Road', 40.00, 'model_a_profit_percent', 500000.00),
('CUST-102', 'Venkatesh Prabhu', 'Prabhu Bullion & Gems', 'wholesale', '+91 98421 22002', '+91 98421 22002', 'Salem', '12 Bazzar Street', 35.00, 'model_a_profit_percent', 350000.00),
('CUST-103', 'Karthik Subramanian', 'Karthik Retail Traders', 'wholesale', '+91 97900 33003', '+91 97900 33003', 'Erode', '88 Big Bazzar', 40.00, 'model_a_profit_percent', 250000.00),
('CUST-104', 'Priya Sundaram', NULL, 'retail', '+91 98940 44004', '+91 98940 44004', 'Coimbatore', '12 Gandhi Nagar', 0.00, 'model_a_profit_percent', 0.00),
('CUST-105', 'Rajesh Kanna', NULL, 'retail', '+91 97888 55005', '+91 97888 55005', 'Coimbatore', '56 R.S. Puram', 0.00, 'model_a_profit_percent', 0.00)
ON CONFLICT (customer_code) DO NOTHING;

-- Seed Products
INSERT INTO products (sku, barcode, name, metal_type, purity, gross_weight_g, stone_weight_g, net_weight_g, quantity, making_charge_type, making_charge_rate, wastage_percent, retail_price, wholesale_valuation, status) VALUES
('NR-G22-001', '8901001', 'Traditional Gold Mukku Poodu Nose Pin', 'gold', '22k', 0.450, 0.050, 0.400, 50, 'per_piece', 150.00, 2.50, 3150.00, 2730.00, 'in_stock'),
('NR-G22-002', '8901002', 'Single Diamond Stud Gold Nose Ring', 'gold', '22k', 0.600, 0.100, 0.500, 40, 'per_piece', 200.00, 3.00, 3950.00, 3415.00, 'in_stock'),
('NR-S92-001', '8901003', 'Silver Pressing Type Nose Stud', 'silver', '925_silver', 1.200, 0.000, 1.200, 100, 'per_piece', 40.00, 1.00, 165.00, 120.00, 'in_stock'),
('ER-G22-001', '8901004', '22K Gold Antique Jhumka Earrings', 'gold', '22k', 12.500, 0.800, 11.700, 10, 'per_gram', 450.00, 8.00, 92400.00, 79900.00, 'in_stock'),
('ER-G22-002', '8901005', '22K Daily Wear Gold Stud Earrings', 'gold', '22k', 3.200, 0.200, 3.000, 25, 'per_gram', 350.00, 5.00, 23500.00, 20490.00, 'in_stock'),
('ER-S92-001', '8901006', '925 Sterling Silver Peacock Studs', 'silver', '925_silver', 5.500, 0.500, 5.000, 30, 'per_piece', 120.00, 2.00, 680.00, 500.00, 'in_stock'),
('CH-G22-001', '8901007', '22K Gold Rope Chain 20 inch', 'gold', '22k', 16.000, 0.000, 16.000, 8, 'per_gram', 380.00, 6.00, 122500.00, 109280.00, 'in_stock'),
('RN-G22-001', '8901008', '22K Mens Gents Gold Ring', 'gold', '22k', 6.500, 0.000, 6.500, 12, 'per_gram', 400.00, 5.00, 49800.00, 44395.00, 'in_stock')
ON CONFLICT (sku) DO NOTHING;

-- Seed Expenses
INSERT INTO expenses (expense_number, category, amount, expense_date, payment_mode, vendor_name, notes) VALUES
('EXP-1001', 'Electricity', 8500.00, CURRENT_DATE - INTERVAL '5 days', 'bank_transfer', 'TNEB Tamil Nadu Power', 'Monthly showroom AC electricity bill'),
('EXP-1002', 'Goldsmith labour', 14500.00, CURRENT_DATE - INTERVAL '3 days', 'cash', 'Murugan Goldsmith Works', 'Labour charges for 50 nose rings batch manufacturing'),
('EXP-1003', 'Rent', 45000.00, CURRENT_DATE - INTERVAL '10 days', 'bank_transfer', 'K. Ramaswamy Building Owner', 'Monthly shop rent payment')
ON CONFLICT (expense_number) DO NOTHING;

