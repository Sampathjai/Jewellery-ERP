import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserRole, PermissionCode } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
  const absVal = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absVal);
  return amount < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

export function formatWeight(grams: number | null | undefined, unit: string = 'g'): string {
  if (grams === null || grams === undefined || isNaN(grams)) return `0.000 ${unit}`;
  return `${Number(grams).toFixed(3)} ${unit}`;
}

export function formatDate(dateString?: string | Date): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString?: string | Date): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Default role permissions definition
export const ROLE_PERMISSIONS: Record<UserRole, PermissionCode[]> = {
  super_admin: [
    'view_dashboard',
    'manage_users',
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'users.enable_disable',
    'users.set_password',
    'users.reset_password',
    'manage_customers',
    'customers.view',
    'customers.create',
    'customers.edit',
    'customers.delete',
    'manage_products',
    'manage_inventory',
    'stock.view',
    'stock.create',
    'stock.edit',
    'stock.delete',
    'create_retail_invoice',
    'edit_retail_invoice',
    'cancel_retail_invoice',
    'billing.view',
    'billing.create',
    'billing.edit',
    'billing.delete',
    'billing.print',
    'create_wholesale_issue',
    'manage_wholesale_returns',
    'view_wholesale_profit',
    'wholesale.view',
    'wholesale.create',
    'wholesale.edit',
    'wholesale.delete',
    'manage_payments',
    'manage_expenses',
    'view_reports',
    'reports.view',
    'reports.export',
    'export_data',
    'manage_settings',
    'settings.view',
    'settings.edit',
    'branches.view',
    'branches.manage',
  ],
  admin: [
    'view_dashboard',
    'manage_users',
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'users.enable_disable',
    'users.set_password',
    'users.reset_password',
    'manage_customers',
    'customers.view',
    'customers.create',
    'customers.edit',
    'manage_products',
    'manage_inventory',
    'stock.view',
    'stock.create',
    'stock.edit',
    'create_retail_invoice',
    'edit_retail_invoice',
    'cancel_retail_invoice',
    'billing.view',
    'billing.create',
    'billing.edit',
    'billing.print',
    'create_wholesale_issue',
    'manage_wholesale_returns',
    'view_wholesale_profit',
    'wholesale.view',
    'wholesale.create',
    'wholesale.edit',
    'manage_payments',
    'manage_expenses',
    'view_reports',
    'reports.view',
    'reports.export',
    'export_data',
    'manage_settings',
    'settings.view',
    'branches.view',
  ],
  manager: [
    'view_dashboard',
    'manage_customers',
    'customers.view',
    'customers.create',
    'customers.edit',
    'manage_products',
    'manage_inventory',
    'stock.view',
    'stock.create',
    'create_retail_invoice',
    'edit_retail_invoice',
    'billing.view',
    'billing.create',
    'billing.print',
    'create_wholesale_issue',
    'manage_wholesale_returns',
    'view_wholesale_profit',
    'wholesale.view',
    'manage_payments',
    'manage_expenses',
    'view_reports',
    'reports.view',
    'export_data',
  ],
  counsellor: [
    'view_dashboard',
    'manage_customers',
    'customers.view',
    'customers.create',
    'customers.edit',
    'stock.view',
    'billing.view',
  ],
  trainer: [
    'view_dashboard',
    'stock.view',
    'manage_inventory',
    'manage_products',
  ],
  accountant: [
    'view_dashboard',
    'manage_payments',
    'manage_expenses',
    'view_wholesale_profit',
    'view_reports',
    'reports.view',
    'reports.export',
    'export_data',
    'billing.view',
    'wholesale.view',
  ],
  receptionist: [
    'view_dashboard',
    'manage_customers',
    'customers.view',
    'customers.create',
    'billing.view',
    'billing.create',
    'billing.print',
  ],
  billing_staff: [
    'view_dashboard',
    'manage_customers',
    'customers.view',
    'customers.create',
    'create_retail_invoice',
    'billing.view',
    'billing.create',
    'billing.print',
    'manage_payments',
  ],
  inventory_staff: [
    'view_dashboard',
    'manage_products',
    'manage_inventory',
    'stock.view',
    'stock.create',
    'stock.edit',
    'create_wholesale_issue',
    'manage_wholesale_returns',
    'wholesale.view',
  ],
  viewer: ['view_dashboard', 'stock.view', 'billing.view', 'customers.view', 'reports.view'],
};

export function hasPermission(role: UserRole, permission: PermissionCode): boolean {
  if (role === 'super_admin') return true;
  const allowed = ROLE_PERMISSIONS[role];
  return allowed ? allowed.includes(permission) : false;
}

