import { RetailInvoice, WholesaleIssue, WholesaleSettlement, BusinessSettings } from '@/types';
import { formatCurrency, formatDate } from './utils';

const defaultShopName = 'Shankar Jewellery';
const defaultPhone = '+91 98765 43210';

export function buildWhatsAppInvoiceMessage(invoice: RetailInvoice, settings?: BusinessSettings): string {
  const shopName = settings?.shop_name || defaultShopName;
  const phone = settings?.phone || defaultPhone;
  return `Hello ${invoice.customer_name || 'Valued Customer'},

Thank you for shopping with *${shopName}*.

Your invoice *${invoice.invoice_number}* dated ${formatDate(invoice.invoice_date)} is ready.

Total Amount: *${formatCurrency(invoice.total_amount)}*
Paid Amount: ${formatCurrency(invoice.paid_amount)}
Balance Due: *${formatCurrency(invoice.balance_due)}*

Thank you for your business!
_${shopName} Phone: ${phone}_`;
}

export function buildWhatsAppPaymentReminder(customerName: string, amountDue: number, settings?: BusinessSettings): string {
  const shopName = settings?.shop_name || defaultShopName;
  const upiId = settings?.upi_id || 'Contact shop';
  return `Hello ${customerName},

This is a friendly reminder from *${shopName}* regarding your pending balance.

Outstanding Balance: *${formatCurrency(amountDue)}*

Please contact us or visit our showroom for account settlement.
UPI ID for direct payment: *${upiId}*

Thank you!
_${shopName}_`;
}

export function buildWhatsAppWholesaleIssueMessage(issue: WholesaleIssue, settings?: BusinessSettings): string {
  const shopName = settings?.shop_name || defaultShopName;
  return `Hello ${issue.customer_name},

Your wholesale consignment issue *${issue.issue_number}* dated ${formatDate(issue.issue_date)} has been dispatched.

Total Items Issued: *${issue.total_items_issued} Pcs*
Total Net Weight: *${issue.total_net_weight_g.toFixed(3)} g*
Consignment Valuation: *${formatCurrency(issue.total_valuation_amount)}*
Expected Return Date: ${formatDate(issue.expected_return_date)}

Thank you for your partnership!
_${shopName}_`;
}

export function buildWhatsAppSettlementMessage(settlement: WholesaleSettlement, settings?: BusinessSettings): string {
  const shopName = settings?.shop_name || defaultShopName;
  return `Hello ${settlement.customer_name},

Your wholesale consignment settlement *${settlement.settlement_number}* for period ending ${formatDate(settlement.period_end)} is finalized.

Gross Sales Value: ${formatCurrency(settlement.total_gross_sales)}
Gross Profit: ${formatCurrency(settlement.gross_profit)}
Your Profit Share: *${formatCurrency(settlement.customer_profit_share)}*
Net Payable to Shop: ${formatCurrency(settlement.net_payable_to_shop)}
Current Outstanding Balance Due: *${formatCurrency(settlement.balance_due)}*

Thank you!
_${shopName}_`;
}

export function buildWhatsAppEstimationMessage(estimation: any, settings?: BusinessSettings): string {
  const shopName = settings?.shop_name || defaultShopName;
  const phone = settings?.phone || defaultPhone;
  const itemsSummary = (estimation.items || [])
    .map((item: any, i: number) => `  ${i + 1}. *${item.item_name}* (${item.purity?.toUpperCase()} ${item.jewellery_type}) - Est. Net: ${item.estimated_net_weight_g}g`)
    .join('\n');

  return `Hello ${estimation.customer_name || 'Valued Customer'},

Greetings from *${shopName}*!

Here is your jewellery quotation based on your reference design:

*Estimation No:* ${estimation.estimation_number} (Rev ${estimation.version})
*Date:* ${formatDate(estimation.estimation_date)}
*Valid Until:* ${formatDate(estimation.valid_until)}
*Type:* ${estimation.estimation_type === 'reference_design' ? 'Customer Reference Design' : 'Custom Jewellery'}

*Design / Item Details:*
${itemsSummary}

*Rate Snapshot:*
Gold 22K (916): ${formatCurrency(estimation.gold_22k_rate)}/g

*Financial Estimate:*
Metal Value: ${formatCurrency(estimation.subtotal_metal_value)}
VA / Wastage: ${formatCurrency(estimation.total_wastage_value)}
Making Charges: ${formatCurrency(estimation.total_making_charges)}
*Estimated Total:* *${formatCurrency(estimation.total_estimated_amount)}*

_Note: This is an estimated price based on reference design specifications. Final billing will be calculated based on actual measured net weight upon completion of manufacturing._

Feel free to reply or visit our showroom to confirm this design!
*${shopName}* | Phone: ${phone}`;
}

export function openWhatsAppClickToChat(phone: string, message: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  window.open(url, '_blank');
}
