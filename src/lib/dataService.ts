import { supabase, isSupabaseConfigured, getLocalDb, saveLocalDb } from './supabase';
import { syncEngine } from './syncEngine';
import {
  Customer,
  Product,
  RetailInvoice,
  RetailPayment,
  WholesaleIssue,
  WholesaleReturn,
  WholesaleSettlement,
  WholesalePayment,
  Purchase,
  PurchasePayment,
  Expense,
  Supplier,
  MetalRate,
  BusinessSettings,
  InventoryMovement,
  AuditLog,
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

// ============================================================================
// CENTRAL DATA SERVICE
// Single source of truth interfacing directly with Supabase PostgreSQL
// ============================================================================

export const dataService = {
  // --------------------------------------------------------------------------
  // CUSTOMERS
  // --------------------------------------------------------------------------
  async getCustomers(): Promise<Customer[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const db = getLocalDb();
          db.customers = data as Customer[];
          saveLocalDb(db);
          return data as Customer[];
        } else if (error) {
          console.warn('Supabase getCustomers error:', error.message);
        }
      } catch (err) {
        console.warn('Error in getCustomers:', err);
      }
    }
    const db = getLocalDb();
    return db.customers || [];
  },

  async createCustomer(customerData: Partial<Customer>): Promise<Customer> {
    const validId = ensureValidUUID(customerData.id);
    const newCustomer: Customer = {
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
      agreed_customer_touch: customerData.agreed_customer_touch ?? 40,
      credit_limit: customerData.credit_limit ?? 0,
      agreed_profit_percent: customerData.agreed_profit_percent ?? 40,
      profit_sharing_model: customerData.profit_sharing_model || 'model_a_profit_percent',
      payment_terms: customerData.payment_terms || '30 Days',
      photo_url: customerData.photo_url || '',
      notes: customerData.notes || '',
      is_active: customerData.is_active ?? true,
      created_at: customerData.created_at || new Date().toISOString(),
    };

    // Update local cache
    const db = getLocalDb();
    db.customers = [newCustomer, ...(db.customers || []).filter((c) => c.id !== newCustomer.id)];
    saveLocalDb(db, 'customers', 'INSERT', newCustomer);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .insert(newCustomer)
          .select()
          .single();

        if (error) {
          console.error('Supabase customer insert error:', error.message);
          throw new Error(error.message);
        }
        if (data) {
          const updatedDb = getLocalDb();
          const idx = updatedDb.customers.findIndex((c) => c.id === newCustomer.id);
          if (idx !== -1) updatedDb.customers[idx] = data as Customer;
          saveLocalDb(updatedDb);
          return data as Customer;
        }
      } catch (err) {
        console.error('Error inserting customer into Supabase:', err);
      }
    }
    return newCustomer;
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const db = getLocalDb();
    const idx = db.customers.findIndex((c) => c.id === id);
    if (idx !== -1) {
      db.customers[idx] = { ...db.customers[idx], ...updates };
      saveLocalDb(db, 'customers', 'UPDATE', db.customers[idx]);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return data as Customer;
        }
      } catch (err) {
        console.warn('Error updating customer in Supabase:', err);
      }
    }
    return db.customers[idx] || (updates as Customer);
  },

  async deleteCustomer(id: string): Promise<boolean> {
    const db = getLocalDb();
    db.customers = (db.customers || []).filter((c) => c.id !== id);
    saveLocalDb(db, 'customers', 'DELETE', { id });

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) {
          console.warn('Supabase customer delete warning:', error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.warn('Error deleting customer in Supabase:', err);
      }
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // PRODUCTS & INVENTORY
  // --------------------------------------------------------------------------
  async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const db = getLocalDb();
          db.products = data as Product[];
          saveLocalDb(db);
          return data as Product[];
        }
      } catch (err) {
        console.warn('Error in getProducts:', err);
      }
    }
    const db = getLocalDb();
    return db.products || [];
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const validId = ensureValidUUID(productData.id);
    const newProduct: Product = {
      id: validId,
      sku: productData.sku || `SKU-${Date.now()}`,
      barcode: productData.barcode || `${Math.floor(100000 + Math.random() * 900000)}`,
      qr_code: productData.qr_code || `QR-${Date.now()}`,
      name: productData.name || '',
      category_id: productData.category_id || '',
      category_name: productData.category_name || '',
      metal_type: productData.metal_type || 'gold',
      purity: productData.purity || '22k',
      gross_weight_g: Number(productData.gross_weight_g || 0),
      stone_weight_g: Number(productData.stone_weight_g || 0),
      other_weight_g: Number(productData.other_weight_g || 0),
      net_weight_g: Number(productData.net_weight_g || 0),
      unit: productData.unit || 'grams',
      quantity: Number(productData.quantity || 1),
      making_charge_type: productData.making_charge_type || 'per_gram',
      making_charge_rate: Number(productData.making_charge_rate || 0),
      labour_charge: Number(productData.labour_charge || 0),
      wastage_percent: Number(productData.wastage_percent || 0),
      wastage_weight_g: Number(productData.wastage_weight_g || 0),
      purchase_cost: Number(productData.purchase_cost || 0),
      manufacturing_cost: Number(productData.manufacturing_cost || 0),
      retail_price: Number(productData.retail_price || 0),
      wholesale_valuation: Number(productData.wholesale_valuation || 0),
      minimum_stock: Number(productData.minimum_stock || 5),
      description: productData.description || '',
      primary_photo_url: productData.primary_photo_url || '',
      status: productData.status || 'in_stock',
      created_at: productData.created_at || new Date().toISOString(),
    };

    const db = getLocalDb();
    db.products = [newProduct, ...(db.products || []).filter((p) => p.id !== newProduct.id)];
    saveLocalDb(db, 'products', 'INSERT', newProduct);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert(newProduct)
          .select()
          .single();

        if (error) {
          console.error('Supabase product insert error:', error.message);
          throw new Error(error.message);
        }
        if (data) {
          const updatedDb = getLocalDb();
          const idx = updatedDb.products.findIndex((p) => p.id === newProduct.id);
          if (idx !== -1) updatedDb.products[idx] = data as Product;
          saveLocalDb(updatedDb);
          return data as Product;
        }
      } catch (err) {
        console.error('Error creating product in Supabase:', err);
      }
    }
    return newProduct;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const db = getLocalDb();
    const idx = db.products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      db.products[idx] = { ...db.products[idx], ...updates };
      saveLocalDb(db, 'products', 'UPDATE', db.products[idx]);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return data as Product;
        }
      } catch (err) {
        console.warn('Error updating product in Supabase:', err);
      }
    }
    return db.products[idx] || (updates as Product);
  },

  async deleteProduct(id: string): Promise<boolean> {
    const db = getLocalDb();
    db.products = (db.products || []).filter((p) => p.id !== id);
    saveLocalDb(db, 'products', 'DELETE', { id });

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        return !error;
      } catch (err) {
        console.warn('Error deleting product in Supabase:', err);
      }
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // RETAIL INVOICES & PAYMENTS
  // --------------------------------------------------------------------------
  async getRetailInvoices(): Promise<RetailInvoice[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('retail_invoices')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const db = getLocalDb();
          db.retailInvoices = data as RetailInvoice[];
          saveLocalDb(db);
          return data as RetailInvoice[];
        }
      } catch (err) {
        console.warn('Error in getRetailInvoices:', err);
      }
    }
    const db = getLocalDb();
    return db.retailInvoices || [];
  },

  async createRetailInvoice(invoiceData: Partial<RetailInvoice>, paymentData?: Partial<RetailPayment>): Promise<RetailInvoice> {
    const validId = ensureValidUUID(invoiceData.id);
    const validCustomerId = ensureValidUUID(invoiceData.customer_id);

    const newInvoice: RetailInvoice = {
      id: validId,
      invoice_number: invoiceData.invoice_number || `SJ-INV-${Date.now()}`,
      customer_id: validCustomerId,
      customer_name: invoiceData.customer_name || 'Retail Buyer',
      customer_phone: invoiceData.customer_phone || '',
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
      items: invoiceData.items || [],
      created_at: invoiceData.created_at || new Date().toISOString(),
    };

    let newPayment: RetailPayment | undefined;
    if (paymentData) {
      newPayment = {
        id: ensureValidUUID(paymentData.id),
        invoice_id: validId,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        amount: Number(paymentData.amount || newInvoice.paid_amount),
        payment_mode: paymentData.payment_mode || 'cash',
        reference_number: paymentData.reference_number || '',
        notes: paymentData.notes || '',
      };
    }

    const db = getLocalDb();
    db.retailInvoices = [newInvoice, ...(db.retailInvoices || []).filter((i) => i.id !== newInvoice.id)];
    if (newPayment) {
      db.retailPayments = [newPayment, ...(db.retailPayments || [])];
    }
    saveLocalDb(db, 'retail_invoices', 'INSERT', newInvoice);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: invData, error: invError } = await supabase
          .from('retail_invoices')
          .insert(newInvoice)
          .select()
          .single();

        if (invError) {
          console.error('Supabase retail invoice insert error:', invError.message);
        }

        if (newPayment) {
          await supabase.from('retail_payments').insert(newPayment);
        }

        if (invData) {
          return invData as RetailInvoice;
        }
      } catch (err) {
        console.error('Error inserting retail invoice into Supabase:', err);
      }
    }
    return newInvoice;
  },

  // --------------------------------------------------------------------------
  // WHOLESALE ISSUES & SETTLEMENTS
  // --------------------------------------------------------------------------
  async getWholesaleIssues(): Promise<WholesaleIssue[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('wholesale_issues')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const db = getLocalDb();
          db.wholesaleIssues = data as WholesaleIssue[];
          saveLocalDb(db);
          return data as WholesaleIssue[];
        }
      } catch (err) {
        console.warn('Error in getWholesaleIssues:', err);
      }
    }
    const db = getLocalDb();
    return db.wholesaleIssues || [];
  },

  async createWholesaleIssue(issueData: Partial<WholesaleIssue>): Promise<WholesaleIssue> {
    const validId = ensureValidUUID(issueData.id);
    const validCustomerId = ensureValidUUID(issueData.customer_id);

    const newIssue: WholesaleIssue = {
      id: validId,
      issue_number: issueData.issue_number || `WI-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      customer_id: validCustomerId,
      customer_name: issueData.customer_name || '',
      customer_shop: issueData.customer_shop || '',
      issue_date: issueData.issue_date || new Date().toISOString().split('T')[0],
      expected_return_date: issueData.expected_return_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      total_items_issued: Number(issueData.total_items_issued || 0),
      total_gross_weight_g: Number(issueData.total_gross_weight_g || 0),
      total_deduction_weight_g: Number(issueData.total_deduction_weight_g || 0),
      total_net_weight_g: Number(issueData.total_net_weight_g || 0),
      total_fine_gold_g: Number(issueData.total_fine_gold_g || 0),
      gold_rate_per_gram: Number(issueData.gold_rate_per_gram || 0),
      total_cash_value: Number(issueData.total_cash_value || 0),
      total_valuation_amount: Number(issueData.total_valuation_amount || 0),
      agreed_profit_model: issueData.agreed_profit_model || 'model_a_profit_percent',
      agreed_profit_percent: Number(issueData.agreed_profit_percent || 40),
      cash_paid: Number(issueData.cash_paid || 0),
      gold_916_weight_paid_g: Number(issueData.gold_916_weight_paid_g || 0),
      gold_916_rate: Number(issueData.gold_916_rate || 0),
      gold_916_value_paid: Number(issueData.gold_916_value_paid || 0),
      remaining_balance: Number(issueData.remaining_balance || 0),
      status: issueData.status || 'active',
      items: issueData.items || [],
      created_at: issueData.created_at || new Date().toISOString(),
    };

    const db = getLocalDb();
    db.wholesaleIssues = [newIssue, ...(db.wholesaleIssues || []).filter((w) => w.id !== newIssue.id)];
    saveLocalDb(db, 'wholesale_issues', 'INSERT', newIssue);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('wholesale_issues')
          .insert(newIssue)
          .select()
          .single();

        if (error) {
          console.error('Supabase wholesale issue insert error:', error.message);
        }
        if (data) return data as WholesaleIssue;
      } catch (err) {
        console.error('Error inserting wholesale issue into Supabase:', err);
      }
    }
    return newIssue;
  },

  // --------------------------------------------------------------------------
  // PURCHASES & EXPENSES
  // --------------------------------------------------------------------------
  async getPurchases(): Promise<Purchase[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('purchases')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const db = getLocalDb();
          db.purchases = data as Purchase[];
          saveLocalDb(db);
          return data as Purchase[];
        }
      } catch (err) {
        console.warn('Error in getPurchases:', err);
      }
    }
    const db = getLocalDb();
    return db.purchases || [];
  },

  async createPurchase(purchaseData: Partial<Purchase>, paymentData?: Partial<PurchasePayment>): Promise<Purchase> {
    const validId = ensureValidUUID(purchaseData.id);
    const validSupplierId = ensureValidUUID(purchaseData.supplier_id);

    const newPurchase: Purchase = {
      id: validId,
      purchase_number: purchaseData.purchase_number || `PUR-${Date.now()}`,
      purchase_date: purchaseData.purchase_date || new Date().toISOString().split('T')[0],
      supplier_id: validSupplierId,
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

    const db = getLocalDb();
    db.purchases = [newPurchase, ...(db.purchases || []).filter((p) => p.id !== newPurchase.id)];
    saveLocalDb(db, 'purchases', 'INSERT', newPurchase);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('purchases')
          .insert(newPurchase)
          .select()
          .single();

        if (!error && data) return data as Purchase;
      } catch (err) {
        console.error('Error inserting purchase into Supabase:', err);
      }
    }
    return newPurchase;
  },

  async getExpenses(): Promise<Expense[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const db = getLocalDb();
          db.expenses = data as Expense[];
          saveLocalDb(db);
          return data as Expense[];
        }
      } catch (err) {
        console.warn('Error in getExpenses:', err);
      }
    }
    const db = getLocalDb();
    return db.expenses || [];
  },

  async createExpense(expenseData: Partial<Expense>): Promise<Expense> {
    const validId = ensureValidUUID(expenseData.id);
    const newExpense: Expense = {
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

    const db = getLocalDb();
    db.expenses = [newExpense, ...(db.expenses || []).filter((e) => e.id !== newExpense.id)];
    saveLocalDb(db, 'expenses', 'INSERT', newExpense);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .insert(newExpense)
          .select()
          .single();

        if (!error && data) return data as Expense;
      } catch (err) {
        console.error('Error inserting expense into Supabase:', err);
      }
    }
    return newExpense;
  },

  // --------------------------------------------------------------------------
  // SUPPLIERS
  // --------------------------------------------------------------------------
  async getSuppliers(): Promise<Supplier[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const db = getLocalDb();
          db.suppliers = data as Supplier[];
          saveLocalDb(db);
          return data as Supplier[];
        }
      } catch (err) {
        console.warn('Error in getSuppliers:', err);
      }
    }
    const db = getLocalDb();
    return db.suppliers || [];
  },

  async createSupplier(supplierData: Partial<Supplier>): Promise<Supplier> {
    const validId = ensureValidUUID(supplierData.id);
    const newSupplier: Supplier = {
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

    const db = getLocalDb();
    db.suppliers = [newSupplier, ...(db.suppliers || []).filter((s) => s.id !== newSupplier.id)];
    saveLocalDb(db, 'suppliers', 'INSERT', newSupplier);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .insert(newSupplier)
          .select()
          .single();

        if (!error && data) return data as Supplier;
      } catch (err) {
        console.error('Error inserting supplier into Supabase:', err);
      }
    }
    return newSupplier;
  },

  // --------------------------------------------------------------------------
  // LOCAL DATA MIGRATION UTILITY
  // Inspects browser localStorage, fixes non-UUID IDs, and uploads missing local records to Supabase
  // --------------------------------------------------------------------------
  async migrateLocalDataToSupabase(): Promise<{ migratedCustomers: number; migratedProducts: number; migratedInvoices: number }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { migratedCustomers: 0, migratedProducts: 0, migratedInvoices: 0 };
    }

    let cCount = 0;
    let pCount = 0;
    let iCount = 0;

    try {
      const db = getLocalDb();

      // 1. Migrate Customers
      if (Array.isArray(db.customers) && db.customers.length > 0) {
        for (const cust of db.customers) {
          const validId = ensureValidUUID(cust.id);
          const formatted = { ...cust, id: validId };
          const { error } = await supabase.from('customers').upsert(formatted);
          if (!error) cCount++;
        }
      }

      // 2. Migrate Products
      if (Array.isArray(db.products) && db.products.length > 0) {
        for (const prod of db.products) {
          const validId = ensureValidUUID(prod.id);
          const formatted = { ...prod, id: validId };
          const { error } = await supabase.from('products').upsert(formatted);
          if (!error) pCount++;
        }
      }

      // 3. Migrate Invoices
      if (Array.isArray(db.retailInvoices) && db.retailInvoices.length > 0) {
        for (const inv of db.retailInvoices) {
          const validId = ensureValidUUID(inv.id);
          const validCustId = ensureValidUUID(inv.customer_id);
          const formatted = { ...inv, id: validId, customer_id: validCustId };
          const { error } = await supabase.from('retail_invoices').upsert(formatted);
          if (!error) iCount++;
        }
      }
    } catch (err) {
      console.warn('Local storage data migration warning:', err);
    }

    return { migratedCustomers: cCount, migratedProducts: pCount, migratedInvoices: iCount };
  },
};
