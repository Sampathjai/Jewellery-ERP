import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

import { Login } from '@/pages/Login';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { Dashboard } from '@/pages/Dashboard';
import { CustomersList } from '@/pages/CustomersList';
import { AddCustomer } from '@/pages/AddCustomer';
import { EditCustomer } from '@/pages/EditCustomer';
import { CustomerDetails } from '@/pages/CustomerDetails';
import { ProductsList } from '@/pages/ProductsList';
import { AddProduct } from '@/pages/AddProduct';
import { ProductDetails } from '@/pages/ProductDetails';
import { MetalRates } from '@/pages/MetalRates';
import { InventoryDashboard } from '@/pages/InventoryDashboard';
import { StockMovements } from '@/pages/StockMovements';
import { ManufacturingList } from '@/pages/ManufacturingList';
import { JobCardDetails } from '@/pages/JobCardDetails';
import { RetailPOS } from '@/pages/RetailPOS';
import { RetailInvoices } from '@/pages/RetailInvoices';
import { InvoiceDetails } from '@/pages/InvoiceDetails';
import { WholesaleCustomers } from '@/pages/WholesaleCustomers';
import { WholesaleCustomerDetails } from '@/pages/WholesaleCustomerDetails';
import { WholesaleIssuesList } from '@/pages/WholesaleIssuesList';
import { WholesaleIssuePage } from '@/pages/WholesaleIssue';
import { WholesaleIssueDetails } from '@/pages/WholesaleIssueDetails';
import { WholesaleReturns } from '@/pages/WholesaleReturns';
import { WholesaleSoldItems } from '@/pages/WholesaleSoldItems';
import { WholesaleHoldings } from '@/pages/WholesaleHoldings';
import { WholesaleLedger } from '@/pages/WholesaleLedger';
import { Payments } from '@/pages/Payments';
import { Suppliers } from '@/pages/Suppliers';
import { Purchases } from '@/pages/Purchases';
import { Expenses } from '@/pages/Expenses';
import { Reports } from '@/pages/Reports';
import { WhatsAppMessages } from '@/pages/WhatsAppMessages';
import { Notifications } from '@/pages/Notifications';
import { UserManagement } from '@/pages/UserManagement';
import { UserLoginSettings } from '@/pages/UserLoginSettings';
import { RolesPermissions } from '@/pages/RolesPermissions';
import { Settings } from '@/pages/Settings';
import { SyncSettings } from '@/pages/SyncSettings';
import { StorageDatabaseSettings } from '@/pages/StorageDatabaseSettings';
import { AuditLogs } from '@/pages/AuditLogs';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorPage } from '@/components/common/ErrorPage';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { LanguageProvider } from '@/lib/i18n';
import { UserRole, PermissionCode } from '@/types';
import { Lock } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <GlobalLoader message="Verifying authentication session..." />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
};

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: PermissionCode;
}

const RoleRoute: React.FC<RoleRouteProps> = ({
  children,
  allowedRoles = ['admin', 'super_admin'],
  requiredPermission,
}) => {
  const { user, role, can, isLoading } = useAuth();

  if (isLoading) {
    return <GlobalLoader message="Verifying permissions..." />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasRole = allowedRoles.includes(role);
  const hasPerm = requiredPermission ? can(requiredPermission) : false;

  if (!hasRole && !hasPerm) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">
            403 — Access Forbidden
          </h2>
          <p className="max-w-md text-xs text-slate-500 leading-relaxed">
            You do not have administrative permissions to view or modify this module. Contact your store owner or administrator to request access.
          </p>
          <a
            href="/dashboard"
            className="rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            Return to Dashboard
          </a>
        </div>
      </DashboardLayout>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Root URL Redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected ERP App Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><CustomersList /></ProtectedRoute>} />
              <Route path="/customers/add" element={<ProtectedRoute><AddCustomer /></ProtectedRoute>} />
              <Route path="/customers/edit/:id" element={<ProtectedRoute><EditCustomer /></ProtectedRoute>} />
              <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetails /></ProtectedRoute>} />

              <Route path="/products" element={<ProtectedRoute><ProductsList /></ProtectedRoute>} />
              <Route path="/products/add" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
              <Route path="/products/:id" element={<ProtectedRoute><ProductDetails /></ProtectedRoute>} />

              <Route path="/metal-rates" element={<ProtectedRoute><MetalRates /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><InventoryDashboard /></ProtectedRoute>} />
              <Route path="/stock-movements" element={<ProtectedRoute><StockMovements /></ProtectedRoute>} />

              <Route path="/manufacturing" element={<ProtectedRoute><ManufacturingList /></ProtectedRoute>} />
              <Route path="/manufacturing/:id" element={<ProtectedRoute><JobCardDetails /></ProtectedRoute>} />

              <Route path="/pos" element={<ProtectedRoute><RetailPOS /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><RetailInvoices /></ProtectedRoute>} />
              <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetails /></ProtectedRoute>} />

              <Route path="/wholesale-customers" element={<ProtectedRoute><WholesaleCustomers /></ProtectedRoute>} />
              <Route path="/wholesale-customers/:id" element={<ProtectedRoute><WholesaleCustomerDetails /></ProtectedRoute>} />
              <Route path="/wholesale-issues" element={<ProtectedRoute><WholesaleIssuesList /></ProtectedRoute>} />
              <Route path="/wholesale-issues/new" element={<ProtectedRoute><WholesaleIssuePage /></ProtectedRoute>} />
              <Route path="/wholesale-issues/:id" element={<ProtectedRoute><WholesaleIssueDetails /></ProtectedRoute>} />
              <Route path="/wholesale-returns" element={<ProtectedRoute><WholesaleReturns /></ProtectedRoute>} />
              <Route path="/wholesale-returns/new" element={<ProtectedRoute><WholesaleReturns /></ProtectedRoute>} />
              <Route path="/wholesale-sold" element={<ProtectedRoute><WholesaleSoldItems /></ProtectedRoute>} />
              <Route path="/wholesale-holdings" element={<ProtectedRoute><WholesaleHoldings /></ProtectedRoute>} />
              <Route path="/wholesale-ledger" element={<ProtectedRoute><WholesaleLedger /></ProtectedRoute>} />

              <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
              <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />

              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/whatsapp-messages" element={<ProtectedRoute><WhatsAppMessages /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/users" element={<RoleRoute allowedRoles={['admin', 'super_admin']} requiredPermission="manage_users"><UserManagement /></RoleRoute>} />
              <Route path="/settings/users" element={<RoleRoute allowedRoles={['admin', 'super_admin']} requiredPermission="manage_users"><UserManagement /></RoleRoute>} />
              <Route path="/admin/user-login-settings" element={<RoleRoute allowedRoles={['admin', 'super_admin']} requiredPermission="manage_settings"><UserLoginSettings /></RoleRoute>} />
              <Route path="/roles-permissions" element={<RoleRoute allowedRoles={['admin', 'super_admin']}><RolesPermissions /></RoleRoute>} />
              <Route path="/settings" element={<RoleRoute allowedRoles={['admin', 'super_admin']} requiredPermission="manage_settings"><Settings /></RoleRoute>} />
              <Route path="/settings/sync" element={<RoleRoute allowedRoles={['admin', 'super_admin']} requiredPermission="manage_settings"><SyncSettings /></RoleRoute>} />
              <Route path="/sync-settings" element={<RoleRoute allowedRoles={['admin', 'super_admin']} requiredPermission="manage_settings"><SyncSettings /></RoleRoute>} />
              <Route path="/admin/storage-database" element={<RoleRoute allowedRoles={['admin', 'super_admin']}><StorageDatabaseSettings /></RoleRoute>} />
              <Route path="/audit-logs" element={<RoleRoute allowedRoles={['admin', 'super_admin']} requiredPermission="view_reports"><AuditLogs /></RoleRoute>} />

              <Route path="*" element={<ErrorPage type="404" />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
};

export default App;

