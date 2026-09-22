import {
  BusinessSettings,
  UserProfile,
  MetalRate,
  ProductCategory,
  Supplier,
  Customer,
  Product,
  Purchase,
  PurchasePayment,
  RetailInvoice,
  RetailInvoiceItem,
  RetailPayment,
  WholesaleIssue,
  WholesalePayment,
  ManufacturingJob,
  Expense,
  InventoryMovement,
  NotificationItem,
  AuditLog,
} from '@/types';
import { supabase, isSupabaseConfigured, getLocalDb, saveLocalDb } from './supabase';
import { syncEngine } from './syncEngine';

// ============================================================================
// COMPLETE 2026 DEMO DATASET FOR SHANKAR JEWELLERS, TRICHY
// ============================================================================

export const DEMO_SETTINGS: BusinessSettings = {
  id: '00000000-0000-0000-0000-000000000001',
  shop_name: 'Shankar Jewellers',
  owner_name: 'Sampath Kumar',
  address: '12, Main Bazaar Road',
  city: 'Trichy',
  state: 'Tamil Nadu',
  country: 'India',
  pin_code: '620001',
  phone: '+91 94431 20260',
  whatsapp_number: '+91 94431 20260',
  email: 'demo@shankarjewellers.example',
  gstin: '33DEMOP1234A1Z5',
  pan: 'DEMOP1234A',
  bank_name: 'State Bank of India',
  bank_account_number: '39182746501',
  bank_ifsc: 'SBIN0001234',
  upi_id: 'shankarjewels@upi',
  invoice_prefix: 'SJ-INV-',
  next_invoice_number: 1045,
  default_profit_sharing_model: 'model_a_profit_percent',
  default_profit_sharing_percent: 40,
  inactivity_logout_enabled: true,
  inactivity_timeout_minutes: 15,
  max_concurrent_sessions: 3,
};

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    user_id: 'b0000000-0000-0000-0000-000000000001',
    full_name: 'Sampath Kumar',
    email: 'sampath@shankarjewellers.example',
    phone: '+91 94431 20260',
    role: 'admin',
    branch: 'Trichy - Main Bazaar',
    is_active: true,
    created_at: '2026-06-01T09:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    user_id: 'b0000000-0000-0000-0000-000000000002',
    full_name: 'Meena Ravi',
    email: 'meena.manager@shankarjewellers.example',
    phone: '+91 94431 20261',
    role: 'manager',
    branch: 'Trichy - Main Bazaar',
    is_active: true,
    created_at: '2026-06-01T09:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    user_id: 'b0000000-0000-0000-0000-000000000003',
    full_name: 'Arun Kumar',
    email: 'arun.sales@shankarjewellers.example',
    phone: '+91 94431 20262',
    role: 'billing_staff',
    branch: 'Trichy - Main Bazaar',
    is_active: true,
    created_at: '2026-06-01T09:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    user_id: 'b0000000-0000-0000-0000-000000000004',
    full_name: 'Priya Devi',
    email: 'priya.sales@shankarjewellers.example',
    phone: '+91 94431 20263',
    role: 'billing_staff',
    branch: 'Trichy - Main Bazaar',
    is_active: true,
    created_at: '2026-06-01T09:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000005',
    user_id: 'b0000000-0000-0000-0000-000000000005',
    full_name: 'Karthik Raj',
    email: 'karthik.accounts@shankarjewellers.example',
    phone: '+91 94431 20264',
    role: 'accountant',
    branch: 'Trichy - Main Bazaar',
    is_active: true,
    created_at: '2026-06-01T09:00:00Z',
  },
];

export const DEMO_RATES: MetalRate[] = [
  { id: 'c0000000-0000-0000-0000-000000000016', rate_date: '2026-09-22', gold_24k_per_gram: 13250, gold_22k_per_gram: 12150, gold_18k_per_gram: 9950, silver_per_gram: 165, silver_per_kg: 165000, source: 'chennai_local', notes: 'Official Demo Market Rate (22-Sep-2026)' },
  { id: 'c0000000-0000-0000-0000-000000000015', rate_date: '2026-09-18', gold_24k_per_gram: 13150, gold_22k_per_gram: 12050, gold_18k_per_gram: 9890, silver_per_gram: 164, silver_per_kg: 164000, source: 'chennai_local', notes: 'Trichy Closing Rate' },
  { id: 'c0000000-0000-0000-0000-000000000014', rate_date: '2026-09-12', gold_24k_per_gram: 13050, gold_22k_per_gram: 11980, gold_18k_per_gram: 9820, silver_per_gram: 162.5, silver_per_kg: 162500, source: 'chennai_local', notes: 'Festival Season Rate' },
  { id: 'c0000000-0000-0000-0000-000000000013', rate_date: '2026-09-05', gold_24k_per_gram: 12850, gold_22k_per_gram: 11800, gold_18k_per_gram: 9680, silver_per_gram: 160, silver_per_kg: 160000, source: 'chennai_local', notes: 'September Opening Rate' },
  { id: 'c0000000-0000-0000-0000-000000000012', rate_date: '2026-08-31', gold_24k_per_gram: 12700, gold_22k_per_gram: 11680, gold_18k_per_gram: 9580, silver_per_gram: 158, silver_per_kg: 158000, source: 'chennai_local', notes: 'August Closing Rate' },
  { id: 'c0000000-0000-0000-0000-000000000011', rate_date: '2026-08-25', gold_24k_per_gram: 12550, gold_22k_per_gram: 11520, gold_18k_per_gram: 9450, silver_per_gram: 156, silver_per_kg: 156000, source: 'chennai_local', notes: 'Trichy Local Market Rate' },
  { id: 'c0000000-0000-0000-0000-000000000010', rate_date: '2026-08-15', gold_24k_per_gram: 12350, gold_22k_per_gram: 11350, gold_18k_per_gram: 9300, silver_per_gram: 154.5, silver_per_kg: 154500, source: 'chennai_local', notes: 'Independence Day Rate' },
  { id: 'c0000000-0000-0000-0000-000000000009', rate_date: '2026-08-05', gold_24k_per_gram: 12100, gold_22k_per_gram: 11100, gold_18k_per_gram: 9100, silver_per_gram: 152, silver_per_kg: 152000, source: 'chennai_local', notes: 'August Opening Rate' },
  { id: 'c0000000-0000-0000-0000-000000000008', rate_date: '2026-07-31', gold_24k_per_gram: 11950, gold_22k_per_gram: 10980, gold_18k_per_gram: 8990, silver_per_gram: 150, silver_per_kg: 150000, source: 'chennai_local', notes: 'July Closing Rate' },
  { id: 'c0000000-0000-0000-0000-000000000007', rate_date: '2026-07-25', gold_24k_per_gram: 11800, gold_22k_per_gram: 10850, gold_18k_per_gram: 8880, silver_per_gram: 148, silver_per_kg: 148000, source: 'chennai_local', notes: 'Chennai Jewellers Guild Rate' },
  { id: 'c0000000-0000-0000-0000-000000000006', rate_date: '2026-07-15', gold_24k_per_gram: 11650, gold_22k_per_gram: 10700, gold_18k_per_gram: 8750, silver_per_gram: 145.5, silver_per_kg: 145500, source: 'chennai_local', notes: 'Mid July Local Rate' },
  { id: 'c0000000-0000-0000-0000-000000000005', rate_date: '2026-07-05', gold_24k_per_gram: 11450, gold_22k_per_gram: 10520, gold_18k_per_gram: 8600, silver_per_gram: 143, silver_per_kg: 143000, source: 'chennai_local', notes: 'July Opening Rate' },
  { id: 'c0000000-0000-0000-0000-000000000004', rate_date: '2026-06-30', gold_24k_per_gram: 11300, gold_22k_per_gram: 10380, gold_18k_per_gram: 8480, silver_per_gram: 141, silver_per_kg: 141000, source: 'chennai_local', notes: 'June Closing Rate' },
  { id: 'c0000000-0000-0000-0000-000000000003', rate_date: '2026-06-20', gold_24k_per_gram: 11100, gold_22k_per_gram: 10200, gold_18k_per_gram: 8350, silver_per_gram: 139, silver_per_kg: 139000, source: 'chennai_local', notes: 'Mid June Market Rate' },
  { id: 'c0000000-0000-0000-0000-000000000002', rate_date: '2026-06-10', gold_24k_per_gram: 10850, gold_22k_per_gram: 9980, gold_18k_per_gram: 8150, silver_per_gram: 136.5, silver_per_kg: 136500, source: 'chennai_local', notes: 'Tamil Nadu Market Rate' },
  { id: 'c0000000-0000-0000-0000-000000000001', rate_date: '2026-06-01', gold_24k_per_gram: 10700, gold_22k_per_gram: 9850, gold_18k_per_gram: 8050, silver_per_gram: 135, silver_per_kg: 135000, source: 'chennai_local', notes: 'Chennai Bullion June Opening Rate' },
];

export const DEMO_CATEGORIES: ProductCategory[] = [
  { id: 'd0000000-0000-0000-0000-000000000001', name: 'Gold Rings', description: 'Men, women, and couple finger rings in 22K/18K', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000002', name: 'Gold Chains', description: '22K Lakshmi, rope, and hollow chains', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000003', name: 'Gold Necklaces', description: 'Bridal chokers, kasu malai, and mango haram', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000004', name: 'Gold Bangles', description: 'Traditional kada, round, and casting bangles', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000005', name: 'Gold Earrings', description: 'Jhumkas, daily wear studs, and hangings', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000006', name: 'Gold Bracelets', description: 'Ladies and gents designer bracelets', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000007', name: 'Gold Pendants', description: 'Lakshmi, Ganesha, and floral lockets', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000008', name: 'Gold Chains for Men', description: 'Heavy machine made gents chains', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000009', name: 'Gold Jewellery for Kids', description: 'Baby bangles, nazariya, and studs', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000010', name: 'Silver Anklets', description: 'Kolusu, payal, and bridal silver anklets', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000011', name: 'Silver Rings', description: '925 sterling silver bands and casual rings', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000012', name: 'Silver Chains', description: 'Sterling silver neck chains', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000013', name: 'Silver Articles', description: 'Silver glasses, plates, cups, and bowls', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000014', name: 'Silver Pooja Items', description: 'Kamatchi vilakku, agarbathi stand, kunguma chimizh', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000015', name: 'Diamond Rings', description: 'Certified natural diamond engagement rings', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000016', name: 'Diamond Earrings', description: 'Diamond studs and drops', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000017', name: 'Diamond Pendants', description: 'Single stone and cluster diamond lockets', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000018', name: 'Coins', description: '24K 999 gold coins and fine silver coins', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000019', name: 'Nose Rings', description: 'Traditional mukku poodu and pressing studs', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000020', name: 'Custom Jewellery', description: 'Custom order artisan jewellery', is_active: true },
];

export const DEMO_SUPPLIERS: Supplier[] = [
  { id: 'e0000000-0000-0000-0000-000000000001', supplier_code: 'DEMO-SUP-001', supplier_name: 'Sri Lakshmi Gold Works', contact_person: 'R. Manickam', phone: '+91 94432 50001', whatsapp: '+91 94432 50001', email: 'lakshmi.gold@demo.example', address: '14 Temple Street, RS Puram, Coimbatore', gstin: '33DEMOS1001A1Z1', supplier_type: 'manufacturer', primary_metal: 'gold' },
  { id: 'e0000000-0000-0000-0000-000000000002', supplier_code: 'DEMO-SUP-002', supplier_name: 'Tamil Gold Traders', contact_person: 'S. Shanmugam', phone: '+91 94432 50002', whatsapp: '+91 94432 50002', email: 'tamil.gold@demo.example', address: '88 Big Bazaar Street, Madurai', gstin: '33DEMOS1002A1Z2', supplier_type: 'bullion', primary_metal: 'gold' },
  { id: 'e0000000-0000-0000-0000-000000000003', supplier_code: 'DEMO-SUP-003', supplier_name: 'Chennai Bullion House', contact_person: 'K. Rajagopal', phone: '+91 94432 50003', whatsapp: '+91 94432 50003', email: 'chennai.bullion@demo.example', address: '201 NSC Bose Road, Sowcarpet, Chennai', gstin: '33DEMOS1003A1Z3', supplier_type: 'bullion', primary_metal: 'gold' },
  { id: 'e0000000-0000-0000-0000-000000000004', supplier_code: 'DEMO-SUP-004', supplier_name: 'Kaveri Jewellery Manufacturers', contact_person: 'M. Ganesan', phone: '+91 94432 50004', whatsapp: '+91 94432 50004', email: 'kaveri.mfg@demo.example', address: '45 West Car Street, Thanjavur', gstin: '33DEMOS1004A1Z4', supplier_type: 'manufacturer', primary_metal: 'gold' },
  { id: 'e0000000-0000-0000-0000-000000000005', supplier_code: 'DEMO-SUP-005', supplier_name: 'Southern Gold Suppliers', contact_person: 'P. Natarajan', phone: '+91 94432 50005', whatsapp: '+91 94432 50005', email: 'southern.gold@demo.example', address: '72 Cross Cut Road, Coimbatore', gstin: '33DEMOS1005A1Z5', supplier_type: 'wholesaler', primary_metal: 'gold' },
  { id: 'e0000000-0000-0000-0000-000000000006', supplier_code: 'DEMO-SUP-006', supplier_name: 'Trichy Gold & Silver Works', contact_person: 'A. Murugesan', phone: '+91 94432 50006', whatsapp: '+91 94432 50006', email: 'trichy.works@demo.example', address: '29 Chinnakadai Street, Trichy', gstin: '33DEMOS1006A1Z6', supplier_type: 'manufacturer', primary_metal: 'silver' },
  { id: 'e0000000-0000-0000-0000-000000000007', supplier_code: 'DEMO-SUP-007', supplier_name: 'Classic Diamond Suppliers', contact_person: 'D. Mehta', phone: '+91 94432 50007', whatsapp: '+91 94432 50007', email: 'classic.diamonds@demo.example', address: '118 Mint Street, George Town, Chennai', gstin: '33DEMOS1007A1Z7', supplier_type: 'diamond', primary_metal: 'other' },
  { id: 'e0000000-0000-0000-0000-000000000008', supplier_code: 'DEMO-SUP-008', supplier_name: 'Sri Vinayaga Bullion', contact_person: 'V. Subramanian', phone: '+91 94432 50008', whatsapp: '+91 94432 50008', email: 'vinayaga.bullion@demo.example', address: '55 Bazaar Road, Salem', gstin: '33DEMOS1008A1Z8', supplier_type: 'bullion', primary_metal: 'silver' },
  { id: 'e0000000-0000-0000-0000-000000000009', supplier_code: 'DEMO-SUP-009', supplier_name: 'Kongu Bullion Refinery', contact_person: 'T. Kandasamy', phone: '+91 94432 50009', whatsapp: '+91 94432 50009', email: 'kongu.refinery@demo.example', address: '102 Erode Road, Tiruppur', gstin: '33DEMOS1009A1Z9', supplier_type: 'refinery', primary_metal: 'gold' },
  { id: 'e0000000-0000-0000-0000-000000000010', supplier_code: 'DEMO-SUP-010', supplier_name: 'Meenakshi Goldsmith Guild', contact_person: 'C. Veluchamy', phone: '+91 94432 50010', whatsapp: '+91 94432 50010', email: 'meenakshi.guild@demo.example', address: '64 South Masi Street, Madurai', gstin: '33DEMOS1010A1Z0', supplier_type: 'artisan', primary_metal: 'gold' },
];

export const DEMO_CUSTOMERS: Customer[] = [
  { id: 'f0000000-0000-0000-0000-000000000001', customer_code: 'DEMO-CUST-001', full_name: 'Rahul Krishnan', customer_type: 'retail', phone: '+91 98421 11001', whatsapp_number: '+91 98421 11001', email: 'rahul.k@demo.example', address: '14 Thillai Nagar 5th Cross', city: 'Trichy', state: 'Tamil Nadu', pin_code: '620018', credit_limit: 300000, agreed_profit_percent: 0, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000002', customer_code: 'DEMO-CUST-002', full_name: 'Priya Suresh', customer_type: 'retail', phone: '+91 98421 11002', whatsapp_number: '+91 98421 11002', email: 'priya.s@demo.example', address: '88 Cantonment Royal Enclave', city: 'Trichy', state: 'Tamil Nadu', pin_code: '620001', credit_limit: 500000, agreed_profit_percent: 0, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000003', customer_code: 'DEMO-CUST-003', full_name: 'Aravind Kumar', customer_type: 'retail', phone: '+91 98421 11003', whatsapp_number: '+91 98421 11003', email: 'aravind.k@demo.example', address: '22 KK Nagar Main Road', city: 'Trichy', state: 'Tamil Nadu', pin_code: '620021', credit_limit: 200000, agreed_profit_percent: 0, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000004', customer_code: 'DEMO-CUST-004', full_name: 'Divya Raj', customer_type: 'retail', phone: '+91 98421 11004', whatsapp_number: '+91 98421 11004', email: 'divya.raj@demo.example', address: '45 Srirangam North Chithirai St', city: 'Trichy', state: 'Tamil Nadu', pin_code: '620006', credit_limit: 150000, agreed_profit_percent: 0, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000005', customer_code: 'DEMO-CUST-005', full_name: 'Karthik M', customer_type: 'retail', phone: '+91 98421 11005', whatsapp_number: '+91 98421 11005', email: 'karthik.m@demo.example', address: '109 Palakarai Main Road', city: 'Trichy', state: 'Tamil Nadu', pin_code: '620008', credit_limit: 250000, agreed_profit_percent: 0, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000006', customer_code: 'DEMO-CUST-006', full_name: 'Meena Lakshmi', customer_type: 'retail', phone: '+91 98421 11006', whatsapp_number: '+91 98421 11006', email: 'meena.lakshmi@demo.example', address: '33 Gandhi Market View', city: 'Trichy', state: 'Tamil Nadu', pin_code: '620002', credit_limit: 200000, agreed_profit_percent: 0, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000007', customer_code: 'DEMO-CUST-007', full_name: 'Vignesh R', customer_type: 'retail', phone: '+91 98421 11007', whatsapp_number: '+91 98421 11007', email: 'vignesh.r@demo.example', address: '61 West Boulevard Road', city: 'Trichy', state: 'Tamil Nadu', pin_code: '620008', credit_limit: 100000, agreed_profit_percent: 0, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000008', customer_code: 'DEMO-CUST-008', full_name: 'Anitha Kumar', customer_type: 'retail', phone: '+91 98421 11008', whatsapp_number: '+91 98421 11008', email: 'anitha.k@demo.example', address: '19 Williams Road', city: 'Trichy', state: 'Tamil Nadu', pin_code: '620001', credit_limit: 150000, agreed_profit_percent: 0, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000009', customer_code: 'DEMO-CUST-009', full_name: 'Suresh Babu', customer_type: 'retail', phone: '+91 98421 11009', whatsapp_number: '+91 98421 11009', email: 'suresh.b@demo.example', address: '74 VOC Nagar', city: 'Thanjavur', state: 'Tamil Nadu', pin_code: '613001', credit_limit: 350000, agreed_profit_percent: 0, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000010', customer_code: 'DEMO-CUST-010', full_name: 'Kavya Srinivasan', customer_type: 'retail', phone: '+91 98421 11010', whatsapp_number: '+91 98421 11010', email: 'kavya.s@demo.example', address: '12 Sastri Road', city: 'Trichy', state: 'Tamil Nadu', pin_code: '620018', credit_limit: 250000, agreed_profit_percent: 0, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  // Wholesale Partners
  { id: 'f0000000-0000-0000-0000-000000000021', customer_code: 'DEMO-CUST-021', full_name: 'Anand Ramakrishnan', shop_name: 'Sri Lakshmi Jewellery', customer_type: 'wholesale', phone: '+91 94432 11001', whatsapp_number: '+91 94432 11001', email: 'anand@srilakshmijewel.example', address: '45 Cross Cut Road', city: 'Madurai', state: 'Tamil Nadu', pin_code: '625001', credit_limit: 1200000, agreed_profit_percent: 40, agreed_customer_touch: 40, default_actual_touch: 37, default_profit_touch: 10, default_billing_touch: 47, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000022', customer_code: 'DEMO-CUST-022', full_name: 'Venkatesh Prabhu', shop_name: 'Prabhu Bullion & Gems', customer_type: 'wholesale', phone: '+91 98421 22002', whatsapp_number: '+91 98421 22002', email: 'prabhu@prabhubullion.example', address: '12 Bazaar Street', city: 'Salem', state: 'Tamil Nadu', pin_code: '636001', credit_limit: 1000000, agreed_profit_percent: 35, agreed_customer_touch: 35, default_actual_touch: 37, default_profit_touch: 10, default_billing_touch: 47, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000023', customer_code: 'DEMO-CUST-023', full_name: 'Karthik Subramanian', shop_name: 'Karthik Retail Traders', customer_type: 'wholesale', phone: '+91 97900 33003', whatsapp_number: '+91 97900 33003', email: 'karthik@karthiktraders.example', address: '88 Big Bazaar', city: 'Erode', state: 'Tamil Nadu', pin_code: '638001', credit_limit: 800000, agreed_profit_percent: 40, agreed_customer_touch: 40, default_actual_touch: 37, default_profit_touch: 10, default_billing_touch: 47, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000024', customer_code: 'DEMO-CUST-024', full_name: 'Murugan Chettiar', shop_name: 'Murugan Gold Emporium', customer_type: 'wholesale', phone: '+91 94433 44004', whatsapp_number: '+91 94433 44004', email: 'murugan@emporium.example', address: '105 Car Street', city: 'Tirunelveli', state: 'Tamil Nadu', pin_code: '627001', credit_limit: 900000, agreed_profit_percent: 40, agreed_customer_touch: 40, default_actual_touch: 37, default_profit_touch: 10, default_billing_touch: 47, profit_sharing_model: 'model_a_profit_percent', is_active: true },
  { id: 'f0000000-0000-0000-0000-000000000025', customer_code: 'DEMO-CUST-025', full_name: 'Saravanan S', shop_name: 'Saravana Jewels', customer_type: 'wholesale', phone: '+91 98422 55005', whatsapp_number: '+91 98422 55005', email: 'saravanan@saravanajewels.example', address: '52 Raja Street', city: 'Coimbatore', state: 'Tamil Nadu', pin_code: '641001', credit_limit: 1500000, agreed_profit_percent: 38, agreed_customer_touch: 38, default_actual_touch: 37, default_profit_touch: 10, default_billing_touch: 47, profit_sharing_model: 'model_a_profit_percent', is_active: true },
];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    sku: 'SJ-GR-001',
    barcode: '89010101',
    qr_code: 'QR-SJ-GR-001',
    name: '22K Classic Gold Ring',
    category_id: 'd0000000-0000-0000-0000-000000000001',
    category_name: 'Gold Rings',
    metal_type: 'gold',
    purity: '22k',
    gross_weight_g: 5.820,
    stone_weight_g: 0.170,
    other_weight_g: 0,
    net_weight_g: 5.650,
    unit: 'grams',
    quantity: 18,
    making_charge_type: 'flat',
    making_charge_rate: 850,
    labour_charge: 150,
    wastage_percent: 3.5,
    wastage_weight_g: 0.198,
    purchase_cost: 64500,
    manufacturing_cost: 65500,
    retail_price: 74250,
    wholesale_valuation: 68650,
    minimum_stock: 5,
    description: 'Classic 22K yellow gold gents engagement ring with glossy finish',
    primary_photo_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=60',
    status: 'in_stock',
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    sku: 'SJ-GC-001',
    barcode: '89010102',
    qr_code: 'QR-SJ-GC-001',
    name: '22K Lakshmi Gold Chain',
    category_id: 'd0000000-0000-0000-0000-000000000002',
    category_name: 'Gold Chains',
    metal_type: 'gold',
    purity: '22k',
    gross_weight_g: 18.400,
    stone_weight_g: 0.300,
    other_weight_g: 0,
    net_weight_g: 18.100,
    unit: 'grams',
    quantity: 12,
    making_charge_type: 'flat',
    making_charge_rate: 2700,
    labour_charge: 500,
    wastage_percent: 4.0,
    wastage_weight_g: 0.724,
    purchase_cost: 208500,
    manufacturing_cost: 211700,
    retail_price: 238500,
    wholesale_valuation: 220000,
    minimum_stock: 4,
    description: 'Traditional 22K gold Lakshmi mugappu chain 22 inches',
    primary_photo_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=60',
    status: 'in_stock',
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    sku: 'SJ-GB-001',
    barcode: '89010103',
    qr_code: 'QR-SJ-GB-001',
    name: '22K Traditional Gold Bangle',
    category_id: 'd0000000-0000-0000-0000-000000000004',
    category_name: 'Gold Bangles',
    metal_type: 'gold',
    purity: '22k',
    gross_weight_g: 24.800,
    stone_weight_g: 0.400,
    other_weight_g: 0,
    net_weight_g: 24.400,
    unit: 'grams',
    quantity: 10,
    making_charge_type: 'flat',
    making_charge_rate: 3900,
    labour_charge: 600,
    wastage_percent: 4.5,
    wastage_weight_g: 1.098,
    purchase_cost: 281000,
    manufacturing_cost: 285500,
    retail_price: 321500,
    wholesale_valuation: 296500,
    minimum_stock: 3,
    description: 'Authentic South Indian handcrafted floral embossed kada bangle',
    primary_photo_url: 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60',
    status: 'in_stock',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    sku: 'SJ-GE-001',
    barcode: '89010104',
    qr_code: 'QR-SJ-GE-001',
    name: '22K Daily Wear Gold Earrings',
    category_id: 'd0000000-0000-0000-0000-000000000005',
    category_name: 'Gold Earrings',
    metal_type: 'gold',
    purity: '22k',
    gross_weight_g: 4.750,
    stone_weight_g: 0.200,
    other_weight_g: 0,
    net_weight_g: 4.550,
    unit: 'grams',
    quantity: 22,
    making_charge_type: 'flat',
    making_charge_rate: 720,
    labour_charge: 180,
    wastage_percent: 3.0,
    wastage_weight_g: 0.137,
    purchase_cost: 52000,
    manufacturing_cost: 52900,
    retail_price: 59800,
    wholesale_valuation: 55300,
    minimum_stock: 6,
    description: 'Lightweight floral screw-back studs for daily college/office wear',
    primary_photo_url: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=500&auto=format&fit=crop&q=60',
    status: 'in_stock',
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    sku: 'SJ-GN-001',
    barcode: '89010105',
    qr_code: 'QR-SJ-GN-001',
    name: '22K Bridal Gold Necklace',
    category_id: 'd0000000-0000-0000-0000-000000000003',
    category_name: 'Gold Necklaces',
    metal_type: 'gold',
    purity: '22k',
    gross_weight_g: 48.600,
    stone_weight_g: 0.700,
    other_weight_g: 0,
    net_weight_g: 47.900,
    unit: 'grams',
    quantity: 6,
    making_charge_type: 'flat',
    making_charge_rate: 8500,
    labour_charge: 1500,
    wastage_percent: 5.0,
    wastage_weight_g: 2.395,
    purchase_cost: 552000,
    manufacturing_cost: 562000,
    retail_price: 632000,
    wholesale_valuation: 582000,
    minimum_stock: 2,
    description: 'Grand temple design bridal choker necklace set with ruby highlights',
    primary_photo_url: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=500&auto=format&fit=crop&q=60',
    status: 'in_stock',
  },
  {
    id: '10000000-0000-0000-0000-000000000022',
    sku: 'SJ-SA-001',
    barcode: '89010122',
    qr_code: 'QR-SJ-SA-001',
    name: '925 Silver Peacock Anklets (Kolusu)',
    category_id: 'd0000000-0000-0000-0000-000000000010',
    category_name: 'Silver Anklets',
    metal_type: 'silver',
    purity: '925_silver',
    gross_weight_g: 68.500,
    stone_weight_g: 0.500,
    other_weight_g: 0,
    net_weight_g: 68.000,
    unit: 'grams',
    quantity: 25,
    making_charge_type: 'flat',
    making_charge_rate: 950,
    labour_charge: 200,
    wastage_percent: 2.0,
    wastage_weight_g: 1.360,
    purchase_cost: 10500,
    manufacturing_cost: 11650,
    retail_price: 13400,
    wholesale_valuation: 11200,
    minimum_stock: 6,
    description: 'Handcrafted traditional Salem silver bell anklets (Goluusu) pair',
    primary_photo_url: 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60',
    status: 'in_stock',
  },
  {
    id: '10000000-0000-0000-0000-000000000031',
    sku: 'SJ-DR-001',
    barcode: '89010131',
    qr_code: 'QR-SJ-DR-001',
    name: '18K Diamond Solitaire Ring (0.50 ct)',
    category_id: 'd0000000-0000-0000-0000-000000000015',
    category_name: 'Diamond Rings',
    metal_type: 'gold',
    purity: '18k',
    gross_weight_g: 4.200,
    stone_weight_g: 0.100,
    other_weight_g: 0,
    net_weight_g: 4.100,
    unit: 'grams',
    quantity: 8,
    making_charge_type: 'flat',
    making_charge_rate: 4500,
    labour_charge: 1000,
    wastage_percent: 2.0,
    wastage_weight_g: 0.082,
    purchase_cost: 95000,
    manufacturing_cost: 100500,
    retail_price: 128000,
    wholesale_valuation: 105000,
    minimum_stock: 2,
    description: 'IGI certified VVS1-E brilliant round diamond in 18K white/yellow gold',
    primary_photo_url: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&auto=format&fit=crop&q=60',
    status: 'in_stock',
  },
  {
    id: '10000000-0000-0000-0000-000000000037',
    sku: 'SJ-CN-001',
    barcode: '89010137',
    qr_code: 'QR-SJ-CN-001',
    name: '24K Lakshmi Gold Coin 5g',
    category_id: 'd0000000-0000-0000-0000-000000000018',
    category_name: 'Coins',
    metal_type: 'gold',
    purity: '24k',
    gross_weight_g: 5.000,
    stone_weight_g: 0,
    other_weight_g: 0,
    net_weight_g: 5.000,
    unit: 'grams',
    quantity: 35,
    making_charge_type: 'flat',
    making_charge_rate: 450,
    labour_charge: 0,
    wastage_percent: 0,
    wastage_weight_g: 0,
    purchase_cost: 65000,
    manufacturing_cost: 65450,
    retail_price: 68500,
    wholesale_valuation: 66250,
    minimum_stock: 10,
    description: '999 fine pure 24K gold Lakshmi coin with certicard',
    primary_photo_url: 'https://images.unsplash.com/photo-1611591475883-8a3c8e42f534?w=500&auto=format&fit=crop&q=60',
    status: 'in_stock',
  },
];

export const DEMO_HERO_INVOICE: RetailInvoice = {
  id: '30000000-0000-0000-0000-000000000038',
  invoice_number: 'SJ-INV-2026-038',
  customer_id: 'f0000000-0000-0000-0000-000000000002',
  customer_name: 'Priya Suresh',
  customer_phone: '+91 98421 11002',
  invoice_date: '2026-09-22',
  subtotal_metal_value: 938500.00,
  total_making_charges: 18700.00,
  total_labour_charges: 3600.00,
  total_wastage_value: 54500.00,
  discount_amount: 5000.00,
  tax_percent: 3.00,
  tax_amount: 30309.00,
  round_off: 391.00,
  total_amount: 1045000.00,
  paid_amount: 700000.00,
  balance_due: 345000.00,
  payment_status: 'partial',
  status: 'finalized',
  notes: 'Grand Bridal Jewellery Package: Bridal Choker Necklace + Antique Bangles + Jimikki Kammal + Diamond Solitaire Pendant. Split payment: ₹5L UPI + ₹2L Card + Balance ₹3.45L Due',
  items: [
    {
      id: '31000000-0000-0000-0000-000000000001',
      invoice_id: '30000000-0000-0000-0000-000000000038',
      product_id: '10000000-0000-0000-0000-000000000005',
      product_name_snapshot: '22K Bridal Gold Necklace',
      sku_snapshot: 'SJ-GN-001',
      metal_type: 'gold',
      purity: '22k',
      gross_weight_g: 48.600,
      stone_weight_g: 0.700,
      net_weight_g: 47.900,
      quantity: 1,
      metal_rate_snapshot: 12150.00,
      metal_value: 581985.00,
      making_charge: 8500.00,
      labour_charge: 1500.00,
      wastage_percent: 5.00,
      wastage_weight_g: 2.395,
      wastage_value: 29099.00,
      discount: 2500.00,
      line_total: 618584.00,
    },
    {
      id: '31000000-0000-0000-0000-000000000002',
      invoice_id: '30000000-0000-0000-0000-000000000038',
      product_id: '10000000-0000-0000-0000-000000000003',
      product_name_snapshot: '22K Traditional Gold Bangle',
      sku_snapshot: 'SJ-GB-001',
      metal_type: 'gold',
      purity: '22k',
      gross_weight_g: 24.800,
      stone_weight_g: 0.400,
      net_weight_g: 24.400,
      quantity: 1,
      metal_rate_snapshot: 12150.00,
      metal_value: 296460.00,
      making_charge: 3900.00,
      labour_charge: 600.00,
      wastage_percent: 4.50,
      wastage_weight_g: 1.098,
      wastage_value: 13341.00,
      discount: 1500.00,
      line_total: 312801.00,
    },
  ],
};

// ============================================================================
// SEED & RESET PROGRAMMATIC ACTIONS
// ============================================================================

export async function seedDemoData(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. If Supabase is configured, upsert into PostgreSQL tables
    if (isSupabaseConfigured() && supabase) {
      await supabase.from('business_settings').upsert(DEMO_SETTINGS);
      await supabase.from('product_categories').upsert(DEMO_CATEGORIES);
      await supabase.from('suppliers').upsert(DEMO_SUPPLIERS);
      await supabase.from('customers').upsert(DEMO_CUSTOMERS);
      await supabase.from('products').upsert(DEMO_PRODUCTS);
      await supabase.from('metal_rates').upsert(DEMO_RATES);
      await supabase.from('retail_invoices').upsert({
        ...DEMO_HERO_INVOICE,
        items: undefined,
      });
      syncEngine.notifyDataChange('all_tables', 'INSERT', { action: 'seed_demo_data' });
    }

    // 2. Also update local storage store for instant client responsiveness
    const db = getLocalDb();
    db.settings = DEMO_SETTINGS;
    db.categories = DEMO_CATEGORIES;
    db.suppliers = DEMO_SUPPLIERS;
    db.customers = DEMO_CUSTOMERS;
    db.products = DEMO_PRODUCTS;
    db.metalRates = DEMO_RATES;
    db.retailInvoices = [DEMO_HERO_INVOICE, ...(db.retailInvoices || []).filter(i => i.id !== DEMO_HERO_INVOICE.id)];
    saveLocalDb(db);

    return {
      success: true,
      message: 'Demo dataset loaded successfully! Dashboard, catalog, invoices, and reports are now populated.',
    };
  } catch (err: any) {
    console.error('Demo data seed error:', err);
    return {
      success: false,
      message: `Failed to load demo data: ${err?.message || 'Unknown database error'}`,
    };
  }
}

export async function clearDemoData(): Promise<{ success: boolean; message: string }> {
  try {
    if (isSupabaseConfigured() && supabase) {
      // Purge only records matching demo keys
      await supabase.from('retail_invoices').delete().like('invoice_number', 'SJ-INV-2026-%');
      await supabase.from('purchases').delete().like('purchase_number', 'DEMO-PUR-%');
      await supabase.from('wholesale_issues').delete().like('issue_number', 'DEMO-WSI-%');
      await supabase.from('expenses').delete().like('expense_number', 'DEMO-EXP-%');
      await supabase.from('manufacturing_jobs').delete().like('job_card_number', 'DEMO-JC-%');
      await supabase.from('customers').delete().like('customer_code', 'DEMO-CUST-%');
      await supabase.from('suppliers').delete().like('supplier_code', 'DEMO-SUP-%');
      syncEngine.notifyDataChange('all_tables', 'DELETE', { action: 'clear_demo_data' });
    }

    const db = getLocalDb();
    db.customers = (db.customers || []).filter(c => !c.customer_code.startsWith('DEMO-'));
    db.suppliers = (db.suppliers || []).filter(s => !s.supplier_code.startsWith('DEMO-'));
    db.products = (db.products || []).filter(p => !p.sku.startsWith('SJ-'));
    db.retailInvoices = (db.retailInvoices || []).filter(i => !i.invoice_number.startsWith('SJ-INV-2026-'));
    saveLocalDb(db);

    return {
      success: true,
      message: 'Demo data cleared safely! Production records were preserved.',
    };
  } catch (err: any) {
    console.error('Clear demo data error:', err);
    return {
      success: false,
      message: `Failed to clear demo data: ${err?.message || 'Database error'}`,
    };
  }
}
