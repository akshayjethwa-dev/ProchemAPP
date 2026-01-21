// ✅ User Types
export type UserRole = 'buyer' | 'seller';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  uid: string;
  email: string;
  phone?: string;
  userType: UserRole;
  companyName?: string;
  gstNumber?: string;
  address?: string;
  pincode?: number;
  documents?: {
    gstin?: boolean;
    shopLicense?: boolean;
    udyogAadhar?: boolean;
  }  
  verified: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
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
  id?: string;
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
  id?: string;
  buyerId: string;
  sellerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  paymentStatus?: 'pending' | 'completed' | 'failed';
  createdAt?: any;
  updatedAt?: any;
}

// ✅ Notification Types
export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'product' | 'promotion' | 'system';
  read: boolean;
  createdAt?: any;
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