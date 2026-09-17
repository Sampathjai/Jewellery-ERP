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

export function openWhatsAppClickToChat(phone: string, message: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  window.open(url, '_blank');
}
