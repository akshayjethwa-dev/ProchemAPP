
export enum UserRole {
  GUEST = 'GUEST',
  BUSINESS = 'BUSINESS',
  TRANSPORTER = 'TRANSPORTER'
}

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ChemicalCategory = 
  | 'Pharma Chemicals' 
  | 'Industrial Chemicals' 
  | 'Agriculture / Fertilizers' 
  | 'Food & Beverage Chemicals' 
  | 'Lab & Research Chemicals';

export interface UserProfile {
  role: UserRole;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  gstNumber?: string;
  isGstVerified?: boolean;
  cin?: string;
  address?: string;
  verificationStatus?: VerificationStatus;
  totalRevenue?: number;
  ordersReceived?: number;
}

export interface Product {
  id: string;
  name: string;
  category: ChemicalCategory;
  casNumber?: string;
  grade: 'Industrial' | 'Lab' | 'Pharma' | 'Food';
  purity: number;
  pricePerUnit: number;
  unit: string;
  moq: number;
  inventory: number;
  packagingType: 'Bag' | 'Drum' | 'Tanker' | 'Bottle';
  gstPercent: number;
  sellerName: string;
  sellerRating: number;
  isSellerVerified?: boolean;
  image: string;
  description: string;
  msdsUrl?: string;
  isActive: boolean;
  isFavorite?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isOffer?: boolean;
  offerPrice?: number;
}

export interface Negotiation {
  id: string;
  productId: string;
  productName: string;
  buyerName: string;
  sellerName: string;
  status: 'OPEN' | 'ACCEPTED' | 'REJECTED';
  messages: Message[];
}

export interface Enquiry {
  id: string;
  productId: string;
  productName: string;
  buyerName: string;
  sellerName: string;
  message: string;
  timestamp: string;
  status: 'OPEN' | 'RESPONDED';
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number;
  status: 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';
  orderDate: string;
  buyerName: string;
  address: string;
  trackingStep?: number;
}

export interface TransportOrder extends Order {
  material: string;
  weight: string;
  payout: number;
  pickupLocation: string;
  dropLocation: string;
}
