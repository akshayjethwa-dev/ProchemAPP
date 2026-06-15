import { UserRole } from '../types';

export type RootStackParamList = {
  // Auth
  Splash: undefined;
  Login: undefined;
  MobileLogin: undefined;
  // ✅ UPDATED: Added mode and formData to handle both login and registration flows
  OTPVerification: { 
    mobile: string; 
    verificationId: string; 
    mode?: 'login' | 'registration'; 
    formData?: any; 
  };
  RoleSelection: undefined;
  Registration: { role: UserRole; mobile: string } | undefined;
  LegalPages: undefined;
  AdminApp: undefined;
  TransporterApp: undefined;
  AboutProchem: undefined;

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
  Compare: undefined;
  Onboarding: undefined;
  KYCVerification: undefined;

  // Seller specific
  SellerDashboard: undefined;
  AddChemical: undefined;
  ManageChemicals: undefined;
  OrderHistory: undefined;
};