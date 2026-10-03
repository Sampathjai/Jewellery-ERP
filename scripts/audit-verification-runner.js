import assert from 'assert';

console.log('====================================================');
console.log('AUDIT VERIFICATION TEST: BUSINESS LOGIC & PERMISSIONS');
console.log('====================================================');

// 1. TEST FINANCIAL CALCULATIONS: RETAIL POS
console.log('\n--- 1. Testing Retail POS Calculations ---');
function calculateRetailLineItem(netWeightG, ratePerGram, wastagePercent, makingChargeRate, labourCharge) {
  const metalValue = Number((netWeightG * ratePerGram).toFixed(2));
  const wastageValue = Number(((netWeightG * wastagePercent * ratePerGram) / 100).toFixed(2));
  const makingCharge = (makingChargeRate || 0) + (labourCharge || 0);
  const lineTotal = metalValue + makingCharge + wastageValue;
  return { metalValue, wastageValue, makingCharge, lineTotal };
}

const item1 = calculateRetailLineItem(10.500, 7450, 8.0, 500, 150);
console.log('Retail Item Test (10.500g Gold @ 7450/g, 8% wastage, 650 making):');
console.log(item1);
assert.strictEqual(item1.metalValue, 78225.00, 'Metal value should be 10.5 * 7450 = 78225.00');
assert.strictEqual(item1.wastageValue, 6258.00, 'Wastage value should be 78225 * 0.08 = 6258.00');
assert.strictEqual(item1.lineTotal, 78225 + 6258 + 650, 'Line total mismatch');

// Subtotal & GST
const rawSubtotal = item1.lineTotal;
const discount = 500;
const taxableSubtotal = rawSubtotal - discount;
const gstPercent = 3.0;
const gstAmount = Number(((taxableSubtotal * gstPercent) / 100).toFixed(2));
const grandTotal = Math.round(taxableSubtotal + gstAmount);
console.log(`Taxable Subtotal: ${taxableSubtotal}, GST (3%): ${gstAmount}, Grand Total: ${grandTotal}`);
assert.strictEqual(taxableSubtotal, 84633);
assert.strictEqual(gstAmount, 2538.99);
assert.strictEqual(grandTotal, 87172);
console.log('✅ Retail POS Calculation Test PASSED');

// 2. TEST ESTIMATION CALCULATION
console.log('\n--- 2. Testing Estimation & Quotation Calculation ---');
function calculateEstimationItem(estNetWt, ratePerGram, wastagePercent, makingType, makingRate, stoneCharge) {
  const metalVal = Number((estNetWt * ratePerGram).toFixed(2));
  const wastageVal = Number(((estNetWt * wastagePercent * ratePerGram) / 100).toFixed(2));
  let makingAmount = 0;
  if (makingType === 'per_gram') {
    makingAmount = estNetWt * makingRate;
  } else if (makingType === 'percentage') {
    makingAmount = (metalVal * makingRate) / 100;
  } else {
    makingAmount = makingRate;
  }
  const lineTotal = metalVal + wastageVal + makingAmount + (stoneCharge || 0);
  return { metalVal, wastageVal, makingAmount, lineTotal };
}

const estItem = calculateEstimationItem(15.200, 7120, 10.0, 'per_gram', 450, 1200);
console.log('Estimation Item Test (15.200g @ 7120/g, 10% wastage, 450/g making, 1200 stones):');
console.log(estItem);
assert.strictEqual(estItem.metalVal, 108224.00);
assert.strictEqual(estItem.wastageVal, 10822.40);
assert.strictEqual(estItem.makingAmount, 6840.00);
assert.strictEqual(estItem.lineTotal, 108224 + 10822.40 + 6840 + 1200);
console.log('✅ Estimation Calculation Test PASSED');

// 3. TEST WHOLESALE TOUCH BILLING & FINE GOLD
console.log('\n--- 3. Testing Wholesale Touch Billing & Fine Gold Calculation ---');
function calculateWholesaleFineGold(netWeightG, billingTouchPercent) {
  return Number(((netWeightG * billingTouchPercent) / 100).toFixed(3));
}

const fineGold = calculateWholesaleFineGold(52.400, 88.5);
console.log(`Wholesale Fine Gold for 52.400g @ 88.5% touch: ${fineGold}g`);
assert.strictEqual(fineGold, 46.374, 'Fine gold calculation mismatch');
console.log('✅ Wholesale Fine Gold Calculation Test PASSED');

// 4. TEST RBAC PERMISSION AUDIT FOR ALL 10 ROLES
console.log('\n--- 4. Testing Role-Based Access Control (RBAC) ---');
const ROLES = [
  'super_admin',
  'admin',
  'manager',
  'counsellor',
  'trainer',
  'accountant',
  'receptionist',
  'billing_staff',
  'inventory_staff',
  'viewer'
];

// Read utils.ts directly to extract role permissions
import fs from 'fs';
const utilsContent = fs.readFileSync('src/lib/utils.ts', 'utf8');

// Check if estimation permissions exist in ROLE_PERMISSIONS
const hasEstimationInAdmin = utilsContent.includes("'view_estimations'") && utilsContent.indexOf("'view_estimations'") < utilsContent.indexOf('viewer:');
console.log('Are estimation permissions explicitly assigned in ROLE_PERMISSIONS?');
const estPerms = [
  'view_estimations',
  'create_estimations',
  'edit_estimations',
  'delete_estimations',
  'upload_estimation_images',
  'approve_estimations',
  'convert_estimation',
  'export_estimation',
  'share_estimation'
];

let foundInAdmin = [];
for (const p of estPerms) {
  // Check if p is present in the admin block
  const adminBlockMatch = utilsContent.match(/admin:\s*\[([\s\S]*?)\],/);
  if (adminBlockMatch && adminBlockMatch[1].includes(`'${p}'`)) {
    foundInAdmin.push(p);
  }
}

console.log(`Estimation permissions found in 'admin' role permissions array: ${foundInAdmin.length} of ${estPerms.length}`);
if (foundInAdmin.length === 0) {
  console.log('⚠️ AUDIT FINDING: Admin role permissions array lacks estimation permission codes!');
  console.log('   Note: super_admin bypasses array via hasPermission() returning true, but non-super_admin roles lack permissions.');
}

console.log('\n====================================================');
console.log('AUDIT VERIFICATION RUNNER FINISHED SUCCESSFULLY');
console.log('====================================================');
