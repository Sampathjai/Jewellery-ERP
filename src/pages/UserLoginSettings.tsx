import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { useAuth } from '@/lib/auth';
import { ShieldCheck, Clock, Lock, Power, RefreshCw, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { GlobalLoader } from '@/components/common/GlobalLoader';

export const UserLoginSettings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { role, can, user: currentUser } = useAuth();

  const isAdmin = Boolean(currentUser) && (
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'manager' ||
    can('manage_users') ||
    can('manage_settings')
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [logoutEnabled, setLogoutEnabled] = useState<boolean>(true);
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(15);
  const [maxSessions, setMaxSessions] = useState<number>(3);
  const [forceLogoutAlert, setForceLogoutAlert] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const settings = await dataService.getBusinessSettings();
      if (settings) {
        setLogoutEnabled(settings.inactivity_logout_enabled ?? true);
        setTimeoutMinutes(settings.inactivity_timeout_minutes ?? 15);
        setMaxSessions(settings.max_concurrent_sessions ?? 3);
      }
    } catch (err: any) {
      console.error('Failed to load user login & session settings from Supabase:', err);
      setLoadError(err?.message || 'Unable to load login & session settings from database. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin, loadSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSavedSuccess(false);

    try {
      const saved = await dataService.saveBusinessSettings({
        inactivity_logout_enabled: logoutEnabled,
        inactivity_timeout_minutes: timeoutMinutes,
        max_concurrent_sessions: maxSessions,
      });

      await dataService.logAuditAction(
        'update_user_login_settings',
        'business_settings',
        saved.id,
        {
          inactivity_logout_enabled: logoutEnabled,
          inactivity_timeout_minutes: timeoutMinutes,
          max_concurrent_sessions: maxSessions,
        }
      );

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);
    } catch (err: any) {
      console.error('Failed to save user login settings:', err);
      setSaveError(err?.message || 'Failed to save login & session settings to Supabase database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleForceLogoutAll = async () => {
    if (window.confirm('Are you sure you want to force logout all active staff sessions? All non-admin users will be required to log in again.')) {
      try {
        const forceTime = new Date().toISOString();
        const saved = await dataService.saveBusinessSettings({
          force_logout_all_at: forceTime,
        });
        await dataService.logAuditAction(
          'force_logout_all_staff_sessions',
          'auth',
          saved.id,
          { admin_email: currentUser?.email, timestamp: forceTime }
        );
        setForceLogoutAlert('All active staff sessions have been revoked. Users must log in again.');
        setTimeout(() => setForceLogoutAlert(null), 6000);
      } catch (err: any) {
        console.error('Force logout all failed:', err);
        setSaveError(err?.message || 'Failed to revoke staff sessions.');
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-slate-500 space-y-2">
        <ShieldCheck className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Access Restricted</h3>
        <p className="text-xs">Only authorized Admin users can access User Login Settings.</p>
      </div>
    );
  }

  if (isLoading) {
    return <GlobalLoader message="Loading User Login & Session Settings from database..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {!embedded && (
        <PageHeader
          title="User Login & Session Settings"
          subtitle="Manage automatic inactivity timeout, login session rules, and authentication security"
          breadcrumb={['Home', 'Administration', 'User Login Settings']}
          actionBtn={
            <button
              type="button"
              onClick={loadSettings}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-900 dark:text-slate-300"
            >
              <RefreshCw className={`h-4 w-4 text-gold-600 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Settings
            </button>
          }
        />
      )}

      {loadError && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-xs font-bold text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="font-bold">Database Error Loading Settings</p>
            <p className="mt-0.5 text-slate-700 dark:text-slate-300 font-normal">{loadError}</p>
          </div>
        </div>
      )}

      {saveError && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-xs font-bold text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="font-bold">Database Error Saving Settings</p>
            <p className="mt-0.5 text-slate-700 dark:text-slate-300 font-normal">{saveError}</p>
          </div>
        </div>
      )}

      {savedSuccess && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2 shadow-sm">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <span>User Login & Session Settings saved successfully to Supabase database! New session rules apply immediately.</span>
        </div>
      )}

      {forceLogoutAlert && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-2 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span>{forceLogoutAlert}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
        {/* Inactivity Auto Logout Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-charcoal-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/20 text-gold-600 dark:text-gold-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal-950 dark:text-slate-100">
                Automatic Inactivity Auto Logout
              </h3>
              <p className="text-xs text-slate-500">Automatically log out idle users after a specified period of inactivity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Enable/Disable Switch */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/40">
              <div>
                <label className="block text-xs font-bold text-charcoal-950 dark:text-slate-100">
                  Enable Inactivity Auto Logout
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Track mouse, keyboard, touch and scroll activity across all ERP pages
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLogoutEnabled(!logoutEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  logoutEnabled ? 'bg-gold-500' : 'bg-slate-300 dark:bg-charcoal-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    logoutEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Timeout Duration Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Inactivity Timeout Duration
              </label>
              <select
                value={timeoutMinutes}
                onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
                disabled={!logoutEnabled}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 disabled:opacity-50"
              >
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes (Recommended Default)</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes (1 Hour)</option>
                <option value={90}>90 Minutes (1.5 Hours)</option>
                <option value={120}>120 Minutes (2 Hours)</option>
                {!([5, 10, 15, 20, 30, 45, 60, 90, 120].includes(timeoutMinutes)) && (
                  <option value={timeoutMinutes}>{timeoutMinutes} Minutes</option>
                )}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Active setting: <strong className="text-gold-600 dark:text-gold-400">{timeoutMinutes} Minutes</strong> before automatic session termination.
              </p>
            </div>
          </div>
        </div>

        {/* Session Security Controls */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-charcoal-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/20 text-gold-600 dark:text-gold-300">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal-950 dark:text-slate-100">
                Staff Session Security & Controls
              </h3>
              <p className="text-xs text-slate-500">Manage active staff sessions and authentication security</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Maximum Concurrent Active Sessions per User
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxSessions}
                onChange={(e) => setMaxSessions(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <button
                type="button"
                onClick={handleForceLogoutAll}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
              >
                <Power className="h-4 w-4" /> Force Logout All Staff Sessions
              </button>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Login & Session Settings
          </button>
        </div>
      </form>
    </div>
  );
};
