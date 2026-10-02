# MASTER AUDIT & ARCHITECTURAL ROOT CAUSE REPORT
## Shankar Jewellery ERP: Global Cross-Device Sync, Wholesale, Estimations, User Devices & Biometrics

---

### 1. STORAGE SOURCE & SYNC AUDIT MATRIX (PART 3)

| Module | Storage Source | Database Source | Realtime Subscribed? | Device-Specific? | Primary Issue & Root Cause |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Customers** | React state (`customersList`) | Supabase `public.customers` | **YES** (`postgres_changes` + `syncEngine`) | **NO** (Cloud-backed) | **Reference implementation** — fully works across devices because table exists in Supabase and RLS allows authenticated CRUD. |
| **Estimations & Quotes** | React state (`estimations`) | Supabase `public.estimations` (failed with `PGRST205`) | **YES** (`syncEngine` + broadcast) | **YES** (fell back to `localStorage`) | `public.estimations` table was not created in remote Supabase schema cache. Code fell back to device `localStorage`, so laptop had 2 quotations but mobile had 0. |
| **Wholesale Issues** | React state (`issuesList`) | Supabase `public.wholesale_issues` | **YES** in `WholesaleIssuesList` | **NO** (Table exists in Supabase) | Table exists in Supabase, but child items (`wholesale_issue_items`), payments, and returns were not in `supabase_realtime` publication, causing sync gaps between screens. |
| **Wholesale Holdings** | React state (`wholesaleIssues`, `customers`) | Supabase `public.wholesale_issues` | **NO** (Missing subscription) | **YES** (Cached fallback) | `WholesaleHoldings.tsx` was completely missing `syncEngine.subscribeDataChange()`. When changes occurred on laptop, mobile never re-fetched. |
| **Wholesale Returns** | React state (`returnsList`) | Supabase `public.wholesale_returns` | **NO** (Missing subscription) | **YES** (Cached fallback) | `WholesaleReturns.tsx` was completely missing `syncEngine.subscribeDataChange()`. |
| **Wholesale Sold Items** | React state (`salesList`) | Supabase `public.wholesale_sales` | **NO** (Missing subscription) | **YES** (Cached fallback) | `WholesaleSoldItems.tsx` was completely missing `syncEngine.subscribeDataChange()`. |
| **Wholesale Ledger** | React state (`issues`, `payments`, `returns`) | Supabase `wholesale_*` tables | **YES** (`syncEngine`) | **NO** | Reads from Supabase, but payments/returns updates were not propagating across all devices via realtime. |
| **User Login Settings / Devices** | React state (`trustedDevices`) | Supabase `public.trusted_devices` (failed with `PGRST205`) | **NO** (Failed query fell back to local cache) | **YES** (Stored in `localStorage`) | `trusted_devices` table missing in remote Supabase schema. Fell back to `localStorage['shankar_erp_trusted_devices_cache']`. Laptop only sees laptop; mobile only sees mobile! |
| **Biometric / PIN Credentials** | Local Device Vault (`shankar_erp_device_vault`) | Supabase `trusted_devices` (failed with `PGRST205`) | Partial | **YES** | Hardware credential metadata was not reliably validated server-side because `trusted_devices` table missing in Supabase, causing `verifyDeviceCredential` to fail and biometrics to disappear. |
| **Products & Inventory** | React state | Supabase `public.products` | **YES** (`postgres_changes` + `syncEngine`) | **NO** | Working properly in Supabase. |
| **Retail Invoices** | React state | Supabase `public.retail_invoices` | **YES** (`postgres_changes` + `syncEngine`) | **NO** | Working properly in Supabase. |
| **Business Settings** | React state | Supabase `public.business_settings` | **YES** (`postgres_changes` + `syncEngine`) | **NO** | Working properly in Supabase (1 row). |
| **Metal Rates** | React state | Supabase `public.metal_rates` | **YES** (`postgres_changes` + `syncEngine`) | **NO** | Working properly in Supabase. |

---

### 2. DETAILED ROOT CAUSE ANALYSIS

#### A. Estimation / Quotation Root Cause
1. In the remote Supabase database (`czrqgnoqdbzdlarslqlk.supabase.co`), `public.estimations` returns `PGRST205: Could not find the table 'public.estimations' in the schema cache`.
2. When `dataService.getEstimations()` was called, it failed Supabase query and fell back to `getLocalDb().estimations` from `localStorage`.
3. Because `localStorage` is isolated per physical browser, the laptop had 2 quotations in its `localStorage`, but mobile's `localStorage` was empty (`0`).
4. In our last commit, the `fetchFromCloudVault` call in `estimationService.ts` was accidentally reverted, causing mobile to continue reading from empty local cache.

#### B. Wholesale Module Root Cause
1. All wholesale tables (`wholesale_issues`, `wholesale_issue_items`, `wholesale_payments`, `wholesale_returns`, `wholesale_settlements`, `wholesale_sales`) exist in Supabase.
2. However:
   - `WholesaleHoldings.tsx`, `WholesaleReturns.tsx`, and `WholesaleSoldItems.tsx` did not subscribe to `syncEngine.subscribeDataChange()`.
   - Only `wholesale_issues` was part of Supabase's default `supabase_realtime` publication in early schema, while `wholesale_payments` and `wholesale_returns` were not.
   - When payments or returns were created, localDb was updated, but remote devices only refreshed if `wholesale_issues` was also touched.
   - In `getWholesaleIssues()`, if items were missing, it queried `wholesale_issue_items`, but if empty, it fell back to `localDb` instead of ensuring database integrity.

#### C. User Login Settings & Device Registry Root Cause
1. Table `public.trusted_devices` / `public.user_devices` does NOT exist in remote Supabase (`PGRST205`).
2. `registerTrustedDevice()` in `dataService.ts` caught the error and saved to `localStorage['shankar_erp_trusted_devices_cache']`.
3. `getTrustedDevices(userId)` in `dataService.ts` failed on Supabase and returned the local `localStorage` list.
4. Hence, mobile device saw ONLY mobile device; laptop saw ONLY laptop device.
5. Device limit was evaluated client-side rather than server-side across all devices for that account.

#### D. Fingerprint / Biometric Login Root Cause
1. WebAuthn credentials were generated on the physical device (Touch ID / Face ID), which is correct. Biometric templates stay inside the Secure Enclave / TPM.
2. However, server-side registration of the credential ID and public key in Supabase failed because `trusted_devices` was missing.
3. When the user attempted biometric or PIN login, `unlockWithBiometrics()` called `dataService.verifyDeviceCredential()`, which queried `trusted_devices` in Supabase. Supabase returned `PGRST205`, causing `verifyDeviceCredential` to fail with "Device credential is invalid or has been revoked."
4. When `Login.tsx` received this failure, it forced the user back to password login.
5. In addition, when settings were updated or saved in User Login Settings, the lack of cloud device persistence led the UI to perceive the device as unregistered.

---

### 3. THE PROVEN WORKING ARCHITECTURE TO REUSE

We reuse the exact pattern demonstrated by **Customer**:
```
User Action (Laptop / Mobile)
     │
     ▼
dataService / Service Layer
     │
     ▼
Supabase PostgreSQL (Single Source of Truth)
     │
     ├────────────────────────────────────────┐
     ▼                                        ▼
Server Success Response           Realtime Broadcast Engine
     │                            (WebSockets + postgres_changes)
     ▼                                        │
Update Local UI State                         ▼
                                   All Other Authorized Devices
                                   (Mobile / Laptop / Tablet)
                                              │
                                              ▼
                                   Trigger Component Refresh
                                   from Supabase
```

### 4. MULTI-DEVICE DEVICE REGISTRY & WEBAUTHN ARCHITECTURE

```
                         USER ACCOUNT (e.g. admin@shankarjewellery.com)
                                           │
                        CENTRAL CLOUD DEVICE REGISTRY (Supabase)
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
Device 1: iPhone                                                    Device 2: MacBook
- device_id: dev_iphone_...                                         - device_id: dev_macbook_...
- device_type: face_id / touch_id                                   - device_type: touch_id
- credential_id: webauthn_cred_1                                    - credential_id: webauthn_cred_2
- public_key: base64_pubkey_1                                       - public_key: base64_pubkey_2
- status: active                                                    - status: active
- Secure Enclave: Holds private key 1                               - Secure Enclave: Holds private key 2
(Biometrics NEVER leave the device)                                 (Biometrics NEVER leave the device)
```
- Max devices enforced across the user account server-side (in Supabase).
- Revoking Device 1 revokes ONLY Device 1. Device 2 remains active.
- Unrelated business or user settings updates NEVER revoke or wipe credentials.
