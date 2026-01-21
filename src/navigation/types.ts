import { UserRole, Product } from '../types';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OTPVerification: { mobile: string };
  RoleSelection: undefined;
  Registration: { role: UserRole; mobile: string };
  LegalPages: undefined;
  
  // Buyer Stack
  BuyerDashboard: undefined;
  Marketplace: { category?: string };
  ProductDetail: { productId: string; product?: any };
  Cart: undefined;
  OrderHistory: undefined;
  Negotiation: { product: any }; // ✅ Added Negotiation
  
  // Seller Stack
  SellerDashboard: undefined;
  AddChemical: undefined;
  ManageChemicals: undefined;
};