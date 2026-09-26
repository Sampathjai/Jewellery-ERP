import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { useAuth } from '@/lib/auth';
import {
  ShieldCheck,
  Clock,
  Lock,
  Power,
  RefreshCw,
  Save,
  CheckCircle,
  AlertTriangle,
  Fingerprint,
  Smartphone,
  Trash2,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { TrustedDevice } from '@/types';
import {
  detectBiometricCapability,
  hasRegisteredLocalDevice,
  removeLocalDeviceBiometrics,
  BiometricCapability,
} from '@/lib/biometricAuth';
import { BiometricSetupModal } from '@/components/auth/BiometricSetupModal';

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

  // Trusted Devices & Biometric State
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability | null>(null);
  const [hasLocalDeviceVault, setHasLocalDeviceVault] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [deviceActionMessage, setDeviceActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const cap = await detectBiometricCapability();
      setBiometricCapability(cap);
      setHasLocalDeviceVault(hasRegisteredLocalDevice());

      const settings = await dataService.getBusinessSettings();
      if (settings) {
        setLogoutEnabled(Boolean(settings.inactivity_logout_enabled ?? true));
        setTimeoutMinutes(Number(settings.inactivity_timeout_minutes ?? 15));
        const numMax = Number(settings.max_concurrent_sessions);
        setMaxSessions(isNaN(numMax) || numMax <= 0 ? 3 : numMax);
      }

      if (currentUser?.id) {
        const devices = await dataService.getTrustedDevices(currentUser.id);
        setTrustedDevices(devices);
      }
    } catch (err: any) {
      console.error('Failed to load user login & session settings from Supabase:', err);
      setLoadError(err?.message || 'Unable to load login & session settings from database. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin, loadSettings]);

  // Handle Revoking a Specific Device
  const handleRevokeDevice = async (deviceId: string, deviceName: string) => {
    if (!currentUser) return;
    if (
      !window.confirm(
        `Are you sure you want to revoke "${deviceName}"? This device will immediately lose biometric and PIN unlock access.`
      )
    ) {
      return;
    }

    setDeviceActionMessage(null);
    try {
      const success = await dataService.revokeTrustedDevice(deviceId, currentUser.id);
      if (success) {
        setDeviceActionMessage({ type: 'success', text: `Device "${deviceName}" was revoked successfully.` });
        const updated = await dataService.getTrustedDevices(currentUser.id);
        setTrustedDevices(updated);
        setHasLocalDeviceVault(hasRegisteredLocalDevice());
      } else {
        setDeviceActionMessage({ type: 'error', text: 'Failed to revoke device.' });
      }
    } catch (err: any) {
      setDeviceActionMessage({ type: 'error', text: err?.message || 'Error revoking device.' });
    }
  };

  // Handle Revoking All Trusted Devices
  const handleRevokeAllDevices = async () => {
    if (!currentUser) return;
    if (
      !window.confirm(
        'Are you sure you want to revoke ALL trusted devices for your account? Every device will be forced to log in with Email & Password again.'
      )
    ) {
      return;
    }

    setDeviceActionMessage(null);
    try {
      const success = await dataService.revokeAllTrustedDevices(currentUser.id);
      if (success) {
        await removeLocalDeviceBiometrics();
        setDeviceActionMessage({ type: 'success', text: 'All trusted devices have been revoked successfully.' });
        const updated = await dataService.getTrustedDevices(currentUser.id);
        setTrustedDevices(updated);
        setHasLocalDeviceVault(false);
      } else {
        setDeviceActionMessage({ type: 'error', text: 'Failed to revoke all devices.' });
      }
    } catch (err: any) {
      setDeviceActionMessage({ type: 'error', text: err?.message || 'Error revoking devices.' });
    }
  };

  // Handle Removing Biometrics from Current Browser
  const handleRemoveLocalDevice = async () => {
    if (
      !window.confirm(
        'Remove biometric and PIN unlock from this browser? You will need to sign in with your email and password next time.'
      )
    ) {
      return;
    }

    try {
      await removeLocalDeviceBiometrics();
      setHasLocalDeviceVault(false);
      setDeviceActionMessage({
        type: 'success',
        text: 'Biometric and PIN unlock removed from this device.',
      });
      if (currentUser?.id) {
        const updated = await dataService.getTrustedDevices(currentUser.id);
        setTrustedDevices(updated);
      }
    } catch (err: any) {
      setDeviceActionMessage({ type: 'error', text: err?.message || 'Failed to remove local device credentials.' });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSavedSuccess(false);

    try {
      const targetMax = Number(maxSessions);
      const targetTimeout = Number(timeoutMinutes);
      const saved = await dataService.saveBusinessSettings({
        inactivity_logout_enabled: logoutEnabled,
        inactivity_timeout_minutes: targetTimeout,
        max_concurrent_sessions: targetMax,
      });

      setLogoutEnabled(Boolean(saved.inactivity_logout_enabled ?? logoutEnabled));
      setTimeoutMinutes(Number(saved.inactivity_timeout_minutes ?? targetTimeout));
      const confirmedMax = Number(saved.max_concurrent_sessions ?? targetMax);
      setMaxSessions(confirmedMax);

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
    if (
      window.confirm(
        'Are you sure you want to force logout all active staff sessions? All non-admin users will be required to log in again.'
      )
    ) {
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
          subtitle="Manage automatic inactivity timeout, login session rules, and trusted device authentication security"
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

        {/* ------------------------------------------------------------- */}
        {/* TRUSTED DEVICES & BIOMETRIC/PIN SECURITY CARD */}
        {/* ------------------------------------------------------------- */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-charcoal-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/20 text-gold-600 dark:text-gold-300">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal-950 dark:text-slate-100">
                  Trusted Devices & Biometric / PIN Unlock
                </h3>
                <p className="text-xs text-slate-500">
                  Manage registered devices authorized for Touch ID, Face ID, Fingerprint, and 6-digit ERP PIN unlock
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-gold-500 bg-gold-500/10 px-3.5 py-2 text-xs font-bold text-gold-600 hover:bg-gold-500 hover:text-charcoal-950 dark:text-gold-400 disabled:opacity-50 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>+ Register This Device</span>
              </button>
            </div>
          </div>

          {/* Action Notification Message */}
          {deviceActionMessage && (
            <div
              className={`rounded-xl p-3 text-xs font-bold flex items-center gap-2 shadow-sm ${
                deviceActionMessage.type === 'success'
                  ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
              }`}
            >
              {deviceActionMessage.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span>{deviceActionMessage.text}</span>
            </div>
          )}

          {/* Security Notice */}
          <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-3.5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-bold text-charcoal-900 dark:text-gold-300 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Hardware-Bound Biometric Security
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Biometric templates (fingerprints and Face ID) are managed exclusively by your device operating system and are NEVER transmitted to or stored on Shankar Jewellery servers.
            </p>
          </div>

          {/* Current Device Vault Status */}
          {hasLocalDeviceVault && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-gold-500" />
                  This Browser is Registered for Biometric & PIN Unlock
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  You can unlock Shankar Jewellery ERP on this device using {biometricCapability?.displayName || 'Biometrics'} or your 6-digit PIN.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRemoveLocalDevice}
                className="self-start sm:self-auto rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:bg-charcoal-900 dark:text-red-400 transition-colors"
              >
                Remove from this Device
              </button>
            </div>
          )}

          {/* Registered Devices List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Registered Trusted Devices ({trustedDevices.length})
              </h4>

              {trustedDevices.length > 0 && (
                <button
                  type="button"
                  onClick={handleRevokeAllDevices}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Revoke All Devices</span>
                </button>
              )}
            </div>

            {trustedDevices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-charcoal-800 space-y-2">
                <Fingerprint className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No Trusted Devices Registered Yet</p>
                <p className="text-[11px] max-w-sm mx-auto">
                  Click <strong>+ Register This Device</strong> to enable fast Touch ID, Face ID, Windows Hello, or Fingerprint unlock on this computer or phone.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-charcoal-800 rounded-xl border border-slate-200 dark:border-charcoal-800 overflow-hidden">
                {trustedDevices.map((device) => {
                  const isActive = device.status === 'active';
                  return (
                    <div
                      key={device.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-4 dark:bg-charcoal-800/40 hover:bg-slate-100/50 dark:hover:bg-charcoal-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {device.device_name}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              }`}
                            >
                              {isActive ? 'Active' : 'Revoked'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                            <span>Type: {device.device_type.replace('_', ' ')}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>
                              Registered: {new Date(device.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span>
                              Last used: {device.last_used_at ? (
                                Math.abs(Date.now() - new Date(device.last_used_at).getTime()) < 60000
                                  ? 'Just now'
                                  : new Date(device.last_used_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              ) : 'Never'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
                          ID: {device.credential_id.substring(0, 14)}...
                        </span>

                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => handleRevokeDevice(device.id, device.device_name)}
                            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Revoke
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Revoked</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

      {/* Registration Modal */}
      {currentUser && (
        <BiometricSetupModal
          user={currentUser}
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            setShowRegisterModal(false);
            loadSettings();
          }}
        />
      )}
    </div>
  );
};
