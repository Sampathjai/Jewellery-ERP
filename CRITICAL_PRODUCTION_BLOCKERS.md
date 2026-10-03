# SHANKAR JEWELLERY ERP — CRITICAL PRODUCTION BLOCKERS

**Audit Date:** October 2026  
**Auditor:** Senior QA Engineer, Security Auditor & Full-Stack Architect  
**Scope:** Priority 0 (P0) and Priority 1 (P1) issues that directly impact security, business integrity, or operational continuity.

---

## Blocker Summary Table

| Blocker ID | Severity | Category | Title | Affected Modules | Status |
|---|---|---|---|---|---|
| **BLK-01** | **P1** | Authorization / RBAC | Estimation Permission Codes Omitted from Admin Role Matrix | Jewellery Estimations, User Roles | **Open — Patch Ready** |
| **BLK-02** | **P1** | Authorization / Routing | Operational Routes Inadequately Guarded in App.tsx | POS, Inventory, Estimations, Wholesale | **Open — Patch Ready** |
| **BLK-03** | **P1** | Data Integrity / Sync | Offline Write Divergence without Automated Sync Queue | Multi-Device Sync, Offline Operations | **Open — Mitigation Documented** |

---

## Blocker Details & Remediation Plans

### BLK-01: Estimation Permission Codes Omitted from Admin Role Matrix

- **Severity:** P1 (High)
- **Affected File:** `src/lib/utils.ts` (lines 97–138, lines 139–163)
- **Root Cause:**
  In `src/types/index.ts`, domain-specific estimation permissions were added:
  ```typescript
  export type PermissionCode =
    | ...
    | 'view_estimations'
    | 'create_estimations'
    | 'edit_estimations'
    | 'delete_estimations'
    | 'upload_estimation_images'
    | 'approve_estimations'
    | 'convert_estimation'
    | 'export_estimation'
    | 'share_estimation'
    | 'view_custom_designs';
  ```
  However, in `src/lib/utils.ts`, `ROLE_PERMISSIONS.admin` and `ROLE_PERMISSIONS.manager` were never updated to include these codes.
- **Operational Impact:**
  `super_admin` bypasses the check via `if (role === 'super_admin') return true;`. However, standard `admin` accounts (store managers, co-owners, or operational leads) return `false` on any `can('view_estimations')` or `can('create_estimations')` check, causing unauthorized denials or hidden action buttons.
- **Steps to Reproduce:**
  1. Create a user account with role `'admin'`.
  2. Log in with this account.
  3. Execute `useAuth().can('create_estimations')` or `hasPermission('admin', 'create_estimations')`.
  4. Returns `false` instead of `true`.
- **Recommended Code Fix:**
  Add the missing permissions to `ROLE_PERMISSIONS.admin` and `ROLE_PERMISSIONS.manager` in `src/lib/utils.ts`:
  ```typescript
  admin: [
    ...
    'view_estimations',
    'create_estimations',
    'edit_estimations',
    'upload_estimation_images',
    'approve_estimations',
    'convert_estimation',
    'export_estimation',
    'share_estimation',
    'view_custom_designs',
  ],
  manager: [
    ...
    'view_estimations',
    'create_estimations',
    'edit_estimations',
    'upload_estimation_images',
    'export_estimation',
    'share_estimation',
    'view_custom_designs',
  ],
  ```

---

### BLK-02: Operational Routes Inadequately Guarded in App.tsx

- **Severity:** P1 (High)
- **Affected File:** `src/App.tsx` (lines 142–182)
- **Root Cause:**
  In `src/App.tsx`, while administrative settings routes are guarded by `<RoleRoute>`, all core operational routes (`/estimations`, `/custom-orders`, `/pos`, `/products`, `/manufacturing`, `/wholesale-issues`, `/purchases`, `/expenses`) are wrapped only in `<ProtectedRoute>`:
  ```tsx
  <Route path="/pos" element={<ProtectedRoute><RetailPOS /></ProtectedRoute>} />
  <Route path="/estimations" element={<ProtectedRoute><EstimationsList /></ProtectedRoute>} />
  ```
  `<ProtectedRoute>` only verifies whether a user is logged in (`if (!user)`), without checking permissions or roles.
- **Operational Impact:**
  A read-only user (such as a trainee, viewer, or receptionist) can type `/pos` or `/wholesale-issues/new` directly into the browser URL bar and load the billing or consignment creation forms.
- **Steps to Reproduce:**
  1. Log in with a user account assigned the `'viewer'` role.
  2. Navigate directly to `https://shankar-jewellery-erp.vercel.app/pos`.
  3. The Retail POS billing counter loads instead of rendering a `403 Forbidden` page.
- **Recommended Code Fix:**
  Wrap sensitive operational routes in `<RoleRoute>` with appropriate permissions or allowed roles:
  ```tsx
  <Route
    path="/pos"
    element={
      <RoleRoute allowedRoles={['super_admin', 'admin', 'manager', 'billing_staff']} requiredPermission="billing.create">
        <RetailPOS />
      </RoleRoute>
    }
  />
  <Route
    path="/estimations/new"
    element={
      <RoleRoute allowedRoles={['super_admin', 'admin', 'manager', 'billing_staff']} requiredPermission="create_estimations">
        <CreateEstimation />
      </RoleRoute>
    }
  />
  <Route
    path="/wholesale-issues/new"
    element={
      <RoleRoute allowedRoles={['super_admin', 'admin', 'manager', 'inventory_staff']} requiredPermission="create_wholesale_issue">
        <WholesaleIssuePage />
      </RoleRoute>
    }
  />
  ```

---

### BLK-03: Offline Write Divergence without Automated Sync Queue

- **Severity:** P1 (High)
- **Affected Files:** `src/lib/dataService.ts`, `src/lib/supabase.ts`
- **Root Cause:**
  When a write operation (e.g. creating an estimation or customer) fails due to lack of network connectivity or session expiration, the codebase falls back to saving the entity in `localStorage` via `getLocalDb()`. However, there is no persistent background sync queue that re-submits cached mutations to Supabase once connectivity is re-established.
- **Operational Impact:**
  If a staff member creates a quotation or customer on mobile while entering a basement vault or cellular dead zone, the record is stored only in the mobile device's browser memory. The desktop counter will never see this record, re-creating the "Desktop shows 2, Mobile shows 0" issue.
- **Steps to Reproduce:**
  1. Disconnect mobile device from network (Airplane mode).
  2. Create an estimation or retail customer.
  3. Re-enable network connectivity.
  4. Notice that the record remains only on the local device and is not automatically synced to Supabase until manual intervention occurs.
- **Recommended Mitigation:**
  1. Add an online status listener (`window.addEventListener('online', ...)`) in `src/lib/syncEngine.ts`.
  2. If an offline mutation occurs, store the payload in an IndexedDB/localStorage `pending_mutations_queue`.
  3. Upon reconnecting, automatically drain the queue by calling the corresponding Supabase insert endpoints.
  4. Display an explicit banner in the UI whenever working in offline mode: `"Working offline — data will sync when connection returns"`.
