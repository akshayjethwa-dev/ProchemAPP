export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export enum UserRole {
  BUSINESS = 'business',
  BUYER = 'buyer',
  SELLER = 'seller',
  TRANSPORTER = 'transporter',
  ADMIN = 'admin',
}

export interface User {
  uid: string;
  phone: string;
  email?: string;
  role: UserRole;
  companyName: string;
  gstNumber?: string;
  cin?: string;
  address?: string;
  verified: boolean;
  createdAt: Date;
}
export interface UserProfile extends User {
  uid: string;
  phone: string;
  email?: string;
  role: UserRole;
  companyName: string;
  gstNumber?: string;
  cin?: string;
  address?: string;
  verified: boolean;
  createdAt: Date;
  verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface Product {
  id: string;
  name: string;
  category: string;
  casNumber?: string;
  purity: number;
  unit: 'litre' | 'kg' | 'tonne';
  pricePerUnit: number;
  moq: number;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  inStock: boolean;
  certifications: string[];
  image?: string;
  createdAt: Date;
  grade: string;
  packagingType: string;
  gstPercent: number;
  isFavorite?: boolean;
  isSellerVerified?: boolean;
  isActive?: 'ACTIVE' | 'INACTIVE'
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
  sellerId: string;
  image?: string;                
  unit: string;                  
  gstPercent: number;
  grade?: string;              
  purity?: number;             
  moq: number; 
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  createdAt: Date;
  deliveryDate?: Date;
}

export interface Seller extends User {
  rating: number;
  totalOrders: number;
  totalSales: number;
}

export type ChemicalCategory = string;
export const CATEGORIES: ChemicalCategory[] = [
  'Pharma Grade Acids',
  'Industrial Solvents', 
  'Agro Chemicals',
  'Food Grade',
  'Lab Reagents'
];
export interface TransportOrder {
  id: string;
  material: string;
  weight: string;  // e.g., "500 kg" or "2.5 MT"
  payout: number;
  pickupLocation: string;
  dropLocation: string;
  status: 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';
  transporterId?: string;
  createdAt: Date;
  deliveryDate?: Date;
  buyerName: string;
}
export interface AuthResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  user?: T;
}
