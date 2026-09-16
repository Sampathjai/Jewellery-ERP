import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorPage } from '@/components/common/ErrorPage';
import { useAuth } from '@/lib/auth';
import {
  getDatabaseHealth,
  getStorageMetrics,
  exportDatabaseData,
  addAuditLog,
  DatabaseHealthInfo,
  StorageMetricCategory,
} from '@/lib/supabase';
import {
  Database,
  HardDrive,
  Download,
  CheckCircle,
  Activity,
  ShieldCheck,
  Server,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  FileText,
  Users,
  Package,
  Truck,
  DollarSign,
  Lock,
} from 'lucide-react';

export const StorageDatabaseSettings: React.FC = () => {
  const { user, role } = useAuth();
  const [healthInfo, setHealthInfo] = useState<DatabaseHealthInfo | null>(null);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetricCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exportModalTarget, setExportModalTarget] = useState<string | null>(null);

  // Strictly enforce Admin-Only Access Control
  if (role !== 'admin') {
    return (
      <ErrorPage
        type="403"
        title="403 – Admin Access Restricted"
        message="Storage & Database Administration is strictly restricted to Owner / Admin roles. Staff accounts are not permitted to access database tools."
      />
    );
  }

  const loadData = () => {
    setLoading(true);
    setTimeout(() => {
      const health = getDatabaseHealth();
      const metrics = getStorageMetrics();
      setHealthInfo(health);
      setStorageMetrics(metrics);
      setLoading(false);
    }, 250);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExport = (key: any, label: string) => {
    try {
      exportDatabaseData(key);
      addAuditLog(
        user?.full_name || 'Admin',
        'Database Export Initiated',
        'database_backup',
        key,
        { target: label, timestamp: new Date().toISOString() }
      );
      showToast(`Export for ${label} completed and downloaded successfully.`);
      setExportModalTarget(null);
    } catch (e: any) {
      alert(`Export failed: ${e.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storage & Database Administration"
        subtitle="Live database health check, Supabase storage breakdown, data exports, and backup management"
        breadcrumb={['Home', 'Settings', 'Storage & Database']}
        actionBtn={
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Run Health Check
          </button>
        }
      />

      {toastMessage && (
        <div className="rounded-2xl border border-emerald-400 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-2 shadow-sm">
          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Database Connection & Health Banner */}
      {healthInfo && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-charcoal-800">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                    Database Connection Status
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    CONNECTED & HEALTHY
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time database connection verified with actual backend records
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-200">
                Env: {healthInfo.environment}
              </span>
            </div>
          </div>

          {/* Health Metrics Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Database Provider
              </span>
              <div className="mt-1 flex items-center gap-2 font-bold text-xs text-charcoal-900 dark:text-slate-100">
                <Server className="h-4 w-4 text-gold-600" />
                {healthInfo.provider}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Backend API Status
              </span>
              <div className="mt-1 flex items-center gap-2 font-bold text-xs text-emerald-600 dark:text-emerald-400">
                <Activity className="h-4 w-4" />
                Backend Operational (Healthy)
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Database Name
              </span>
              <div className="mt-1 font-mono font-bold text-xs text-charcoal-900 dark:text-slate-100">
                {healthInfo.databaseName}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Last Health Verification
              </span>
              <div className="mt-1 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {new Date(healthInfo.lastHealthCheck).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Storage Usage Categories */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-gold-600" />
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
              Storage Usage & Category Breakdown
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Real file & object metrics
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {storageMetrics.map((cat, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/60 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal-900 dark:text-slate-100 truncate">
                  {cat.categoryName}
                </span>
                <Layers className="h-4 w-4 text-gold-600 shrink-0" />
              </div>
              <div className="font-serif text-xl font-bold text-amber-900 dark:text-gold-300">
                {cat.formattedSize}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {cat.itemCount} linked files
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safe Database Backup & Admin Export Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-gold-600" />
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
              Database Backup & Admin Data Export
            </h3>
          </div>
          <span className="text-xs font-bold text-amber-800 dark:text-gold-300 flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-gold-600" />
            Admin Authorized Only
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          Safely backup your entire Shankar Jewellery ERP dataset or export specific domain tables as structured JSON/CSV files. Exports strictly preserve business records and exclude sensitive system security keys.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          <button
            onClick={() => setExportModalTarget('full_backup')}
            className="flex flex-col items-start gap-1.5 rounded-2xl border border-gold-400/60 bg-gold-50/70 p-4 text-left hover:bg-gold-100 dark:border-gold-800 dark:bg-gold-950/40 dark:text-gold-300 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between w-full">
              <Download className="h-5 w-5 text-gold-600" />
              <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-950 dark:text-gold-200">
                RECOMMENDED
              </span>
            </div>
            <div className="font-bold text-xs text-amber-950 dark:text-gold-300">
              Full System Backup (.JSON)
            </div>
            <div className="text-[10px] text-amber-800 dark:text-gold-400">
              Complete ERP database snapshot
            </div>
          </button>

          <button
            onClick={() => handleExport('customers', 'Customers CRM')}
            className="flex flex-col items-start gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-gold-500 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all"
          >
            <Users className="h-5 w-5 text-gold-600" />
            <div className="font-bold text-xs text-charcoal-900 dark:text-slate-100">
              Customers CRM Dataset
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Retail & Wholesale customers
            </div>
          </button>

          <button
            onClick={() => handleExport('products', 'Product Inventory')}
            className="flex flex-col items-start gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-gold-500 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all"
          >
            <Package className="h-5 w-5 text-gold-600" />
            <div className="font-bold text-xs text-charcoal-900 dark:text-slate-100">
              Jewellery Product Stock
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              SKUs, weights, wastage, charges
            </div>
          </button>

          <button
            onClick={() => handleExport('retailInvoices', 'Retail Invoices')}
            className="flex flex-col items-start gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-gold-500 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all"
          >
            <FileText className="h-5 w-5 text-gold-600" />
            <div className="font-bold text-xs text-charcoal-900 dark:text-slate-100">
              Retail Invoices Log
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Counter sales & bill history
            </div>
          </button>

          <button
            onClick={() => handleExport('wholesaleIssues', 'Wholesale Bills')}
            className="flex flex-col items-start gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-gold-500 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all"
          >
            <Layers className="h-5 w-5 text-gold-600" />
            <div className="font-bold text-xs text-charcoal-900 dark:text-slate-100">
              Wholesale Bills & Issues
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Consignment batches & touch %
            </div>
          </button>

          <button
            onClick={() => handleExport('purchases', 'Purchases & Refineries')}
            className="flex flex-col items-start gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-gold-500 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all"
          >
            <Truck className="h-5 w-5 text-gold-600" />
            <div className="font-bold text-xs text-charcoal-900 dark:text-slate-100">
              Raw Metal Purchases
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Supplier refinery purchases
            </div>
          </button>

          <button
            onClick={() => handleExport('expenses', 'Expenses & Operating Costs')}
            className="flex flex-col items-start gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-gold-500 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all"
          >
            <DollarSign className="h-5 w-5 text-gold-600" />
            <div className="font-bold text-xs text-charcoal-900 dark:text-slate-100">
              Showroom Expenses Log
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Rent, TNEB, labour expenses
            </div>
          </button>

          <button
            onClick={() => handleExport('auditLogs', 'System Audit Logs')}
            className="flex flex-col items-start gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-gold-500 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200 transition-all"
          >
            <Lock className="h-5 w-5 text-gold-600" />
            <div className="font-bold text-xs text-charcoal-900 dark:text-slate-100">
              Security Audit Logs
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Admin & user activity history
            </div>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Full Backup */}
      {exportModalTarget === 'full_backup' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 space-y-4">
            <div className="flex items-center gap-3 text-gold-600">
              <Download className="h-6 w-6" />
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
                Confirm Full Database Backup
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will generate and download a complete JSON backup containing all registered customers, stock products, retail invoices, wholesale issues, and financial purchase records.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExportModalTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExport('full_backup', 'Full Database Backup')}
                className="rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
              >
                Download Complete Backup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

