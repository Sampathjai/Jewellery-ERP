# SHANKAR JEWELLERY ERP — FEATURE AUDIT REPORT

**Audit Date:** October 2026  
**Auditor:** Senior QA Engineer, Security Auditor & Full-Stack Architect  
**Scope:** In-depth, feature-by-feature verification across all ERP routes, database operations, business calculations, permissions, and synchronization workflows.

---

## 1. Authentication, Sessions & Device Security

### 1.1 Email / Password Authentication
- **Implementation:** `src/pages/Login.tsx`, `src/lib/auth.tsx`
- **Verification:** Tested sign-in, session initialization, token refresh, and sign-out.
- **Findings:**
  - Standard JWT tokens are managed securely through Supabase Auth client.
  - State persistence survives page refreshes.
  - Generic error messages (`"Invalid email or password."`) prevent account enumeration.
- **Status:** ✅ PASS

### 1.2 Brute Force Rate Limiting
- **Implementation:** `src/lib/rateLimiter.ts`
- **Verification:** Executed automated unit tests (`scripts/security-audit-test.js`).
- **Findings:**
  - Consecutive failed attempts are recorded in session/local storage.
  - After 5 consecutive failures, login attempts are locked out for 300 seconds (5 minutes).
  - Countdown timer renders on the login UI.
- **Status:** ✅ PASS

### 1.3 PIN Authentication & Complexity
- **Implementation:** `src/lib/pinValidator.ts`, `src/components/auth/PinModal.tsx`
- **Verification:** Tested trivial PIN sequences (`123456`, `000000`, `111111`, `654321`, `999999`) and strong PINs (`849201`, `395174`).
- **Findings:**
  - Trivial ascending, descending, repeated sequences, and non-numeric inputs are blocked.
  - Only strong 6-digit non-trivial PINs are accepted.
- **Status:** ✅ PASS

### 1.4 Biometric & Trusted Device Management
- **Implementation:** `src/lib/biometricAuth.ts`, `src/pages/UserLoginSettings.tsx`, `APPLY_ESTIMATION_AND_SYNC_MIGRATION.sql`
- **Verification:** Evaluated `trusted_devices` table schema and device verification workflow.
- **Findings:**
  - Central cloud database table `trusted_devices` links registered devices to `user_id`.
  - Inactive or deleted user profiles immediately invalidate device unlocking.
  - Fallback mechanism exists for browsers or devices lacking WebAuthn/Touch ID hardware.
  - **Limitation:** On mobile browsers where WebAuthn permissions are denied by user policy, the fallback to device token PIN should provide clearer explanatory error guidance.
- **Status:** ⚠️ PARTIAL (P2 severity)

---

## 2. Role-Based Access Control (RBAC) & Route Guards

### 2.1 Role Matrix & Permission Mapping
- **Implementation:** `src/lib/utils.ts` (`ROLE_PERMISSIONS`), `src/types/index.ts` (`PermissionCode`)
- **Verification:** Audited all 10 roles: `super_admin`, `admin`, `manager`, `counsellor`, `trainer`, `accountant`, `receptionist`, `billing_staff`, `inventory_staff`, `viewer`.
- **Critical Finding (RBAC-02):**
  - In `src/types/index.ts`, estimation permissions (`view_estimations`, `create_estimations`, `edit_estimations`, `delete_estimations`, `approve_estimations`, etc.) are defined.
  - However, in `src/lib/utils.ts`, `ROLE_PERMISSIONS.admin` and `ROLE_PERMISSIONS.manager` **lack these permission codes**.
  - While `super_admin` bypasses the check because `hasPermission()` returns `true` automatically, any explicit `can('view_estimations')` check on an `admin` or `manager` returns `false`.
- **Status:** ❌ FAIL (P1 severity)
- **Remediation:** Add the estimation permission codes to `ROLE_PERMISSIONS.admin` and `ROLE_PERMISSIONS.manager`.

### 2.2 Route Guarding in App.tsx
- **Implementation:** `src/App.tsx`, `ProtectedRoute`, `RoleRoute`
- **Verification:** Audited route declarations for all 38 page routes.
- **Findings:**
  - Admin settings routes (`/users`, `/settings`, `/admin/user-login-settings`, `/admin/storage-database`) are protected by `<RoleRoute>`.
  - However, core operational routes (`/estimations`, `/custom-orders`, `/pos`, `/invoices`, `/wholesale-issues`, `/manufacturing`) are wrapped only in `<ProtectedRoute>`, which checks only `if (!user)` without verifying role permissions.
- **Status:** ⚠️ PARTIAL (P1 severity)
- **Remediation:** Apply `<RoleRoute requiredPermission="...">` to operational routes so that restricted roles (such as `viewer`) cannot access action pages directly via URL manipulation.

---

## 3. Retail POS & Billing Operations

### 3.1 Stock Availability & Anti-Negative Guard
- **Implementation:** `src/pages/RetailPOS.tsx`, `src/lib/dataService.ts` (`createRetailInvoice`)
- **Verification:** Tested cart addition with requested quantity exceeding available inventory.
- **Findings:**
  - **Client-Side Guard:** POS displays an immediate warning banner and prevents adding out-of-stock items.
  - **Server-Side Guard:** Before inserting into `retail_invoices`, `createRetailInvoice` aggregates quantities for identical items and checks against `products.quantity`. If requested > available, an exception is thrown before any records are committed.
  - Inventory status transitions to `'sold'` when stock reaches 0.
- **Status:** ✅ PASS

### 3.2 Gold Rate, Wastage, and Setharam (சேதாரம்) Calculations
- **Implementation:** `src/pages/RetailPOS.tsx` lines 183–205
- **Verification:** Verified with standard Indian jewellery retail formulas:
  $$\text{Metal Value} = \text{Net Weight} \times \text{Rate per Gram}$$
  $$\text{Wastage Amount} = \frac{\text{Net Weight} \times \text{Wastage \%} \times \text{Rate per Gram}}{100}$$
  $$\text{Taxable Subtotal} = \text{Metal Value} + \text{Making Charges} + \text{Wastage} + \text{Setharam} - \text{Discount}$$
  $$\text{Grand Total} = \text{Taxable Subtotal} + \text{GST (3\%) if enabled}$$
- **Findings:**
  - Formula tested with 10.500g @ ₹7,450/g, 8% wastage, ₹650 making charges, ₹500 discount, and 3% GST.
  - Exact match: Metal Value ₹78,225.00, Wastage ₹6,258.00, Taxable Subtotal ₹84,633.00, GST ₹2,538.99, Grand Total ₹87,172.00.
- **Status:** ✅ PASS

### 3.3 Split Payments & Balance Reconciliation
- **Implementation:** `src/pages/RetailPOS.tsx` lines 214–227
- **Verification:** Tested split payments combining Cash, UPI, Card, and Bank transfer.
- **Findings:**
  - Prevents overpayment (`totalPaidAmount > grandTotal`).
  - Sets invoice payment status accurately (`'paid'`, `'partial'`, or `'unpaid'`).
  - Logs payment transaction in `retail_payments` table.
- **Status:** ✅ PASS

### 3.4 Unique Invoice Number Collision Handling
- **Implementation:** `src/lib/dataService.ts` lines 832–865
- **Verification:** Tested race conditions where two terminals attempt to generate the same invoice number simultaneously.
- **Findings:**
  - Uses a retry loop (`attempt < 3`).
  - Catches PostgreSQL error `23505` (unique violation) and fetches a fresh sequential number automatically.
- **Status:** ✅ PASS

---

## 4. Jewellery Estimations & Custom Quotations

### 4.1 Creation with Customer Reference Photos
- **Implementation:** `src/pages/CreateEstimation.tsx`, `src/lib/dataService.ts`
- **Verification:** Created estimations with customer-provided design photos.
- **Findings:**
  - Uploaded images are stored with URL reference or data URI.
  - Estimation record persisted in Supabase `estimations` and `estimation_items` tables.
  - Rate snapshot locked at time of creation (22K, 24K, Silver).
- **Status:** ✅ PASS

### 4.2 Cross-Device Synchronization
- **Implementation:** `src/pages/EstimationsList.tsx`, `src/lib/syncEngine.ts`
- **Verification:** Audited why estimations were previously invisible on mobile.
- **Findings:**
  - Schema migration created `public.estimations` and `public.estimation_items` tables with RLS policies enabled for authenticated users.
  - Realtime publication `ALTER PUBLICATION supabase_realtime ADD TABLE estimations` allows mobile and desktop devices to receive live push notifications upon creation or update.
  - LocalStorage mock store is bypassed in favor of live Supabase queries when connected.
- **Status:** ✅ PASS

### 4.3 Multi-Version Revisions & Bespoke Order Conversion
- **Implementation:** `src/pages/EstimationDetails.tsx`, `src/lib/dataService.ts`
- **Verification:** Created revision v2 from v1, preserving parent reference. Converted approved estimation to custom workshop order.
- **Findings:**
  - Version increments smoothly; root estimation link preserved.
  - Conversion creates entry in `custom_orders` table with status `'design_confirmed'` and preserves estimated weight vs actual finished weight fields.
- **Status:** ✅ PASS

---

## 5. Estimation & Invoice PDF Generation

### 5.1 A4 Portrait Geometry & Margin Compliance
- **Implementation:** `src/lib/estimationPdfGenerator.ts`, `src/utils/pdfGenerator.ts`
- **Verification:** Inspected document dimensions and table column budgets.
- **Findings:**
  - Standard A4 Portrait geometry: 210mm × 297mm.
  - Left Margin: 14mm, Right Margin: 14mm.
  - Total printable content width: $210 - 14 - 14 = 182\text{ mm}$.
  - Table columns precisely sum to 182mm (Idx 6 + Desc 42 + Gross 14 + Stone 13 + Net 14 + Rate 17 + MetalVal 19 + Wastage 18 + Making 18 + Total 21 = 182mm).
  - Zero horizontal overflow beyond $x = 196\text{ mm}$.
- **Status:** ✅ PASS

### 5.2 Currency Font & Character Encoding
- **Implementation:** `src/lib/pdfFont.ts`
- **Verification:** Inspected rendering of ₹ symbol in generated PDF files.
- **Findings:**
  - PDF generator properly configures font rendering to prevent garbled question marks or character substitution.
- **Status:** ✅ PASS

---

## 6. Wholesale Consignment & Touch Billing

### 6.1 Touch Billing Math & Pure Gold Computation
- **Implementation:** `src/pages/WholesaleIssue.tsx`, `src/pages/WholesaleLedger.tsx`
- **Verification:** Tested pure gold formula:
  $$\text{Fine Gold (g)} = \frac{\text{Net Weight (g)} \times \text{Billing Touch \%}}{100}$$
  $$\text{For 52.400g @ 88.5\% touch} = 46.374\text{ g Pure Gold}$$
- **Findings:**
  - Calculation accurately reflects bullion trade standards in Tamil Nadu / South India markets.
- **Status:** ✅ PASS

### 6.2 Consignment Settlement & Ledger Balance
- **Implementation:** `src/pages/WholesaleSettlements.tsx`, `src/pages/WholesaleLedger.tsx`
- **Verification:** Dual ledger tracks monetary debt (INR) and bullion debt (916/Pure Gold weight).
- **Findings:**
  - Settled records update dealer balance; returns adjust holding quantities.
- **Status:** ✅ PASS

---

## 7. Realtime Cloud Synchronization & Offline Fallback

### 7.1 Realtime Engine
- **Implementation:** `src/lib/syncEngine.ts`, `src/pages/SyncSettings.tsx`
- **Verification:** Verified channel subscriptions and BroadcastChannel intra-tab event sharing.
- **Findings:**
  - Realtime subscriptions listen to `postgres_changes`.
  - Intra-browser tabs communicate via `BroadcastChannel('shankar_erp_sync_bus')`.
  - Latency ping test measures connection response in milliseconds.
- **Status:** ✅ PASS

### 7.2 Offline Cache Behavior
- **Implementation:** `src/lib/supabase.ts` (`getLocalDb`), `src/lib/dataService.ts`
- **Verification:** Tested behavior during offline mode or failed network requests.
- **Findings:**
  - App falls back to `sampath_jewellery_db_v1` in `localStorage` when offline.
  - **Limitation:** Mutations made strictly offline are written to localStorage, but lack an automated replay queue to sync back to Supabase once connectivity returns.
- **Status:** ⚠️ PARTIAL (P2 severity)
