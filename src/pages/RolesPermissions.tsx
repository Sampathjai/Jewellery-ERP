import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROLE_PERMISSIONS } from '@/lib/utils';
import { UserRole, PermissionCode } from '@/types';
import { useAuth } from '@/lib/auth';
import { ShieldCheck, Check, X, Save, CheckCircle, Lock } from 'lucide-react';

export const RolesPermissions: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  // Enforce Admin-only access
  if (role !== 'admin') {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-3 text-center">
        <Lock className="h-12 w-12 text-red-500" />
        <h3 className="font-serif text-xl font-bold text-charcoal-900 dark:text-slate-100">Access Restricted</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Only authorized Shankar Jewellery Admin/Owner accounts can manage roles & permissions matrix.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const [matrixState, setMatrixState] = useState<Record<UserRole, PermissionCode[]>>(() => {
    const saved = localStorage.getItem('sampath_roles_matrix');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return { ...ROLE_PERMISSIONS };
  });

  const [notification, setNotification] = useState<string | null>(null);

  const roles: UserRole[] = ['admin', 'manager', 'billing_staff', 'inventory_staff', 'accountant', 'viewer'];
  const permissions: { code: PermissionCode; label: string }[] = [
    { code: 'view_dashboard', label: 'View Dashboard Metrics' },
    { code: 'manage_users', label: 'Manage System Users & Credentials' },
    { code: 'manage_customers', label: 'Manage Customer CRM & Photos' },
    { code: 'manage_products', label: 'Manage Product Catalog & Pricing' },
    { code: 'manage_inventory', label: 'Manage Stock Inventory & Adjustments' },
    { code: 'create_retail_invoice', label: 'Create Retail POS Invoices' },
    { code: 'edit_retail_invoice', label: 'Edit Existing Invoices' },
    { code: 'cancel_retail_invoice', label: 'Cancel & Refund Invoices' },
    { code: 'create_wholesale_issue', label: 'Issue Wholesale Consignment Bills' },
    { code: 'manage_wholesale_returns', label: 'Receive Wholesale Stock Returns' },
    { code: 'manage_payments', label: 'Record & Manage Customer Payments' },
    { code: 'manage_expenses', label: 'Manage Operating Expenses' },
    { code: 'view_reports', label: 'Access Financial Reports & Analytics' },
    { code: 'manage_settings', label: 'Manage Shop Settings & Backups' },
  ];

  const handleTogglePermission = (targetRole: UserRole, code: PermissionCode) => {
    // Prevent locking Admin out of critical permissions
    if (targetRole === 'admin' && (code === 'view_dashboard' || code === 'manage_users' || code === 'manage_settings')) {
      alert('Admin must retain core management permissions.');
      return;
    }

    setMatrixState((prev) => {
      const currentPerms = prev[targetRole] || [];
      const hasPerm = currentPerms.includes(code);
      const updatedPerms = hasPerm
        ? currentPerms.filter((c) => c !== code)
        : [...currentPerms, code];

      return {
        ...prev,
        [targetRole]: updatedPerms,
      };
    });
  };

  const handleSaveMatrix = () => {
    localStorage.setItem('sampath_roles_matrix', JSON.stringify(matrixState));
    setNotification('Roles & Permissions Matrix updated successfully.');
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Permission Matrix Editor"
        subtitle="Granular authorization mapping for Shankar Jewellery staff roles and database security"
        breadcrumb={['Home', 'Roles & Permissions']}
        actionBtn={
          <button
            onClick={handleSaveMatrix}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all"
          >
            <Save className="h-4 w-4" />
            Save Permissions Matrix
          </button>
        }
      />

      {notification && (
        <div className="rounded-2xl border border-gold-400 bg-gold-50 p-4 text-xs font-bold text-amber-950 dark:border-gold-800 dark:bg-gold-950/40 dark:text-gold-300 flex items-center gap-2 shadow-sm">
          <CheckCircle className="h-4 w-4 text-gold-600" />
          <span>{notification}</span>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
              <tr>
                <th className="p-3">Permission Capability</th>
                {roles.map((r) => (
                  <th key={r} className="p-3 text-center uppercase">{r.replace('_', ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              {permissions.map((p) => (
                <tr key={p.code} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                  <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{p.label}</td>
                  {roles.map((r) => {
                    const hasPerm = matrixState[r]?.includes(p.code);
                    return (
                      <td key={r} className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(r, p.code)}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                            hasPerm
                              ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-charcoal-800 dark:text-slate-600'
                          }`}
                        >
                          {hasPerm ? <Check className="h-4 w-4 stroke-[3]" /> : <X className="h-4 w-4" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
