import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useLanguage, Translations } from '@/lib/i18n';
import { PermissionCode } from '@/types';
import {
  LayoutDashboard,
  Users,
  Package,
  Boxes,
  Hammer,
  ShoppingCart,
  FileText,
  HandCoins,
  Receipt,
  Truck,
  Building2,
  DollarSign,
  BarChart3,
  MessageSquare,
  Bell,
  UserCheck,
  ShieldCheck,
  Settings,
  History,
  Coins,
  BadgePercent,
  CircleDot,
  RotateCcw,
  Lock,
  PackageCheck,
  Database,
} from 'lucide-react';

import { BrandLogo } from '@/components/common/BrandLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  titleKey: keyof Translations;
  path: string;
  icon: React.ElementType;
  permission?: PermissionCode;
  badge?: string;
}

interface NavGroup {
  groupNameKey: keyof Translations;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { can } = useAuth();
  const { t } = useLanguage();

  const navGroups: NavGroup[] = [
    {
      groupNameKey: 'main',
      items: [
        { titleKey: 'dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
      ],
    },
    {
      groupNameKey: 'retail_pos_catalog',
      items: [
        { titleKey: 'pos_billing', path: '/pos', icon: ShoppingCart, permission: 'create_retail_invoice', badge: 'POS' },
        { titleKey: 'retail_invoices', path: '/invoices', icon: FileText, permission: 'view_dashboard' },
        { titleKey: 'product_catalog', path: '/products', icon: Package, permission: 'manage_products' },
        { titleKey: 'stock_inventory', path: '/inventory', icon: Boxes, permission: 'manage_inventory' },
        { titleKey: 'metal_rates', path: '/metal-rates', icon: Coins, permission: 'view_dashboard' },
        { titleKey: 'goldsmith_jobs', path: '/manufacturing', icon: Hammer, permission: 'manage_inventory' },
      ],
    },
    {
      groupNameKey: 'wholesale_consignment',
      items: [
        { titleKey: 'wholesale_partners', path: '/wholesale-customers', icon: Users, permission: 'create_wholesale_issue' },
        { titleKey: 'wholesale_issues', path: '/wholesale-issues', icon: HandCoins, permission: 'create_wholesale_issue', badge: 'Credit' },
        { titleKey: 'wholesale_returns', path: '/wholesale-returns', icon: RotateCcw, permission: 'manage_wholesale_returns' },
        { titleKey: 'wholesale_sold', path: '/wholesale-sold', icon: CircleDot, permission: 'create_wholesale_issue' },
        { titleKey: 'wholesale_holdings', path: '/wholesale-holdings', icon: PackageCheck, permission: 'create_wholesale_issue', badge: 'Live' },
        { titleKey: 'wholesale_ledger', path: '/wholesale-ledger', icon: Receipt, permission: 'create_wholesale_issue' },
      ],
    },
    {
      groupNameKey: 'crm_financials',
      items: [
        { titleKey: 'customers_crm', path: '/customers', icon: Users, permission: 'manage_customers' },
        { titleKey: 'payment_receipts', path: '/payments', icon: DollarSign, permission: 'manage_payments' },
        { titleKey: 'suppliers', path: '/suppliers', icon: Building2, permission: 'view_reports' },
        { titleKey: 'purchases', path: '/purchases', icon: Truck, permission: 'manage_inventory' },
        { titleKey: 'expenses_costs', path: '/expenses', icon: Receipt, permission: 'manage_expenses' },
        { titleKey: 'reports_analytics', path: '/reports', icon: BarChart3, permission: 'view_reports' },
      ],
    },
    {
      groupNameKey: 'administration',
      items: [
        { titleKey: 'whatsapp_log', path: '/whatsapp-messages', icon: MessageSquare, permission: 'manage_settings' },
        { titleKey: 'notifications', path: '/notifications', icon: Bell, permission: 'view_dashboard' },
        { titleKey: 'user_management', path: '/users', icon: UserCheck, permission: 'manage_users' },
        { titleKey: 'user_login_settings', path: '/admin/user-login-settings', icon: Lock, permission: 'manage_users' },
        { titleKey: 'roles_permissions', path: '/roles-permissions', icon: ShieldCheck, permission: 'manage_users' },
        { titleKey: 'shop_settings', path: '/settings', icon: Settings, permission: 'manage_settings' },
        { titleKey: 'storage_database', path: '/admin/storage-database', icon: Database, permission: 'manage_settings' },
        { titleKey: 'audit_logs', path: '/audit-logs', icon: History, permission: 'manage_settings' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-charcoal-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out dark:border-charcoal-800 dark:bg-charcoal-900 lg:static lg:z-auto lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-charcoal-800">
          <BrandLogo variant="compact" size="md" />
        </div>

        {/* Scrollable Nav Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group) => {
            const filteredItems = group.items.filter((item) => !item.permission || can(item.permission));
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.groupNameKey}>
                <h3 className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500 mb-2">
                  {t(group.groupNameKey)}
                </h3>
                <nav className="space-y-1">
                  {filteredItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-gold-500 text-charcoal-950 font-bold shadow-gold'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-charcoal-800 dark:hover:text-slate-100'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{t(item.titleKey)}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded bg-gold-600/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:text-gold-300 uppercase">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};
