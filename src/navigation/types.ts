import { UserRole } from '../types';

export type RootStackParamList = {
  // Auth
  Splash: undefined;
  Login: undefined;
  OTPVerification: { mobile: string };
  RoleSelection: undefined;
  Registration: { role: UserRole; mobile: string };
  LegalPages: undefined;
  AdminApp: undefined;
  TransporterApp: undefined;

  // Navigation Stacks
  BuyerApp: undefined;  
  SellerApp: undefined; 

  // Feature Screens
  ProductDetail: { productId: string; product?: any };
  Negotiation: { product: any };
  OrderTracking: { orderId?: string; order?: any }; 
  EditProfile: undefined; 
  Notifications: undefined;
  NotificationDetail: { notification: any }; 

  // Seller specific
  SellerDashboard: undefined;
  AddChemical: undefined;
  ManageChemicals: undefined;
  OrderHistory: undefined;
};