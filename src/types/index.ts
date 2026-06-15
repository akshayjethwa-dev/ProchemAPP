// src/types/index.ts

// ✅ User Types
export type UserRole = 'buyer' | 'seller' | 'transporter' | 'dual' | 'admin' | 'sub_admin';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type OrderStatus = 
  | 'PENDING_SELLER'   
  | 'PENDING_ADMIN'    
  | 'ACCEPTED'         
  | 'CANCELLED'        
  | 'REJECTED'         
  | 'shipped'          
  | 'delivered';

export interface TieredPrice {
  minQty: number;
  maxQty?: number; 
  pricePerUnit: number;
}

export type SubscriptionTier = 'FREE' | 'GROWTH_PACKAGE';

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
  phoneVerified?: boolean; // ✅ ADDED THIS LINE TO FIX THE ERROR
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
  subscriptionTier?: SubscriptionTier; 
  subscriptionExpiry?: string | Date | null; 
  paymentHistory?: string[]; 

  premiumNegotiationCredits?: number; 
  liveQuoteCredits?: number;

  // 🚀 NEW: WhatsApp Integration
  whatsappOptIn?: boolean;
  whatsappPreferences?: {
    general?: boolean;
    marketAlerts?: boolean;
    negotiations?: boolean;
    digest?: boolean;
  };
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

export interface CustomRequirement {
  id?: string;
  buyerId: string;
  buyerName?: string;
  buyerPhone?: string;
  productName: string;
  quantity: string;
  unit: string;
  description?: string;
  targetPrice?: string;
  status: 'PENDING' | 'REVIEWING' | 'FULFILLED' | 'REJECTED';
  createdAt: string;
}

// ✅ Product Types (UPDATED WITH CHEMICAL-SPECIFIC DATA)
export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  pricePerUnit?: number;
  quantity: number;
  unit?: string; 
  sellerName?: string;
  grade?: string;
  origin?: string;
  purity?: number;
  casNumber?: string;

  tieredPricing?: TieredPrice[];
  sampleAvailable?: boolean;
  samplePrice?: number;
  sampleSize?: string;
  
  // 🚀 NEW: Logistics & Packaging
  packagingType?: string; 
  
  // 🚀 NEW: Commercial & Tax
  gstPercent?: number;    
  moq?: number;
  
  // 🚀 NEW: Compliance & Safety
  hazardClass?: string;   
  unNumber?: string;      
  storageConditions?: string; 
  manufactureDate?: string;
  expiryDate?: string;

  // 🚀 NEW: Documentation (URLs)
  msdsUrl?: string;       
  tdsUrl?: string;        
  coaUrl?: string;        

  certifications?: string[];
  imageUrl?: string;
  image?: string;
  sellerId: string;
  active?: boolean;
  verified: boolean;
  inStock?: boolean;
  createdAt?: any;
  updatedAt?: any;

  sellerTier?: SubscriptionTier; 
  readyToDispatch?: boolean;
}

export interface RFQ {
  id: string;
  productId: string;
  productName: string;
  buyerId: string;
  buyerName: string;
  sellerName?: string;
  sellerId: string;
  targetQuantity: number;
  targetPrice: number;
  unit: string;
  deliveryPincode: string;
  notes?: string;
  status: 'PENDING' | 'NEGOTIATING' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
  agreedPrice?: number;
  createdAt: string;
  updatedAt: string;
}

// 🚀 NEW: Masked Negotiation Conversation Schema (Task 5.1)
export interface Conversation {
  id?: string;
  buyerUserId: string;
  sellerUserId: string;
  rfqId: string;
  status: 'open' | 'closed';
  createdAt?: any; 
  updatedAt?: any; 
}

// 🚀 NEW: Masked Negotiation Message Schema (Task 5.1)
export interface ConversationMessage {
  id?: string;
  conversationId?: string; 
  senderRole: 'buyer' | 'seller' | 'system';
  direction: 'toBuyer' | 'toSeller' | 'both'; 
  body: string;
  source: 'whatsapp' | 'app';
  timestamp?: any; 
}

// 🚀 UPDATED: Negotiation Message Schema (for the chat room)
export interface NegotiationMessage {
  id: string;
  rfqId?: string; 
  text: string;
  senderId: string;
  timestamp: number;
  isBuyer: boolean;
  isOffer?: boolean;
  proposedPrice?: number;
  proposedQty?: number;
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
    qualityReport?: string; 
    purityCertificate?: string;
    gradeSheet?: string;
  };
  subTotal: number;         
  taxAmount: number;        
  cgst?: number;            
  sgst?: number;            
  igst?: number;            
  payoutAmount: number;       
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
  paymentReference: string; 
  paymentScreenshot?: string; 
}

// ✅ Notification Types
export interface Notification {
  id?: string;
  userId: string; 
  title: string;
  message: string;
  type: 'order' | 'product' | 'promotion' | 'system' | 'admin_broadcast'; 
  read: boolean;
  imageUrl?: string; 
  createdAt?: any;
  data?: any; 
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

export interface Address {
  id: string;
  label: string; 
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

// 🚀 NEW: Live Market / Broadcast Types
export interface BroadcastLead {
  id?: string;
  originalOrderId?: string; 
  productName: string;
  rfqId?: string;
  excludedSellerId?: string;
  excludedSellerIds?: string[];
  casNumber?: string;
  purity?: string;
  quantityRequired: string;
  unit: string;
  deliveryRegion: string; 
  status: 'OPEN' | 'CLOSED';
  createdAt: any;
}

export interface SupplierQuote {
  id?: string;
  leadId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  pricePerUnit: number;
  availableQuantity: string;
  dispatchDays: string; 
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: any;
}