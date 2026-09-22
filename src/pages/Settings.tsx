import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SyncSettings } from './SyncSettings';
import { UserLoginSettings } from './UserLoginSettings';
import { getLocalDb, resetLocalDbToDemo, resetToCleanProductionData } from '@/lib/supabase';
import { seedDemoData, clearDemoData } from '@/lib/demoData';
import { dataService } from '@/lib/dataService';
import { BusinessSettings } from '@/types';
import { Settings as SettingsIcon, Save, RefreshCw, Upload, ShieldCheck, AlertOctagon, Trash2, Wifi, Building2, Database, Lock } from 'lucide-react';

export const Settings: React.FC = () => {
  const [db, setDb] = useState(getLocalDb());
  const [settings, setSettings] = useState<BusinessSettings>(db.settings);
  const [activeTab, setActiveTab] = useState<'profile' | 'login-settings' | 'sync' | 'database'>('profile');
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'login-settings' || tabParam === 'login' || tabParam === 'security') {
        setActiveTab('login-settings');
      } else if (tabParam === 'sync') {
        setActiveTab('sync');
      } else if (tabParam === 'database') {
        setActiveTab('database');
      }
    }
  }, []);

  useEffect(() => {
    async function loadSettings() {
      try {
        const fetched = await dataService.getBusinessSettings();
        if (fetched) {
          setSettings(fetched);
        }
      } catch (err) {
        console.warn('Could not load settings from Supabase:', err);
      }
    }
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await dataService.saveBusinessSettings(settings);
      setSettings(saved);
      setToastMessage('Shop settings saved successfully to database!');
    } catch (err: any) {
      console.error('Settings Save Error:', err);
      setToastMessage(`Save Failed: ${err?.message || 'Database connection error'}`);
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleConfirmCleanReset = async () => {
    setShowCleanModal(false);
    setToastMessage('Purging demo data...');
    try {
      const res = await clearDemoData();
      setToastMessage(res.message);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      resetToCleanProductionData();
    }
  };

  const handleConfirmDemoReset = async () => {
    setShowDemoModal(false);
    setToastMessage('Loading demo test dataset (2026)...');
    try {
      const res = await seedDemoData();
      setToastMessage(res.message);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      resetLocalDbToDemo();
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-charcoal-900 text-gold-400 px-4 py-3 shadow-xl text-xs font-bold border border-gold-500/40 flex items-center gap-2">
          <span>✓</span> {toastMessage}
        </div>
      )}

      <PageHeader
        title="Shop Settings & Configuration"
        subtitle="Business profile, bank details, GSTIN, invoice numbering, profit rules, and multi-device sync"
        breadcrumb={['Home', 'Settings']}
      />

      {/* Settings Tab Header Navigation */}
      <div className="flex border-b border-slate-200 dark:border-charcoal-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-gold-500 text-amber-900 dark:text-gold-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Building2 className="h-4 w-4" /> Business Profile & Bank
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('login-settings')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'login-settings'
              ? 'border-gold-500 text-amber-900 dark:text-gold-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Lock className="h-4 w-4" /> User Login & Session Security
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sync')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'sync'
              ? 'border-gold-500 text-amber-900 dark:text-gold-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Wifi className="h-4 w-4" /> Multi-Device Sync
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'database'
              ? 'border-gold-500 text-amber-900 dark:text-gold-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Database className="h-4 w-4" /> Database Maintenance
        </button>
      </div>

      {activeTab === 'login-settings' ? (
        <UserLoginSettings embedded />
      ) : activeTab === 'sync' ? (
        <SyncSettings />
      ) : activeTab === 'database' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-6 max-w-4xl">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 border-b border-slate-100 pb-2 dark:border-charcoal-800">
            Database Maintenance & Production Reset Engine
          </h3>
          <p className="text-xs text-slate-500">
            Manage production database states, test seeds, and clear transactional demo data.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
              <h4 className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5 mb-1">
                <AlertOctagon className="h-4 w-4" /> Start Fresh Production Mode
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-3">
                Purges demo transactions and resets invoice numbering to #1001 for live store operations.
              </p>
              <button
                type="button"
                onClick={() => setShowCleanModal(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" /> Reset to Clean Production Data
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/40">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <RefreshCw className="h-4 w-4 text-gold-600" /> Reload Demo Test Seed
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-3">
                Restores sample products, test wholesale dealers, and demo invoices.
              </p>
              <button
                type="button"
                onClick={() => setShowDemoModal(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-200"
              >
                <RefreshCw className="h-4 w-4 text-gold-600" /> Reset DB to Demo Seed Data
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-6 max-w-4xl">
          {/* Shop Profile */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 border-b border-slate-100 pb-2 dark:border-charcoal-800">
              Business Profile & Contact Info
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={settings.shop_name}
                  onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Owner Name *</label>
                <input
                  type="text"
                  required
                  value={settings.owner_name}
                  onChange={(e) => setSettings({ ...settings, owner_name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Shop Street Address</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">City</label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* GSTIN, Tax & Invoicing */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 border-b border-slate-100 pb-2 dark:border-charcoal-800">
              Invoice Auto-Numbering & Tax Prefix
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={settings.gstin || ''}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                  placeholder="Leave empty if not registered"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">PAN Number</label>
                <input
                  type="text"
                  value={settings.pan || ''}
                  onChange={(e) => setSettings({ ...settings, pan: e.target.value })}
                  placeholder="ABCDE1234F"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Invoice Prefix</label>
                <input
                  type="text"
                  value={settings.invoice_prefix}
                  onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Next Invoice No</label>
                <input
                  type="number"
                  value={settings.next_invoice_number}
                  onChange={(e) => setSettings({ ...settings, next_invoice_number: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Bank & UPI Info */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 border-b border-slate-100 pb-2 dark:border-charcoal-800">
              Bank Account & UPI Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Bank Name</label>
                <input
                  type="text"
                  value={settings.bank_name || ''}
                  onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">A/C Number</label>
                <input
                  type="text"
                  value={settings.bank_account_number || ''}
                  onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">IFSC Code</label>
                <input
                  type="text"
                  value={settings.bank_ifsc || ''}
                  onChange={(e) => setSettings({ ...settings, bank_ifsc: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">UPI ID for Invoice QR</label>
                <input
                  type="text"
                  value={settings.upi_id || ''}
                  onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                  placeholder="sampath@upi"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center border-t border-slate-100 pt-4 dark:border-charcoal-800">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-gold-500 px-6 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <Save className="h-4 w-4" /> Save All Settings
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Modal for Clean Reset */}
      {showCleanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertOctagon className="h-6 w-6" />
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                Confirm Production Reset
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Are you sure you want to purge all demo data? This will clear all transactions, products, stock items, and invoices. The system will start clean with invoice #1001 for production.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCleanModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCleanReset}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700"
              >
                Yes, Start Fresh Production DB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Demo Reset */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800">
            <div className="flex items-center gap-3 text-gold-600 mb-3">
              <RefreshCw className="h-6 w-6" />
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                Confirm Reset to Demo Data
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              This will restore sample products, sample wholesale dealers, and demo invoices.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDemoReset}
                className="rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
              >
                Reload Demo Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
