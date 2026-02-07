import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase'; 
import { Order } from '../types';

// --- Types ---
// Cast 'order' to this to avoid TS errors for fields like sellerName, buyerGst, etc.
type ExtendedOrder = any; 

// --- Constants ---
const PROCHEM_DETAILS = {
  name: 'Prochem Private Limited',
  address: 'Ahmedabad, Gujarat, India',
  gstin: '24AAACC1234C1Z1',
  state: 'Gujarat',
  stateCode: '24',
  sacCode: '998599'
};

// --- Helpers ---
const formatCurrency = (amount: number) => 
  `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getDateStr = (date: any) => {
  if (!date) return new Date().toLocaleDateString();
  const d = new Date(date.seconds ? date.seconds * 1000 : date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getTaxType = (fromCode: string, toCode: string) => {
  if (!fromCode || !toCode) return 'IGST';
  return fromCode === toCode ? 'CGST_SGST' : 'IGST';
};

// --- Fetch Real Data from Firebase ---
const fetchUserData = async (uid: string) => {
  if (!uid) return null;
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
  return null;
};

// --- 1. GOODS INVOICE (Seller -> Buyer) ---
const generateGoodsInvoiceHTML = async (order: Order) => {
  const o = order as ExtendedOrder;
  
  // Fetch Real Data
  const sellerData = await fetchUserData(order.sellerId);
  const buyerData = await fetchUserData(order.buyerId);

  // Fallbacks if data is missing
  const seller = {
    name: sellerData?.companyName || o.sellerName || 'Seller Company',
    address: sellerData?.address || o.sellerAddress || 'Address Not Available',
    gstin: sellerData?.gstNumber || sellerData?.gstin || o.sellerGst || 'Unregistered',
    state: sellerData?.state || 'Maharashtra', 
    stateCode: sellerData?.stateCode || '27'
  };

  const buyerAddress = typeof o.shippingAddress === 'string' ? JSON.parse(o.shippingAddress) : o.shippingAddress || {};
  const buyer = {
    name: buyerData?.companyName || o.buyerName || 'Buyer Company',
    address: buyerData?.address || `${buyerAddress?.street || ''}, ${buyerAddress?.city || ''}` || 'Address Not Available',
    gstin: buyerData?.gstNumber || buyerData?.gstin || o.buyerGst || 'Unregistered',
    state: buyerData?.state || 'Gujarat',
    stateCode: buyerData?.stateCode || '24'
  };

  const taxType = getTaxType(seller.stateCode, buyer.stateCode);

  const itemsRows = o.items.map((item: any) => {
    const total = item.quantity * item.pricePerUnit;
    return `
      <tr>
        <td>HSN: ${item.hsn || '2915'} | ${item.name}</td>
        <td>${item.quantity} ${item.unit}</td>
        <td>${formatCurrency(item.pricePerUnit)}</td>
        <td>${formatCurrency(total)}</td>
      </tr>`;
  }).join('');

  const totalTaxable = o.items.reduce((acc: number, item: any) => acc + (item.quantity * item.pricePerUnit), 0);
  const taxAmount = totalTaxable * 0.18; // Assuming flat 18% for demo
  const grandTotal = totalTaxable + taxAmount;

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; font-size: 12px; }
          .box { border: 1px solid #000; padding: 0; }
          .header { text-align: center; border-bottom: 1px solid #000; padding: 10px; background: #f0f0f0; }
          .row { display: flex; border-bottom: 1px solid #000; }
          .col { flex: 1; padding: 10px; }
          .col-r { border-left: 1px solid #000; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="header"><h3>TAX INVOICE (GOODS)</h3></div>
          <div class="row">
            <div class="col">
              <strong>Invoice No:</strong> SELL-${order.id.slice(0,6).toUpperCase()}<br>
              <strong>Date:</strong> ${getDateStr(order.createdAt)}
            </div>
            <div class="col col-r">
              <strong>Order ID:</strong> ${order.id.toUpperCase()}
            </div>
          </div>
          <div class="row">
            <div class="col">
              <strong>SUPPLIER (SELLER):</strong><br>
              ${seller.name}<br>${seller.address}<br>
              <strong>GSTIN:</strong> ${seller.gstin}
            </div>
            <div class="col col-r">
              <strong>BUYER:</strong><br>
              ${buyer.name}<br>${buyer.address}<br>
              <strong>GSTIN:</strong> ${buyer.gstin}
            </div>
          </div>
          <div style="padding: 10px;">
            <table>
              <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Taxable Value</th></tr>
              ${itemsRows}
            </table>
            <div style="text-align: right; margin-top: 15px;">
              <p>Taxable Amount: ${formatCurrency(totalTaxable)}</p>
              <p>${taxType} @ 18%: ${formatCurrency(taxAmount)}</p>
              <h3>TOTAL AMOUNT: ${formatCurrency(grandTotal)}</h3>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

// --- 2. BUYER SERVICE INVOICE (Prochem -> Buyer) ---
const generateProchemBuyerInvoiceHTML = async (order: Order) => {
  const o = order as ExtendedOrder;
  const buyerData = await fetchUserData(order.buyerId);
  const buyerAddress = typeof o.shippingAddress === 'string' ? JSON.parse(o.shippingAddress) : o.shippingAddress || {};
  
  const buyer = {
    name: buyerData?.companyName || o.buyerName || 'Buyer Company',
    address: buyerData?.address || `${buyerAddress?.street || ''}, ${buyerAddress?.city || ''}`,
    gstin: buyerData?.gstNumber || buyerData?.gstin || o.buyerGst || 'Unregistered',
    state: buyerData?.state || 'Gujarat',
    stateCode: buyerData?.stateCode || '24'
  };

  const platformFee = o.platformFeeBuyer || 500;
  // ✅ FIX: Use 'o' to access fields that might miss in strict Order type
  const logisticsFee = o.logisticFee || o.shippingFee || 1000; 
  
  const taxType = getTaxType(PROCHEM_DETAILS.stateCode, buyer.stateCode);
  
  const tax1 = platformFee * 0.18;
  const tax2 = logisticsFee * 0.18;
  const totalPayable = (platformFee + tax1) + (logisticsFee + tax2);

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; font-size: 12px; }
          .box { border: 1px solid #000; }
          .header { text-align: center; border-bottom: 1px solid #000; padding: 10px; background: #eee; }
          .row { display: flex; border-bottom: 1px solid #000; }
          .col { flex: 1; padding: 10px; }
          .col-r { border-left: 1px solid #000; }
          .line-item { margin-bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="header"><h3>TAX INVOICE (SERVICES)<br>PROCHEM TO BUYER</h3></div>
          <div class="row">
            <div class="col">
              <strong>Invoice No:</strong> PCB-${order.id.slice(0,6).toUpperCase()}<br>
              <strong>Date:</strong> ${getDateStr(order.createdAt)}
            </div>
            <div class="col col-r">
               <strong>Ref Order:</strong> ${order.id.toUpperCase()}
            </div>
          </div>
          <div class="row">
            <div class="col">
              <strong>SERVICE PROVIDER:</strong><br>
              ${PROCHEM_DETAILS.name}<br>${PROCHEM_DETAILS.address}<br>
              <strong>GSTIN:</strong> ${PROCHEM_DETAILS.gstin}
            </div>
            <div class="col col-r">
              <strong>RECIPIENT:</strong><br>
              ${buyer.name}<br>${buyer.address}<br>
              <strong>GSTIN:</strong> ${buyer.gstin}
            </div>
          </div>
          <div style="padding: 20px;">
            <div class="line-item">
              <strong>1. Platform Fee</strong><br>
              Taxable: ${formatCurrency(platformFee)} | ${taxType} (18%): ${formatCurrency(tax1)}
            </div>
            <div class="line-item">
              <strong>2. Logistics Fee</strong><br>
              Taxable: ${formatCurrency(logisticsFee)} | ${taxType} (18%): ${formatCurrency(tax2)}
            </div>
            <h3 style="text-align: right; margin-top: 20px;">TOTAL PAYABLE: ${formatCurrency(totalPayable)}</h3>
          </div>
        </div>
      </body>
    </html>
  `;
};

// --- 3. SELLER SERVICE INVOICE (Prochem -> Seller) ---
const generateProchemSellerInvoiceHTML = async (order: Order) => {
  const o = order as ExtendedOrder;
  const sellerData = await fetchUserData(order.sellerId);

  const seller = {
    name: sellerData?.companyName || o.sellerName || 'Seller Company',
    address: sellerData?.address || o.sellerAddress || 'Address Not Available',
    gstin: sellerData?.gstNumber || sellerData?.gstin || o.sellerGst || 'Unregistered',
    state: sellerData?.state || 'Maharashtra',
    stateCode: sellerData?.stateCode || '27'
  };

  const platformFee = o.platformFeeSeller || 0;
  const securityFee = o.safetyFee || 0;
  const freightFee = o.freightFee || 0;
  
  const taxableTotal = platformFee + securityFee + freightFee;
  const taxTotal = taxableTotal * 0.18;
  const grossCharges = taxableTotal + taxTotal;
  const netPayout = (order.totalAmount || 0) - grossCharges;

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; font-size: 12px; }
          .box { border: 1px solid #000; }
          .header { text-align: center; border-bottom: 1px solid #000; padding: 10px; background: #eee; }
          .row { display: flex; border-bottom: 1px solid #000; }
          .col { flex: 1; padding: 10px; }
          .col-r { border-left: 1px solid #000; }
          .summary { background: #f9f9f9; padding: 15px; border: 1px dashed #000; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="header"><h3>TAX INVOICE (SERVICES)<br>PROCHEM TO SELLER</h3></div>
          <div class="row">
            <div class="col">
              <strong>Invoice No:</strong> PCS-${order.id.slice(0,6).toUpperCase()}<br>
              <strong>Date:</strong> ${getDateStr(order.createdAt)}
            </div>
            <div class="col col-r">
               <strong>Ref Order:</strong> ${order.id.toUpperCase()}
            </div>
          </div>
          <div class="row">
            <div class="col">
              <strong>SERVICE PROVIDER:</strong><br>
              ${PROCHEM_DETAILS.name}<br>${PROCHEM_DETAILS.address}<br>
              <strong>GSTIN:</strong> ${PROCHEM_DETAILS.gstin}
            </div>
            <div class="col col-r">
              <strong>RECIPIENT:</strong><br>
              ${seller.name}<br>${seller.address}<br>
              <strong>GSTIN:</strong> ${seller.gstin}
            </div>
          </div>
          <div style="padding: 20px;">
             <p>1. Platform Fee: ${formatCurrency(platformFee)}</p>
             <p>2. Security Fee: ${formatCurrency(securityFee)}</p>
             <p>3. Freight Fee: ${formatCurrency(freightFee)}</p>
             <hr>
             <p style="text-align: right;"><strong>Gross Charges (Inc GST): ${formatCurrency(grossCharges)}</strong></p>
             
             <div class="summary">
               <strong>PAYOUT CALCULATION:</strong><br>
               Order Value: ${formatCurrency(order.totalAmount)}<br>
               Less Charges: -${formatCurrency(grossCharges)}<br>
               <h3 style="margin-top: 10px;">NET PAYOUT TO SELLER: ${formatCurrency(netPayout)}</h3>
             </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

// --- EXPORTS ---

export const generateInvoiceHtml = async (
  type: 'GOODS' | 'SERVICE_BUYER' | 'SERVICE_SELLER', 
  order: Order
) => {
  switch (type) {
    case 'GOODS': return await generateGoodsInvoiceHTML(order);
    case 'SERVICE_BUYER': return await generateProchemBuyerInvoiceHTML(order);
    case 'SERVICE_SELLER': return await generateProchemSellerInvoiceHTML(order);
    default: return '<html><body>Invalid Invoice Type</body></html>';
  }
};

export const printInvoice = async (html: string) => {
  try {
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  } catch (error) {
    console.error('Invoice Error:', error);
  }
};