import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

import { Login } from '@/pages/Login';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { Dashboard } from '@/pages/Dashboard';
import { CustomersList } from '@/pages/CustomersList';
import { AddCustomer } from '@/pages/AddCustomer';
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
              <Route path="/wholesale-issues" element={<ProtectedRoute><WholesaleCustomers /></ProtectedRoute>} />
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
              <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
              <Route path="/admin/user-login-settings" element={<ProtectedRoute><UserLoginSettings /></ProtectedRoute>} />
              <Route path="/roles-permissions" element={<ProtectedRoute><RolesPermissions /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/sync" element={<ProtectedRoute><SyncSettings /></ProtectedRoute>} />
              <Route path="/sync-settings" element={<ProtectedRoute><SyncSettings /></ProtectedRoute>} />
              <Route path="/admin/storage-database" element={<ProtectedRoute><StorageDatabaseSettings /></ProtectedRoute>} />
              <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />

              <Route path="*" element={<ErrorPage type="404" />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
};

export default App;

