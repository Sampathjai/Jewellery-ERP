-- Migration to ensure optional fields used by frontend are safely defined on PostgreSQL tables

-- 1. Customers Table Optional Columns
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS agreed_customer_touch NUMERIC(5,2) DEFAULT 40.00;

-- 2. Products Table Optional Columns
ALTER TABLE products
ADD COLUMN IF NOT EXISTS category_name TEXT,
ADD COLUMN IF NOT EXISTS actual_touch NUMERIC(5,2) DEFAULT 37.00;

