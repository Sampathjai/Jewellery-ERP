import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';
import { UserRole } from '@/types';
import { getLocalDb } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  Bell,
  Sun,
  Moon,
  TrendingUp,
  UserCheck,
  LogOut,
  Globe,
  Menu,
} from 'lucide-react';

import { SyncStatusBadge } from '@/components/common/SyncStatusBadge';

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleNotifications: () => void;
  unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onToggleNotifications,
  unreadCount,
}) => {
  const { user, role, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const db = getLocalDb();
  const todayRate = db.metalRates?.[0] || { gold_24k_per_gram: 7450, gold_22k_per_gram: 6830, silver_per_gram: 89.5 };

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  };

  const roleLabels: Record<UserRole, string> = {
    admin: 'Owner / Admin (Full Access)',
    manager: 'Manager',
    billing_staff: 'Billing Staff (POS)',
    inventory_staff: 'Inventory Staff',
    accountant: 'Accountant (P&L)',
    viewer: 'Viewer (Read-only)',
  };

  const getUserDisplayName = (): string => {
    if (!user || !user.full_name) return 'Sampath Kumar';
    let clean = user.full_name.replace(/\s*\([^)]*\)/g, '').trim();
    const upper = clean.toUpperCase();
    if (['OWNER', 'ADMIN', 'MANAGER', 'BILLING', 'BILLING STAFF', 'INVENTORY', 'INVENTORY STAFF', 'ACCOUNTANT', 'VIEWER', 'USER'].includes(upper)) {
      return 'Sampath Kumar';
    }
    return clean || 'Sampath Kumar';
  };

  const displayName = getUserDisplayName();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-charcoal-800 dark:bg-charcoal-900/95 sm:px-6">
      {/* Mobile-only toggle sidebar & branding */}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          onClick={onToggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500 text-charcoal-950 font-serif font-bold text-sm shadow-gold">
            SJ
          </div>
          <span className="font-serif text-sm font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
            {language === 'ta' ? 'சங்கர் ஜுவல்லரி' : 'Shankar Jewellery'}
          </span>
        </div>
      </div>

      {/* Center: Today's Metal Rates Ticker */}
      <div className="flex items-center gap-3 rounded-full border border-amber-200 bg-amber-50/70 px-3.5 py-1 text-xs text-amber-900 dark:border-gold-800/40 dark:bg-gold-950/30 dark:text-gold-300">
        <TrendingUp className="h-3.5 w-3.5 text-gold-600" />
        <span className="font-bold">{t('today_rates')}:</span>
        <span>{t('gold_24k')}: <strong className="font-bold">{formatCurrency(todayRate.gold_24k_per_gram || 7450)}/g</strong></span>
        <span className="text-amber-300 dark:text-gold-700">|</span>
        <span>{t('silver_925')}: <strong className="font-bold">{formatCurrency(todayRate.silver_per_gram || 89.5)}/g</strong></span>
      </div>

      {/* Right / Center-Right Section */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-Time Sync Status Badge */}
        <SyncStatusBadge />
        {/* Dynamic Welcome Back Banner */}
        <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-charcoal-900 dark:text-slate-100">
          <span>Welcome back, <strong className="font-bold text-amber-900 dark:text-gold-300">{displayName}</strong> 👋</span>
        </div>

        {/* ENG / தமிழ் Language Toggle Button */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 rounded-lg border border-gold-400 bg-gold-50 px-2.5 py-1.5 text-xs font-bold text-charcoal-950 shadow-sm hover:bg-gold-100 dark:border-gold-700 dark:bg-gold-950/60 dark:text-gold-200"
          title="Switch Language (English / தமிழ்)"
        >
          <Globe className="h-4 w-4 text-gold-600" />
          <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300 dark:hover:bg-charcoal-800"
          title="Toggle Light/Dark Theme"
        >
          {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </button>

        {/* Notifications Toggle */}
        <button
          onClick={onToggleNotifications}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300 dark:hover:bg-charcoal-800"
          title="In-app Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Menu & Role Badge */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 rounded-lg border border-gold-400/40 bg-gold-50/50 px-2.5 py-1.5 text-xs font-medium text-charcoal-900 hover:border-gold-500 dark:border-gold-800/40 dark:bg-gold-950/40 dark:text-gold-200"
          >
            <UserCheck className="h-4 w-4 text-gold-600" />
            <span className="hidden sm:inline-block max-w-[120px] truncate">{displayName}</span>
            <span className="rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-charcoal-950 uppercase">
              {role}
            </span>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-charcoal-800 dark:bg-charcoal-900 z-50">
              <div className="border-b border-slate-100 pb-2 mb-2 dark:border-charcoal-800">
                <p className="text-xs font-bold text-charcoal-900 dark:text-slate-100">{displayName}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{user?.email}</p>
                <div className="mt-1.5 inline-block rounded bg-gold-100 dark:bg-gold-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-gold-300">
                  {roleLabels[role] || role}
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => logout()}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t('sign_out')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
