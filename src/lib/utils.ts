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
  admin: [
    'view_dashboard',
    'manage_users',
    'manage_customers',
    'manage_products',
    'manage_inventory',
    'create_retail_invoice',
    'edit_retail_invoice',
    'cancel_retail_invoice',
    'create_wholesale_issue',
    'manage_wholesale_returns',
    'view_wholesale_profit',
    'manage_payments',
    'manage_expenses',
    'view_reports',
    'export_data',
    'manage_settings',
  ],
  manager: [
    'view_dashboard',
    'manage_customers',
    'manage_products',
    'manage_inventory',
    'create_retail_invoice',
    'edit_retail_invoice',
    'create_wholesale_issue',
    'manage_wholesale_returns',
    'view_wholesale_profit',
    'manage_payments',
    'manage_expenses',
    'view_reports',
    'export_data',
  ],
  billing_staff: [
    'view_dashboard',
    'manage_customers',
    'create_retail_invoice',
    'manage_payments',
  ],
  inventory_staff: [
    'view_dashboard',
    'manage_products',
    'manage_inventory',
    'create_wholesale_issue',
    'manage_wholesale_returns',
  ],
  accountant: [
    'view_dashboard',
    'manage_payments',
    'manage_expenses',
    'view_wholesale_profit',
    'view_reports',
    'export_data',
  ],
  viewer: ['view_dashboard'],
};

export function hasPermission(role: UserRole, permission: PermissionCode): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed ? allowed.includes(permission) : false;
}

