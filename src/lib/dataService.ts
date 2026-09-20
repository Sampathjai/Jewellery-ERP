import { supabase, isSupabaseConfigured, getLocalDb, saveLocalDb, createSecondaryAuthClient } from './supabase';
import { syncEngine } from './syncEngine';
import {
  Customer,
  Product,
  ProductCategory,
  RetailInvoice,
  RetailPayment,
  WholesaleIssue,
  WholesaleIssueItem,
  WholesaleReturn,
  WholesaleSettlement,
  WholesalePayment,
  WholesaleSale,
  Purchase,
  PurchasePayment,
  Expense,
  Supplier,
  MetalRate,
  MetalPurity,
  BusinessSettings,
  InventoryMovement,
  ManufacturingJob,
  UserProfile,
  UserRole,
  AuditLog,
  NotificationItem,
  WhatsAppMessage,
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
export const sanitizeMetalPurity = (purity?: string, touch?: number, metalType?: string): MetalPurity => {
  if (metalType === 'silver') {
    if (purity === '999_silver') return '999_silver';
    return '925_silver';
  }
  const validEnums: MetalPurity[] = ['24k', '22k', '18k', '14k', '925_silver', '999_silver', 'other'];
  if (purity && validEnums.includes(purity as MetalPurity)) {
    return purity as MetalPurity;
  }
  if (touch !== undefined && touch !== null) {
    const t = Number(touch);
    if (t >= 99) return '24k';
    if (t >= 90) return '22k';
    if (t >= 74) return '18k';
    if (t >= 55) return '14k';
  }
  return 'other';
};

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

  async getCustomerById(id: string): Promise<Customer | null> {
    const validId = ensureValidUUID(id);
    const localDb = getLocalDb();
    try {
      const db = checkSupabaseClient();
      const { data, error } = await db
        .from('customers')
        .select('*')
        .eq('id', validId)
        .maybeSingle();

      if (error || !data) {
        return localDb.customers.find((c) => c.id === id || c.id === validId) || null;
      }
      return {
        ...data,
        agreed_customer_touch: data.default_actual_touch ?? data.agreed_profit_percent ?? 40,
      } as Customer;
    } catch {
      return localDb.customers.find((c) => c.id === id || c.id === validId) || null;
    }
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

    this.logAuditAction('create_customer', 'customer', result.id, {
      full_name: result.full_name,
      shop_name: result.shop_name,
      customer_type: result.customer_type,
    }).catch((e) => console.warn('Audit log failed for createCustomer:', e));

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

    this.logAuditAction('update_customer', 'customer', result.id, {
      full_name: result.full_name,
      shop_name: result.shop_name,
    }).catch((e) => console.warn('Audit log failed for updateCustomer:', e));

    syncEngine.notifyDataChange('customers', 'UPDATE', result);
    return result;
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; softDeleted: boolean; message: string }> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(id);

    const [retailRef, wholesaleRef] = await Promise.all([
      db.from('retail_invoices').select('id').eq('customer_id', validId).limit(1),
      db.from('wholesale_issues').select('id').eq('customer_id', validId).limit(1),
    ]);

    const isReferenced = (retailRef.data && retailRef.data.length > 0) ||
                         (wholesaleRef.data && wholesaleRef.data.length > 0);

    let softDeleted = false;
    if (isReferenced) {
      const { error } = await db.from('customers').update({ is_active: false }).eq('id', validId);
      if (error) {
        console.error('Failed to deactivate customer in Supabase:', error.message);
        throw new Error(`Customer Deactivation Failed: ${error.message}`);
      }
      softDeleted = true;
    } else {
      const { error } = await db.from('customers').delete().eq('id', validId);
      if (error) {
        console.error('Failed to delete customer in Supabase:', error.message);
        throw new Error(`Customer Delete Failed: ${error.message}`);
      }
    }

    await this.logAuditAction(
      softDeleted ? 'deactivate_customer' : 'delete_customer',
      'customer',
      validId,
      { softDeleted }
    );

    syncEngine.notifyDataChange('customers', 'DELETE', { id: validId });
    return {
      success: true,
      softDeleted,
      message: softDeleted
        ? 'Customer has historical transaction records; safely archived to protect CRM & accounting ledger history.'
        : 'Customer permanently deleted.',
    };
  },

  // --------------------------------------------------------------------------
  // PRODUCTS & STOCK
  // --------------------------------------------------------------------------
  async getProducts(includeArchived: boolean = false): Promise<Product[]> {
    const db = checkSupabaseClient();
    let query = db.from('products').select('*');
    if (!includeArchived) {
      query = query.neq('status', 'archived');
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch products from Supabase:', error.message);
      throw formatDbError('Database Error', error);
    }
    return ((data || []).map((p) => ({
      ...p,
      category_name: p.category_name || (p.metal_type === 'silver' ? 'Silverware' : 'Gold Jewellery'),
      actual_touch: Number(p.actual_touch ?? 37),
      purity: sanitizeMetalPurity(p.purity, p.actual_touch, p.metal_type),
    }))) as Product[];
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(productData.id);
    const touchVal = Number(productData.actual_touch ?? 37);
    const sanitizedPurity = sanitizeMetalPurity(productData.purity, touchVal, productData.metal_type);

    const dbPayload: Record<string, any> = {
      id: validId,
      sku: productData.sku || `SKU-${Date.now()}`,
      barcode: productData.barcode || `${Math.floor(100000 + Math.random() * 900000)}`,
      qr_code: productData.qr_code || `QR-${Date.now()}`,
      name: productData.name || '',
      category_id: productData.category_id ? ensureValidUUID(productData.category_id) : undefined,
      metal_type: productData.metal_type || 'gold',
      purity: sanitizedPurity,
      actual_touch: touchVal,
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
      actual_touch: Number(data.actual_touch ?? touchVal),
      purity: data.purity || sanitizedPurity,
    } as Product;

    // Automatically record opening stock movement if quantity > 0
    if (result.quantity > 0) {
      try {
        await this.createInventoryMovement({
          product_id: result.id,
          product_name: result.name,
          sku: result.sku,
          metal_type: result.metal_type,
          purity: result.purity,
          movement_type: 'opening_stock',
          quantity_change: result.quantity,
          weight_change_g: (result.net_weight_g || 0) * result.quantity,
          gross_weight_g: result.gross_weight_g,
          net_weight_g: result.net_weight_g,
          quantity: result.quantity,
          notes: `Initial opening stock for ${result.name} (${result.actual_touch || 40}% touch)`,
        });
      } catch (movErr) {
        console.warn('Could not record initial opening stock movement:', movErr);
      }
    }

    this.logAuditAction('create_product', 'product', result.id, {
      name: result.name,
      sku: result.sku,
      quantity: result.quantity,
      gross_weight_g: result.gross_weight_g,
    }).catch((e) => console.warn('Audit log failed for createProduct:', e));

    syncEngine.notifyDataChange('products', 'INSERT', result);
    return result;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(id);

    const { category_name, deduction_weight_g, ...dbUpdates } = updates as any;

    if (dbUpdates.actual_touch !== undefined) {
      dbUpdates.actual_touch = Number(dbUpdates.actual_touch);
    }
    if (dbUpdates.purity || dbUpdates.actual_touch) {
      dbUpdates.purity = sanitizeMetalPurity(dbUpdates.purity, dbUpdates.actual_touch, dbUpdates.metal_type);
    }

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
      actual_touch: Number(data.actual_touch ?? updates.actual_touch ?? 37),
    } as Product;

    this.logAuditAction('update_product', 'product', result.id, {
      name: result.name,
      sku: result.sku,
    }).catch((e) => console.warn('Audit log failed for updateProduct:', e));

    syncEngine.notifyDataChange('products', 'UPDATE', result);
    return result;
  },

  async deleteProduct(id: string): Promise<{ success: boolean; softDeleted: boolean; message: string }> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(id);

    const [retailRef, wholesaleRef, movementRef] = await Promise.all([
      db.from('retail_invoice_items').select('id').eq('product_id', validId).limit(1),
      db.from('wholesale_issue_items').select('id').eq('product_id', validId).limit(1),
      db.from('inventory_movements').select('id').eq('product_id', validId).limit(1),
    ]);

    const isReferenced = (retailRef.data && retailRef.data.length > 0) ||
                         (wholesaleRef.data && wholesaleRef.data.length > 0) ||
                         (movementRef.data && movementRef.data.length > 0);

    let softDeleted = false;
    if (isReferenced) {
      const { error } = await db.from('products').update({ status: 'archived' }).eq('id', validId);
      if (error) {
        console.error('Failed to archive product in Supabase:', error.message);
        throw new Error(`Product Archive Failed: ${error.message}`);
      }
      softDeleted = true;
    } else {
      const { error } = await db.from('products').delete().eq('id', validId);
      if (error) {
        console.error('Failed to delete product in Supabase:', error.message);
        throw new Error(`Product Delete Failed: ${error.message}`);
      }
    }

    await this.logAuditAction(
      softDeleted ? 'archive_product' : 'delete_product',
      'product',
      validId,
      { softDeleted }
    );

    syncEngine.notifyDataChange('products', 'DELETE', { id: validId });
    return {
      success: true,
      softDeleted,
      message: softDeleted
        ? 'Product has historical billing records; safely archived to protect tax & accounting history.'
        : 'Product permanently deleted.',
    };
  },

  // --------------------------------------------------------------------------
  // INVENTORY MOVEMENTS & AUDIT LEDGER
  // --------------------------------------------------------------------------
  async getInventoryMovements(): Promise<InventoryMovement[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db
      .from('inventory_movements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch inventory movements from Supabase:', error.message);
      const localDb = getLocalDb();
      return localDb.inventoryMovements || [];
    }
    return (data || []) as InventoryMovement[];
  },

  async createInventoryMovement(movement: Partial<InventoryMovement>): Promise<InventoryMovement> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(movement.id);
    const dbPayload = {
      id: validId,
      product_id: movement.product_id ? ensureValidUUID(movement.product_id) : undefined,
      movement_type: movement.movement_type || 'opening_stock',
      quantity_change: Number(movement.quantity_change || 0),
      weight_change_g: Number(movement.weight_change_g || 0),
      notes: movement.notes || '',
      created_at: movement.created_at || new Date().toISOString(),
    };

    const { data, error } = await db
      .from('inventory_movements')
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.warn('Failed to record inventory movement in Supabase:', error.message);
    }

    const result = {
      ...movement,
      ...(data || dbPayload),
    } as InventoryMovement;

    const localDb = getLocalDb();
    if (!localDb.inventoryMovements) localDb.inventoryMovements = [];
    localDb.inventoryMovements.unshift(result);
    saveLocalDb(localDb);

    syncEngine.notifyDataChange('inventory_movements', 'INSERT', result);
    return result;
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

  async generateUniqueInvoiceNumber(prefix: string = 'INV-2026-'): Promise<string> {
    const db = checkSupabaseClient();
    try {
      const { data } = await db
        .from('retail_invoices')
        .select('invoice_number')
        .like('invoice_number', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(30);

      let maxNum = 1000;
      if (data && data.length > 0) {
        for (const row of data) {
          const match = row.invoice_number?.match(/\d+$/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      return `${prefix}${maxNum + 1}`;
    } catch (e) {
      return `${prefix}${Math.floor(10000 + Math.random() * 90000)}`;
    }
  },

  async createRetailInvoice(invoiceData: Partial<RetailInvoice>, paymentData?: Partial<RetailPayment>): Promise<RetailInvoice> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(invoiceData.id);
    const validCustomerId = invoiceData.customer_id ? ensureValidUUID(invoiceData.customer_id) : undefined;
    const custName = (invoiceData.customer_name || '').trim() || 'Walk-in Customer';
    const custPhone = (invoiceData.customer_phone || '').trim();

    // Stock Validation Guard
    // Pre-flight Server-Side Stock Validation Guard (Accumulates duplicate product items)
    if (invoiceData.items && invoiceData.items.length > 0) {
      const productTotalsMap = new Map<string, { name: string; requestedQty: number }>();
      for (const item of invoiceData.items) {
        if (!item.product_id) continue;
        const validProdId = ensureValidUUID(item.product_id);
        const reqQty = Number(item.quantity || 1);
        const name = item.product_name_snapshot || 'Item';
        const existing = productTotalsMap.get(validProdId) || { name, requestedQty: 0 };
        existing.requestedQty += reqQty;
        productTotalsMap.set(validProdId, existing);
      }

      for (const [validProdId, info] of productTotalsMap.entries()) {
        const { data: prodData } = await db.from('products').select('name, quantity').eq('id', validProdId).maybeSingle();
        if (prodData) {
          const availQty = prodData.quantity ?? 0;
          if (info.requestedQty > availQty) {
            throw new Error(`Insufficient stock for "${prodData.name || info.name}". Available: ${availQty} Pcs, Requested: ${info.requestedQty} Pcs.`);
          }
        }
      }
    }

    const basePayload: Partial<RetailInvoice> = {
      id: validId,
      customer_id: validCustomerId,
      customer_name: custName,
      customer_phone: custPhone,
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

    let attempt = 0;
    let savedInv: any = null;
    let lastErr: any = null;

    while (attempt < 3 && !savedInv) {
      attempt++;
      let currentInvNumber = invoiceData.invoice_number;
      if (attempt > 1 || !currentInvNumber) {
        currentInvNumber = await this.generateUniqueInvoiceNumber('INV-2026-');
      }

      const payload = {
        ...basePayload,
        invoice_number: currentInvNumber,
      };

      const { data, error } = await db
        .from('retail_invoices')
        .insert(payload)
        .select()
        .single();

      if (error) {
        lastErr = error;
        if (error.code === '23505' || error.message.includes('unique constraint') || error.message.includes('already exists')) {
          console.warn(`Invoice number collision detected on attempt ${attempt} (${currentInvNumber}), retrying with fresh sequence...`);
          await new Promise((res) => setTimeout(res, 150 * attempt));
          continue;
        } else {
          console.error('Failed to insert retail invoice into Supabase:', error.message);
          throw new Error(`Invoice Creation Failed: ${error.message}`);
        }
      }
      savedInv = data;
    }

    if (!savedInv) {
      throw new Error(`Invoice Creation Failed: ${lastErr?.message || 'Unique invoice number collision limit exceeded'}`);
    }

    if (paymentData) {
      const paymentPayload: RetailPayment = {
        id: ensureValidUUID(paymentData.id),
        invoice_id: validId,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        amount: Number(paymentData.amount || basePayload.paid_amount),
        payment_mode: paymentData.payment_mode || 'cash',
        reference_number: paymentData.reference_number || '',
        notes: paymentData.notes || '',
        created_at: new Date().toISOString(),
      };
      try {
        await db.from('retail_payments').insert(paymentPayload);
      } catch (e) {
        console.warn('Payment insert warning:', e);
      }
    }

    if (invoiceData.items && invoiceData.items.length > 0) {
      const itemsPayload = invoiceData.items.map((item) => ({
        id: ensureValidUUID(item.id),
        invoice_id: validId,
        product_id: item.product_id ? ensureValidUUID(item.product_id) : undefined,
        product_name_snapshot: item.product_name_snapshot || 'Gold Item',
        sku_snapshot: item.sku_snapshot || '',
        metal_type: item.metal_type || 'gold',
        purity: item.purity || '22k',
        gross_weight_g: Number(item.gross_weight_g || 0),
        stone_weight_g: Number(item.stone_weight_g || 0),
        net_weight_g: Number(item.net_weight_g || 0),
        quantity: Number(item.quantity || 1),
        metal_rate_snapshot: Number(item.metal_rate_snapshot || 0),
        metal_value: Number(item.metal_value || 0),
        making_charge: Number(item.making_charge || 0),
        labour_charge: Number(item.labour_charge || 0),
        wastage_percent: Number(item.wastage_percent || 0),
        wastage_weight_g: Number(item.wastage_weight_g || 0),
        wastage_value: Number(item.wastage_value || 0),
        discount: Number(item.discount || 0),
        line_total: Number(item.line_total || 0),
        created_at: new Date().toISOString(),
      }));
      try {
        await db.from('retail_invoice_items').insert(itemsPayload);
      } catch (e) {
        console.warn('Items insert warning:', e);
      }

      // Perform stock deduction & inventory movement logging
      for (const item of invoiceData.items) {
        if (!item.product_id) continue;
        const validProdId = ensureValidUUID(item.product_id);
        const reqQty = Number(item.quantity || 1);

        try {
          const { data: prodData } = await db.from('products').select('quantity, status').eq('id', validProdId).maybeSingle();
          if (prodData) {
            const currentQty = prodData.quantity ?? 0;
            const newQty = Math.max(0, currentQty - reqQty);
            const newStatus = newQty === 0 ? 'sold' : prodData.status;
            await db.from('products').update({ quantity: newQty, status: newStatus }).eq('id', validProdId);

            await this.createInventoryMovement({
              product_id: validProdId,
              product_name: item.product_name_snapshot || 'Retail Item',
              movement_type: 'retail_sale',
              quantity_change: -reqQty,
              weight_change_g: -Number(((item.net_weight_g || 0) * reqQty).toFixed(3)),
              notes: `Stock deducted for Retail Invoice #${savedInv.invoice_number}`,
            });
          }
        } catch (e) {
          console.warn('Stock deduction error:', e);
        }
      }
    }

    const resultInvoice: RetailInvoice = {
      ...savedInv,
      customer_name: custName,
      customer_phone: custPhone,
      items: invoiceData.items || [],
    };

    await this.logAuditAction(
      'create_retail_invoice',
      'retail_invoice',
      validId,
      { invoice_number: savedInv.invoice_number, total_amount: savedInv.total_amount, customer_name: custName }
    );

    syncEngine.notifyDataChange('retail_invoices', 'INSERT', resultInvoice);
    syncEngine.notifyDataChange('products', 'UPDATE', { id: validId });
    return resultInvoice;
  },

  async deleteRetailInvoice(id: string): Promise<boolean> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(id);

    const { data: invData } = await db
      .from('retail_invoices')
      .select('*, items:retail_invoice_items(*)')
      .eq('id', validId)
      .maybeSingle();

    if (!invData) {
      throw new Error(`Retail Invoice #${id} not found.`);
    }

    const invNumber = invData.invoice_number || id;

    // Reverse Stock Quantity
    if (invData.items && invData.items.length > 0) {
      for (const item of invData.items) {
        if (!item.product_id) continue;
        const validProdId = ensureValidUUID(item.product_id);
        const returnQty = Number(item.quantity || 1);

        try {
          const { data: prodData } = await db.from('products').select('quantity, status').eq('id', validProdId).maybeSingle();
          if (prodData) {
            const currentQty = prodData.quantity ?? 0;
            const restoredQty = currentQty + returnQty;
            const restoredStatus = prodData.status === 'sold' ? 'in_stock' : prodData.status;
            await db.from('products').update({ quantity: restoredQty, status: restoredStatus }).eq('id', validProdId);

            await this.createInventoryMovement({
              product_id: validProdId,
              product_name: item.product_name_snapshot || 'Retail Item',
              movement_type: 'cancellation',
              quantity_change: returnQty,
              weight_change_g: Number(((item.net_weight_g || 0) * returnQty).toFixed(3)),
              notes: `Restored stock from deleted Retail Invoice #${invNumber}`,
            });
          }
        } catch (e) {
          console.warn('Stock reversal warning:', e);
        }
      }
    }

    await db.from('retail_invoice_items').delete().eq('invoice_id', validId);
    await db.from('retail_payments').delete().eq('invoice_id', validId);
    const { error } = await db.from('retail_invoices').delete().eq('id', validId);

    if (error) {
      console.error('Failed to delete retail invoice from Supabase:', error.message);
      throw formatDbError('Delete Retail Invoice Failed', error);
    }

    await this.logAuditAction(
      'delete_retail_invoice',
      'retail_invoice',
      validId,
      { invoice_number: invNumber, total_amount: invData.total_amount }
    );

    syncEngine.notifyDataChange('retail_invoices', 'DELETE', { id: validId });
    syncEngine.notifyDataChange('products', 'UPDATE', { id: validId });
    return true;
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
    const localDb = getLocalDb();
    try {
      const db = checkSupabaseClient();
      const { data, error } = await db
        .from('wholesale_issues')
        .select('*, items:wholesale_issue_items(*)')
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.error('Failed to fetch wholesale issues from Supabase:', error?.message);
        return localDb.wholesaleIssues || [];
      }

      const issues = data as WholesaleIssue[];
      
      // Perform batch items fallback for any issues missing items
      const missingItemsIssues = issues.filter((i) => !i.items || i.items.length === 0);
      if (missingItemsIssues.length > 0) {
        const issueIds = missingItemsIssues.map((i) => i.id);
        const { data: allItems } = await db
          .from('wholesale_issue_items')
          .select('*')
          .in('issue_id', issueIds);

        const itemsByIssueId = new Map<string, WholesaleIssueItem[]>();
        if (allItems) {
          for (const item of allItems as WholesaleIssueItem[]) {
            const list = itemsByIssueId.get(item.issue_id!) || [];
            list.push(item);
            itemsByIssueId.set(item.issue_id!, list);
          }
        }

        for (const issue of issues) {
          if (!issue.items || issue.items.length === 0) {
            const fetched = itemsByIssueId.get(issue.id);
            if (fetched && fetched.length > 0) {
              issue.items = fetched;
            } else if (localDb.wholesaleIssues) {
              const localMatch = localDb.wholesaleIssues.find((w) => w.id === issue.id || w.issue_number === issue.issue_number);
              if (localMatch && localMatch.items && localMatch.items.length > 0) {
                issue.items = localMatch.items;
              }
            }
          }
        }
      }

      return issues;
    } catch (e) {
      console.warn('Could not fetch wholesale issues from Supabase:', e);
      return localDb.wholesaleIssues || [];
    }
  },

  async getWholesaleIssueById(id: string): Promise<WholesaleIssue | null> {
    const localDb = getLocalDb();
    try {
      const db = checkSupabaseClient();
      const isUuid = UUID_REGEX.test(id);
      
      let query = db.from('wholesale_issues').select('*, items:wholesale_issue_items(*)');
      if (isUuid) {
        query = query.eq('id', id);
      } else {
        query = query.eq('issue_number', id);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        const localMatch = localDb.wholesaleIssues?.find((w) => w.id === id || w.issue_number === id);
        if (localMatch) return localMatch;
        return null;
      }

      let fetchedItems: WholesaleIssueItem[] = data.items || [];

      // If embedded items is empty, perform a direct query on wholesale_issue_items by issue_id
      if (fetchedItems.length === 0) {
        const { data: directItems } = await db
          .from('wholesale_issue_items')
          .select('*')
          .eq('issue_id', data.id);
        if (directItems && directItems.length > 0) {
          fetchedItems = directItems as WholesaleIssueItem[];
        }
      }

      // If still empty, check localDb cache for items matching data.id or issue_number
      if (fetchedItems.length === 0 && localDb.wholesaleIssues) {
        const localMatch = localDb.wholesaleIssues.find((w) => w.id === data.id || w.issue_number === data.issue_number);
        if (localMatch && localMatch.items && localMatch.items.length > 0) {
          fetchedItems = localMatch.items;
        }
      }

      return {
        ...data,
        items: fetchedItems,
      } as WholesaleIssue;
    } catch (e) {
      console.warn('Could not fetch wholesale issue by id from Supabase:', e);
      const localMatch = localDb.wholesaleIssues?.find((w) => w.id === id || w.issue_number === id);
      return localMatch || null;
    }
  },

  async createWholesaleIssue(issueData: Partial<WholesaleIssue>): Promise<WholesaleIssue> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(issueData.id);
    const validCustomerId = ensureValidUUID(issueData.customer_id);

    // Stock Validation Guard
    if (issueData.items && issueData.items.length > 0) {
      for (const item of issueData.items) {
        if (!item.product_id) continue;
        const validProdId = ensureValidUUID(item.product_id);
        const { data: prodData } = await db.from('products').select('name, quantity').eq('id', validProdId).maybeSingle();
        if (prodData) {
          const availQty = prodData.quantity ?? 0;
          const reqQty = Number(item.quantity_issued || 1);
          if (reqQty > availQty) {
            throw new Error(`Insufficient stock for "${prodData.name}". Available: ${availQty} Pcs, Requested: ${reqQty} Pcs.`);
          }
        }
      }
    }

    let issueNumber = issueData.issue_number;
    if (!issueNumber) {
      issueNumber = `WI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const payload: Record<string, any> = {
      id: validId,
      issue_number: issueNumber,
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
      total_cash_value: Number(issueData.total_cash_value || issueData.total_valuation_amount || 0),
      total_valuation_amount: Number(issueData.total_valuation_amount || 0),
      agreed_profit_model: issueData.agreed_profit_model || 'model_a_profit_percent',
      agreed_profit_percent: Number(issueData.agreed_profit_percent || 40),
      cash_paid: Number(issueData.cash_paid || 0),
      gold_916_weight_paid_g: Number(issueData.gold_916_weight_paid_g || 0),
      gold_916_rate: Number(issueData.gold_916_rate || 0),
      gold_916_value_paid: Number(issueData.gold_916_value_paid || 0),
      remaining_balance: Number(issueData.remaining_balance || 0),
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

    const insertedItems: WholesaleIssueItem[] = [];
    if (issueData.items && issueData.items.length > 0) {
      const itemsPayload = issueData.items.map((item) => ({
        id: ensureValidUUID(item.id),
        issue_id: validId,
        product_id: ensureValidUUID(item.product_id),
        product_name: item.product_name || '',
        sku: item.sku || '',
        category: item.category || 'Jewellery',
        metal_type: item.metal_type || 'gold',
        purity: item.purity || '22k',
        quantity_issued: Number(item.quantity_issued || 1),
        gross_weight_g: Number(item.gross_weight_g || 0),
        deduction_weight_g: Number(item.deduction_weight_g || 0),
        stone_weight_g: Number(item.stone_weight_g || 0),
        net_weight_g: Number(item.net_weight_g || 0),
        actual_touch: Number(item.actual_touch || 0),
        profit_touch: Number(item.profit_touch || 0),
        billing_touch: Number(item.billing_touch || 0),
        fine_gold_g: Number(item.fine_gold_g || 0),
        unit_cost_valuation: Number(item.unit_cost_valuation || 0),
        total_issue_value: Number(item.total_issue_value || 0),
        quantity_sold: Number(item.quantity_sold || 0),
        quantity_returned: Number(item.quantity_returned || 0),
        quantity_remaining: Number(item.quantity_remaining || item.quantity_issued || 1),
      }));

      const { data: itemsData, error: itemsError } = await db
        .from('wholesale_issue_items')
        .insert(itemsPayload)
        .select();

      if (itemsError) {
        console.warn('Could not insert wholesale_issue_items in Supabase:', itemsError.message);
      } else if (itemsData) {
        insertedItems.push(...(itemsData as WholesaleIssueItem[]));
      }

      // Perform stock deduction & inventory movement logging
      for (const item of issueData.items) {
        if (!item.product_id) continue;
        const validProdId = ensureValidUUID(item.product_id);
        const reqQty = Number(item.quantity_issued || 1);

        try {
          const { data: prodData } = await db.from('products').select('quantity, status').eq('id', validProdId).maybeSingle();
          if (prodData) {
            const currentQty = prodData.quantity ?? 0;
            const newQty = Math.max(0, currentQty - reqQty);
            const newStatus = newQty === 0 ? 'wholesale_issued' : prodData.status;
            await db.from('products').update({ quantity: newQty, status: newStatus }).eq('id', validProdId);

            await this.createInventoryMovement({
              product_id: validProdId,
              product_name: item.product_name || 'Wholesale Item',
              movement_type: 'wholesale_issue',
              quantity_change: -reqQty,
              weight_change_g: -Number(((item.net_weight_g || 0) * reqQty).toFixed(3)),
              notes: `Stock deducted for Wholesale Consignment #${issueNumber}`,
            });
          }
        } catch (e) {
          console.warn('Stock deduction error:', e);
        }
      }
    }

    const result = {
      ...data,
      items: insertedItems.length > 0 ? insertedItems : (issueData.items || []),
    } as WholesaleIssue;

    await this.logAuditAction(
      'create_wholesale_issue',
      'wholesale_issue',
      validId,
      { issue_number: issueNumber, customer_name: issueData.customer_name, valuation: issueData.total_valuation_amount }
    );

    const localDb = getLocalDb();
    if (!localDb.wholesaleIssues) localDb.wholesaleIssues = [];
    localDb.wholesaleIssues.unshift(result);
    saveLocalDb(localDb);

    syncEngine.notifyDataChange('wholesale_issues', 'INSERT', result);
    syncEngine.notifyDataChange('products', 'UPDATE', { id: validId });
    return result;
  },

  async deleteWholesaleIssue(id: string): Promise<boolean> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(id);

    const { data: issueData } = await db
      .from('wholesale_issues')
      .select('*, items:wholesale_issue_items(*)')
      .eq('id', validId)
      .maybeSingle();

    if (!issueData) {
      throw new Error(`Wholesale Consignment #${id} not found.`);
    }

    const issueNum = issueData.issue_number || id;

    // Stock Reversal for unreturned items
    if (issueData.items && issueData.items.length > 0) {
      for (const item of issueData.items) {
        if (!item.product_id) continue;
        const validProdId = ensureValidUUID(item.product_id);
        const returnQty = Number(item.quantity_remaining ?? item.quantity_issued ?? 1);

        if (returnQty > 0) {
          try {
            const { data: prodData } = await db.from('products').select('quantity, status').eq('id', validProdId).maybeSingle();
            if (prodData) {
              const currentQty = prodData.quantity ?? 0;
              const restoredQty = currentQty + returnQty;
              const restoredStatus = prodData.status === 'wholesale_issued' ? 'in_stock' : prodData.status;
              await db.from('products').update({ quantity: restoredQty, status: restoredStatus }).eq('id', validProdId);

              await this.createInventoryMovement({
                product_id: validProdId,
                product_name: item.product_name || 'Wholesale Consignment Item',
                movement_type: 'cancellation',
                quantity_change: returnQty,
                weight_change_g: Number(((item.net_weight_g || 0) * returnQty).toFixed(3)),
                notes: `Restored stock from deleted Wholesale Consignment #${issueNum}`,
              });
            }
          } catch (e) {
            console.warn('Wholesale stock reversal warning:', e);
          }
        }
      }
    }

    await db.from('wholesale_issue_items').delete().eq('issue_id', validId);
    await db.from('wholesale_payments').delete().eq('issue_id', validId);
    const { error } = await db.from('wholesale_issues').delete().eq('id', validId);

    if (error) {
      console.error('Failed to delete wholesale issue from Supabase:', error.message);
      throw formatDbError('Delete Wholesale Consignment Failed', error);
    }

    await this.logAuditAction(
      'delete_wholesale_issue',
      'wholesale_issue',
      validId,
      { issue_number: issueNum, customer_name: issueData.customer_name }
    );

    syncEngine.notifyDataChange('wholesale_issues', 'DELETE', { id: validId });
    syncEngine.notifyDataChange('products', 'UPDATE', { id: validId });
    return true;
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
    if (error) {
      const localDb = getLocalDb();
      return localDb.wholesalePayments || [];
    }
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
    if (error) {
      console.warn('Failed to insert wholesale payment in Supabase:', error.message);
    }

    const result = (data || payload) as WholesalePayment;
    const localDb = getLocalDb();
    if (!localDb.wholesalePayments) localDb.wholesalePayments = [];
    localDb.wholesalePayments.unshift(result);
    saveLocalDb(localDb);

    syncEngine.notifyDataChange('wholesale_payments', 'INSERT', result);
    return result;
  },

  async getWholesaleSales(): Promise<WholesaleSale[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db.from('wholesale_sales').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Failed to fetch wholesale sales from Supabase:', error.message);
      const localDb = getLocalDb();
      return localDb.wholesaleSales || [];
    }
    return (data || []) as WholesaleSale[];
  },

  async createWholesaleSale(saleData: Partial<WholesaleSale>): Promise<WholesaleSale> {
    const db = checkSupabaseClient();
    const validId = ensureValidUUID(saleData.id);
    const payload: WholesaleSale = {
      id: validId,
      sale_number: saleData.sale_number || `WS-${Date.now().toString().slice(-6)}`,
      issue_id: saleData.issue_id ? ensureValidUUID(saleData.issue_id) : undefined,
      customer_id: ensureValidUUID(saleData.customer_id),
      customer_name: saleData.customer_name || '',
      sale_date: saleData.sale_date || new Date().toISOString().split('T')[0],
      buyer_shop_name: saleData.buyer_shop_name || '',
      buyer_location: saleData.buyer_location || '',
      total_quantity_sold: Number(saleData.total_quantity_sold || 0),
      total_weight_sold_g: Number(saleData.total_weight_sold_g || 0),
      total_sale_value: Number(saleData.total_sale_value || 0),
      total_cost_valuation: Number(saleData.total_cost_valuation || 0),
      gross_profit: Number(saleData.gross_profit || 0),
      customer_profit_share: Number(saleData.customer_profit_share || 0),
      shop_profit_share: Number(saleData.shop_profit_share || 0),
      notes: saleData.notes || '',
      created_at: saleData.created_at || new Date().toISOString(),
    };

    const { data, error } = await db.from('wholesale_sales').insert(payload).select().single();
    if (error) {
      console.warn('Failed to insert wholesale sale in Supabase:', error.message);
    }

    const result = (data || payload) as WholesaleSale;
    const localDb = getLocalDb();
    if (!localDb.wholesaleSales) localDb.wholesaleSales = [];
    localDb.wholesaleSales.unshift(result);
    saveLocalDb(localDb);

    syncEngine.notifyDataChange('wholesale_sales', 'INSERT', result);
    return result;
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
    const localDb = getLocalDb();
    try {
      const db = checkSupabaseClient();
      const { data: bData, error } = await db.from('business_settings').select('*').order('updated_at', { ascending: false }).limit(1);

      let auditDetails: Record<string, any> = {};
      try {
        const { data: auditData } = await db
          .from('audit_logs')
          .select('*')
          .eq('action', 'update_user_login_settings')
          .order('created_at', { ascending: false })
          .limit(1);

        if (auditData && auditData.length > 0 && auditData[0].details) {
          auditDetails = auditData[0].details;
        }
      } catch (auditErr) {
        console.warn('Could not query audit_logs for session settings:', auditErr);
      }

      if (error && !auditDetails.updated_at) {
        console.error('Failed to fetch business_settings from Supabase:', error.message);
        throw formatDbError('Fetch Business Settings Failed', error);
      }

      if ((bData && bData.length > 0) || Object.keys(auditDetails).length > 0) {
        const row = bData && bData.length > 0 ? bData[0] : {};

        const logoutEnabled = row.inactivity_logout_enabled !== undefined && row.inactivity_logout_enabled !== null
          ? Boolean(row.inactivity_logout_enabled)
          : auditDetails.inactivity_logout_enabled !== undefined && auditDetails.inactivity_logout_enabled !== null
            ? Boolean(auditDetails.inactivity_logout_enabled)
            : (localDb.settings?.inactivity_logout_enabled ?? true);

        const timeoutMins = row.inactivity_timeout_minutes !== undefined && row.inactivity_timeout_minutes !== null
          ? Number(row.inactivity_timeout_minutes)
          : auditDetails.inactivity_timeout_minutes !== undefined && auditDetails.inactivity_timeout_minutes !== null
            ? Number(auditDetails.inactivity_timeout_minutes)
            : Number(localDb.settings?.inactivity_timeout_minutes ?? 15);

        const maxSessions = row.max_concurrent_sessions !== undefined && row.max_concurrent_sessions !== null
          ? Number(row.max_concurrent_sessions)
          : auditDetails.max_concurrent_sessions !== undefined && auditDetails.max_concurrent_sessions !== null
            ? Number(auditDetails.max_concurrent_sessions)
            : Number(localDb.settings?.max_concurrent_sessions ?? 3);

        const forceLogoutAt = row.force_logout_all_at || auditDetails.force_logout_all_at || localDb.settings?.force_logout_all_at || null;

        const settingsObj = {
          ...localDb.settings,
          ...row,
          inactivity_logout_enabled: logoutEnabled,
          inactivity_timeout_minutes: timeoutMins,
          max_concurrent_sessions: maxSessions,
          force_logout_all_at: forceLogoutAt,
        } as BusinessSettings;

        localDb.settings = settingsObj;
        saveLocalDb(localDb);
        return settingsObj;
      }
    } catch (e: any) {
      console.warn('Could not fetch business_settings from Supabase:', e);
      throw e;
    }
    if (localDb.settings && !UUID_REGEX.test(localDb.settings.id)) {
      localDb.settings.id = '00000000-0000-0000-0000-000000000001';
      saveLocalDb(localDb);
    }
    return localDb.settings || null;
  },

  async saveBusinessSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings> {
    const localDb = getLocalDb();
    let existingObj: BusinessSettings | null = null;
    try {
      existingObj = await this.getBusinessSettings();
    } catch {
      existingObj = localDb.settings || null;
    }

    let targetId = '00000000-0000-0000-0000-000000000001';
    if (existingObj?.id && UUID_REGEX.test(existingObj.id)) {
      targetId = existingObj.id;
    } else if (localDb.settings?.id && UUID_REGEX.test(localDb.settings.id)) {
      targetId = localDb.settings.id;
    }

    const updatedSettings: BusinessSettings = {
      ...localDb.settings,
      ...existingObj,
      ...settings,
      id: targetId,
      updated_at: new Date().toISOString(),
    };

    const baseDbPayload: Record<string, any> = {
      id: targetId,
      shop_name: updatedSettings.shop_name || 'Shankar Jewellery',
      owner_name: updatedSettings.owner_name || 'Sampath Kumar',
      logo_url: updatedSettings.logo_url || null,
      address: updatedSettings.address || '',
      city: updatedSettings.city || '',
      state: updatedSettings.state || 'Tamil Nadu',
      country: updatedSettings.country || 'India',
      pin_code: updatedSettings.pin_code || '',
      phone: updatedSettings.phone || '',
      whatsapp_number: updatedSettings.whatsapp_number || updatedSettings.phone || '',
      email: updatedSettings.email || '',
      gstin: updatedSettings.gstin || null,
      pan: updatedSettings.pan || null,
      bank_name: updatedSettings.bank_name || null,
      bank_account_number: updatedSettings.bank_account_number || null,
      bank_ifsc: updatedSettings.bank_ifsc || null,
      upi_id: updatedSettings.upi_id || null,
      signature_url: updatedSettings.signature_url || null,
      invoice_prefix: updatedSettings.invoice_prefix || 'SJ-INV-',
      next_invoice_number: Number(updatedSettings.next_invoice_number || 1005),
      default_profit_sharing_model: updatedSettings.default_profit_sharing_model || 'model_a_profit_percent',
      default_profit_sharing_percent: Number(updatedSettings.default_profit_sharing_percent || 40),
      updated_at: new Date().toISOString(),
    };

    const fullDbPayload: Record<string, any> = {
      ...baseDbPayload,
      inactivity_logout_enabled: updatedSettings.inactivity_logout_enabled ?? true,
      inactivity_timeout_minutes: Number(updatedSettings.inactivity_timeout_minutes ?? 15),
      max_concurrent_sessions: Number(updatedSettings.max_concurrent_sessions ?? 3),
      force_logout_all_at: updatedSettings.force_logout_all_at || null,
    };

    const sessionSecurityPayload: Record<string, any> = {
      ...baseDbPayload,
      inactivity_logout_enabled: updatedSettings.inactivity_logout_enabled ?? true,
      inactivity_timeout_minutes: Number(updatedSettings.inactivity_timeout_minutes ?? 15),
      max_concurrent_sessions: Number(updatedSettings.max_concurrent_sessions ?? 3),
    };

    const db = checkSupabaseClient();
    
    // First try full payload with all session security columns
    let { data, error } = await db
      .from('business_settings')
      .upsert(fullDbPayload)
      .select()
      .single();

    // If schema lacks force_logout_all_at column, retry with sessionSecurityPayload
    if (error && (error.message?.includes('column') || error.message?.includes('PGRST') || error.message?.includes('cache'))) {
      const retrySessionSec = await db
        .from('business_settings')
        .upsert(sessionSecurityPayload)
        .select()
        .single();
      if (!retrySessionSec.error) {
        data = retrySessionSec.data;
        error = null;
      } else {
        const retryBase = await db
          .from('business_settings')
          .upsert(baseDbPayload)
          .select()
          .single();
        if (!retryBase.error) {
          data = retryBase.data;
          error = null;
        }
      }
    }

    if (error) {
      console.error('Failed to save business_settings in Supabase:', error.message);
      throw formatDbError('Shop Settings Save Failed', error);
    }

    const result: BusinessSettings = {
      ...updatedSettings,
      ...(data || {}),
      inactivity_logout_enabled: data?.inactivity_logout_enabled ?? updatedSettings.inactivity_logout_enabled ?? true,
      inactivity_timeout_minutes: data?.inactivity_timeout_minutes !== null && data?.inactivity_timeout_minutes !== undefined
        ? Number(data.inactivity_timeout_minutes)
        : Number(updatedSettings.inactivity_timeout_minutes ?? 15),
      max_concurrent_sessions: data?.max_concurrent_sessions !== null && data?.max_concurrent_sessions !== undefined
        ? Number(data.max_concurrent_sessions)
        : Number(updatedSettings.max_concurrent_sessions ?? 3),
      force_logout_all_at: data?.force_logout_all_at || updatedSettings.force_logout_all_at || null,
    };

    // Always log session settings audit entry into Supabase database for persistent fallback recovery across devices & sessions
    await this.logAuditAction(
      'update_user_login_settings',
      'business_settings',
      result.id,
      {
        inactivity_logout_enabled: result.inactivity_logout_enabled,
        inactivity_timeout_minutes: result.inactivity_timeout_minutes,
        max_concurrent_sessions: result.max_concurrent_sessions,
        force_logout_all_at: result.force_logout_all_at,
        updated_at: new Date().toISOString(),
      }
    );

    localDb.settings = result;
    saveLocalDb(localDb, 'settings', 'UPDATE', result);
    syncEngine.notifyDataChange('business_settings', 'UPDATE', result);

    return result;
  },

  // --------------------------------------------------------------------------
  // AUDIT LOGS & WHATSAPP LOGS
  // --------------------------------------------------------------------------
  async getAuditLogs(): Promise<AuditLog[]> {
    const db = checkSupabaseClient();
    const { data, error } = await db
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch audit_logs from Supabase:', error.message);
      throw formatDbError('Audit Logs Query Failed', error);
    }

    if (data) {
      return data.map((log: any) => ({
        ...log,
        user_name: log.user_name || log.details?.user_name || 'Admin User',
        details: log.details || {},
      })) as AuditLog[];
    }

    const localDb = getLocalDb();
    return (localDb.auditLogs || []).map((log: any) => ({
      ...log,
      user_name: log.user_name || log.details?.user_name || 'Admin User',
    }));
  },

  async logAuditAction(
    action: string,
    entityType: string,
    entityId?: string,
    details?: Record<string, any>,
    userName?: string
  ): Promise<AuditLog> {
    const validId = ensureValidUUID();
    let currentUser = userName;
    if (!currentUser && typeof localStorage !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('sampath_auth_user') || '{}');
        currentUser = u.full_name || u.email || 'Admin User';
      } catch {
        currentUser = 'Admin User';
      }
    }

    const nameToUse = currentUser || 'System User';
    const mergedDetails = {
      ...(details || {}),
      user_name: nameToUse,
    };

    const payloadWithUserColumn: Record<string, any> = {
      id: validId,
      user_name: nameToUse,
      action,
      entity_type: entityType,
      entity_id: entityId || '',
      details: mergedDetails,
      created_at: new Date().toISOString(),
    };

    const fallbackPayload: Record<string, any> = {
      id: validId,
      action,
      entity_type: entityType,
      entity_id: entityId || '',
      details: mergedDetails,
      created_at: new Date().toISOString(),
    };

    try {
      const db = checkSupabaseClient();
      const { error } = await db.from('audit_logs').insert(payloadWithUserColumn);
      if (error) {
        if (error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('user_name')) {
          const { error: fallbackError } = await db.from('audit_logs').insert(fallbackPayload);
          if (fallbackError) {
            console.error('Audit log fallback insert error:', fallbackError.message);
          }
        } else {
          console.error('Audit log insert error:', error.message);
        }
      }
    } catch (e) {
      console.warn('Audit log insert exception:', e);
    }

    const returnLog: AuditLog = {
      id: validId,
      user_name: nameToUse,
      action,
      entity_type: entityType,
      entity_id: entityId || '',
      details: mergedDetails,
      created_at: payloadWithUserColumn.created_at,
    };

    const localDb = getLocalDb();
    if (!localDb.auditLogs) localDb.auditLogs = [];
    localDb.auditLogs.unshift(returnLog);
    saveLocalDb(localDb);

    syncEngine.notifyDataChange('audit_logs', 'INSERT', returnLog);
    return returnLog;
  },

  async getWhatsAppLogs(): Promise<WhatsAppMessage[]> {
    try {
      const db = checkSupabaseClient();
      const { data, error } = await db
        .from('whatsapp_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data as WhatsAppMessage[];
      }
    } catch (e) {
      console.warn('Could not fetch whatsapp_logs from Supabase:', e);
    }
    const localDb = getLocalDb();
    return (localDb as any).whatsAppLogs || [];
  },

  async logWhatsAppMessage(logData: Partial<WhatsAppMessage>): Promise<WhatsAppMessage> {
    const validId = ensureValidUUID(logData.id);
    const payload: WhatsAppMessage = {
      id: validId,
      message_id: logData.message_id || `WAM-${Date.now()}`,
      customer_name: logData.customer_name || 'Customer',
      phone: logData.phone || '',
      template_type: logData.template_type || 'invoice',
      message_body: logData.message_body || '',
      status: logData.status || 'sent',
      failure_reason: logData.failure_reason,
      sent_at: logData.sent_at || new Date().toISOString(),
      delivered_at: logData.delivered_at,
      read_at: logData.read_at,
      created_at: new Date().toISOString(),
    };

    try {
      const db = checkSupabaseClient();
      await db.from('whatsapp_logs').insert(payload);
    } catch (e) {
      console.warn('WhatsApp log insert warning:', e);
    }

    const localDb = getLocalDb();
    if (!(localDb as any).whatsAppLogs) (localDb as any).whatsAppLogs = [];
    (localDb as any).whatsAppLogs.unshift(payload);
    saveLocalDb(localDb);

    syncEngine.notifyDataChange('whatsapp_logs', 'INSERT', payload);
    return payload;
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
        this.logAuditAction('create_user', 'user_profile', created.id, { full_name: created.full_name, email: created.email, role: created.role }).catch(() => {});
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

    this.logAuditAction('create_user', 'user_profile', created.id, { full_name: created.full_name, email: created.email, role: created.role }).catch(() => {});
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

    this.logAuditAction('create_user', 'user_profile', created.id, { full_name: created.full_name, email: created.email, role: created.role }).catch(() => {});
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

    this.logAuditAction('update_user', 'user_profile', updated.id, { full_name: updated.full_name, email: updated.email, role: updated.role }).catch(() => {});
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

    this.logAuditAction('delete_user', 'user_profile', id).catch(() => {});
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
