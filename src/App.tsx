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
import { EstimationsList } from '@/pages/EstimationsList';
import { CreateEstimation } from '@/pages/CreateEstimation';
import { EstimationDetails } from '@/pages/EstimationDetails';
import { CustomOrdersList } from '@/pages/CustomOrdersList';
import { CustomOrderDetails } from '@/pages/CustomOrderDetails';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorPage } from '@/components/common/ErrorPage';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { LanguageProvider } from '@/lib/i18n';
import { UserRole, PermissionCode } from '@/types';
import { Lock } from 'lucide-react';

const AuthenticatedShell: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <GlobalLoader message="Verifying authentication session..." />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <DashboardLayout />;
};

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: PermissionCode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles = ['admin', 'super_admin'],
  requiredPermission,
}) => {
  const { role, can } = useAuth();

  const hasRole = allowedRoles.includes(role);
  const hasPerm = requiredPermission ? can(requiredPermission) : false;

  if (!hasRole && !hasPerm) {
    return (
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
    );
  }

  return <>{children}</>;
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

              {/* Protected ERP App Routes inside Persistent Shell */}
              <Route element={<AuthenticatedShell />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<CustomersList />} />
                <Route path="/customers/add" element={<AddCustomer />} />
                <Route path="/customers/edit/:id" element={<EditCustomer />} />
                <Route path="/customers/:id" element={<CustomerDetails />} />

                {/* Jewellery Estimations & Bespoke Orders */}
                <Route path="/estimations" element={<EstimationsList />} />
                <Route path="/estimations/new" element={<CreateEstimation />} />
                <Route path="/estimations/:id" element={<EstimationDetails />} />
                <Route path="/custom-orders" element={<CustomOrdersList />} />
                <Route path="/custom-orders/:id" element={<CustomOrderDetails />} />

                <Route path="/products" element={<ProductsList />} />
                <Route path="/products/add" element={<AddProduct />} />
                <Route path="/products/:id" element={<ProductDetails />} />

                <Route path="/metal-rates" element={<MetalRates />} />
                <Route path="/inventory" element={<InventoryDashboard />} />
                <Route path="/stock-movements" element={<StockMovements />} />

                <Route path="/manufacturing" element={<ManufacturingList />} />
                <Route path="/manufacturing/:id" element={<JobCardDetails />} />

                <Route path="/pos" element={<RetailPOS />} />
                <Route path="/invoices" element={<RetailInvoices />} />
                <Route path="/invoices/:id" element={<InvoiceDetails />} />

                <Route path="/wholesale-customers" element={<WholesaleCustomers />} />
                <Route path="/wholesale-customers/:id" element={<WholesaleCustomerDetails />} />
                <Route path="/wholesale-issues" element={<WholesaleIssuesList />} />
                <Route path="/wholesale-issues/new" element={<WholesaleIssuePage />} />
                <Route path="/wholesale-issues/:id" element={<WholesaleIssueDetails />} />
                <Route path="/wholesale-returns" element={<WholesaleReturns />} />
                <Route path="/wholesale-returns/new" element={<WholesaleReturns />} />
                <Route path="/wholesale-sold" element={<WholesaleSoldItems />} />
                <Route path="/wholesale-holdings" element={<WholesaleHoldings />} />
                <Route path="/wholesale-ledger" element={<WholesaleLedger />} />

                <Route path="/payments" element={<Payments />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/expenses" element={<Expenses />} />

                <Route path="/reports" element={<Reports />} />
                <Route path="/whatsapp-messages" element={<WhatsAppMessages />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/users" element={<RoleGuard allowedRoles={['admin', 'super_admin']} requiredPermission="manage_users"><UserManagement /></RoleGuard>} />
                <Route path="/settings/users" element={<RoleGuard allowedRoles={['admin', 'super_admin']} requiredPermission="manage_users"><UserManagement /></RoleGuard>} />
                <Route path="/admin/user-login-settings" element={<RoleGuard allowedRoles={['admin', 'super_admin']} requiredPermission="manage_settings"><UserLoginSettings /></RoleGuard>} />
                <Route path="/roles-permissions" element={<RoleGuard allowedRoles={['admin', 'super_admin']}><RolesPermissions /></RoleGuard>} />
                <Route path="/settings" element={<RoleGuard allowedRoles={['admin', 'super_admin']} requiredPermission="manage_settings"><Settings /></RoleGuard>} />
                <Route path="/settings/sync" element={<RoleGuard allowedRoles={['admin', 'super_admin']} requiredPermission="manage_settings"><SyncSettings /></RoleGuard>} />
                <Route path="/sync-settings" element={<RoleGuard allowedRoles={['admin', 'super_admin']} requiredPermission="manage_settings"><SyncSettings /></RoleGuard>} />
                <Route path="/admin/storage-database" element={<RoleGuard allowedRoles={['admin', 'super_admin']}><StorageDatabaseSettings /></RoleGuard>} />
                <Route path="/audit-logs" element={<RoleGuard allowedRoles={['admin', 'super_admin']} requiredPermission="view_reports"><AuditLogs /></RoleGuard>} />
              </Route>

              <Route path="*" element={<ErrorPage type="404" />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
};

export default App;

