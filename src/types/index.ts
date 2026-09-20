// ============================================================================
// SHANKAR JEWELLERY ERP & WHOLESALE CREDIT MANAGEMENT SYSTEM
// Core TypeScript Interfaces & Domain Definitions
// ============================================================================

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'counsellor'
  | 'trainer'
  | 'accountant'
  | 'receptionist'
  | 'manager'
  | 'billing_staff'
  | 'inventory_staff'
  | 'viewer';

export type PermissionCode =
  | 'view_dashboard'
  | 'manage_users'
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.enable_disable'
  | 'users.set_password'
  | 'users.reset_password'
  | 'manage_customers'
  | 'customers.view'
  | 'customers.create'
  | 'customers.edit'
  | 'customers.delete'
  | 'manage_products'
  | 'manage_inventory'
  | 'stock.view'
  | 'stock.create'
  | 'stock.edit'
  | 'stock.delete'
  | 'create_retail_invoice'
  | 'edit_retail_invoice'
  | 'cancel_retail_invoice'
  | 'billing.view'
  | 'billing.create'
  | 'billing.edit'
  | 'billing.delete'
  | 'billing.print'
  | 'create_wholesale_issue'
  | 'manage_wholesale_returns'
  | 'view_wholesale_profit'
  | 'wholesale.view'
  | 'wholesale.create'
  | 'wholesale.edit'
  | 'wholesale.delete'
  | 'manage_payments'
  | 'manage_expenses'
  | 'view_reports'
  | 'reports.view'
  | 'reports.export'
  | 'export_data'
  | 'manage_settings'
  | 'settings.view'
  | 'settings.edit'
  | 'branches.view'
  | 'branches.manage';

export interface UserProfile {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  branch?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at?: string;
}

export type MetalType = 'gold' | 'silver' | 'platinum' | 'other';
export type MetalPurity = '24k' | '22k' | '18k' | '14k' | '925_silver' | '999_silver' | 'other';

export type StockStatus =
  | 'in_stock'
  | 'reserved'
  | 'wholesale_issued'
  | 'sold'
  | 'returned'
  | 'under_manufacturing'
  | 'damaged'
  | 'lost'
  | 'archived';

export type MovementType =
  | 'opening_stock'
  | 'manufacturing_entry'
  | 'purchase'
  | 'retail_sale'
  | 'wholesale_issue'
  | 'wholesale_return'
  | 'stock_adjustment'
  | 'damage'
  | 'loss'
  | 'transfer'
  | 'cancellation';

export type WholesaleProfitModel =
  | 'model_a_profit_percent'
  | 'model_b_commission'
  | 'model_c_fixed_margin'
  | 'model_d_custom_formula';

export type InvoiceStatus = 'draft' | 'finalized' | 'cancelled' | 'partially_refunded' | 'refunded';
export type SettlementStatus = 'draft' | 'pending_verification' | 'approved' | 'partially_paid' | 'paid' | 'cancelled';
export type ManufacturingStatus = 'draft' | 'material_issued' | 'in_progress' | 'quality_check' | 'completed' | 'delivered' | 'cancelled';

export interface BusinessSettings {
  id: string;
  shop_name: string;
  owner_name: string;
  logo_url?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  gstin?: string;
  pan?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  upi_id?: string;
  signature_url?: string;
  invoice_prefix: string;
  next_invoice_number: number;
  default_profit_sharing_model: WholesaleProfitModel;
  default_profit_sharing_percent: number;
  inactivity_logout_enabled?: boolean;
  inactivity_timeout_minutes?: number;
  max_concurrent_sessions?: number;
  force_logout_all_at?: string;
  updated_at?: string;
}

export interface UserPasskey {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports?: string[];
  device_name: string;
  created_at: string;
  last_used_at: string;
}

export interface MetalRate {
  id: string;
  rate_date: string;
  gold_24k_per_gram: number;
  gold_22k_per_gram: number;
  gold_18k_per_gram: number;
  gold_14k_per_gram?: number;
  silver_per_gram: number;
  silver_per_kg: number;
  source?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export type CustomerType = 'retail' | 'wholesale' | 'supplier' | 'other';

export interface Customer {
  id: string;
  customer_code: string;
  full_name: string;
  shop_name?: string;
  customer_type: CustomerType;
  phone: string;
  whatsapp_number?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  gstin?: string;
  pan?: string;
  photo_url?: string;
  id_doc_url?: string;
  agreed_customer_touch?: number;
  credit_limit: number;
  agreed_profit_percent: number;
  profit_sharing_model: WholesaleProfitModel;
  default_actual_touch?: number;
  default_profit_touch?: number;
  default_billing_touch?: number;
  payment_terms?: string;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  supplier_name: string;
  contact_person?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  gstin?: string;
  supplier_type?: string;
  primary_metal: MetalType;
  notes?: string;
  created_at?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  qr_code?: string;
  name: string;
  category_id?: string;
  category_name?: string;
  metal_type: MetalType;
  purity: MetalPurity;
  actual_touch?: number;
  gross_weight_g: number;
  deduction_weight_g?: number;
  stone_weight_g: number;
  other_weight_g: number;
  net_weight_g: number;
  unit: string;
  quantity: number;
  making_charge_type: 'per_gram' | 'per_piece' | 'flat';
  making_charge_rate: number;
  labour_charge: number;
  wastage_percent: number;
  wastage_weight_g: number;
  purchase_cost: number;
  manufacturing_cost: number;
  retail_price: number;
  wholesale_valuation: number;
  minimum_stock: number;
  description?: string;
  primary_photo_url?: string;
  supplier_id?: string;
  status: StockStatus;
  created_by?: string;
  created_at?: string;
}

export interface InventoryMovement {
  id: string;
  product_id?: string;
  product_name?: string;
  sku?: string;
  metal_type?: MetalType;
  purity?: MetalPurity;
  movement_type: MovementType;
  quantity_change?: number;
  weight_change_g?: number;
  gross_weight_g?: number;
  net_weight_g?: number;
  quantity?: number;
  reference_id?: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface ManufacturingJob {
  id: string;
  job_card_number: string;
  customer_id?: string;
  customer_name?: string;
  product_category: string;
  metal_type: MetalType;
  purity: MetalPurity;
  raw_metal_weight_g: number;
  expected_finished_weight_g: number;
  actual_finished_weight_g?: number;
  stone_weight_g: number;
  wastage_allowance_g: number;
  actual_wastage_g?: number;
  labour_charge: number;
  making_charge: number;
  assigned_goldsmith: string;
  start_date: string;
  expected_completion_date?: string;
  actual_completion_date?: string;
  status: ManufacturingStatus;
  before_photo_url?: string;
  after_photo_url?: string;
  linked_product_id?: string;
  notes?: string;
  created_at?: string;
}

export interface RetailInvoiceItem {
  id: string;
  invoice_id?: string;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  metal_type: MetalType;
  purity: MetalPurity;
  gross_weight_g: number;
  stone_weight_g: number;
  net_weight_g: number;
  quantity: number;
  metal_rate_snapshot: number;
  metal_value: number;
  making_charge: number;
  labour_charge: number;
  wastage_percent: number;
  wastage_weight_g: number;
  wastage_value: number;
  discount: number;
  line_total: number;
}

export interface RetailInvoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  invoice_date: string;
  subtotal_metal_value: number;
  total_making_charges: number;
  total_labour_charges: number;
  total_wastage_value: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  round_off: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  status: InvoiceStatus;
  items: RetailInvoiceItem[];
  notes?: string;
  created_at?: string;
}

export interface RetailPayment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_mode: 'cash' | 'upi' | 'bank_transfer' | 'card' | 'credit' | 'split';
  reference_number?: string;
  notes?: string;
  created_at?: string;
}

export interface RetailReturn {
  id: string;
  return_number: string;
  invoice_id: string;
  invoice_number?: string;
  customer_id?: string;
  customer_name?: string;
  return_date: string;
  refund_amount: number;
  reason?: string;
  status: string;
  created_at?: string;
}

// Wholesale Consignment Specifics
export interface WholesaleIssueItem {
  id: string;
  issue_id?: string;
  product_id: string;
  product_name?: string;
  product_photo?: string;
  sku?: string;
  category?: string;
  metal_type?: MetalType;
  purity?: MetalPurity;
  quantity_issued: number;
  gross_weight_g: number;
  deduction_weight_g: number;
  stone_weight_g: number;
  net_weight_g: number;
  actual_touch: number;
  profit_touch: number;
  billing_touch: number;
  fine_gold_g: number;
  unit_cost_valuation: number;
  total_issue_value: number;
  quantity_sold: number;
  quantity_returned: number;
  quantity_remaining: number;
}

export interface WholesaleIssue {
  id: string;
  issue_number: string;
  customer_id: string;
  customer_name?: string;
  customer_shop?: string;
  issue_date: string;
  expected_return_date?: string;
  total_items_issued: number;
  total_gross_weight_g: number;
  total_deduction_weight_g: number;
  total_net_weight_g: number;
  total_fine_gold_g: number;
  gold_rate_per_gram: number;
  total_cash_value: number;
  total_valuation_amount: number;
  agreed_profit_model: WholesaleProfitModel;
  agreed_profit_percent: number;
  cash_paid: number;
  gold_916_weight_paid_g: number;
  gold_916_rate: number;
  gold_916_value_paid: number;
  remaining_balance: number;
  status: 'active' | 'partially_settled' | 'settled' | 'cancelled';
  items: WholesaleIssueItem[];
  notes?: string;
  created_at?: string;
}

export interface WholesaleSale {
  id: string;
  sale_number: string;
  issue_id?: string;
  customer_id: string;
  customer_name?: string;
  sale_date: string;
  buyer_shop_name?: string;
  buyer_location?: string;
  total_quantity_sold: number;
  total_weight_sold_g: number;
  total_sale_value: number;
  total_cost_valuation: number;
  gross_profit: number;
  customer_profit_share: number;
  shop_profit_share: number;
  notes?: string;
  created_at?: string;
}

export interface WholesaleReturn {
  id: string;
  return_number: string;
  issue_id?: string;
  customer_id: string;
  customer_name?: string;
  return_date: string;
  total_quantity_returned: number;
  total_weight_returned_g: number;
  condition_notes?: string;
  verified_by?: string;
  created_at?: string;
}

export interface WholesaleSettlement {
  id: string;
  settlement_number: string;
  customer_id: string;
  customer_name?: string;
  customer_shop?: string;
  settlement_date: string;
  period_start?: string;
  period_end?: string;
  total_gross_sales: number;
  total_cost_valuation: number;
  gross_profit: number;
  customer_profit_share: number;
  shop_profit_share: number;
  adjustments_amount: number;
  net_payable_to_customer: number;
  net_payable_to_shop: number;
  amount_paid: number;
  balance_due: number;
  status: SettlementStatus;
  notes?: string;
  created_at?: string;
}

export interface WholesalePayment {
  id: string;
  customer_id: string;
  settlement_id?: string;
  issue_id?: string;
  payment_date: string;
  payment_method?: 'cash' | 'gold_916' | 'split';
  amount: number; // total monetary value
  cash_amount?: number;
  gold_weight_g?: number;
  gold_purity?: string;
  gold_rate?: number;
  gold_value?: number;
  gold_916_weight_g?: number;
  gold_916_rate?: number;
  gold_916_value?: number;
  payment_mode: 'cash' | 'upi' | 'bank_transfer' | 'card' | 'gold_916' | 'split' | 'adjustment';
  reference_number?: string;
  notes?: string;
  created_at?: string;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  purchase_date: string;
  supplier_id: string;
  supplier_name: string;
  supplier_phone?: string;
  supplier_invoice_number: string;
  metal_type: MetalType;
  purity: MetalPurity;
  gross_weight_g: number;
  deduction_weight_g: number;
  net_weight_g: number;
  purchase_rate_per_gram: number;
  total_cost: number;
  amount_paid: number;
  balance_payable: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_method?: 'cash' | 'upi' | 'bank_transfer' | 'card' | 'gold_916' | 'split';
  notes?: string;
  stock_added?: boolean;
  created_at?: string;
}

export interface PurchasePayment {
  id: string;
  purchase_id: string;
  payment_date: string;
  amount: number;
  payment_mode: 'cash' | 'upi' | 'bank_transfer' | 'card' | 'gold_916' | 'split';
  reference_number?: string;
  notes?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  category: string;
  amount: number;
  expense_date: string;
  payment_mode: string;
  vendor_name?: string;
  notes?: string;
  attachment_url?: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  is_read: boolean;
  created_at: string;
}

export interface WhatsAppMessage {
  id: string;
  message_id?: string;
  customer_name: string;
  phone: string;
  template_type: 'invoice' | 'payment_reminder' | 'wholesale_return' | 'settlement' | 'custom';
  message_body: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  failure_reason?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
}

