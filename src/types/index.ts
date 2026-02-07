// src/types/index.ts

// ✅ User Types
export type UserRole = 'buyer' | 'seller' | 'transporter' | 'dual' | 'admin';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type OrderStatus = 
  | 'PENDING_SELLER'   // Buyer placed order, waiting for Seller
  | 'PENDING_ADMIN'    // Seller accepted, waiting for Admin verification
  | 'ACCEPTED'         // Admin verified, Order is Live
  | 'CANCELLED'        // Seller declined or Buyer cancelled
  | 'REJECTED'         // Admin rejected docs
  | 'shipped'          // Legacy/Future use
  | 'delivered';

export interface User {
  uid: string;
  email: string;
  phone?: string;
  userType: UserRole;
  companyName?: string;
  businessName?: string;
  gstNumber?: string;
  address?: string;
  addresses?: Address[];
  phoneNumber?: string;
  pincode?: string;
  documents?: {
    gstin?: boolean;
    shopLicense?: boolean;
    udyogAadhar?: boolean;
  }  
  verified: boolean;
  kycStatus?: 'pending' | 'verified' | 'rejected';
  profile?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  phone: string;
  cin?: string;
  userType: UserRole;
  companyName?: string;
  companyDescription?: string;
  location?: string;
  address?: string; 
  verified: boolean;
  verificationStatus?: VerificationStatus;
  gstNumber?: string; 
  panNumber?: string;
  createdAt?: any;
  updatedAt?: any;
}

// ✅ Product Types
export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  pricePerUnit?: number;
  quantity: number;
  unit?: string; // 'kg' | 'litre' | 'tonne'
  sellerName?: string;
  grade?: string;
  origin?: string;
  purity?: number;
  casNumber?: string;
  packagingType?: string;
  gstPercent?: number;
  moq?: number;
  certifications?: string[];
  imageUrl?: string;
  image?: string;
  sellerId: string;
  active?: boolean;
  verified: boolean;
  inStock?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// ✅ Cart Types
export interface CartItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  unit: string;
  image?: string;
  imageUrl?: string;
  gstPercent?: number;
  sellerId: string;
  total?: number;
}

// ✅ Order Types
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  items: any[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: string;
  paymentStatus?: 'pending' | 'completed' | 'failed';
  createdAt: string;
  updatedAt?: any;
  date: any;
  invoiceUrl?: string;
  sellerDocuments?: {
    qualityReport?: string; // URL or Ref
    purityCertificate?: string;
    gradeSheet?: string;
  };
  subTotal: number;         // For the base price before taxes
  
  // ✅ Tax Breakdown
  taxAmount: number;        // Total Tax
  cgst?: number;            // Central GST (Same State)
  sgst?: number;            // State GST (Same State)
  igst?: number;            // Integrated GST (Different State)
  
  payoutAmount: number;       
  
  // ✅ Fees
  platformFeeBuyer?: number; 
  logisticFee?: number;      
  
  platformFeeSeller: number; 
  safetyFee: number;         
  freightFee?: number;       

  paymentId?: string;
  sellerPayoutStatus?: 'PENDING' | 'COMPLETED' | 'FAILED';
  sellerPayoutTxId?: string;
  sellerPayoutDate?: any;
  paymentMode: 'BANK_TRANSFER';
  paymentReference: string; // UTR Number
  paymentScreenshot?: string; // URL
}

// ✅ Notification Types
export interface Notification {
  id?: string;
  userId: string; // 'ALL' or specific UserUID
  title: string;
  message: string;
  type: 'order' | 'product' | 'promotion' | 'system' | 'admin_broadcast'; 
  read: boolean;
  imageUrl?: string; 
  createdAt?: any;
  data?: any; 
}

// ✅ Auth Response Types
export interface AuthResponse {
  success: boolean;
  user?: User;
  message: string;
}

// ✅ API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

export interface TransportOrder {
  id?: string;
  material: string;
  weight: string;
  payout: number;
  status: 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED'; 
  buyerName: string;
  pickupLocation: string;
  dropLocation: string;
  distance?: number;
  createdAt?: any;
  sellerId: string;
}
export interface NegotiationMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  isBuyer: boolean;
}

export interface Address {
  id: string;
  label: string; // e.g., "Main Warehouse", "Home"
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}