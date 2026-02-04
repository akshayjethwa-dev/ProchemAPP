import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Order, Product } from '../types';

export const generateInvoice = async (order: Order, userDetails?: any) => {
  // 1. Safe Address Parsing
  let addressText = "Address not provided";
  try {
    if (order.shippingAddress) {
      const addr = JSON.parse(order.shippingAddress);
      addressText = `${addr.label || ''}\n${addr.street || ''}, ${addr.city || ''}\n${addr.state || ''} - ${addr.zipCode || ''}`;
    }
  } catch (e) {
    addressText = order.shippingAddress || "Invalid Address Format";
  }

  // 2. Format Items List HTML
  const itemsHtml = order.items.map((item: any) => `
    <tr class="item">
      <td>${item.name}</td>
      <td>${item.quantity} ${item.unit || 'Units'}</td>
      <td>₹${item.pricePerUnit}</td>
      <td>₹${(item.quantity * item.pricePerUnit).toFixed(2)}</td>
    </tr>
  `).join('');

  // 3. Invoice HTML Template
  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #004AAD; padding-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #004AAD; }
          .invoice-details { text-align: right; }
          .section-title { font-size: 14px; color: #666; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
          .address-box { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; padding: 12px; background: #f8f9fa; border-bottom: 2px solid #ddd; }
          td { padding: 12px; border-bottom: 1px solid #eee; }
          .total-section { margin-top: 30px; text-align: right; }
          .total-row { font-size: 18px; font-weight: bold; color: #004AAD; }
          .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ProChem Invoice</div>
          <div class="invoice-details">
            <div>Order ID: #${order.id.slice(0, 8).toUpperCase()}</div>
            <div>Date: ${new Date(order.createdAt).toLocaleDateString()}</div>
            <div>Status: ${order.status.toUpperCase()}</div>
          </div>
        </div>

        <div class="address-box">
          <div class="section-title">Bill To:</div>
          <div>${userDetails?.companyName || 'Valued Customer'}</div>
          <div>${userDetails?.email || ''}</div>
          <div style="white-space: pre-line; margin-top: 5px;">${addressText}</div>
        </div>

        <table>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
          ${itemsHtml}
        </table>

        <div class="total-section">
          <p>Subtotal: ₹${(order.subTotal || order.totalAmount).toFixed(2)}</p>
          <p>Tax (GST): ₹${(order.taxAmount || 0).toFixed(2)}</p>
          <div class="total-row">Total Paid: ₹${order.totalAmount.toFixed(2)}</div>
        </div>

        <div class="footer">
          This is a computer-generated invoice. No signature required.<br>
          ProChem Marketplace Inc.
        </div>
      </body>
    </html>
  `;

  // 4. Generate and Share PDF
  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error('Invoice Error:', error);
  }
};