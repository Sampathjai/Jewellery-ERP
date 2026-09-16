import { RetailInvoice, WholesaleIssue, WholesaleSettlement, BusinessSettings } from '@/types';
import { formatCurrency, formatDate } from './utils';

export function buildWhatsAppInvoiceMessage(invoice: RetailInvoice, settings: BusinessSettings): string {
  return `Hello ${invoice.customer_name || 'Valued Customer'},

Thank you for shopping with *${settings.shop_name}*.

Your invoice *${invoice.invoice_number}* dated ${formatDate(invoice.invoice_date)} is ready.

Total Amount: *${formatCurrency(invoice.total_amount)}*
Paid Amount: ${formatCurrency(invoice.paid_amount)}
Balance Due: *${formatCurrency(invoice.balance_due)}*

Thank you for your business!
_${settings.shop_name} Phone: ${settings.phone}_`;
}

export function buildWhatsAppPaymentReminder(customerName: string, amountDue: number, settings: BusinessSettings): string {
  return `Hello ${customerName},

This is a friendly reminder from *${settings.shop_name}* regarding your pending balance.

Outstanding Balance: *${formatCurrency(amountDue)}*

Please contact us or visit our showroom for account settlement.
UPI ID for direct payment: *${settings.upi_id || 'Contact shop'}*

Thank you!
_${settings.shop_name}_`;
}

export function buildWhatsAppWholesaleIssueMessage(issue: WholesaleIssue, settings: BusinessSettings): string {
  return `Hello ${issue.customer_name},

Your wholesale consignment issue *${issue.issue_number}* dated ${formatDate(issue.issue_date)} has been dispatched.

Total Items Issued: *${issue.total_items_issued} Pcs*
Total Net Weight: *${issue.total_net_weight_g.toFixed(3)} g*
Consignment Valuation: *${formatCurrency(issue.total_valuation_amount)}*
Expected Return Date: ${formatDate(issue.expected_return_date)}

Thank you for your partnership!
_${settings.shop_name}_`;
}

export function buildWhatsAppSettlementMessage(settlement: WholesaleSettlement, settings: BusinessSettings): string {
  return `Hello ${settlement.customer_name},

Your wholesale consignment settlement *${settlement.settlement_number}* for period ending ${formatDate(settlement.period_end)} is finalized.

Gross Sales Value: ${formatCurrency(settlement.total_gross_sales)}
Gross Profit: ${formatCurrency(settlement.gross_profit)}
Your Profit Share: *${formatCurrency(settlement.customer_profit_share)}*
Net Payable to Shop: ${formatCurrency(settlement.net_payable_to_shop)}
Current Outstanding Balance Due: *${formatCurrency(settlement.balance_due)}*

Thank you!
_${settings.shop_name}_`;
}

export function openWhatsAppClickToChat(phone: string, textMessage: string) {
  // Clean phone number
  const cleanedPhone = phone.replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(textMessage);
  const url = `https://wa.me/${cleanedPhone}?text=${encodedMsg}`;
  window.open(url, '_blank');
}

