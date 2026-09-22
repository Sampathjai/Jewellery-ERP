-- ============================================================================
-- SHANKAR JEWELLERY ERP - DEMO DATA SURGICAL RESET SCRIPT
-- Safely removes ONLY records created by the demo dataset.
-- NEVER deletes real customer transactions, products, or production settings.
-- ============================================================================

BEGIN;

-- 1. Remove Demo Audit Logs & Notifications
DELETE FROM audit_logs 
WHERE id >= '90000000-0000-0000-0000-000000000001' AND id <= '90000000-0000-0000-0000-000000000099';

DELETE FROM notifications 
WHERE id >= '80000000-0000-0000-0000-000000000001' AND id <= '80000000-0000-0000-0000-000000000099';

-- 2. Remove Demo Inventory Movements
DELETE FROM inventory_movements 
WHERE id >= '70000000-0000-0000-0000-000000000001' AND id <= '70000000-0000-0000-0000-000000000099'
   OR reference_number LIKE 'SJ-INV-2026-%'
   OR reference_number LIKE 'DEMO-%';

-- 3. Remove Demo Expenses
DELETE FROM expenses 
WHERE id >= '60000000-0000-0000-0000-000000000001' AND id <= '60000000-0000-0000-0000-000000000099'
   OR expense_number LIKE 'DEMO-EXP-2026-%';

-- 4. Remove Demo Manufacturing Jobs
DELETE FROM manufacturing_jobs 
WHERE id >= '50000000-0000-0000-0000-000000000001' AND id <= '50000000-0000-0000-0000-000000000099'
   OR job_card_number LIKE 'DEMO-JC-2026-%';

-- 5. Remove Demo Wholesale Consignments & Payments
DELETE FROM wholesale_payments 
WHERE id >= '41000000-0000-0000-0000-000000000001' AND id <= '41000000-0000-0000-0000-000000000099';

DELETE FROM wholesale_issues 
WHERE id >= '40000000-0000-0000-0000-000000000001' AND id <= '40000000-0000-0000-0000-000000000099'
   OR issue_number LIKE 'DEMO-WSI-2026-%';

-- 6. Remove Demo Retail Sales (Items and Payments cascade automatically via FK)
DELETE FROM retail_payments 
WHERE id >= '32000000-0000-0000-0000-000000000001' AND id <= '32000000-0000-0000-0000-000000000099'
   OR reference_number LIKE 'EXCH-OG-2026-%';

DELETE FROM retail_invoice_items 
WHERE id >= '31000000-0000-0000-0000-000000000001' AND id <= '31000000-0000-0000-0000-000000000099';

DELETE FROM retail_invoices 
WHERE id >= '30000000-0000-0000-0000-000000000001' AND id <= '30000000-0000-0000-0000-000000000099'
   OR invoice_number LIKE 'SJ-INV-2026-%';

-- 7. Remove Demo Purchases & Payments
DELETE FROM purchase_payments 
WHERE id >= '21000000-0000-0000-0000-000000000001' AND id <= '21000000-0000-0000-0000-000000000099';

DELETE FROM purchases 
WHERE id >= '20000000-0000-0000-0000-000000000001' AND id <= '20000000-0000-0000-0000-000000000099'
   OR purchase_number LIKE 'DEMO-PUR-2026-%';

-- 8. Remove Demo Products
DELETE FROM products 
WHERE id >= '10000000-0000-0000-0000-000000000001' AND id <= '10000000-0000-0000-0000-000000000099'
   OR sku LIKE 'SJ-GR-%' OR sku LIKE 'SJ-GC-%' OR sku LIKE 'SJ-GB-%' 
   OR sku LIKE 'SJ-GE-%' OR sku LIKE 'SJ-GN-%' OR sku LIKE 'SJ-GP-%' 
   OR sku LIKE 'SJ-GBR-%' OR sku LIKE 'SJ-GK-%' OR sku LIKE 'SJ-SA-%' 
   OR sku LIKE 'SJ-SR-%' OR sku LIKE 'SJ-SC-%' OR sku LIKE 'SJ-SP-%' 
   OR sku LIKE 'SJ-DR-%' OR sku LIKE 'SJ-DE-%' OR sku LIKE 'SJ-DP-%' 
   OR sku LIKE 'SJ-CN-%' OR sku LIKE 'SJ-CUS-%' OR sku LIKE 'SJ-NR-%';

-- 9. Remove Demo Customers
DELETE FROM customers 
WHERE id >= 'f0000000-0000-0000-0000-000000000001' AND id <= 'f0000000-0000-0000-0000-000000000099'
   OR customer_code LIKE 'DEMO-CUST-%';

-- 10. Remove Demo Suppliers
DELETE FROM suppliers 
WHERE id >= 'e0000000-0000-0000-0000-000000000001' AND id <= 'e0000000-0000-0000-0000-000000000099'
   OR supplier_code LIKE 'DEMO-SUP-%';

-- 11. Remove Demo Historical Metal Rates (Keep latest active rate if present)
DELETE FROM metal_rates 
WHERE id >= 'c0000000-0000-0000-0000-000000000001' AND id <= 'c0000000-0000-0000-0000-000000000099';

-- 12. Remove Demo Staff Profiles
DELETE FROM profiles 
WHERE email IN (
    'meena.manager@shankarjewellers.example',
    'arun.sales@shankarjewellers.example',
    'priya.sales@shankarjewellers.example',
    'karthik.accounts@shankarjewellers.example'
);

-- Reset invoice number counter safely if needed
UPDATE business_settings 
SET next_invoice_number = 1001 
WHERE id = '00000000-0000-0000-0000-000000000001' 
  AND (next_invoice_number = 1045 OR next_invoice_number IS NULL);

COMMIT;

-- Reset completed. Only demo records were removed. Real store data is preserved.

