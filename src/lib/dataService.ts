import { supabase, isSupabaseConfigured, getLocalDb, saveLocalDb, createSecondaryAuthClient } from './supabase';
import { syncEngine } from './syncEngine';
import {
  Customer,
  Product,
  ProductCategory,
  RetailInvoice,
  RetailPayment,
  WholesaleIssue,
  WholesaleReturn,
  WholesaleSettlement,
  WholesalePayment,
  WholesaleSale,
  Purchase,
  PurchasePayment,
  Expense,
  Supplier,
  MetalRate,
  BusinessSettings,
  InventoryMovement,
  ManufacturingJob,
  UserProfile,
  UserRole,
  AuditLog,
  NotificationItem,
} from '@/types';

// ============================================================================
// UUID SANITIZATION HELPER
// Ensures that all entity and foreign key IDs are valid RFC4122 UUIDs
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ensureValidUUID = (id?: string): string => {
  if (id && UUID_REGEX.test(id)) {
    return id;
  }
  return crypto.randomUUID();
};

const checkSupabaseClient = () => {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase database client is not initialized or configured.');
  }
  return supabase;
};

export const formatDbError = (context: string, error: any): Error => {
  const msg = error?.message || String(error);
  if (msg.includes('schema cache') || msg.includes('PGRST205') || msg.includes('not find the table')) {
    return new Error(`${context}: Could not find table in Supabase schema. Please run the SQL file 'supabase/schema_full.sql' in your Supabase SQL Editor.`);
  }
  return new Error(`${context}: ${msg}`);
};

// ============================================================================
// CENTRAL DIRECT SUPABASE DATA SERVICE
// Single source of truth interfacing directly with Supabase PostgreSQL.
// LocalStorage is NEVER used as a primary, fallback, or startup database.
// ============================================================================

export const dataService = {
  // --------------------------------------------------------------------------
  // CUSTOMERS
  // --------------------------------------------------------------------------
  async getCustomers(): Promise<Customer[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch customers from Supabase:', error.message);
      throw formatDbError('Database Error', error);
    }
    return ((data || []).map((c) => ({
      ...c,
      agreed_customer_touch: c.default_actual_touch ?? c.agreed_profit_percent ?? 40,
    }))) as Customer[];
  },

  async createCustomer(customerData: Partial<Customer>): Promise<Customer> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(customerData.id);

    const actualTouch = customerData.default_actual_touch ?? customerData.agreed_customer_touch ?? 37;
    const profitTouch = customerData.default_profit_touch ?? 10;
    const billingTouch = customerData.default_billing_touch ?? (actualTouch + profitTouch);

    const dbPayload: Record<string, any> = {
      id: validId,
      customer_code: customerData.customer_code || `CUST-${Math.floor(100 + Math.random() * 900)}`,
      full_name: customerData.full_name || '',
      shop_name: customerData.shop_name || '',
      customer_type: customerData.customer_type || 'retail',
      phone: customerData.phone || '',
      whatsapp_number: customerData.whatsapp_number || customerData.phone || '',
      email: customerData.email || '',
      address: customerData.address || '',
      city: customerData.city || '',
      state: customerData.state || 'Tamil Nadu',
      pin_code: customerData.pin_code || '',
      gstin: customerData.gstin || '',
      pan: customerData.pan || '',
      credit_limit: Number(customerData.credit_limit || 0),
      agreed_profit_percent: Number(customerData.agreed_profit_percent ?? 40),
      profit_sharing_model: customerData.profit_sharing_model || 'model_a_profit_percent',
      default_actual_touch: Number(actualTouch),
      default_profit_touch: Number(profitTouch),
      default_billing_touch: Number(billingTouch),
      payment_terms: customerData.payment_terms || '30 Days',
      photo_url: customerData.photo_url || '',
      notes: customerData.notes || '',
      is_active: customerData.is_active ?? true,
      created_at: customerData.created_at || new Date().toISOString(),
    };

    const { data, error } = await db
      .from('customers')
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error('Failed to create customer in Supabase:', error.message);
      throw formatDbError('Customer Save Failed', error);
    }

    const result = {
      ...data,
      agreed_customer_touch: data.default_actual_touch ?? data.agreed_profit_percent ?? 40,
    } as Customer;

    syncEngine.notifyDataChange('customers', 'INSERT', result);
    return result;
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(id);

    const { agreed_customer_touch, ...dbUpdates } = updates as any;
    if (agreed_customer_touch !== undefined) {
      dbUpdates.default_actual_touch = agreed_customer_touch;
      dbUpdates.agreed_profit_percent = agreed_customer_touch;
    }

    const { data, error } = await db
      .from('customers')
      .update(dbUpdates)
      .eq('id', validId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update customer in Supabase:', error.message);
      throw formatDbError('Customer Update Failed', error);
    }

    const result = {
      ...data,
      agreed_customer_touch: data.default_actual_touch ?? data.agreed_profit_percent ?? 40,
    } as Customer;

    syncEngine.notifyDataChange('customers', 'UPDATE', result);
    return result;
  },

  async deleteCustomer(id: string): Promise<boolean> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(id);

    const { error } = await db.from('customers').delete().eq('id', validId);

    if (error) {
      console.error('Failed to delete customer in Supabase:', error.message);
      throw new Error(`Customer Delete Failed: ${error.message}`);
    }

    syncEngine.notifyDataChange('customers', 'DELETE', { id: validId });
    return true;
  },

  // --------------------------------------------------------------------------
  // PRODUCTS & STOCK
  // --------------------------------------------------------------------------
  async getProducts(): Promise<Product[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch products from Supabase:', error.message);
      throw formatDbError('Database Error', error);
    }
    return ((data || []).map((p) => ({
      ...p,
      category_name: p.category_name || (p.metal_type === 'silver' ? 'Silverware' : 'Gold Jewellery'),
      actual_touch: 37,
    }))) as Product[];
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(productData.id);

    const dbPayload: Record<string, any> = {
      id: validId,
      sku: productData.sku || `SKU-${Date.now()}`,
      barcode: productData.barcode || `${Math.floor(100000 + Math.random() * 900000)}`,
      qr_code: productData.qr_code || `QR-${Date.now()}`,
      name: productData.name || '',
      category_id: productData.category_id ? ensureValidUUID(productData.category_id) : undefined,
      metal_type: productData.metal_type || 'gold',
      purity: productData.purity || '22k',
      gross_weight_g: Number(productData.gross_weight_g || 0),
      stone_weight_g: Number(productData.stone_weight_g || 0),
      other_weight_g: Number(productData.other_weight_g || 0),
      net_weight_g: Number(productData.net_weight_g || 0),
      unit: productData.unit || 'grams',
      quantity: Number(productData.quantity || 1),
      making_charge_type: productData.making_charge_type || 'per_piece',
      making_charge_rate: Number(productData.making_charge_rate || 0),
      labour_charge: Number(productData.labour_charge || 0),
      wastage_percent: Number(productData.wastage_percent || 0),
      wastage_weight_g: Number(productData.wastage_weight_g || 0),
      purchase_cost: Number(productData.purchase_cost || 0),
      manufacturing_cost: Number(productData.manufacturing_cost || 0),
      retail_price: Number(productData.retail_price || 0),
      wholesale_valuation: Number(productData.wholesale_valuation || 0),
      minimum_stock: Number(productData.minimum_stock || 1),
      description: productData.description || '',
      primary_photo_url: productData.primary_photo_url || '',
      status: productData.status || 'in_stock',
      created_at: productData.created_at || new Date().toISOString(),
    };

    const { data, error } = await db
      .from('products')
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error('Failed to create product in Supabase:', error.message);
      throw formatDbError('Product Save Failed', error);
    }

    const result = {
      ...data,
      category_name: productData.category_name || (data.metal_type === 'silver' ? 'Silverware' : 'Gold Jewellery'),
      actual_touch: (productData as any).actual_touch || 37,
    } as Product;

    syncEngine.notifyDataChange('products', 'INSERT', result);
    return result;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(id);

    const { category_name, actual_touch, deduction_weight_g, ...dbUpdates } = updates as any;

    const { data, error } = await db
      .from('products')
      .update(dbUpdates)
      .eq('id', validId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update product in Supabase:', error.message);
      throw new Error(`Product Update Failed: ${error.message}`);
    }

    const result = {
      ...data,
      category_name: category_name || (data.metal_type === 'silver' ? 'Silverware' : 'Gold Jewellery'),
      actual_touch: actual_touch || 37,
    } as Product;

    syncEngine.notifyDataChange('products', 'UPDATE', result);
    return result;
  },

  async deleteProduct(id: string): Promise<boolean> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(id);

    const { error } = await db.from('products').delete().eq('id', validId);

    if (error) {
      console.error('Failed to delete product in Supabase:', error.message);
      throw new Error(`Product Delete Failed: ${error.message}`);
    }

    syncEngine.notifyDataChange('products', 'DELETE', { id: validId });
    return true;
  },

  // --------------------------------------------------------------------------
  // PRODUCT CATEGORIES
  // --------------------------------------------------------------------------
  async getCategories(): Promise<ProductCategory[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db.from('product_categories').select('*').order('name', { ascending: true });

    if (error) {
      console.error('Failed to fetch categories:', error.message);
      return [];
    }
    return (data || []) as ProductCategory[];
  },

  // --------------------------------------------------------------------------
  // RETAIL INVOICES & PAYMENTS
  // --------------------------------------------------------------------------
  async getRetailInvoices(): Promise<RetailInvoice[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db
      .from('retail_invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch retail invoices from Supabase:', error.message);
      throw new Error(`Database Error: ${error.message}`);
    }
    return (data || []) as RetailInvoice[];
  },

  async createRetailInvoice(invoiceData: Partial<RetailInvoice>, paymentData?: Partial<RetailPayment>): Promise<RetailInvoice> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(invoiceData.id);
    const validCustomerId = invoiceData.customer_id ? ensureValidUUID(invoiceData.customer_id) : undefined;

    const payload: Partial<RetailInvoice> = {
      id: validId,
      invoice_number: invoiceData.invoice_number || `SJ-INV-${Date.now()}`,
      customer_id: validCustomerId,
      invoice_date: invoiceData.invoice_date || new Date().toISOString().split('T')[0],
      subtotal_metal_value: Number(invoiceData.subtotal_metal_value || 0),
      total_making_charges: Number(invoiceData.total_making_charges || 0),
      total_labour_charges: Number(invoiceData.total_labour_charges || 0),
      total_wastage_value: Number(invoiceData.total_wastage_value || 0),
      discount_amount: Number(invoiceData.discount_amount || 0),
      tax_percent: Number(invoiceData.tax_percent || 3.0),
      tax_amount: Number(invoiceData.tax_amount || 0),
      round_off: Number(invoiceData.round_off || 0),
      total_amount: Number(invoiceData.total_amount || 0),
      paid_amount: Number(invoiceData.paid_amount || 0),
      balance_due: Number(invoiceData.balance_due || 0),
      payment_status: invoiceData.payment_status || 'paid',
      status: invoiceData.status || 'finalized',
      notes: invoiceData.notes || '',
      created_at: invoiceData.created_at || new Date().toISOString(),
    };

    const { data: savedInv, error: invError } = await db
      .from('retail_invoices')
      .insert(payload)
      .select()
      .single();

    if (invError) {
      console.error('Failed to insert retail invoice into Supabase:', invError.message);
      throw new Error(`Invoice Creation Failed: ${invError.message}`);
    }

    if (paymentData) {
      const paymentPayload: RetailPayment = {
        id: ensureValidUUID(paymentData.id),
        invoice_id: validId,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        amount: Number(paymentData.amount || payload.paid_amount),
        payment_mode: paymentData.payment_mode || 'cash',
        reference_number: paymentData.reference_number || '',
        notes: paymentData.notes || '',
        created_at: new Date().toISOString(),
      };
      await db.from('retail_payments').insert(paymentPayload);
    }

    syncEngine.notifyDataChange('retail_invoices', 'INSERT', savedInv);
    return savedInv as RetailInvoice;
  },

  async getRetailPayments(): Promise<RetailPayment[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db
      .from('retail_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch retail payments:', error.message);
      return [];
    }
    return (data || []) as RetailPayment[];
  },

  // --------------------------------------------------------------------------
  // WHOLESALE CONSIGNMENT & CREDIT ENGINE
  // --------------------------------------------------------------------------
  async getWholesaleIssues(): Promise<WholesaleIssue[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db
      .from('wholesale_issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch wholesale issues from Supabase:', error.message);
      throw new Error(`Database Error: ${error.message}`);
    }
    return (data || []) as WholesaleIssue[];
  },

  async createWholesaleIssue(issueData: Partial<WholesaleIssue>): Promise<WholesaleIssue> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(issueData.id);
    const validCustomerId = ensureValidUUID(issueData.customer_id);

    const payload: Partial<WholesaleIssue> = {
      id: validId,
      issue_number: issueData.issue_number || `WI-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      customer_id: validCustomerId,
      issue_date: issueData.issue_date || new Date().toISOString().split('T')[0],
      expected_return_date: issueData.expected_return_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      total_items_issued: Number(issueData.total_items_issued || 0),
      total_gross_weight_g: Number(issueData.total_gross_weight_g || 0),
      total_net_weight_g: Number(issueData.total_net_weight_g || 0),
      total_valuation_amount: Number(issueData.total_valuation_amount || 0),
      agreed_profit_model: issueData.agreed_profit_model || 'model_a_profit_percent',
      agreed_profit_percent: Number(issueData.agreed_profit_percent || 40),
      notes: issueData.notes || '',
      status: issueData.status || 'active',
      created_at: issueData.created_at || new Date().toISOString(),
    };

    const { data, error } = await db
      .from('wholesale_issues')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Failed to create wholesale issue in Supabase:', error.message);
      throw new Error(`Wholesale Issue Creation Failed: ${error.message}`);
    }

    syncEngine.notifyDataChange('wholesale_issues', 'INSERT', data);
    return data as WholesaleIssue;
  },

  async getWholesaleReturns(): Promise<WholesaleReturn[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db.from('wholesale_returns').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []) as WholesaleReturn[];
  },

  async createWholesaleReturn(returnData: Partial<WholesaleReturn>): Promise<WholesaleReturn> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(returnData.id);
    const payload: WholesaleReturn = {
      id: validId,
      return_number: returnData.return_number || `WR-${Date.now().toString().slice(-6)}`,
      issue_id: returnData.issue_id ? ensureValidUUID(returnData.issue_id) : undefined,
      customer_id: ensureValidUUID(returnData.customer_id),
      return_date: returnData.return_date || new Date().toISOString().split('T')[0],
      total_quantity_returned: Number(returnData.total_quantity_returned || 0),
      total_weight_returned_g: Number(returnData.total_weight_returned_g || 0),
      condition_notes: returnData.condition_notes || '',
      created_at: returnData.created_at || new Date().toISOString(),
    };

    const { data, error } = await db.from('wholesale_returns').insert(payload).select().single();
    if (error) throw new Error(`Wholesale Return Save Failed: ${error.message}`);

    syncEngine.notifyDataChange('wholesale_returns', 'INSERT', data);
    return data as WholesaleReturn;
  },

  async getWholesaleSettlements(): Promise<WholesaleSettlement[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db
      .from('wholesale_settlements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch wholesale settlements:', error.message);
      return [];
    }
    return (data || []) as WholesaleSettlement[];
  },

  async createWholesaleSettlement(settlementData: Partial<WholesaleSettlement>): Promise<WholesaleSettlement> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(settlementData.id);
    const validCustomerId = ensureValidUUID(settlementData.customer_id);

    const payload: Partial<WholesaleSettlement> = {
      id: validId,
      settlement_number: settlementData.settlement_number || `SETTL-${Date.now().toString().slice(-6)}`,
      customer_id: validCustomerId,
      settlement_date: settlementData.settlement_date || new Date().toISOString().split('T')[0],
      period_start: settlementData.period_start || new Date().toISOString().split('T')[0],
      period_end: settlementData.period_end || new Date().toISOString().split('T')[0],
      total_gross_sales: Number(settlementData.total_gross_sales || 0),
      total_cost_valuation: Number(settlementData.total_cost_valuation || 0),
      gross_profit: Number(settlementData.gross_profit || 0),
      customer_profit_share: Number(settlementData.customer_profit_share || 0),
      shop_profit_share: Number(settlementData.shop_profit_share || 0),
      adjustments_amount: Number(settlementData.adjustments_amount || 0),
      net_payable_to_customer: Number(settlementData.net_payable_to_customer || 0),
      net_payable_to_shop: Number(settlementData.net_payable_to_shop || 0),
      amount_paid: Number(settlementData.amount_paid || 0),
      balance_due: Number(settlementData.balance_due || 0),
      status: settlementData.status || 'draft',
      notes: settlementData.notes || '',
      created_at: settlementData.created_at || new Date().toISOString(),
    };

    const { data, error } = await db.from('wholesale_settlements').insert(payload).select().single();
    if (error) throw new Error(`Settlement Save Failed: ${error.message}`);

    syncEngine.notifyDataChange('wholesale_settlements', 'INSERT', data);
    return data as WholesaleSettlement;
  },

  async getWholesalePayments(): Promise<WholesalePayment[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db.from('wholesale_payments').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []) as WholesalePayment[];
  },

  async createWholesalePayment(paymentData: Partial<WholesalePayment>): Promise<WholesalePayment> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(paymentData.id);

    const payload: WholesalePayment = {
      id: validId,
      customer_id: ensureValidUUID(paymentData.customer_id),
      settlement_id: paymentData.settlement_id ? ensureValidUUID(paymentData.settlement_id) : undefined,
      payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
      amount: Number(paymentData.amount || 0),
      payment_mode: paymentData.payment_mode || 'cash',
      reference_number: paymentData.reference_number || '',
      notes: paymentData.notes || '',
      created_at: paymentData.created_at || new Date().toISOString(),
    };

    const { data, error } = await db.from('wholesale_payments').insert(payload).select().single();
    if (error) throw new Error(`Wholesale Payment Save Failed: ${error.message}`);

    syncEngine.notifyDataChange('wholesale_payments', 'INSERT', data);
    return data as WholesalePayment;
  },

  // --------------------------------------------------------------------------
  // PURCHASES & SUPPLIERS
  // --------------------------------------------------------------------------
  async getPurchases(): Promise<Purchase[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db.from('purchases').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch purchases from Supabase:', error.message);
      throw new Error(`Database Error: ${error.message}`);
    }
    return (data || []) as Purchase[];
  },

  async createPurchase(purchaseData: Partial<Purchase>): Promise<Purchase> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(purchaseData.id);
    const validSupplierId = purchaseData.supplier_id ? ensureValidUUID(purchaseData.supplier_id) : undefined;

    const payload: Purchase = {
      id: validId,
      purchase_number: purchaseData.purchase_number || `PUR-${Date.now()}`,
      purchase_date: purchaseData.purchase_date || new Date().toISOString().split('T')[0],
      supplier_id: validSupplierId || '',
      supplier_name: purchaseData.supplier_name || '',
      supplier_phone: purchaseData.supplier_phone || '',
      supplier_invoice_number: purchaseData.supplier_invoice_number || '',
      metal_type: purchaseData.metal_type || 'gold',
      purity: purchaseData.purity || '24k',
      gross_weight_g: Number(purchaseData.gross_weight_g || 0),
      deduction_weight_g: Number(purchaseData.deduction_weight_g || 0),
      net_weight_g: Number(purchaseData.net_weight_g || 0),
      purchase_rate_per_gram: Number(purchaseData.purchase_rate_per_gram || 0),
      total_cost: Number(purchaseData.total_cost || 0),
      amount_paid: Number(purchaseData.amount_paid || 0),
      balance_payable: Number(purchaseData.balance_payable || 0),
      payment_status: purchaseData.payment_status || 'unpaid',
      payment_method: purchaseData.payment_method || 'bank_transfer',
      notes: purchaseData.notes || '',
      stock_added: purchaseData.stock_added ?? true,
      created_at: purchaseData.created_at || new Date().toISOString(),
    };

    const { data, error } = await db.from('purchases').insert(payload).select().single();
    if (error) throw new Error(`Purchase Save Failed: ${error.message}`);

    syncEngine.notifyDataChange('purchases', 'INSERT', data);
    return data as Purchase;
  },

  async deletePurchase(id: string): Promise<boolean> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(id);

    const { error } = await db.from('purchases').delete().eq('id', validId);

    if (error) {
      console.error('Failed to delete purchase in Supabase:', error.message);
      throw new Error(`Purchase Delete Failed: ${error.message}`);
    }

    syncEngine.notifyDataChange('purchases', 'DELETE', { id: validId });
    return true;
  },

  async getSuppliers(): Promise<Supplier[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db.from('suppliers').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch suppliers:', error.message);
      return [];
    }
    return (data || []) as Supplier[];
  },

  async createSupplier(supplierData: Partial<Supplier>): Promise<Supplier> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(supplierData.id);

    const payload: Supplier = {
      id: validId,
      supplier_code: supplierData.supplier_code || `SUP-${Math.floor(100 + Math.random() * 900)}`,
      supplier_name: supplierData.supplier_name || '',
      contact_person: supplierData.contact_person || '',
      phone: supplierData.phone || '',
      whatsapp: supplierData.whatsapp || supplierData.phone || '',
      email: supplierData.email || '',
      address: supplierData.address || '',
      gstin: supplierData.gstin || '',
      primary_metal: supplierData.primary_metal || 'gold',
      notes: supplierData.notes || '',
      created_at: supplierData.created_at || new Date().toISOString(),
    };

    const { data, error } = await db.from('suppliers').insert(payload).select().single();
    if (error) throw new Error(`Supplier Save Failed: ${error.message}`);

    syncEngine.notifyDataChange('suppliers', 'INSERT', data);
    return data as Supplier;
  },

  // --------------------------------------------------------------------------
  // EXPENSES
  // --------------------------------------------------------------------------
  async getExpenses(): Promise<Expense[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db.from('expenses').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch expenses:', error.message);
      throw new Error(`Database Error: ${error.message}`);
    }
    return (data || []) as Expense[];
  },

  async createExpense(expenseData: Partial<Expense>): Promise<Expense> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(expenseData.id);

    const payload: Expense = {
      id: validId,
      expense_number: expenseData.expense_number || `EXP-${Math.floor(100 + Math.random() * 900)}`,
      category: expenseData.category || 'General Operations',
      amount: Number(expenseData.amount || 0),
      expense_date: expenseData.expense_date || new Date().toISOString().split('T')[0],
      payment_mode: expenseData.payment_mode || 'cash',
      vendor_name: expenseData.vendor_name || '',
      notes: expenseData.notes || '',
      attachment_url: expenseData.attachment_url || '',
      created_at: expenseData.created_at || new Date().toISOString(),
    };

    const { data, error } = await db.from('expenses').insert(payload).select().single();
    if (error) throw new Error(`Expense Save Failed: ${error.message}`);

    syncEngine.notifyDataChange('expenses', 'INSERT', data);
    return data as Expense;
  },

  // --------------------------------------------------------------------------
  // METAL RATES & BUSINESS SETTINGS
  // --------------------------------------------------------------------------
  async getMetalRates(): Promise<MetalRate[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db
      .from('metal_rates')
      .select('*')
      .order('rate_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error || !data) {
      return getLocalDb().metalRates || [];
    }
    // Update local cache
    const localDb = getLocalDb();
    localDb.metalRates = data as MetalRate[];
    saveLocalDb(localDb);
    return data as MetalRate[];
  },

  async saveMetalRates(rateData: Partial<MetalRate>): Promise<MetalRate> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(rateData.id);

    // Standard columns present in Supabase metal_rates table
    const payload: Record<string, any> = {
      id: validId,
      rate_date: rateData.rate_date || new Date().toISOString().split('T')[0],
      gold_24k_per_gram: Number(rateData.gold_24k_per_gram || 0),
      gold_22k_per_gram: Number(rateData.gold_22k_per_gram || 0),
      gold_18k_per_gram: Number(rateData.gold_18k_per_gram || 0),
      silver_per_gram: Number(rateData.silver_per_gram || 0),
      silver_per_kg: Number(rateData.silver_per_kg || 0),
      source: rateData.source || 'manual',
      notes: rateData.notes || '',
      created_at: new Date().toISOString(),
    };

    let { data, error } = await db.from('metal_rates').upsert(payload, { onConflict: 'rate_date' }).select().single();
    if (error) {
      // Fallback upsert by id
      const { data: retryData, error: retryError } = await db.from('metal_rates').upsert(payload).select().single();
      if (retryError) throw new Error(`Metal Rate Save Failed: ${retryError.message}`);
      data = retryData;
    }

    // Update local cache
    const localDb = getLocalDb();
    const idx = (localDb.metalRates || []).findIndex((r) => r.rate_date === payload.rate_date);
    if (idx > -1) {
      localDb.metalRates[idx] = data as MetalRate;
    } else {
      localDb.metalRates = [data as MetalRate, ...(localDb.metalRates || [])];
    }
    saveLocalDb(localDb);

    syncEngine.notifyDataChange('metal_rates', 'UPDATE', data);
    return data as MetalRate;
  },

  async getBusinessSettings(): Promise<BusinessSettings | null> {
    const db = checkSupabaseClient();
    const { data, error } = await db.from('business_settings').select('*').limit(1).single();
    if (error || !data) return null;
    return data as BusinessSettings;
  },

  // --------------------------------------------------------------------------
  // USER PROFILES / USER MANAGEMENT
  // --------------------------------------------------------------------------
  async getUsers(): Promise<UserProfile[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch user profiles from Supabase:', error.message);
      throw formatDbError('Database Error', error);
    }

    const profilesData = data || [];

    return (profilesData.map((u: any) => ({
      id: u.id,
      user_id: u.user_id || u.id,
      full_name: u.full_name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: (u.role || 'billing_staff') as UserRole,
      branch: u.branch || 'Trichy - Sandhukadai',
      avatar_url: u.avatar_url,
      is_active: u.is_active ?? true,
      last_login_at: u.last_login_at,
      created_at: u.created_at,
    }))) as UserProfile[];
  },

  async createStaffAccount(params: {
    full_name: string;
    email: string;
    password?: string;
    role: UserRole;
    branch?: string;
    phone?: string;
  }): Promise<UserProfile> {
    const db = checkSupabaseClient();
    const emailNorm = params.email.trim().toLowerCase();

    if (!emailNorm || !params.full_name) {
      throw new Error('Full Name and Email Address are required.');
    }

    let authUserId: string | null = null;
    let edgeFnError: string | null = null;

    // 1. Try invoking Supabase Edge Function 'create-staff-user' for secure server-side Admin Auth creation
    try {
      const { data: fnData, error: fnError } = await db.functions.invoke('create-staff-user', {
        body: {
          action: 'create',
          full_name: params.full_name,
          email: emailNorm,
          password: params.password,
          role: params.role,
          branch: params.branch || 'Trichy - Sandhukadai',
          phone: params.phone || '',
        },
      });

      if (fnError) {
        let errMsg = fnError.message || 'Edge function invocation failed';
        try {
          if (typeof fnError === 'object' && (fnError as any).context && typeof (fnError as any).context.json === 'function') {
            const bodyErr = await (fnError as any).context.json();
            if (bodyErr?.error) errMsg = bodyErr.error;
          }
        } catch (e) {
          // Fallthrough
        }
        throw new Error(errMsg);
      }

      if (fnData?.error) {
        throw new Error(fnData.error);
      }

      if (fnData?.user) {
        const created: UserProfile = {
          id: fnData.user.id,
          user_id: fnData.user.user_id || fnData.user.id,
          full_name: fnData.user.full_name,
          email: fnData.user.email,
          phone: fnData.user.phone || '',
          role: (fnData.user.role || params.role) as UserRole,
          branch: fnData.user.branch || params.branch || 'Trichy - Sandhukadai',
          is_active: fnData.user.is_active ?? true,
          created_at: fnData.user.created_at || new Date().toISOString(),
        };
        syncEngine.notifyDataChange('profiles', 'INSERT', created);
        return created;
      }
    } catch (fnErr: any) {
      console.warn('Edge Function create-staff-user invocation error, trying fallback:', fnErr);
      const edgeFnMsg = fnErr?.message || '';
      if (edgeFnMsg.includes('Unauthorized')) {
        throw new Error('Your authentication session has expired. Please log out and log in again as Admin.');
      }
      if (edgeFnMsg.includes('already exists') || edgeFnMsg.includes('Too many requests') || edgeFnMsg.includes('Password must be')) {
        throw fnErr;
      }
    }

    // 2. Fallback: If Edge Function is not deployed/reachable, create Auth user via isolated secondary auth client
    if (params.password && params.password.length >= 6) {
      const secondaryClient = createSecondaryAuthClient();
      if (secondaryClient) {
        const { data: authRes, error: authErr } = await secondaryClient.auth.signUp({
          email: emailNorm,
          password: params.password,
          options: {
            data: {
              full_name: params.full_name,
              role: params.role,
              branch: params.branch || 'Trichy - Sandhukadai',
            },
          },
        });

        if (authErr) {
          let msg = authErr.message;
          if (msg.toLowerCase().includes('rate limit')) {
            msg = "Auth email rate limit exceeded. Deploy the 'create-staff-user' Edge Function for unlimited admin staff creation.";
          } else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
            msg = 'A user with this email address already exists.';
          }
          throw new Error(`Auth Registration Failed: ${msg}`);
        }

        if (authRes?.user) {
          authUserId = authRes.user.id;
        }
      }
    }

    if (!authUserId) {
      throw new Error('Failed to create staff Auth user in Supabase Auth. Please verify email/password or deploy Edge Function.');
    }

    // 3. Create Profile row linked to the REAL Auth User ID
    const dbPayload: Record<string, any> = {
      id: authUserId,
      user_id: authUserId,
      full_name: params.full_name,
      email: emailNorm,
      phone: params.phone || '',
      role: params.role,
      branch: params.branch || 'Trichy - Sandhukadai',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from('profiles')
      .upsert([dbPayload], { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to insert staff profile in Supabase:', error.message);
      throw formatDbError('User Profile Creation Failed', error);
    }

    const created: UserProfile = {
      id: data.id,
      user_id: data.user_id || data.id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      role: (data.role || 'billing_staff') as UserRole,
      branch: data.branch || 'Trichy - Sandhukadai',
      avatar_url: data.avatar_url,
      is_active: data.is_active ?? true,
      last_login_at: data.last_login_at,
      created_at: data.created_at,
    };

    syncEngine.notifyDataChange('profiles', 'INSERT', created);
    return created;
  },

  async adminChangeUserPassword(userId: string, newPassword: string): Promise<void> {
    const db = checkSupabaseClient();
    try {
      const { data: fnData, error: fnError } = await db.functions.invoke('create-staff-user', {
        body: {
          action: 'update_password',
          user_id: userId,
          password: newPassword,
        },
      });

      if (fnError) {
        let errMsg = fnError.message || 'Failed to update password';
        try {
          if (typeof fnError === 'object' && (fnError as any).context && typeof (fnError as any).context.json === 'function') {
            const bodyErr = await (fnError as any).context.json();
            if (bodyErr?.error) errMsg = bodyErr.error;
          }
        } catch (e) {}

        if (errMsg.includes('Failed to send a request') || errMsg.includes('FunctionsFetchError')) {
          throw new Error("Admin direct password change requires the 'create-staff-user' Edge Function to be deployed on Supabase. Run 'supabase functions deploy create-staff-user' to enable.");
        }
        throw new Error(errMsg);
      }

      if (fnData?.error) {
        throw new Error(fnData.error);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('Failed to send a request') || err.message.includes('FunctionsFetchError'))) {
        throw new Error("Admin direct password change requires the 'create-staff-user' Edge Function to be deployed on Supabase. Run 'supabase functions deploy create-staff-user' to enable.");
      }
      throw err;
    }
  },

  async createUserProfile(userData: Partial<UserProfile>): Promise<UserProfile> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(userData.id);

    const dbPayload: Record<string, any> = {
      id: validId,
      user_id: validId,
      full_name: userData.full_name || '',
      email: (userData.email || '').trim().toLowerCase(),
      phone: userData.phone || '',
      role: userData.role || 'billing_staff',
      branch: userData.branch || 'Trichy - Sandhukadai',
      is_active: userData.is_active ?? true,
    };

    const { data, error } = await db
      .from('profiles')
      .upsert([dbPayload])
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create user profile in Supabase:', error.message);
      throw formatDbError('User Profile Creation Failed', error);
    }

    const created: UserProfile = {
      id: data.id,
      user_id: data.user_id || data.id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      role: (data.role || 'billing_staff') as UserRole,
      branch: data.branch || 'Trichy - Sandhukadai',
      avatar_url: data.avatar_url,
      is_active: data.is_active ?? true,
      last_login_at: data.last_login_at,
      created_at: data.created_at,
    };

    syncEngine.notifyDataChange('profiles', 'INSERT', created);
    return created;
  },

  async updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const db = checkSupabaseClient();

    const dbPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.full_name !== undefined) dbPayload.full_name = updates.full_name;
    if (updates.email !== undefined) dbPayload.email = updates.email.trim().toLowerCase();
    if (updates.phone !== undefined) dbPayload.phone = updates.phone;
    if (updates.role !== undefined) dbPayload.role = updates.role;
    if (updates.branch !== undefined) dbPayload.branch = updates.branch;
    if (updates.is_active !== undefined) dbPayload.is_active = updates.is_active;

    const { data, error } = await db
      .from('profiles')
      .update(dbPayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update user profile in Supabase:', error.message);
      throw formatDbError('User Profile Update Failed', error);
    }

    const updated: UserProfile = {
      id: data.id,
      user_id: data.user_id || data.id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      role: (data.role || 'billing_staff') as UserRole,
      branch: data.branch || 'Trichy - Sandhukadai',
      avatar_url: data.avatar_url,
      is_active: data.is_active ?? true,
      last_login_at: data.last_login_at,
      created_at: data.created_at,
    };

    syncEngine.notifyDataChange('profiles', 'UPDATE', updated);
    return updated;
  },

  async deleteUserProfile(id: string): Promise<void> {
    const db = checkSupabaseClient();

    try {
      await db.functions.invoke('create-staff-user', {
        body: {
          action: 'delete_user',
          user_id: id,
        },
      });
    } catch (e) {
      console.warn('Edge function delete_user warning, deleting profile row directly:', e);
    }

    const { error } = await db.from('profiles').delete().or(`id.eq.${id},user_id.eq.${id}`);

    if (error) {
      console.error('Failed to delete user profile in Supabase:', error.message);
      throw formatDbError('User Profile Deletion Failed', error);
    }

    syncEngine.notifyDataChange('profiles', 'DELETE', { id });
  },

  // --------------------------------------------------------------------------
  // EXPLICIT BACKUP & RESTORE SYSTEM (PHASE 8)
  // Exports full Supabase database to downloadable JSON & restores JSON into Supabase
  // --------------------------------------------------------------------------
  async exportDatabaseBackup(): Promise<string> {
    const db = checkSupabaseClient();

    const [
      { data: customers },
      { data: products },
      { data: retailInvoices },
      { data: wholesaleIssues },
      { data: wholesaleSettlements },
      { data: wholesalePayments },
      { data: purchases },
      { data: expenses },
      { data: suppliers },
      { data: metalRates },
      { data: businessSettings },
    ] = await Promise.all([
      db.from('customers').select('*'),
      db.from('products').select('*'),
      db.from('retail_invoices').select('*'),
      db.from('wholesale_issues').select('*'),
      db.from('wholesale_settlements').select('*'),
      db.from('wholesale_payments').select('*'),
      db.from('purchases').select('*'),
      db.from('expenses').select('*'),
      db.from('suppliers').select('*'),
      db.from('metal_rates').select('*'),
      db.from('business_settings').select('*'),
    ]);

    const backupPayload = {
      app_version: '1.0.0',
      shop_name: 'Shankar Jewellery ERP',
      export_timestamp: new Date().toISOString(),
      data: {
        customers: customers || [],
        products: products || [],
        retailInvoices: retailInvoices || [],
        wholesaleIssues: wholesaleIssues || [],
        wholesaleSettlements: wholesaleSettlements || [],
        wholesalePayments: wholesalePayments || [],
        purchases: purchases || [],
        expenses: expenses || [],
        suppliers: suppliers || [],
        metalRates: metalRates || [],
        businessSettings: businessSettings || [],
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shankar_jewellery_erp_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return jsonString;
  },

  async restoreDatabaseBackup(jsonData: string): Promise<{ restoredCounts: Record<string, number> }> {
    const db = checkSupabaseClient();
    const parsed = JSON.parse(jsonData);

    if (!parsed || !parsed.data) {
      throw new Error('Invalid backup file format. Missing root data object.');
    }

    const { data } = parsed;
    const counts: Record<string, number> = {};

    if (Array.isArray(data.customers) && data.customers.length > 0) {
      const formatted = data.customers.map((c: any) => ({ ...c, id: ensureValidUUID(c.id) }));
      const { error } = await db.from('customers').upsert(formatted);
      if (error) throw new Error(`Customers Restore Failed: ${error.message}`);
      counts.customers = formatted.length;
    }

    if (Array.isArray(data.products) && data.products.length > 0) {
      const formatted = data.products.map((p: any) => ({ ...p, id: ensureValidUUID(p.id) }));
      const { error } = await db.from('products').upsert(formatted);
      if (error) throw new Error(`Products Restore Failed: ${error.message}`);
      counts.products = formatted.length;
    }

    if (Array.isArray(data.retailInvoices) && data.retailInvoices.length > 0) {
      const formatted = data.retailInvoices.map((i: any) => ({
        ...i,
        id: ensureValidUUID(i.id),
        customer_id: i.customer_id ? ensureValidUUID(i.customer_id) : undefined,
      }));
      const { error } = await db.from('retail_invoices').upsert(formatted);
      if (error) throw new Error(`Invoices Restore Failed: ${error.message}`);
      counts.retailInvoices = formatted.length;
    }

    if (Array.isArray(data.wholesaleIssues) && data.wholesaleIssues.length > 0) {
      const formatted = data.wholesaleIssues.map((w: any) => ({
        ...w,
        id: ensureValidUUID(w.id),
        customer_id: ensureValidUUID(w.customer_id),
      }));
      const { error } = await db.from('wholesale_issues').upsert(formatted);
      if (error) throw new Error(`Wholesale Issues Restore Failed: ${error.message}`);
      counts.wholesaleIssues = formatted.length;
    }

    if (Array.isArray(data.expenses) && data.expenses.length > 0) {
      const formatted = data.expenses.map((e: any) => ({ ...e, id: ensureValidUUID(e.id) }));
      const { error } = await db.from('expenses').upsert(formatted);
      if (error) throw new Error(`Expenses Restore Failed: ${error.message}`);
      counts.expenses = formatted.length;
    }

    if (Array.isArray(data.suppliers) && data.suppliers.length > 0) {
      const formatted = data.suppliers.map((s: any) => ({ ...s, id: ensureValidUUID(s.id) }));
      const { error } = await db.from('suppliers').upsert(formatted);
      if (error) throw new Error(`Suppliers Restore Failed: ${error.message}`);
      counts.suppliers = formatted.length;
    }

    return { restoredCounts: counts };
  },
};
