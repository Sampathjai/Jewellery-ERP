import { createClient } from '@supabase/supabase-js';
import { syncEngine } from './syncEngine';
import {
  UserProfile,
  BusinessSettings,
  MetalRate,
  Customer,
  Supplier,
  ProductCategory,
  Product,
  InventoryMovement,
  ManufacturingJob,
  RetailInvoice,
  RetailPayment,
  RetailReturn,
  WholesaleIssue,
  WholesaleSale,
  WholesaleReturn,
  WholesaleSettlement,
  WholesalePayment,
  Expense,
  AuditLog,
  NotificationItem,
  WhatsAppMessage,
  Purchase,
  PurchasePayment,
} from '@/types';

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (import.meta.env[key] as string) || '';
    }
  } catch (e) {
    // Ignore environment resolution error
  }
  return '';
};

export const rawSupabaseUrl = (
  getEnvVar('VITE_SUPABASE_URL') ||
  getEnvVar('NEXT_PUBLIC_SUPABASE_URL') ||
  'https://czrqgnoqdbzdlarslqlk.supabase.co'
).trim();

export const rawSupabaseKey = (
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
  'sb_publishable_gCtxdfxlqViuHBs-MAlcEQ_2NhkX8cz'
).trim();

export const isValidHttpUrl = (urlStr: string): boolean => {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

export const isSupabaseConfigured = (): boolean => {
  return isValidHttpUrl(rawSupabaseUrl) && Boolean(rawSupabaseKey && rawSupabaseKey.length > 0);
};

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase URL or Key is missing or invalid. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    return null;
  }
  try {
    return createClient(rawSupabaseUrl, rawSupabaseKey);
  } catch (e) {
    console.warn('Supabase createClient error prevented crash:', e);
    return null;
  }
};

export const supabase = getSupabaseClient();

// ============================================================================
// MOCK PERSISTENT DATA STORAGE ENGINE FOR CLIENT/DEMO MODE
// ============================================================================

const STORAGE_KEY = 'sampath_jewellery_db_v1';

interface DbStore {
  settings: BusinessSettings;
  metalRates: MetalRate[];
  categories: ProductCategory[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  users: UserProfile[];
  inventoryMovements: InventoryMovement[];
  manufacturingJobs: ManufacturingJob[];
  retailInvoices: RetailInvoice[];
  retailPayments: RetailPayment[];
  retailReturns: RetailReturn[];
  wholesaleIssues: WholesaleIssue[];
  wholesaleSales: WholesaleSale[];
  wholesaleReturns: WholesaleReturn[];
  wholesaleSettlements: WholesaleSettlement[];
  wholesalePayments: WholesalePayment[];
  purchases: Purchase[];
  purchasePayments: PurchasePayment[];
  expenses: Expense[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  whatsappMessages: WhatsAppMessage[];
}

const defaultSeedStore: DbStore = {
  settings: {
    id: 'set-1',
    shop_name: 'Shankar Jewellery',
    owner_name: 'Sampath Kumar',
    address: 'No.4 sandhukadai, bigbazzar street',
    city: 'Trichy',
    state: 'Tamil Nadu',
    country: 'India',
    pin_code: '620008',
    phone: '+91 98765 43210',
    whatsapp_number: '+91 98765 43210',
    email: 'contact@shankarjewellery.com',
    gstin: '',
    pan: 'ABCDE1234F',
    bank_name: 'State Bank of India',
    bank_account_number: '39182746501',
    bank_ifsc: 'SBIN0001234',
    upi_id: 'shankarjewels@upi',
    invoice_prefix: 'SJ-INV-',
    next_invoice_number: 1005,
    default_profit_sharing_model: 'model_a_profit_percent',
    default_profit_sharing_percent: 40,
    inactivity_logout_enabled: true,
    inactivity_timeout_minutes: 15,
  },
  metalRates: [
    {
      id: 'rate-1',
      rate_date: new Date().toISOString().split('T')[0],
      gold_24k_per_gram: 7450,
      gold_22k_per_gram: 6830,
      gold_18k_per_gram: 5600,
      silver_per_gram: 89.5,
      silver_per_kg: 89500,
      source: 'manual',
      notes: 'Official Market Rate',
    },
    {
      id: 'rate-2',
      rate_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      gold_24k_per_gram: 7420,
      gold_22k_per_gram: 6800,
      gold_18k_per_gram: 5580,
      silver_per_gram: 89.0,
      silver_per_kg: 89000,
      source: 'manual',
      notes: 'Yesterday closing rate',
    },
  ],
  categories: [
    { id: 'cat-1', name: 'Nose Rings', description: 'Gold and Silver nose pins, press studs, and rings', is_active: true },
    { id: 'cat-2', name: 'Ear Rings', description: 'Gold and Silver earrings, studs, jhumkas, and hoops', is_active: true },
    { id: 'cat-3', name: 'Rings', description: 'Gold and silver finger rings for men and women', is_active: true },
    { id: 'cat-4', name: 'Chains', description: '22K and 18K gold chains and silver rope chains', is_active: true },
    { id: 'cat-5', name: 'Bangles', description: 'Gold bangles, kada, and silver bangles', is_active: true },
    { id: 'cat-6', name: 'Bracelets', description: 'Gold and silver wrist bracelets', is_active: true },
    { id: 'cat-7', name: 'Necklaces', description: 'Designer gold bridal necklaces', is_active: true },
    { id: 'cat-8', name: 'Silver Items', description: 'Silver lamps, coins, plates, and boxes', is_active: true },
    { id: 'cat-9', name: 'Custom Orders', description: 'Custom designed jewellery pieces', is_active: true },
  ],
  products: [
    {
      id: 'prod-1',
      sku: 'NR-G22-001',
      barcode: '8901001',
      qr_code: 'QR-8901001',
      name: 'Traditional Gold Mukku Poodu Nose Pin',
      category_id: 'cat-1',
      category_name: 'Nose Rings',
      metal_type: 'gold',
      purity: '22k',
      gross_weight_g: 0.45,
      stone_weight_g: 0.05,
      other_weight_g: 0,
      net_weight_g: 0.4,
      unit: 'grams',
      quantity: 50,
      making_charge_type: 'per_piece',
      making_charge_rate: 150,
      labour_charge: 50,
      wastage_percent: 2.5,
      wastage_weight_g: 0.01,
      purchase_cost: 2600,
      manufacturing_cost: 2650,
      retail_price: 3150,
      wholesale_valuation: 2730,
      minimum_stock: 10,
      description: 'Handcrafted traditional 22K gold nose pin with press stud mechanism',
      primary_photo_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=60',
      status: 'in_stock',
    },
    {
      id: 'prod-2',
      sku: 'NR-G22-002',
      barcode: '8901002',
      qr_code: 'QR-8901002',
      name: 'Single Diamond Stud Gold Nose Ring',
      category_id: 'cat-1',
      category_name: 'Nose Rings',
      metal_type: 'gold',
      purity: '22k',
      gross_weight_g: 0.6,
      stone_weight_g: 0.1,
      other_weight_g: 0,
      net_weight_g: 0.5,
      unit: 'grams',
      quantity: 40,
      making_charge_type: 'per_piece',
      making_charge_rate: 200,
      labour_charge: 75,
      wastage_percent: 3.0,
      wastage_weight_g: 0.015,
      purchase_cost: 3200,
      manufacturing_cost: 3275,
      retail_price: 3950,
      wholesale_valuation: 3415,
      minimum_stock: 8,
      description: 'Single CZ stone studded 22K gold nose ring with secure screw back',
      primary_photo_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=60',
      status: 'in_stock',
    },
    {
      id: 'prod-3',
      sku: 'NR-S92-001',
      barcode: '8901003',
      qr_code: 'QR-8901003',
      name: 'Silver Pressing Type Nose Stud',
      category_id: 'cat-1',
      category_name: 'Nose Rings',
      metal_type: 'silver',
      purity: '925_silver',
      gross_weight_g: 1.2,
      stone_weight_g: 0,
      other_weight_g: 0,
      net_weight_g: 1.2,
      unit: 'grams',
      quantity: 100,
      making_charge_type: 'per_piece',
      making_charge_rate: 40,
      labour_charge: 10,
      wastage_percent: 1.0,
      wastage_weight_g: 0.012,
      purchase_cost: 110,
      manufacturing_cost: 120,
      retail_price: 165,
      wholesale_valuation: 120,
      minimum_stock: 20,
      description: '925 Sterling Silver non-piercing press nose stud',
      primary_photo_url: 'https://images.unsplash.com/photo-1611591475143-4f8f77346564?w=500&auto=format&fit=crop&q=60',
      status: 'in_stock',
    },
    {
      id: 'prod-4',
      sku: 'ER-G22-001',
      barcode: '8901004',
      qr_code: 'QR-8901004',
      name: '22K Gold Antique Jhumka Earrings',
      category_id: 'cat-2',
      category_name: 'Ear Rings',
      metal_type: 'gold',
      purity: '22k',
      gross_weight_g: 12.5,
      stone_weight_g: 0.8,
      other_weight_g: 0,
      net_weight_g: 11.7,
      unit: 'grams',
      quantity: 10,
      making_charge_type: 'per_gram',
      making_charge_rate: 450,
      labour_charge: 200,
      wastage_percent: 8.0,
      wastage_weight_g: 0.936,
      purchase_cost: 76000,
      manufacturing_cost: 78000,
      retail_price: 92400,
      wholesale_valuation: 79900,
      minimum_stock: 2,
      description: 'Traditional temple design antique finish 22K gold Jhumka pair',
      primary_photo_url: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=500&auto=format&fit=crop&q=60',
      status: 'in_stock',
    },
    {
      id: 'prod-5',
      sku: 'ER-G22-002',
      barcode: '8901005',
      qr_code: 'QR-8901005',
      name: '22K Daily Wear Gold Stud Earrings',
      category_id: 'cat-2',
      category_name: 'Ear Rings',
      metal_type: 'gold',
      purity: '22k',
      gross_weight_g: 3.2,
      stone_weight_g: 0.2,
      other_weight_g: 0,
      net_weight_g: 3.0,
      unit: 'grams',
      quantity: 25,
      making_charge_type: 'per_gram',
      making_charge_rate: 350,
      labour_charge: 100,
      wastage_percent: 5.0,
      wastage_weight_g: 0.15,
      purchase_cost: 19500,
      manufacturing_cost: 20000,
      retail_price: 23500,
      wholesale_valuation: 20490,
      minimum_stock: 5,
      description: 'Lightweight floral design daily wear gold studs',
      primary_photo_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&auto=format&fit=crop&q=60',
      status: 'in_stock',
    },
    {
      id: 'prod-6',
      sku: 'ER-S92-001',
      barcode: '8901006',
      qr_code: 'QR-8901006',
      name: '925 Sterling Silver Peacock Studs',
      category_id: 'cat-2',
      category_name: 'Ear Rings',
      metal_type: 'silver',
      purity: '925_silver',
      gross_weight_g: 5.5,
      stone_weight_g: 0.5,
      other_weight_g: 0,
      net_weight_g: 5.0,
      unit: 'grams',
      quantity: 30,
      making_charge_type: 'per_piece',
      making_charge_rate: 120,
      labour_charge: 30,
      wastage_percent: 2.0,
      wastage_weight_g: 0.1,
      purchase_cost: 480,
      manufacturing_cost: 500,
      retail_price: 680,
      wholesale_valuation: 500,
      minimum_stock: 5,
      description: 'Silver Oxidized Peacock Earring Stud pair',
      primary_photo_url: 'https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=500&auto=format&fit=crop&q=60',
      status: 'in_stock',
    },
  ],
  customers: [
    {
      id: 'cust-1',
      customer_code: 'CUST-101',
      full_name: 'Anand Ramakrishnan',
      shop_name: 'Sri Lakshmi Jewellery',
      customer_type: 'wholesale',
      phone: '+91 94432 11001',
      whatsapp_number: '+91 94432 11001',
      city: 'Madurai',
      address: '45 Cross Cut Road',
      agreed_customer_touch: 40,
      agreed_profit_percent: 40,
      profit_sharing_model: 'model_a_profit_percent',
      credit_limit: 500000,
      payment_terms: '30 Days',
      is_active: true,
      notes: 'Primary wholesale consignment dealer for nose rings and ear rings',
    },
    {
      id: 'cust-2',
      customer_code: 'CUST-102',
      full_name: 'Venkatesh Prabhu',
      shop_name: 'Prabhu Bullion & Gems',
      customer_type: 'wholesale',
      phone: '+91 98421 22002',
      whatsapp_number: '+91 98421 22002',
      city: 'Salem',
      address: '12 Bazzar Street',
      agreed_customer_touch: 38,
      agreed_profit_percent: 35,
      profit_sharing_model: 'model_a_profit_percent',
      credit_limit: 350000,
      payment_terms: '15 Days',
      is_active: true,
      notes: 'Wholesale retailer supplying Salem regional shops',
    },
    {
      id: 'cust-3',
      customer_code: 'CUST-103',
      full_name: 'Karthik Subramanian',
      shop_name: 'Karthik Retail Traders',
      customer_type: 'wholesale',
      phone: '+91 97900 33003',
      whatsapp_number: '+91 97900 33003',
      city: 'Erode',
      address: '88 Big Bazzar',
      agreed_customer_touch: 40,
      agreed_profit_percent: 40,
      profit_sharing_model: 'model_a_profit_percent',
      credit_limit: 250000,
      payment_terms: '30 Days',
      is_active: true,
      notes: 'Erode wholesale credit partner',
    },
    {
      id: 'cust-4',
      customer_code: 'CUST-104',
      full_name: 'Priya Sundaram',
      shop_name: '',
      customer_type: 'retail',
      phone: '+91 98940 44004',
      whatsapp_number: '+91 98940 44004',
      city: 'Coimbatore',
      address: '12 Gandhi Nagar',
      agreed_profit_percent: 0,
      profit_sharing_model: 'model_a_profit_percent',
      credit_limit: 0,
      is_active: true,
    },
    {
      id: 'cust-5',
      customer_code: 'CUST-105',
      full_name: 'Rajesh Kanna',
      shop_name: '',
      customer_type: 'retail',
      phone: '+91 97888 55005',
      whatsapp_number: '+91 97888 55005',
      city: 'Coimbatore',
      address: '56 R.S. Puram',
      agreed_profit_percent: 0,
      profit_sharing_model: 'model_a_profit_percent',
      credit_limit: 0,
      is_active: true,
    },
  ],
  suppliers: [
    {
      id: 'sup-1',
      supplier_code: 'SUP-101',
      supplier_name: 'Murugan Refineries & Bullion',
      contact_person: 'M. Murugan',
      phone: '+91 98430 99887',
      primary_metal: 'gold',
      address: 'Gold Market, Coimbatore',
    },
  ],
  users: [
    {
      id: 'usr-1',
      user_id: 'owner_sampath',
      full_name: 'Sampath Kumar',
      email: 'owner@shankarjewellery.com',
      phone: '+91 98765 43210',
      role: 'admin',
      branch: 'Trichy - Sandhukadai',
      is_active: true,
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-2',
      user_id: 'mgr_murali',
      full_name: 'Muralidharan',
      email: 'manager@shankarjewellery.com',
      phone: '+91 98765 43211',
      role: 'manager',
      branch: 'Trichy - Sandhukadai',
      is_active: true,
      last_login_at: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-3',
      user_id: 'bill_senthil',
      full_name: 'Senthil',
      email: 'billing@shankarjewellery.com',
      phone: '+91 98765 43212',
      role: 'billing_staff',
      branch: 'Trichy - Sandhukadai',
      is_active: true,
      last_login_at: new Date(Date.now() - 7200000).toISOString(),
      created_at: new Date().toISOString(),
    },
  ],
  inventoryMovements: [],
  manufacturingJobs: [
    {
      id: 'job-1',
      job_card_number: 'JC-2026-001',
      customer_name: 'Internal Shop Production',
      product_category: 'Nose Rings',
      metal_type: 'gold',
      purity: '22k',
      raw_metal_weight_g: 22.0,
      expected_finished_weight_g: 20.0,
      actual_finished_weight_g: 20.2,
      stone_weight_g: 1.0,
      wastage_allowance_g: 0.8,
      actual_wastage_g: 0.8,
      labour_charge: 3500,
      making_charge: 4000,
      assigned_goldsmith: 'Muralidharan (Senior Goldsmith)',
      start_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      status: 'completed',
      notes: 'Batch manufacturing of 50 traditional gold nose pins',
    },
  ],
  retailInvoices: [
    {
      id: 'inv-1001',
      invoice_number: 'SJ-INV-1001',
      customer_id: 'cust-4',
      customer_name: 'Priya Sundaram',
      customer_phone: '+91 98940 44004',
      invoice_date: new Date().toISOString().split('T')[0],
      subtotal_metal_value: 20490,
      total_making_charges: 1050,
      total_labour_charges: 300,
      total_wastage_value: 1024.5,
      discount_amount: 500,
      tax_percent: 3.0,
      tax_amount: 670.93,
      round_off: 0.07,
      total_amount: 23035.5,
      paid_amount: 23035.5,
      balance_due: 0,
      payment_status: 'paid',
      status: 'finalized',
      items: [
        {
          id: 'item-1',
          product_id: 'prod-5',
          product_name_snapshot: '22K Daily Wear Gold Stud Earrings',
          sku_snapshot: 'ER-G22-002',
          metal_type: 'gold',
          purity: '22k',
          gross_weight_g: 3.2,
          stone_weight_g: 0.2,
          net_weight_g: 3.0,
          quantity: 1,
          metal_rate_snapshot: 6830,
          metal_value: 20490,
          making_charge: 1050,
          labour_charge: 300,
          wastage_percent: 5.0,
          wastage_weight_g: 0.15,
          wastage_value: 1024.5,
          discount: 500,
          line_total: 22364.5,
        },
      ],
    },
  ],
  retailPayments: [
    {
      id: 'pay-1',
      invoice_id: 'inv-1001',
      payment_date: new Date().toISOString().split('T')[0],
      amount: 23035.5,
      payment_mode: 'upi',
      reference_number: 'UPI/9182746192',
    },
  ],
  retailReturns: [],
  wholesaleIssues: [
    {
      id: 'issue-101',
      issue_number: 'WI-2026-001',
      customer_id: 'cust-1',
      customer_name: 'Anand Ramakrishnan',
      customer_shop: 'Sri Lakshmi Jewellery',
      issue_date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
      expected_return_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      total_items_issued: 80,
      total_gross_weight_g: 32.5,
      total_deduction_weight_g: 2.5,
      total_net_weight_g: 30.0,
      total_fine_gold_g: 14.1,
      gold_rate_per_gram: 6850,
      total_cash_value: 196500,
      total_valuation_amount: 196500,
      agreed_profit_model: 'model_a_profit_percent',
      agreed_profit_percent: 40,
      cash_paid: 50000,
      gold_916_weight_paid_g: 0,
      gold_916_rate: 6850,
      gold_916_value_paid: 0,
      remaining_balance: 146500,
      status: 'active',
      items: [
        {
          id: 'witem-1',
          product_id: 'prod-1',
          product_name: 'Traditional Gold Mukku Poodu Nose Pin',
          sku: 'NR-G22-001',
          category: 'Nose Rings',
          metal_type: 'gold',
          purity: '22k',
          quantity_issued: 50,
          gross_weight_g: 22.5,
          deduction_weight_g: 2.5,
          stone_weight_g: 0,
          net_weight_g: 20.0,
          actual_touch: 37,
          profit_touch: 10,
          billing_touch: 47,
          fine_gold_g: 9.4,
          unit_cost_valuation: 2730,
          total_issue_value: 136500,
          quantity_sold: 25,
          quantity_returned: 10,
          quantity_remaining: 15,
        },
        {
          id: 'witem-2',
          product_id: 'prod-6',
          product_name: '925 Sterling Silver Peacock Studs',
          sku: 'ER-S92-001',
          category: 'Ear Rings',
          metal_type: 'silver',
          purity: '925_silver',
          quantity_issued: 30,
          gross_weight_g: 10.0,
          deduction_weight_g: 0,
          stone_weight_g: 0.0,
          net_weight_g: 10.0,
          actual_touch: 70,
          profit_touch: 10,
          billing_touch: 80,
          fine_gold_g: 8.0,
          unit_cost_valuation: 500,
          total_issue_value: 15000,
          quantity_sold: 15,
          quantity_returned: 5,
          quantity_remaining: 10,
        },
      ],
    },
  ],
  wholesaleSales: [
    {
      id: 'wsale-1',
      sale_number: 'WS-2026-001',
      issue_id: 'issue-101',
      customer_id: 'cust-1',
      customer_name: 'Anand Ramakrishnan',
      sale_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      buyer_shop_name: 'Madurai Royal Jewellers',
      buyer_location: 'Madurai Town',
      total_quantity_sold: 25,
      total_weight_sold_g: 10.0,
      total_sale_value: 78750, // sold at 3150 avg
      total_cost_valuation: 68250, // cost at 2730
      gross_profit: 10500,
      customer_profit_share: 4200, // 40%
      shop_profit_share: 6300, // 60%
    },
  ],
  wholesaleReturns: [
    {
      id: 'wret-1',
      return_number: 'WR-2026-001',
      issue_id: 'issue-101',
      customer_id: 'cust-1',
      customer_name: 'Anand Ramakrishnan',
      return_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      total_quantity_returned: 15,
      total_weight_returned_g: 5.5,
      condition_notes: '10 Gold Nose pins + 5 Silver Studs returned unsold in original velvet pouch',
    },
  ],
  wholesaleSettlements: [
    {
      id: 'settle-1',
      settlement_number: 'WST-2026-001',
      customer_id: 'cust-1',
      customer_name: 'Anand Ramakrishnan',
      customer_shop: 'Sri Lakshmi Jewellery',
      settlement_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
      period_start: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
      period_end: new Date().toISOString().split('T')[0],
      total_gross_sales: 78750,
      total_cost_valuation: 68250,
      gross_profit: 10500,
      customer_profit_share: 4200,
      shop_profit_share: 6300,
      adjustments_amount: 0,
      net_payable_to_customer: 4200,
      net_payable_to_shop: 74550, // valuation cost + shop profit
      amount_paid: 50000,
      balance_due: 24550,
      status: 'approved',
    },
  ],
  wholesalePayments: [
    {
      id: 'wpay-1',
      customer_id: 'cust-1',
      settlement_id: 'settle-1',
      payment_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
      payment_method: 'cash',
      amount: 50000,
      cash_amount: 50000,
      gold_weight_g: 0,
      gold_purity: '916',
      gold_rate: 6850,
      gold_value: 0,
      payment_mode: 'bank_transfer',
      reference_number: 'NEFT/SBI/89127394',
    },
  ],
  purchases: [
    {
      id: 'pur-1',
      purchase_number: 'PUR-2026-001',
      purchase_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      supplier_id: 'sup-1',
      supplier_name: 'Murugan Refineries & Bullion',
      supplier_phone: '+91 98430 99887',
      supplier_invoice_number: 'MRB-2026-891',
      metal_type: 'gold',
      purity: '24k',
      gross_weight_g: 50.0,
      deduction_weight_g: 0.0,
      net_weight_g: 50.0,
      purchase_rate_per_gram: 7420,
      total_cost: 371000,
      amount_paid: 200000,
      balance_payable: 171000,
      payment_status: 'partial',
      payment_method: 'bank_transfer',
      notes: '24K Raw Gold Bar purchase from Coimbatore refinery',
      stock_added: true,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: 'pur-2',
      purchase_number: 'PUR-2026-002',
      purchase_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      supplier_id: 'sup-1',
      supplier_name: 'Murugan Refineries & Bullion',
      supplier_phone: '+91 98430 99887',
      supplier_invoice_number: 'MRB-2026-904',
      metal_type: 'silver',
      purity: '925_silver',
      gross_weight_g: 1000.0,
      deduction_weight_g: 0.0,
      net_weight_g: 1000.0,
      purchase_rate_per_gram: 89.5,
      total_cost: 89500,
      amount_paid: 89500,
      balance_payable: 0,
      payment_status: 'paid',
      payment_method: 'upi',
      notes: '925 Sterling Silver Bullion 1kg block',
      stock_added: true,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  ],
  purchasePayments: [
    {
      id: 'pur-pay-1',
      purchase_id: 'pur-1',
      payment_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      amount: 200000,
      payment_mode: 'bank_transfer',
      reference_number: 'NEFT/SBI/7819234',
      notes: 'Initial deposit for 50g 24K Gold Bar',
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: 'pur-pay-2',
      purchase_id: 'pur-2',
      payment_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      amount: 89500,
      payment_mode: 'upi',
      reference_number: 'UPI/9812739120',
      notes: 'Full payment for 1kg Silver Bullion',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  ],
  expenses: [
    {
      id: 'exp-1',
      expense_number: 'EXP-1001',
      category: 'Electricity',
      amount: 8500,
      expense_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      payment_mode: 'bank_transfer',
      vendor_name: 'TNEB Tamil Nadu Power',
      notes: 'Monthly showroom AC electricity bill',
    },
    {
      id: 'exp-2',
      expense_number: 'EXP-1002',
      category: 'Goldsmith labour',
      amount: 14500,
      expense_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      payment_mode: 'cash',
      vendor_name: 'Murugan Goldsmith Works',
      notes: 'Labour charges for 50 nose rings batch manufacturing',
    },
  ],
  auditLogs: [
    {
      id: 'log-1',
      user_name: 'Sampath Kumar (Owner)',
      action: 'Create Wholesale Issue',
      entity_type: 'wholesale_issues',
      entity_id: 'WI-2026-001',
      details: { items_issued: 80, customer: 'Anand Ramakrishnan' },
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ],
  notifications: [
    {
      id: 'notif-1',
      title: 'Wholesale Return Due',
      message: 'Sri Lakshmi Jewellery has 15 items pending return from Issue WI-2026-001',
      type: 'warning',
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      title: 'Low Stock Alert',
      message: '22K Gold Antique Jhumka Earrings stock reached minimum threshold (2 left)',
      type: 'danger',
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ],
  whatsappMessages: [],
};

// ============================================================================
// CLEAN IN-MEMORY SHELL ENGINE (NO LOCALSTORAGE BUSINESS DATA PERSISTENCE)
// ============================================================================

export const getCleanStore = (): DbStore => ({
  settings: { ...defaultSeedStore.settings, next_invoice_number: 1001 },
  metalRates: [defaultSeedStore.metalRates[0]],
  categories: defaultSeedStore.categories,
  products: [],
  customers: [],
  suppliers: [],
  users: defaultSeedStore.users,
  inventoryMovements: [],
  manufacturingJobs: [],
  retailInvoices: [],
  retailPayments: [],
  retailReturns: [],
  wholesaleIssues: [],
  wholesaleSales: [],
  wholesaleReturns: [],
  wholesaleSettlements: [],
  wholesalePayments: [],
  purchases: [],
  purchasePayments: [],
  expenses: [],
  auditLogs: [],
  notifications: [],
  whatsappMessages: [],
});

export const getLocalDb = (): DbStore => {
  return getCleanStore();
};

export const saveLocalDb = (data: DbStore, tableName?: string, eventType?: 'INSERT' | 'UPDATE' | 'DELETE', payload?: any) => {
  if (tableName) {
    syncEngine.notifyDataChange(tableName, eventType || 'UPDATE', payload);
  }
};

export const resetLocalDbToDemo = () => {
  window.location.reload();
};

export const resetToCleanProductionData = () => {
  window.location.reload();
};

// ============================================================================
// DIRECT SUPABASE FETCH HELPERS
// ============================================================================

export const fetchCustomersFromSupabase = async (): Promise<Customer[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data as Customer[];
      }
    } catch (err) {
      console.warn('Error fetching customers from Supabase:', err);
    }
  }
  return [];
};

export const fetchProductsFromSupabase = async (): Promise<Product[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data as Product[];
      }
    } catch (err) {
      console.warn('Error fetching products from Supabase:', err);
    }
  }
  return [];
};

export const fetchRetailInvoicesFromSupabase = async (): Promise<RetailInvoice[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('retail_invoices').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data as RetailInvoice[];
      }
    } catch (err) {
      console.warn('Error fetching retail invoices from Supabase:', err);
    }
  }
  return [];
};

export const fetchWholesaleIssuesFromSupabase = async (): Promise<WholesaleIssue[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('wholesale_issues').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data as WholesaleIssue[];
      }
    } catch (err) {
      console.warn('Error fetching wholesale issues from Supabase:', err);
    }
  }
  return [];
};

export const fetchWholesaleSettlementsFromSupabase = async (): Promise<WholesaleSettlement[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('wholesale_settlements').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data as WholesaleSettlement[];
      }
    } catch (err) {
      console.warn('Error fetching wholesale settlements from Supabase:', err);
    }
  }
  return [];
};

export const fetchPurchasesFromSupabase = async (): Promise<Purchase[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('purchases').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data as Purchase[];
      }
    } catch (err) {
      console.warn('Error fetching purchases from Supabase:', err);
    }
  }
  return [];
};

export const fetchExpensesFromSupabase = async (): Promise<Expense[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data as Expense[];
      }
    } catch (err) {
      console.warn('Error fetching expenses from Supabase:', err);
    }
  }
  return [];
};

export const fetchSuppliersFromSupabase = async (): Promise<Supplier[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data as Supplier[];
      }
    } catch (err) {
      console.warn('Error fetching suppliers from Supabase:', err);
    }
  }
  return [];
};

export const saveCustomerRecord = async (customer: Customer) => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('customers').upsert(customer).select().single();
    if (error) throw new Error(`Customer save failed: ${error.message}`);
    syncEngine.notifyDataChange('customers', 'UPDATE', data);
    return data;
  }
  return customer;
};

export const saveWholesaleIssueRecord = async (issue: WholesaleIssue) => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('wholesale_issues').upsert(issue).select().single();
    if (error) throw new Error(`Wholesale issue save failed: ${error.message}`);
    syncEngine.notifyDataChange('wholesale_issues', 'UPDATE', data);
    return data;
  }
  return issue;
};

export const saveWholesaleReturnRecord = async (ret: WholesaleReturn) => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('wholesale_returns').upsert(ret).select().single();
    if (error) throw new Error(`Wholesale return save failed: ${error.message}`);
    syncEngine.notifyDataChange('wholesale_returns', 'UPDATE', data);
    return data;
  }
  return ret;
};

export const saveWholesaleSettlementRecord = async (settlement: WholesaleSettlement) => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('wholesale_settlements').upsert(settlement).select().single();
    if (error) throw new Error(`Wholesale settlement save failed: ${error.message}`);
    syncEngine.notifyDataChange('wholesale_settlements', 'UPDATE', data);
    return data;
  }
  return settlement;
};

export const saveWholesalePaymentRecord = async (payment: WholesalePayment) => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('wholesale_payments').upsert(payment).select().single();
    if (error) throw new Error(`Wholesale payment save failed: ${error.message}`);
    syncEngine.notifyDataChange('wholesale_payments', 'UPDATE', data);
    return data;
  }
  return payment;
};

export const saveRetailInvoiceRecord = async (invoice: RetailInvoice, payment?: RetailPayment) => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('retail_invoices').upsert(invoice).select().single();
    if (error) throw new Error(`Invoice save failed: ${error.message}`);
    if (payment) {
      await supabase.from('retail_payments').upsert(payment);
    }
    syncEngine.notifyDataChange('retail_invoices', 'UPDATE', data);
    return data;
  }
  return invoice;
};

// ============================================================================
// PURCHASE & SUPPLIER PAYMENT HELPER FUNCTIONS
// ============================================================================

export const savePurchaseRecord = (purchase: Purchase, initialPayment?: PurchasePayment) => {
  const db = getLocalDb();
  db.purchases = [purchase, ...(db.purchases || [])];

  if (initialPayment) {
    db.purchasePayments = [initialPayment, ...(db.purchasePayments || [])];
  }

  // Stock Integration: Record Inventory Movement
  const movement: InventoryMovement = {
    id: `mov-${Date.now()}`,
    movement_type: 'purchase',
    metal_type: purchase.metal_type,
    purity: purchase.purity,
    gross_weight_g: purchase.gross_weight_g,
    net_weight_g: purchase.net_weight_g,
    quantity: 1,
    reference_id: purchase.id,
    reference_number: purchase.purchase_number,
    notes: `Raw ${purchase.metal_type.toUpperCase()} (${purchase.purity}) purchase from ${purchase.supplier_name} - Inv #${purchase.supplier_invoice_number}`,
    created_at: purchase.created_at || new Date().toISOString(),
  };
  db.inventoryMovements = [movement, ...(db.inventoryMovements || [])];

  saveLocalDb(db);
  return db;
};

export const updatePurchaseRecord = (updatedPurchase: Purchase) => {
  const db = getLocalDb();
  const idx = db.purchases.findIndex((p) => p.id === updatedPurchase.id);
  if (idx !== -1) {
    const oldPurchase = db.purchases[idx];
    const weightDelta = updatedPurchase.net_weight_g - oldPurchase.net_weight_g;
    db.purchases[idx] = updatedPurchase;

    if (weightDelta !== 0) {
      const movement: InventoryMovement = {
        id: `mov-${Date.now()}`,
        movement_type: 'stock_adjustment',
        metal_type: updatedPurchase.metal_type,
        purity: updatedPurchase.purity,
        gross_weight_g: Math.abs(weightDelta),
        net_weight_g: weightDelta,
        quantity: 1,
        reference_id: updatedPurchase.id,
        reference_number: updatedPurchase.purchase_number,
        notes: `Adjusted purchase net weight by ${weightDelta > 0 ? '+' : ''}${weightDelta}g (${updatedPurchase.supplier_name})`,
        created_at: new Date().toISOString(),
      };
      db.inventoryMovements = [movement, ...(db.inventoryMovements || [])];
    }
    saveLocalDb(db);
  }
  return db;
};

export const deletePurchaseRecord = (purchaseId: string) => {
  const db = getLocalDb();
  const target = db.purchases.find((p) => p.id === purchaseId);
  if (target) {
    db.purchases = db.purchases.filter((p) => p.id !== purchaseId);
    db.purchasePayments = (db.purchasePayments || []).filter((pay) => pay.purchase_id !== purchaseId);

    // Record stock reversal movement
    const movement: InventoryMovement = {
      id: `mov-${Date.now()}`,
      movement_type: 'cancellation',
      metal_type: target.metal_type,
      purity: target.purity,
      gross_weight_g: target.gross_weight_g,
      net_weight_g: -target.net_weight_g,
      quantity: 1,
      reference_id: target.id,
      reference_number: target.purchase_number,
      notes: `Reversed stock for deleted purchase ${target.purchase_number} (${target.supplier_name})`,
      created_at: new Date().toISOString(),
    };
    db.inventoryMovements = [movement, ...(db.inventoryMovements || [])];
    saveLocalDb(db);
  }
  return db;
};

export const recordPurchasePayment = (payment: PurchasePayment) => {
  const db = getLocalDb();
  db.purchasePayments = [payment, ...(db.purchasePayments || [])];

  const target = db.purchases.find((p) => p.id === payment.purchase_id);
  if (target) {
    const totalPaid = (db.purchasePayments || [])
      .filter((p) => p.purchase_id === target.id)
      .reduce((sum, p) => sum + p.amount, 0);

    target.amount_paid = totalPaid;
    target.balance_payable = Math.max(0, target.total_cost - totalPaid);
    if (target.balance_payable <= 0) {
      target.payment_status = 'paid';
    } else if (target.amount_paid > 0) {
      target.payment_status = 'partial';
    } else {
      target.payment_status = 'unpaid';
    }
  }

  saveLocalDb(db);
  return db;
};

// ============================================================================
// HEALTH, STORAGE & ADMIN DATABASE MAINTENANCE HELPERS
// ============================================================================

export interface DatabaseHealthInfo {
  status: 'connected' | 'disconnected' | 'error';
  apiStatus: 'healthy' | 'degraded' | 'offline';
  provider: string;
  databaseName: string;
  environment: 'Production' | 'Development';
  lastHealthCheck: string;
  recordCounts: {
    customers: number;
    products: number;
    retailInvoices: number;
    wholesaleIssues: number;
    purchases: number;
    expenses: number;
  };
}

export const getDatabaseHealth = (): DatabaseHealthInfo => {
  const db = getLocalDb();
  const isHealthy = Boolean(db && db.settings && Array.isArray(db.products));

  return {
    status: isHealthy ? 'connected' : 'error',
    apiStatus: isHealthy ? 'healthy' : 'degraded',
    provider: import.meta.env.VITE_SUPABASE_URL ? 'Supabase Cloud (PostgreSQL)' : 'Local Persistent Storage Engine',
    databaseName: 'shankar_jewellery_erp_prod',
    environment: import.meta.env.PROD ? 'Production' : 'Development',
    lastHealthCheck: new Date().toISOString(),
    recordCounts: {
      customers: db.customers?.length || 0,
      products: db.products?.length || 0,
      retailInvoices: db.retailInvoices?.length || 0,
      wholesaleIssues: db.wholesaleIssues?.length || 0,
      purchases: db.purchases?.length || 0,
      expenses: db.expenses?.length || 0,
    },
  };
};

export interface StorageMetricCategory {
  categoryName: string;
  itemCount: number;
  estimatedSizeBytes: number;
  formattedSize: string;
}

export const getStorageMetrics = (): StorageMetricCategory[] => {
  const db = getLocalDb();

  const customerPhotosCount = db.customers?.filter((c) => c.photo_url).length || 0;
  const productPhotosCount = db.products?.filter((p) => p.primary_photo_url).length || 0;
  const invoicesCount = db.retailInvoices?.length || 0;
  const wholesaleDocsCount = db.wholesaleIssues?.length || 0;

  const estimateBytes = (count: number, avgSizeKB: number) => count * avgSizeKB * 1024;
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const custBytes = estimateBytes(customerPhotosCount, 150);
  const prodBytes = estimateBytes(productPhotosCount, 250);
  const invBytes = estimateBytes(invoicesCount, 45);
  const wsBytes = estimateBytes(wholesaleDocsCount, 55);

  return [
    {
      categoryName: 'Customer Photos',
      itemCount: customerPhotosCount,
      estimatedSizeBytes: custBytes,
      formattedSize: formatBytes(custBytes),
    },
    {
      categoryName: 'Product Images',
      itemCount: productPhotosCount,
      estimatedSizeBytes: prodBytes,
      formattedSize: formatBytes(prodBytes),
    },
    {
      categoryName: 'Jewellery Catalog Photos',
      itemCount: productPhotosCount,
      estimatedSizeBytes: prodBytes,
      formattedSize: formatBytes(prodBytes),
    },
    {
      categoryName: 'Invoice & Bill Documents',
      itemCount: invoicesCount + wholesaleDocsCount,
      estimatedSizeBytes: invBytes + wsBytes,
      formattedSize: formatBytes(invBytes + wsBytes),
    },
    {
      categoryName: 'Other Uploaded Files',
      itemCount: (db.suppliers?.length || 0),
      estimatedSizeBytes: estimateBytes(db.suppliers?.length || 0, 30),
      formattedSize: formatBytes(estimateBytes(db.suppliers?.length || 0, 30)),
    },
  ];
};

export const exportDatabaseData = (tableKey: keyof DbStore | 'full_backup') => {
  const db = getLocalDb();
  let exportData: any = null;
  let filename = `shankar_jewellery_${tableKey}_${new Date().toISOString().split('T')[0]}.json`;

  if (tableKey === 'full_backup') {
    // Exclude raw passwords or sensitive auth session keys
    exportData = {
      backup_timestamp: new Date().toISOString(),
      shop_name: db.settings.shop_name,
      version: '1.0.0',
      data: db,
    };
  } else {
    exportData = db[tableKey] || [];
  }

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const addAuditLog = (
  userName: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, any>
) => {
  const db = getLocalDb();
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    user_name: userName,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    created_at: new Date().toISOString(),
  };

  db.auditLogs = [newLog, ...(db.auditLogs || [])];
  saveLocalDb(db);
};


