'use client';

import { Invoice } from '@/types/pos';

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const generateReceiptHtml = (inv: Invoice, language: string, t: (key: string) => string) => {
  const customerInfo = inv.customerName
    ? `<p style="margin:0;font-size:12px"><strong>${language === 'ar' ? 'العميل' : 'Customer'}:</strong> ${escapeHtml(inv.customerName)}${inv.customerPhone ? ` | ${escapeHtml(inv.customerPhone)}` : ''}</p>`
    : '';

  const itemsHtml = inv.items
    .map(
      (item) =>
        `<tr>
        <td style="padding:4px 0;font-size:11px">${escapeHtml(item.productName)}</td>
        <td style="padding:4px 0;font-size:11px;text-align:center">${item.quantity}</td>
        <td style="padding:4px 0;font-size:11px;text-align:right">${Number(item.unitPrice).toFixed(2)}</td>
        <td style="padding:4px 0;font-size:11px;text-align:right">${Number(item.total).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  return `
      <div class="receipt-print">
        <div class="header">
          <h1>${t('pos_title')}</h1>
          <p>${language === 'ar' ? 'فاتورة ضريبية مبسطة' : 'Simplified Tax Invoice'}</p>
        </div>
        <div class="divider"></div>
        <div class="meta">
          <p><strong>${t('pos_invoice_number')}:</strong> ${inv.number}</p>
          <p><strong>${t('pos_date')}:</strong> ${new Date(inv.createdAt).toLocaleString()}</p>
          <p><strong>${t('pos_payment_method')}:</strong> ${inv.paymentMethod ? t(`pos_${inv.paymentMethod}`) : '-'}</p>
          ${customerInfo}
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th>${language === 'ar' ? 'المنتج' : 'Item'}</th>
              <th class="center">${t('pos_quantity')}</th>
              <th class="right">${t('admin_market_price')}</th>
              <th class="right">${t('pos_total')}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="totals">
          <div class="row"><span>${t('pos_subtotal')}</span><span>${Number(inv.subtotal).toFixed(2)} EGP</span></div>
          ${Number(inv.discount) > 0 ? `<div class="row"><span>${t('pos_discount')}</span><span>-${Number(inv.discount).toFixed(2)} EGP</span></div>` : ''}
          <div class="row"><span>${t('pos_tax')} (14%)</span><span>${Number(inv.taxTotal).toFixed(2)} EGP</span></div>
          <div class="row total"><span>${t('pos_total')}</span><span>${Number(inv.total).toFixed(2)} EGP</span></div>
          <div class="row"><span>${t('pos_paid')}</span><span>${Number(inv.paid).toFixed(2)} EGP</span></div>
          ${Number(inv.change) > 0 ? `<div class="row" style="color:#16a34a"><span>${t('pos_change')}</span><span>${Number(inv.change).toFixed(2)} EGP</span></div>` : ''}
        </div>
        <div class="payment">
          <p>${language === 'ar' ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</p>
        </div>
        <div class="footer">
          <p>${new Date().toLocaleString()}</p>
        </div>
      </div>`;
};

export const printReceipt = (
  completedInvoiceData: Invoice | null,
  setReceiptHTML: (html: string) => void,
  t: (key: string) => string,
  language: string
) => {
  if (!completedInvoiceData) return;
  setReceiptHTML(generateReceiptHtml(completedInvoiceData, language, t));
  setTimeout(() => {
    window.print();
    window.onafterprint = () => {
      setReceiptHTML('');
      window.onafterprint = null;
    };
    setTimeout(() => setReceiptHTML(''), 1000);
  }, 150);
};

export const receiptPrintStyles = `
    @page { margin: 0; size: 80mm auto; }
    @media print {
      body > *:not(#receipt-print-area) { display: none !important; }
      #receipt-print-area { display: block !important; padding: 0; margin: 0; }
      #receipt-print-area .receipt-print {
        width: 80mm; padding: 8mm 4mm; font-size: 12px; color: #000;
        font-family: 'Courier New', monospace; box-sizing: border-box;
      }
      #receipt-print-area .receipt-print * { margin: 0; padding: 0; box-sizing: border-box; }
      #receipt-print-area .header { text-align: center; margin-bottom: 12px; }
      #receipt-print-area .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
      #receipt-print-area .header p { font-size: 11px; color: #555; margin: 1px 0; }
      #receipt-print-area .divider { border-top: 1px dashed #000; margin: 8px 0; }
      #receipt-print-area .meta { font-size: 11px; margin-bottom: 8px; }
      #receipt-print-area .meta p { margin: 2px 0; }
      #receipt-print-area table { width: 100%; border-collapse: collapse; font-size: 11px; }
      #receipt-print-area th { text-align: left; padding: 4px 0; border-bottom: 1px solid #000; font-size: 10px; text-transform: uppercase; }
      #receipt-print-area th.right { text-align: right; }
      #receipt-print-area th.center { text-align: center; }
      #receipt-print-area .totals { margin-top: 8px; }
      #receipt-print-area .totals .row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
      #receipt-print-area .totals .total { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
      #receipt-print-area .payment { text-align: center; margin-top: 10px; font-size: 11px; }
      #receipt-print-area .footer { text-align: center; margin-top: 12px; font-size: 10px; color: #888; border-top: 1px dashed #000; padding-top: 8px; }
    }
  `;

export function POSReceiptStyles() {
  return <style>{receiptPrintStyles}</style>;
}

export function POSReceipt({ receiptHTML }: { receiptHTML: string }) {
  if (!receiptHTML) return null;
  return <div id="receipt-print-area" dangerouslySetInnerHTML={{ __html: receiptHTML }} />;
}
