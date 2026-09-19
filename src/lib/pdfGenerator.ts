import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  RetailInvoice,
  BusinessSettings,
  WholesaleIssue,
  WholesaleSettlement,
  Customer,
  WholesalePayment,
} from '@/types';
import { formatCurrency, formatWeight, formatDate } from './utils';
import { loadPdfFont } from './pdfFont';

// Helper for shop header info
function getShopHeaderDetails(settings?: BusinessSettings) {
  const name = settings?.shop_name || 'Shankar Jewellery';
  const addressParts = [
    settings?.address,
    settings?.city,
    settings?.state && settings?.pin_code ? `${settings.state} - ${settings.pin_code}` : (settings?.state || settings?.pin_code)
  ].filter(Boolean).join(', ');
  const address = addressParts || 'No.4 sandhukadai, bigbazzar street, Trichy - 620008';
  const phoneStr = `Phone: ${settings?.phone || '+91 98765 43210'}${settings?.gstin ? ` | GSTIN: ${settings.gstin}` : ''}`;
  return { name, address, phoneStr };
}

// ============================================================================
// STANDARDIZED PAYMENT & SETTLEMENT SUMMARY CARD
// ============================================================================
export interface PaymentSummaryOptions {
  doc: jsPDF;
  startY: number;
  title?: string;
  totalBillAmountLabel?: string;
  totalBillAmount: number;
  prevPaid?: number;
  currentPayment?: number;
  totalPaid?: number;
  remainingBalance?: number;
  statusOverride?: 'PAID' | 'PARTIALLY PAID' | 'UNPAID';
  gold916Details?: {
    weightG: number;
    rate: number;
    value: number;
  };
  cashPaid?: number;
}

export function renderPaymentSummaryCard(options: PaymentSummaryOptions): number {
  const {
    doc,
    startY,
    title = 'PAYMENT & SETTLEMENT SUMMARY',
    totalBillAmountLabel = 'Total Bill Amount:',
    totalBillAmount,
    prevPaid = 0,
    currentPayment = 0,
    gold916Details,
    cashPaid = 0,
  } = options;

  const totalPaid = options.totalPaid ?? (prevPaid + currentPayment);
  const remainingBal = options.remainingBalance ?? Math.max(0, totalBillAmount - totalPaid);

  let statusText = options.statusOverride;
  let statusColor: [number, number, number] = [180, 0, 0];

  if (!statusText) {
    if (remainingBal === 0 && totalPaid > 0) {
      statusText = 'PAID';
    } else if (totalPaid > 0) {
      statusText = 'PARTIALLY PAID';
    } else {
      statusText = 'UNPAID';
    }
  }

  if (statusText === 'PAID') {
    statusColor = [0, 128, 0];
  } else if (statusText === 'PARTIALLY PAID') {
    statusColor = [180, 100, 0];
  } else {
    statusColor = [180, 0, 0];
  }

  const hasExtraInfo = (gold916Details && gold916Details.weightG > 0) || cashPaid > 0;
  const boxHeight = hasExtraInfo ? 48 : 44;

  // Cream/Light background & Gold border
  doc.setFillColor(250, 248, 240);
  doc.rect(14, startY, 182, boxHeight, 'F');
  doc.setLineWidth(0.4);
  doc.setDrawColor(212, 175, 55);
  doc.rect(14, startY, 182, boxHeight, 'S');

  // Header Title
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(184, 134, 11);
  doc.text(title, 18, startY + 8);

  // Status Badge
  doc.setTextColor(...statusColor);
  doc.text(`STATUS: ${statusText}`, 145, startY + 8);

  // Left Column Labels & Values
  doc.setFontSize(8);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(totalBillAmountLabel, 18, startY + 16);
  doc.setFont('Georgia', 'bold');
  doc.text(formatCurrency(totalBillAmount), 65, startY + 16);

  doc.setFont('Georgia', 'normal');
  doc.text('Previously Paid:', 18, startY + 22);
  doc.text(formatCurrency(prevPaid), 65, startY + 22);

  doc.text('Current Payment:', 18, startY + 28);
  doc.text(formatCurrency(currentPayment), 65, startY + 28);

  doc.setFont('Georgia', 'bold');
  doc.setTextColor(30, 31, 38);
  doc.text('Total Paid:', 18, startY + 35);
  doc.text(formatCurrency(totalPaid), 65, startY + 35);

  // Middle Optional Details (Gold / Cash)
  if (gold916Details && gold916Details.weightG > 0) {
    doc.setFont('Georgia', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(
      `916 Gold Recd: ${gold916Details.weightG} g @ ${formatCurrency(gold916Details.rate)}/g`,
      112,
      startY + 16
    );
    doc.text(`916 Gold Value: ${formatCurrency(gold916Details.value)}`, 112, startY + 22);
  }
  if (cashPaid > 0) {
    doc.setFont('Georgia', 'normal');
    doc.setTextColor(50, 50, 50);
    const cashY = (gold916Details && gold916Details.weightG > 0) ? startY + 28 : startY + 16;
    doc.text(`Cash Payment: ${formatCurrency(cashPaid)}`, 112, cashY);
  }

  // Right Side Prominent Balance Due
  doc.setFontSize(9);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(180, 0, 0);
  doc.text('Remaining Balance Due:', 112, startY + 35);
  doc.text(formatCurrency(remainingBal), 162, startY + 35);

  return startY + boxHeight;
}

// ============================================================================
// 1. RETAIL INVOICE PDF (Shankar Jewellery Customer Invoice)
// ============================================================================
export function generateRetailInvoicePDF(invoice: RetailInvoice, settings?: BusinessSettings) {
  const doc = new jsPDF();
  loadPdfFont(doc);

  const shop = getShopHeaderDetails(settings);

  // Premium Dark Header Banner
  doc.setFillColor(30, 31, 38);
  doc.rect(0, 0, 210, 38, 'F');

  doc.setTextColor(212, 175, 55); // Gold Accent
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(22);
  doc.text(shop.name, 14, 18);

  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.setFont('Georgia', 'normal');
  doc.text(shop.address, 14, 25);
  doc.text(shop.phoneStr, 14, 31);

  // Title Tag
  doc.setFillColor(212, 175, 55);
  doc.rect(145, 12, 50, 14, 'F');
  doc.setTextColor(18, 18, 23);
  doc.setFontSize(11);
  doc.setFont('Georgia', 'bold');
  doc.text('RETAIL INVOICE', 148, 21);

  // Bill To & Invoice Meta
  doc.setTextColor(30, 31, 38);
  doc.setFontSize(10);
  doc.setFont('Georgia', 'bold');
  doc.text('BILLED TO:', 14, 48);

  doc.setFont('Georgia', 'normal');
  doc.setFontSize(9);
  doc.text(`Customer Name: ${invoice.customer_name || 'Walk-in Customer'}`, 14, 55);
  doc.text(`Phone Number: ${invoice.customer_phone || 'N/A'}`, 14, 61);

  doc.setFont('Georgia', 'bold');
  doc.text(`Invoice No: ${invoice.invoice_number}`, 130, 48);
  doc.setFont('Georgia', 'normal');
  doc.text(`Invoice Date: ${formatDate(invoice.invoice_date)}`, 130, 55);
  doc.text(`Payment Status: ${invoice.status.toUpperCase()}`, 130, 61);

  // Item Table
  const tableData = invoice.items.map((item, idx) => [
    idx + 1,
    `${item.product_name_snapshot}\nSKU: ${item.sku_snapshot}`,
    `${item.metal_type.toUpperCase()} (${item.purity.toUpperCase()})`,
    formatWeight(item.gross_weight_g),
    formatWeight(item.net_weight_g),
    formatCurrency(item.metal_rate_snapshot),
    formatCurrency(item.metal_value),
    formatCurrency(item.making_charge + item.labour_charge + item.wastage_value),
    formatCurrency(item.line_total),
  ]);

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Item Description', 'Metal / Purity', 'Gross Wt', 'Net Wt', 'Rate / g', 'Metal Value', 'Making / Wastage', 'Line Total']],
    body: tableData,
    headStyles: { fillColor: [30, 31, 38], textColor: [212, 175, 55], fontStyle: 'bold', fontSize: 8, font: 'Georgia' },
    styles: { fontSize: 8, cellPadding: 3, font: 'Georgia' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;

  // Summary Card (Subtotal metal, making, discount, tax, grand total)
  doc.setFillColor(248, 249, 250);
  doc.rect(120, finalY + 5, 76, 46, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(120, finalY + 5, 76, 46, 'S');

  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.setFont('Georgia', 'normal');

  doc.text(`Subtotal Metal Value:`, 124, finalY + 14);
  doc.text(formatCurrency(invoice.subtotal_metal_value), 190, finalY + 14, { align: 'right' });

  doc.text(`Making & Wastage Charges:`, 124, finalY + 20);
  doc.text(formatCurrency(invoice.total_making_charges + invoice.total_labour_charges + invoice.total_wastage_value), 190, finalY + 20, { align: 'right' });

  if (invoice.discount_amount > 0) {
    doc.text(`Discount:`, 124, finalY + 26);
    doc.text(`-${formatCurrency(invoice.discount_amount)}`, 190, finalY + 26, { align: 'right' });
  }

  if (invoice.tax_amount > 0) {
    doc.text(`Tax (${invoice.tax_percent}%):`, 124, finalY + 32);
    doc.text(formatCurrency(invoice.tax_amount), 190, finalY + 32, { align: 'right' });
  }

  doc.setFont('Georgia', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(184, 134, 11);
  doc.text(`Grand Total:`, 124, finalY + 44);
  doc.text(formatCurrency(invoice.total_amount), 190, finalY + 44, { align: 'right' });

  // Bank Info
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont('Georgia', 'normal');
  doc.text('Bank Payment Info:', 14, finalY + 14);
  doc.text(`Bank: ${settings?.bank_name || 'State Bank of India'} | A/C: ${settings?.bank_account_number || '39182746501'}`, 14, finalY + 20);
  doc.text(`IFSC: ${settings?.bank_ifsc || 'SBIN0001234'} | UPI: ${settings?.upi_id || 'shankarjewels@upi'}`, 14, finalY + 26);
  doc.text('Terms: Goods certified under Hallmark standards. Return subject to shop policy.', 14, finalY + 35);

  // Standardized Payment & Settlement Summary Card
  const totalBillVal = invoice.total_amount || 0;
  const currentPaid = invoice.paid_amount || 0;
  const prevPaid = 0;
  const totalPaid = currentPaid;
  const remainingBal = invoice.balance_due ?? Math.max(0, totalBillVal - totalPaid);

  let statusOverride: 'PAID' | 'PARTIALLY PAID' | 'UNPAID' = 'UNPAID';
  if (invoice.payment_status === 'paid' || remainingBal === 0) {
    statusOverride = 'PAID';
  } else if (invoice.payment_status === 'partial' || currentPaid > 0) {
    statusOverride = 'PARTIALLY PAID';
  }

  const payFinalY = renderPaymentSummaryCard({
    doc,
    startY: finalY + 54,
    title: 'PAYMENT & SETTLEMENT SUMMARY',
    totalBillAmountLabel: 'Total Bill Amount:',
    totalBillAmount: totalBillVal,
    prevPaid,
    currentPayment: currentPaid,
    totalPaid,
    remainingBalance: remainingBal,
    statusOverride,
  });

  // Signatures
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont('Georgia', 'normal');

  doc.text('Customer Signature', 14, payFinalY + 16);
  doc.line(14, payFinalY + 14, 60, payFinalY + 14);

  doc.text('Authorized Shankar Jewellery Signature', 130, payFinalY + 16);
  doc.line(130, payFinalY + 14, 190, payFinalY + 14);

  doc.save(`${invoice.invoice_number}.pdf`);
}

// ============================================================================
// 2. CUSTOMER-FACING WHOLESALE INVOICE PDF (Strictly NO Touch percentages)
// ============================================================================
export function generateCustomerWholesaleIssuePDF(
  issue: WholesaleIssue,
  customer?: Customer,
  settings?: BusinessSettings
) {
  const doc = new jsPDF();
  loadPdfFont(doc);

  const shop = getShopHeaderDetails(settings);
  const custName = customer?.full_name || issue.customer_name || 'Wholesale Partner';
  const custShop = customer?.shop_name || issue.customer_shop || '';
  const custPhone = customer?.phone || '';

  // Premium Header Banner
  doc.setFillColor(30, 31, 38);
  doc.rect(0, 0, 210, 38, 'F');

  doc.setTextColor(212, 175, 55); // Gold Accent
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(22);
  doc.text(shop.name, 14, 18);

  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.setFont('Georgia', 'normal');
  doc.text(shop.address, 14, 25);
  doc.text(shop.phoneStr, 14, 31);

  // Title Tag
  doc.setFillColor(212, 175, 55);
  doc.rect(135, 12, 60, 14, 'F');
  doc.setTextColor(18, 18, 23);
  doc.setFontSize(10);
  doc.setFont('Georgia', 'bold');
  doc.text('WHOLESALE INVOICE', 139, 21);

  // Customer & Bill Information Header
  doc.setTextColor(30, 31, 38);
  doc.setFontSize(10);
  doc.setFont('Georgia', 'bold');
  doc.text('CUSTOMER INFORMATION:', 14, 48);

  doc.setFont('Georgia', 'normal');
  doc.setFontSize(9);
  doc.text(`Customer Name: ${custName}`, 14, 55);
  doc.text(`Shop Name: ${custShop || 'Dealer'}`, 14, 61);
  doc.text(`Phone: ${custPhone} | City: ${customer?.city || 'Tamil Nadu'}`, 14, 67);

  doc.setFont('Georgia', 'bold');
  doc.text(`Invoice / Bill No: ${issue.issue_number}`, 125, 48);
  doc.setFont('Georgia', 'normal');
  doc.text(`Invoice Date: ${formatDate(issue.issue_date)}`, 125, 55);
  doc.text(`Expected Reconciliation: ${formatDate(issue.expected_return_date)}`, 125, 61);

  // Table Data (STRICTLY NO Actual Touch / Profit Touch / Final Touch columns!)
  const itemsList = issue.items && issue.items.length > 0 ? issue.items : [];
  const tableData = itemsList.map((item, idx) => {
    const fineGold = item.fine_gold_g || Number((((item.net_weight_g || 0) * (item.billing_touch || 47)) / 100).toFixed(3));

    return [
      idx + 1,
      `${item.product_name || 'Jewellery Item'}\nSKU: ${item.sku || 'SKU-NA'}`,
      `${item.quantity_issued || 1} Pcs`,
      formatWeight(item.gross_weight_g || 0),
      formatWeight(item.deduction_weight_g || 0),
      formatWeight(item.net_weight_g || 0),
      `${fineGold.toFixed(3)} g`,
      formatCurrency(item.total_issue_value || 0),
    ];
  });

  if (tableData.length === 0 && (issue.total_items_issued > 0 || issue.total_net_weight_g > 0)) {
    tableData.push([
      1,
      'Consignment Jewellery Issue (Aggregated Item Row)',
      `${issue.total_items_issued || 1} Pcs`,
      formatWeight(issue.total_gross_weight_g || 0),
      formatWeight(issue.total_deduction_weight_g || 0),
      formatWeight(issue.total_net_weight_g || 0),
      `${(issue.total_fine_gold_g || 0).toFixed(3)} g`,
      formatCurrency(issue.total_valuation_amount || 0),
    ]);
  }

  autoTable(doc, {
    startY: 73,
    head: [
      [
        '#',
        'Item Description',
        'Qty',
        'Gross Wt',
        'Deduction',
        'Net Wt',
        'Fine Gold',
        'Total Amount',
      ],
    ],
    body: tableData,
    headStyles: { fillColor: [30, 31, 38], textColor: [212, 175, 55], fontSize: 8, fontStyle: 'bold', font: 'Georgia' },
    styles: { fontSize: 8, cellPadding: 3, font: 'Georgia' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 130;

  // Bill Aggregated Totals Bar
  doc.setFillColor(245, 245, 247);
  doc.rect(14, finalY + 4, 182, 12, 'F');
  doc.setFontSize(8);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(30, 31, 38);
  doc.text(
    `Total Issued Qty: ${issue.total_items_issued} Pcs   |   Gross Wt: ${formatWeight(
      issue.total_gross_weight_g
    )}   |   Net Wt: ${formatWeight(issue.total_net_weight_g)}   |   Fine Gold: ${(
      issue.total_fine_gold_g || 0
    ).toFixed(3)} g`,
    18,
    finalY + 12
  );

  // REDESIGNED STANDARDIZED PAYMENT SUMMARY CARD
  const cashPaid = issue.cash_paid || 0;
  const goldPaidVal = issue.gold_916_value_paid || 0;
  const currentPaid = cashPaid + goldPaidVal;
  const totalBillVal = issue.total_valuation_amount;
  const prevPaid = 0;
  const totalPaid = prevPaid + currentPaid;
  const remainingBal = issue.remaining_balance ?? Math.max(0, totalBillVal - totalPaid);

  const payFinalY = renderPaymentSummaryCard({
    doc,
    startY: finalY + 20,
    title: 'PAYMENT & SETTLEMENT SUMMARY',
    totalBillAmountLabel: 'Total Bill Amount:',
    totalBillAmount: totalBillVal,
    prevPaid,
    currentPayment: currentPaid,
    totalPaid,
    remainingBalance: remainingBal,
    gold916Details: issue.gold_916_weight_paid_g ? {
      weightG: issue.gold_916_weight_paid_g,
      rate: issue.gold_916_rate,
      value: goldPaidVal,
    } : undefined,
    cashPaid,
  });

  // Footer & Signatures
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont('Georgia', 'normal');
  doc.text('Thank you for your business with Shankar Jewellery. All jewellery manufactured under hallmark standard.', 14, payFinalY + 10);

  doc.text('Customer Signature', 14, payFinalY + 24);
  doc.line(14, payFinalY + 22, 60, payFinalY + 22);

  doc.text('Authorized Shankar Jewellery Signature', 130, payFinalY + 24);
  doc.line(130, payFinalY + 22, 190, payFinalY + 22);

  doc.save(`Invoice_${issue.issue_number}.pdf`);
}

// ============================================================================
// 3. INTERNAL ADMIN VOUCHER PDF (Includes full Touch & Profit calculations)
// ============================================================================
export function generateInternalWholesaleIssuePDF(
  issue: WholesaleIssue,
  customer?: Customer,
  settings?: BusinessSettings
) {
  const doc = new jsPDF();
  loadPdfFont(doc);

  const shop = getShopHeaderDetails(settings);
  const custName = customer?.full_name || issue.customer_name || 'Wholesale Partner';
  const custShop = customer?.shop_name || issue.customer_shop || '';
  const custPhone = customer?.phone || '';

  // Dark Header Banner
  doc.setFillColor(30, 31, 38);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(212, 175, 55);
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(18);
  doc.text(shop.name, 14, 16);
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.setFont('Georgia', 'normal');
  doc.text('INTERNAL GOLDSMITH & TOUCH CALCULATION VOUCHER (ADMIN ONLY)', 14, 25);

  doc.setTextColor(30, 31, 38);
  doc.setFontSize(9);
  doc.setFont('Georgia', 'bold');
  doc.text(`Voucher / Issue No: ${issue.issue_number}`, 14, 44);
  doc.setFont('Georgia', 'normal');
  doc.text(`Date: ${formatDate(issue.issue_date)}`, 14, 50);

  doc.setFont('Georgia', 'bold');
  doc.text(`Wholesale Partner: ${custName}`, 110, 44);
  doc.setFont('Georgia', 'normal');
  doc.text(`Shop: ${custShop || 'N/A'} | Phone: ${custPhone}`, 110, 50);

  // Table Data with complete Touch calculation breakdown
  const itemsList = issue.items && issue.items.length > 0 ? issue.items : [];
  const tableData = itemsList.map((item, idx) => {
    const actTouch = item.actual_touch ?? customer?.default_actual_touch ?? 37;
    const billTouch = item.billing_touch ?? (actTouch + (item.profit_touch ?? customer?.default_profit_touch ?? 10));
    const profTouch = (item.profit_touch !== undefined && item.profit_touch !== null && item.profit_touch !== 0)
      ? item.profit_touch
      : (billTouch > actTouch ? (billTouch - actTouch) : (customer?.default_profit_touch ?? 10));
    const profTouchStr = profTouch > 0 ? `+${profTouch}%` : `${profTouch}%`;
    const fineGold = item.fine_gold_g ?? Number((((item.net_weight_g || 0) * billTouch) / 100).toFixed(3));
    const val = item.total_issue_value ?? 0;

    return [
      idx + 1,
      `${item.product_name || 'Jewellery Item'}${item.sku ? `\nSKU: ${item.sku}` : ''}`,
      `${item.quantity_issued ?? 1} Pcs`,
      formatWeight(item.gross_weight_g || 0),
      formatWeight(item.deduction_weight_g || 0),
      formatWeight(item.net_weight_g || 0),
      `${actTouch}%`,
      profTouchStr,
      `${billTouch}%`,
      `${fineGold.toFixed(3)} g`,
      formatCurrency(val),
    ];
  });

  if (tableData.length === 0 && (issue.total_items_issued > 0 || issue.total_net_weight_g > 0)) {
    const defaultProfit = customer?.default_profit_touch ?? issue.agreed_profit_percent ?? 10;
    const defaultActual = customer?.default_actual_touch ?? 40;
    const defaultBilling = customer?.default_billing_touch ?? (defaultActual + defaultProfit);
    const profTouchStr = defaultProfit > 0 ? `+${defaultProfit}%` : `${defaultProfit}%`;

    tableData.push([
      1,
      'Consignment Jewellery Issue (Aggregated Item Row)',
      `${issue.total_items_issued || 1} Pcs`,
      formatWeight(issue.total_gross_weight_g || 0),
      formatWeight(issue.total_deduction_weight_g || 0),
      formatWeight(issue.total_net_weight_g || 0),
      `${defaultActual}%`,
      profTouchStr,
      `${defaultBilling}%`,
      `${(issue.total_fine_gold_g || 0).toFixed(3)} g`,
      formatCurrency(issue.total_valuation_amount || 0),
    ]);
  }

  autoTable(doc, {
    startY: 56,
    head: [
      [
        '#',
        'Item Description',
        'Qty',
        'Gross Wt',
        'Deduction',
        'Net Wt',
        'Actual Touch',
        'Profit Touch',
        'Final Touch',
        'Fine Gold',
        'Valuation',
      ],
    ],
    body: tableData,
    headStyles: { fillColor: [30, 31, 38], textColor: [212, 175, 55], fontSize: 7, fontStyle: 'bold', font: 'Georgia' },
    styles: { fontSize: 7, cellPadding: 2, font: 'Georgia' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 110;

  // Bill Totals Card
  doc.setFillColor(245, 245, 247);
  doc.rect(14, finalY + 4, 182, 16, 'F');
  doc.setFontSize(8);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(30, 31, 38);
  doc.text(
    `Total Issued Qty: ${issue.total_items_issued} Pcs   |   Gross Wt: ${formatWeight(
      issue.total_gross_weight_g
    )}   |   Net Wt: ${formatWeight(issue.total_net_weight_g)}   |   Fine Gold: ${(
      issue.total_fine_gold_g || 0
    ).toFixed(3)} g`,
    18,
    finalY + 14
  );

  const cashPaid = issue.cash_paid || 0;
  const goldPaidVal = issue.gold_916_value_paid || 0;
  const currentPaid = cashPaid + goldPaidVal;
  const totalBillVal = issue.total_valuation_amount;
  const prevPaid = 0;
  const totalPaid = prevPaid + currentPaid;
  const remainingBal = issue.remaining_balance ?? Math.max(0, totalBillVal - totalPaid);

  const payFinalY = renderPaymentSummaryCard({
    doc,
    startY: finalY + 24,
    title: 'INTERNAL PAYMENT & SETTLEMENT SUMMARY',
    totalBillAmountLabel: 'Total Valuation:',
    totalBillAmount: totalBillVal,
    prevPaid,
    currentPayment: currentPaid,
    totalPaid,
    remainingBalance: remainingBal,
    gold916Details: issue.gold_916_weight_paid_g ? {
      weightG: issue.gold_916_weight_paid_g,
      rate: issue.gold_916_rate,
      value: goldPaidVal,
    } : undefined,
    cashPaid,
  });

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont('Georgia', 'normal');
  doc.text('CONFIDENTIAL: Internal goldsmith voucher. Contains proprietary melting touch and profit calculation metrics.', 14, payFinalY + 10);

  doc.save(`InternalVoucher_${issue.issue_number}.pdf`);
}

// Default export wrapper
export function generateWholesaleIssuePDF(
  issue: WholesaleIssue,
  customer?: Customer,
  settings?: BusinessSettings,
  isInternal: boolean = false
) {
  if (isInternal) {
    generateInternalWholesaleIssuePDF(issue, customer, settings);
  } else {
    generateCustomerWholesaleIssuePDF(issue, customer, settings);
  }
}

// ============================================================================
// 4. WHOLESALE SETTLEMENT PDF
// ============================================================================
export function generateWholesaleSettlementPDF(
  settlement: WholesaleSettlement,
  customer?: Customer,
  settings?: BusinessSettings
) {
  const doc = new jsPDF();
  loadPdfFont(doc);

  const shop = getShopHeaderDetails(settings);

  doc.setFillColor(30, 31, 38);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(212, 175, 55);
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(20);
  doc.text(shop.name, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.setFont('Georgia', 'normal');
  doc.text('WHOLESALE PROFIT-SHARING SETTLEMENT STATEMENT', 14, 25);

  doc.setTextColor(30, 31, 38);
  doc.setFontSize(9);
  doc.setFont('Georgia', 'bold');
  doc.text(`Settlement No: ${settlement.settlement_number}`, 14, 44);
  doc.setFont('Georgia', 'normal');
  doc.text(`Settlement Date: ${formatDate(settlement.settlement_date)}`, 14, 50);
  doc.setFont('Georgia', 'bold');
  doc.text(`Wholesale Partner: ${customer?.full_name || settlement.customer_name} (${customer?.shop_name || settlement.customer_shop || 'N/A'})`, 110, 44);
  doc.setFont('Georgia', 'normal');
  doc.text(`Period: ${formatDate(settlement.period_start)} to ${formatDate(settlement.period_end)}`, 110, 50);

  const tableData = [
    ['Total Gross Sales Value', formatCurrency(settlement.total_gross_sales)],
    ['Less: Cost / Valuation of Sold Items', `-${formatCurrency(settlement.total_cost_valuation)}`],
    ['Gross Profit Generated', formatCurrency(settlement.gross_profit)],
    ['Partner Profit Share', formatCurrency(settlement.customer_profit_share)],
    ['Shop Net Profit Share', formatCurrency(settlement.shop_profit_share)],
    ['Total Net Amount Payable to Shop', formatCurrency(settlement.net_payable_to_shop)],
    ['Amount Paid to Date', formatCurrency(settlement.amount_paid)],
    ['Outstanding Balance Due', formatCurrency(settlement.balance_due)],
  ];

  autoTable(doc, {
    startY: 58,
    head: [['Settlement Line Breakdown', 'Amount (₹)']],
    body: tableData,
    headStyles: { fillColor: [30, 31, 38], textColor: [212, 175, 55], font: 'Georgia' },
    styles: { font: 'Georgia' },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;

  const totalBillVal = settlement.net_payable_to_shop || 0;
  const currentPaid = settlement.amount_paid || 0;
  const prevPaid = 0;
  const totalPaid = currentPaid;
  const remainingBal = settlement.balance_due ?? Math.max(0, totalBillVal - totalPaid);

  const payFinalY = renderPaymentSummaryCard({
    doc,
    startY: finalY + 8,
    title: 'SETTLEMENT PAYMENT SUMMARY',
    totalBillAmountLabel: 'Total Net Payable:',
    totalBillAmount: totalBillVal,
    prevPaid,
    currentPayment: currentPaid,
    totalPaid,
    remainingBalance: remainingBal,
  });

  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.setFont('Georgia', 'normal');
  doc.text('Verified and Approved by Shop Management', 14, payFinalY + 20);
  doc.line(14, payFinalY + 18, 75, payFinalY + 18);

  doc.save(`${settlement.settlement_number}.pdf`);
}

// ============================================================================
// 5. CUSTOMER STATEMENT / LEDGER PDF
// ============================================================================
export function generateWholesaleCustomerStatementPDF(
  customer: Customer,
  payments: WholesalePayment[],
  issues: WholesaleIssue[],
  settings?: BusinessSettings
) {
  const doc = new jsPDF();
  loadPdfFont(doc);

  const shop = getShopHeaderDetails(settings);

  doc.setFillColor(30, 31, 38);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(212, 175, 55);
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(18);
  doc.text(shop.name, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.setFont('Georgia', 'normal');
  doc.text('WHOLESALE ACCOUNT STATEMENT & RUNNING LEDGER', 14, 25);

  doc.setTextColor(30, 31, 38);
  doc.setFontSize(9);
  doc.setFont('Georgia', 'bold');
  doc.text(`Wholesale Partner: ${customer.full_name} (${customer.shop_name || 'Dealer'})`, 14, 44);
  doc.setFont('Georgia', 'normal');
  doc.text(`Phone: ${customer.phone} | City: ${customer.city || 'Tamil Nadu'}`, 14, 50);
  doc.text(`Statement Date: ${formatDate(new Date().toISOString())}`, 120, 50);

  const tableData = payments.map((p, idx) => [
    idx + 1,
    formatDate(p.payment_date),
    p.reference_number || `PAY-${p.id}`,
    p.payment_mode === 'gold_916' || p.payment_mode === 'split'
      ? `916 Pure Gold: ${p.gold_916_weight_g || p.gold_weight_g || 0}g @ ${formatCurrency(p.gold_916_rate || p.gold_rate || 0)}/g`
      : 'Cash Settlement',
    p.gold_916_weight_g || p.gold_weight_g ? `${p.gold_916_weight_g || p.gold_weight_g} g` : '-',
    '916 Pure',
    formatCurrency(p.amount),
  ]);

  autoTable(doc, {
    startY: 56,
    head: [['#', 'Date', 'Ref / Voucher', 'Payment Mode / Description', 'Gold Wt', 'Purity', 'Amount Paid']],
    body: tableData.length > 0 ? tableData : [['-', '-', 'No payment records found', '-', '-', '-', '₹0.00']],
    headStyles: { fillColor: [30, 31, 38], textColor: [212, 175, 55], font: 'Georgia' },
    styles: { font: 'Georgia' },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 110;

  const totalIssuesValuation = issues.reduce((sum, i) => sum + (i.total_valuation_amount || 0), 0);
  const totalPaymentsMade = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remainingBal = Math.max(0, totalIssuesValuation - totalPaymentsMade);

  const payFinalY = renderPaymentSummaryCard({
    doc,
    startY: finalY + 8,
    title: 'WHOLESALE ACCOUNT LEDGER SUMMARY',
    totalBillAmountLabel: 'Total Consignment Debits:',
    totalBillAmount: totalIssuesValuation,
    prevPaid: 0,
    currentPayment: totalPaymentsMade,
    totalPaid: totalPaymentsMade,
    remainingBalance: remainingBal,
  });

  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.setFont('Georgia', 'normal');
  doc.text(`Account Statement Generated for ${customer.full_name}`, 14, payFinalY + 12);

  doc.save(`Ledger-${customer.full_name.replace(/\s+/g, '_')}.pdf`);
}
