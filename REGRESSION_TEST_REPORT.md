# SHANKAR JEWELLERY ERP — REGRESSION TEST REPORT

**Audit Date:** October 2026  
**Auditor:** Senior QA Engineer, Security Auditor & Full-Stack Architect  
**Scope:** Verification of build stability, security test suites, mathematical calculations, and cross-feature regression boundaries.

---

## 1. Automated Test Suite Results

### 1.1 Security Test Suite (`npm run test:security`)
- **Script:** `scripts/security-audit-test.js`
- **Execution Date:** October 2026
- **Result:** 9 Passed, 0 Failed

| Test ID | Test Description | Result | Output Evidence |
|---|---|---|---|
| SEC-01 | Rate limiter starts unthrottled for new email | ✅ PASS | `[PASS] Rate limiter starts unthrottled for new email` |
| SEC-02 | Rate limiter tracks consecutive failed attempts | ✅ PASS | `[PASS] Rate limiter tracks consecutive failed attempts` |
| SEC-03 | Rate limiter triggers lockout on 5th consecutive failure | ✅ PASS | `[PASS] Rate limiter triggers lockout on 5th consecutive failure` |
| SEC-04 | Rate limiter resets failure counter on successful authentication | ✅ PASS | `[PASS] Rate limiter resets failure counter on successful authentication` |
| SEC-05 | Password length validation enforces minimum 8 characters | ✅ PASS | `[PASS] Password length validation enforces minimum 8 characters` |
| SEC-06 | Authentication error messages are generic and non-enumerating | ✅ PASS | `[PASS] Authentication error messages are generic and non-enumerating` |
| SEC-07 | PIN complexity rejects non-numeric, wrong length, and trivial sequences | ✅ PASS | `[PASS] PIN complexity rejects non-numeric, wrong length, and trivial sequences` |
| SEC-08 | PIN complexity accepts strong, non-trivial 6-digit PINs | ✅ PASS | `[PASS] PIN complexity accepts strong, non-trivial 6-digit PINs` |
| SEC-09 | Device credential validation rejects inactive or deleted users | ✅ PASS | `[PASS] Device credential validation rejects inactive or deleted users` |

---

### 1.2 Mathematical & Business Logic Verification Suite (`scripts/audit-verification-runner.js`)
- **Execution Date:** October 2026
- **Result:** 4 Test Categories Evaluated

| Test Area | Input Data | Expected Result | Actual Result | Verification Status |
|---|---|---|---|---|
| **Retail POS Gold Billing** | 10.500g Gold @ ₹7,450/g, 8% Wastage, ₹650 Making Charge, ₹500 Discount, 3% GST | Metal Val: ₹78,225<br>Wastage: ₹6,258<br>Line Total: ₹85,133<br>Taxable: ₹84,633<br>GST: ₹2,538.99<br>Grand Total: ₹87,172 | Metal Val: ₹78,225<br>Wastage: ₹6,258<br>Line Total: ₹85,133<br>Taxable: ₹84,633<br>GST: ₹2,538.99<br>Grand Total: ₹87,172 | ✅ PASS |
| **Jewellery Estimation Math** | 15.200g @ ₹7,120/g, 10% Wastage, ₹450/g Making, ₹1,200 Stone Charge | Metal Val: ₹108,224<br>Wastage: ₹10,822.40<br>Making: ₹6,840<br>Line Total: ₹127,086.40 | Metal Val: ₹108,224<br>Wastage: ₹10,822.40<br>Making: ₹6,840<br>Line Total: ₹127,086.40 | ✅ PASS |
| **Wholesale Fine Gold Calculation** | 52.400g @ 88.5% Touch | Fine Gold: 46.374g | Fine Gold: 46.374g | ✅ PASS |
| **Admin Role Estimation Permissions** | Check `ROLE_PERMISSIONS.admin` for `view_estimations`, `create_estimations` | Admin permissions include estimation codes | Estimation codes missing from admin array | ❌ FAIL (Tracked in BLK-01) |

---

## 2. Compilation, Lint & Build Regression

### 2.1 TypeScript Compilation (`tsc --noEmit`)
- **Command:** `npm run lint`
- **Output:** Clean exit with code 0.
- **Findings:** No type errors, syntax errors, or unresolvable imports in the current codebase.

### 2.2 Production Vite Build (`npm run build`)
- **Command:** `npm run build`
- **Build Duration:** 4.32s
- **Output:**
  ```text
  dist/index.html                              1.42 kB │ gzip:   0.67 kB
  dist/assets/index-DkHxA2Ko.css              89.57 kB │ gzip:  13.61 kB
  dist/assets/index.es-DSdB8thy.js           150.86 kB │ gzip:  51.62 kB
  dist/assets/vendor-supabase-3Te545q_.js    227.01 kB │ gzip:  58.86 kB
  dist/assets/vendor-recharts-mj5uV0-v.js    574.51 kB │ gzip: 168.57 kB
  dist/assets/vendor-pdf-130EKTcY.js         623.30 kB │ gzip: 188.03 kB
  dist/assets/index-DziKwDcG.js            1,535.38 kB │ gzip: 431.62 kB
  ✓ built in 4.32s
  ```
- **Findings:**
  - Build succeeds without errors.
  - Rollup bundle splitting creates dedicated vendor chunks for PDF generator, Supabase, and Recharts charts.
  - Main bundle size is ~1.5MB uncompressed (~431kB gzip), acceptable for a complex enterprise ERP with 38+ modules.

---

## 3. UI and Cross-Device Layout Regression

| Feature Area | Layout & Boundary Verification | Result |
|---|---|---|
| **Estimation PDF A4 Portrait** | Content width constrained to 182mm (Margins: Left 14mm, Right 14mm). No horizontal overflow. Total table width 182mm. | ✅ PASS |
| **Mobile Navigation (<640px)** | Bottom navigation bar displayed (`BottomNav.tsx`). Sidebar auto-collapses to hamburger drawer. | ✅ PASS |
| **POS Responsive Counter** | Dual-column layout collapses to single column on tablet/mobile screens without clipping cart items. | ✅ PASS |
| **Tamil Language Labels** | சேதாரம் (Setharam) and localized units render properly across POS and quotation views. | ✅ PASS |

---

## 4. Live Cloud Database Regression Check

- **Endpoint:** `https://czrqgnoqdbzdlarslqlk.supabase.co`
- **Verified Tables:**
  - `business_settings`: 1 active record (Shankar Jewellery, Trichy).
  - `metal_rates`: 9 records present; Cloud Sync Vault rows at 1970-01-01 active.
  - `estimations`, `estimation_items`, `custom_orders`: Created and verified in Supabase PostgreSQL schema.
  - `trusted_devices`: Table created with device token hash and credential ID indexes.
- **Row Level Security (RLS):**
  - Confirmed active on all sensitive tables (`auth.role() = 'authenticated'`).
  - Unauthenticated access correctly returns HTTP 403 / PostgreSQL error 42501.
