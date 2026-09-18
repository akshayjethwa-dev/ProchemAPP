import { UserRole } from '../types';

export type RootStackParamList = {
  // Auth
  Splash: undefined;
  Login: undefined;
  MobileLogin: undefined;
  // ✅ UPDATED: Added mode, formData, and selectedPlan to handle subscription registration flow
  OTPVerification: { 
    mobile: string; 
    verificationId?: string; 
    mode?: 'login' | 'registration'; 
    formData?: any; 
    selectedPlan?: any;
    webConfirmation?: any;
    nativeConfirmation?: any;
  };
  RoleSelection: undefined;
  Registration: { role?: UserRole; mobile?: string } | undefined;
  PlanSelection: { 
    formData: any; 
    role?: UserRole;
  };
  Payment: {
    plan: any;
    userId?: string;
    user?: any;
  };
  PaymentSuccess: {
    isSubscription?: boolean;
    planName?: string;
    planTier?: string;
    paymentReference?: string;
    orderId?: string;
    rawOrderId?: string;
    firestoreOrderId?: string;
    displayOrderId?: string;
    totalAmount: number;
    productName?: string;
    quantity?: number;
    unit?: string;
    utr?: string;
    buyerName?: string;
    date: string;
  };
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
  CommerceHub: undefined;
};