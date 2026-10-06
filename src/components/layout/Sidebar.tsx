import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/lib/auth';
import { useLanguage, Translations } from '@/lib/i18n';
import { PermissionCode } from '@/types';
import { drawerTransition, backdropVariant } from '@/animations/variants';
import { navItemPreset } from '@/animations/presets';
import { useMotionSafe } from '@/animations/motionConfig';
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
  Sparkles,
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
  LogOut,
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
  const { user, role, logout, can } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const { prefersReduced } = useMotionSafe();

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
        { titleKey: 'estimations', path: '/estimations', icon: Sparkles, permission: 'view_dashboard', badge: 'Quotes' },
        { titleKey: 'custom_orders', path: '/custom-orders', icon: Hammer, permission: 'view_dashboard' },
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

  // Find single active item path to prevent multiple simultaneous active highlights
  const activeItemPath = React.useMemo(() => {
    let bestMatch = '';
    for (const group of navGroups) {
      for (const item of group.items) {
        if (location.pathname === item.path) {
          return item.path;
        }
        if (
          item.path !== '/dashboard' &&
          location.pathname.startsWith(item.path) &&
          item.path.length > bestMatch.length
        ) {
          bestMatch = item.path;
        }
      }
    }
    return bestMatch || (location.pathname === '/' ? '/dashboard' : '');
  }, [location.pathname, navGroups]);

  const renderSidebarContent = (isMobile: boolean = false) => (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-colors dark:border-charcoal-800 dark:bg-charcoal-900">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-charcoal-800">
        <BrandLogo variant="compact" size="md" />
        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-charcoal-800 lg:hidden transition-colors"
          >
            ✕
          </button>
        )}
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
                {filteredItems.map((item) => {
                  const isActive = activeItemPath === item.path;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`group relative flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        isActive
                          ? 'text-charcoal-950 font-bold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-charcoal-800 dark:hover:text-slate-100'
                      }`}
                    >
                      {/* Smooth animated active indicator sliding across menu items */}
                      {isActive && !prefersReduced && (
                        <motion.div
                          layoutId={isMobile ? 'mobile-sidebar-active-indicator' : 'sidebar-active-indicator'}
                          className="absolute inset-0 rounded-lg bg-gold-500 shadow-gold"
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        />
                      )}
                      {isActive && prefersReduced && (
                        <div className="absolute inset-0 rounded-lg bg-gold-500 shadow-gold" />
                      )}

                      <motion.div
                        className="relative z-10 flex items-center gap-2.5"
                        {...(prefersReduced ? {} : navItemPreset)}
                      >
                        <item.icon className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
                        <span>{t(item.titleKey)}</span>
                      </motion.div>

                      {item.badge && (
                        <span
                          className={`relative z-10 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            isActive
                              ? 'bg-charcoal-950/20 text-charcoal-950'
                              : 'bg-gold-600/20 text-amber-800 dark:text-gold-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Footer Area: User Profile & Sign Out */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50/60 p-3 dark:border-charcoal-800 dark:bg-charcoal-900/80">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-charcoal-900 dark:text-slate-100 truncate">
              {user?.full_name || 'Sampath Kumar'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-900 dark:text-gold-300 uppercase border border-gold-400/30">
                {role}
              </span>
              <span className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@erp.com'}</span>
            </div>
          </div>
          <motion.button
            onClick={() => {
              onClose();
              logout();
            }}
            whileHover={prefersReduced ? {} : { scale: 1.08 }}
            whileTap={prefersReduced ? {} : { scale: 0.94 }}
            aria-label="Sign out of ERP"
            title="Sign Out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex h-full shrink-0">
        {renderSidebarContent(false)}
      </div>

      {/* Mobile Drawer with Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="mobile-sidebar-backdrop"
              variants={prefersReduced ? undefined : backdropVariant}
              initial={prefersReduced ? undefined : 'hidden'}
              animate={prefersReduced ? undefined : 'visible'}
              exit={prefersReduced ? undefined : 'exit'}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-charcoal-950/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              key="mobile-sidebar-drawer"
              variants={prefersReduced ? undefined : drawerTransition}
              initial={prefersReduced ? undefined : 'hidden'}
              animate={prefersReduced ? undefined : 'visible'}
              exit={prefersReduced ? undefined : 'exit'}
              className="fixed inset-y-0 left-0 z-40 h-full lg:hidden shadow-2xl"
            >
              {renderSidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
