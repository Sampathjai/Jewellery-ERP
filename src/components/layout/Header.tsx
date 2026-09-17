import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';
import { UserRole, MetalRate } from '@/types';
import { getLocalDb } from '@/lib/supabase';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
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
import { BrandLogo } from '@/components/common/BrandLogo';

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

  const [metalRate, setMetalRate] = useState<MetalRate | null>(() => getLocalDb().metalRates?.[0] || null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  const loadCurrentMetalRate = useCallback(async () => {
    setIsLoadingRate(true);
    try {
      const rates = await dataService.getMetalRates();
      if (rates && rates.length > 0) {
        setMetalRate(rates[0]);
      }
    } catch (e) {
      console.error('Error loading current metal rate in Header:', e);
    } finally {
      setIsLoadingRate(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentMetalRate();
    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'metal_rates' || tableName === 'general') {
        loadCurrentMetalRate();
      }
    });
    return () => unsubscribe();
  }, [loadCurrentMetalRate]);

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
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur dark:border-charcoal-800 dark:bg-charcoal-900/95 sm:px-6 z-30">
      {/* Mobile-only toggle sidebar & branding */}
      <div className="flex items-center gap-2 lg:hidden shrink-0">
        <button
          onClick={onToggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
        >
          <Menu className="h-5 w-5" />
        </button>
        <BrandLogo variant="compact" size="sm" />
      </div>

      {/* Center/Left: Today's Metal Rates Ticker (Single Row, Shrinkable) */}
      <div className="flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1.5 text-xs text-amber-900 dark:border-gold-800/40 dark:bg-gold-950/40 dark:text-gold-300 shrink min-w-0 overflow-x-auto whitespace-nowrap shadow-sm scrollbar-none">
        <TrendingUp className="h-3.5 w-3.5 shrink-0 text-gold-600" />
        <span className="font-bold shrink-0">{t('today_rates')}:</span>
        {metalRate ? (
          <>
            <span className="whitespace-nowrap">
              {t('gold_24k')}: <strong className="font-bold text-amber-950 dark:text-gold-300">{formatCurrency(metalRate.gold_24k_per_gram)}/g</strong>
            </span>
            <span className="text-amber-300 dark:text-gold-700">|</span>
            <span className="whitespace-nowrap">
              22K (916): <strong className="font-bold text-amber-950 dark:text-gold-300">{formatCurrency(metalRate.gold_22k_per_gram)}/g</strong>
            </span>
            <span className="text-amber-300 dark:text-gold-700">|</span>
            <span className="whitespace-nowrap">
              {t('silver_925')}: <strong className="font-bold text-amber-950 dark:text-gold-300">{formatCurrency(metalRate.silver_per_gram)}/g</strong>
            </span>
            <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-900 dark:text-gold-300 border border-gold-300/40 ml-0.5 shrink-0">
              {metalRate.source === 'manual' ? 'Shop Rate' : 'Live Market'}
            </span>
          </>
        ) : (
          <span className="text-slate-400 italic">Gold Rate: Loading...</span>
        )}
      </div>

      {/* Right Controls Section: Single Row, Vertically Centered */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Real-Time Sync Status Badge */}
        <SyncStatusBadge />

        {/* Dynamic Welcome Back Banner */}
        <div className="hidden lg:flex items-center gap-1 text-xs font-semibold text-charcoal-900 dark:text-slate-100 whitespace-nowrap">
          <span>Welcome back, <strong className="font-bold text-amber-900 dark:text-gold-300">{displayName}</strong> 👋</span>
        </div>

        {/* ENG / தமிழ் Language Toggle Button */}
        <button
          onClick={toggleLanguage}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-gold-400 bg-gold-50 px-2.5 text-xs font-bold text-charcoal-950 shadow-sm hover:bg-gold-100 dark:border-gold-700 dark:bg-gold-950/60 dark:text-gold-200 transition-colors"
          title="Switch Language (English / தமிழ்)"
        >
          <Globe className="h-3.5 w-3.5 text-gold-600" />
          <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300 dark:hover:bg-charcoal-800 transition-colors"
          title="Toggle Light/Dark Theme"
        >
          {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </button>

        {/* Notifications Toggle */}
        <button
          onClick={onToggleNotifications}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300 dark:hover:bg-charcoal-800 transition-colors"
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
            className="flex h-9 items-center gap-2 rounded-xl border border-gold-400/40 bg-gold-50/50 px-3 text-xs font-medium text-charcoal-900 hover:border-gold-500 dark:border-gold-800/40 dark:bg-gold-950/40 dark:text-gold-200 shadow-sm transition-colors"
          >
            <UserCheck className="h-4 w-4 text-gold-600 shrink-0" />
            <span className="hidden sm:inline-block max-w-[110px] truncate font-bold">{displayName}</span>
            <span className="rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-charcoal-950 uppercase shrink-0">
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
