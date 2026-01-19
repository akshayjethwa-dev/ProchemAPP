import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { UserProfile, Product, UserRole } from '../types';

// Auth Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import RegistrationScreen from '../screens/RegistrationScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';

// Buyer Screens
import BuyerDashboard from '../screens/BuyerDashboard';
import ProductListingScreen from '../screens/ProductListingScreen';
import ProductDetail from '../screens/ProductDetail';
import CartScreen from '../screens/CartScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import OrderTracking from '../screens/OrderTracking';

// Seller Screens
import SellerDashboard from '../screens/SellerDashboard';
import SellerAddChemical from '../screens/SellerAddChemical';
import SellerManageChemicals from '../screens/SellerManageChemicals';

// Common Screens
import CompanyProfileScreen from '../screens/CompanyProfileScreen';
import HelpScreen from '../screens/HelpScreen';
import NotificationScreen from '../screens/NotificationScreen';

type Screen = 
  | 'splash' | 'login' | 'otp' | 'register' | 'roleSelect'
  | 'buyerDashboard' | 'marketplace' | 'browse' | 'productDetail' | 'cart' | 'orderHistory' | 'orderTracking' | 'buyerProfile' | 'buyerHelp'
  | 'sellerDashboard' | 'addChemical' | 'manageChemicals' | 'sellerProfile' | 'sellerHelp'
  | 'notifications';

interface NavigationState {
  currentScreen: Screen;
  screenParams?: {
    mobile?: string;
    role?: UserRole;
    product?: Product;
    order?: any;
  };
}

export const RootNavigator = () => {
  const { user } = useAuthStore();
  const { items } = useCartStore();
  const [nav, setNav] = useState<NavigationState>({ currentScreen: 'splash' });
  const [profile, setProfile] = useState<UserProfile | null>(user || null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Navigation helpers
  const goTo = (screen: Screen, params?: NavigationState['screenParams']) => {
    setNav({ currentScreen: screen, screenParams: params });
  };

  const goBack = () => {
    const backMap: Record<Screen, Screen> = {
      'splash': 'splash',
      'login': 'splash',
      'otp': 'login',
      'register': 'roleSelect',
      'roleSelect': 'otp',
      'buyerDashboard': 'buyerDashboard',
      'marketplace': 'buyerDashboard',
      'productDetail': 'marketplace', 
      'browse':'browse',
      'cart': 'buyerDashboard',
      'orderHistory': 'buyerDashboard',
      'orderTracking': 'orderHistory',
      'buyerProfile': 'buyerDashboard',
      'buyerHelp': 'buyerDashboard',
      'sellerDashboard': 'sellerDashboard',
      'addChemical': 'sellerDashboard',
      'manageChemicals': 'sellerDashboard',
      'sellerProfile': 'sellerDashboard',
      'sellerHelp': 'sellerDashboard',
      'notifications': 'buyerDashboard',
    };
    goTo(backMap[nav.currentScreen] || 'splash');
  };

  // Handle Auth Flow
  if (!user) {
    switch (nav.currentScreen) {
      case 'splash':
        return <SplashScreen />;
      
      case 'login':
        return (
          <LoginScreen
            onOTPSent={(mobile: string) => goTo('otp', { mobile })}

          />
        );
      
      case 'otp':
        return (
        <OTPVerificationScreen
        mobile={nav.screenParams?.mobile || ''}
        onBack={() => goBack()}
        onVerify={() => {}}
        onVerified={() => goTo('roleSelect')}
        />
        );

      case 'roleSelect':
        return (
          <RoleSelectionScreen
            onBack={() => goBack()}
            onSelect={(role: any) => goTo('register', { role: role, mobile: nav.screenParams?.mobile })}
          />
        );
      
      case 'register':
        return (
          <RegistrationScreen
            mobile={nav.screenParams?.mobile || ''}
            role={nav.screenParams?.role || UserRole.BUSINESS}
            onBack={() => goBack()}
            onRegister={(userData: UserProfile) => {
              setProfile(userData);
              useAuthStore.setState({ user: userData });
              goTo(userData.role === UserRole.BUSINESS ? 'buyerDashboard' : 'sellerDashboard');
            }}
          />
        );
      
      
      
      default:
        return <SplashScreen />;
    }
  }

  // Handle Buyer Flow
  if (user.role === UserRole.BUSINESS) {
    switch (nav.currentScreen) {
      case 'buyerDashboard':
        return (
          <BuyerDashboard
            profile={user}
            onBrowse={() => goTo('marketplace')}
            onOrders={() => goTo('orderHistory')}
            onTrack={() => goTo('orderTracking')}
            onHelp={() => goTo('buyerHelp')}
            onNotifications={() => goTo('notifications')}
            onLogout={() => {
              useAuthStore.setState({ user: null });
              goTo('login');
            }}
          />
        );

      case 'browse':
      return (
    <ProductListingScreen
      category="Industrial Acids"
      products={[]}  // Will be empty initially, can populate from store
      onBack={() => goBack()}
      onProductSelect={(product: Product) => {
        setSelectedProduct(product);
        goTo('productDetail', { product });
      }}
      onToggleFavorite={(id: string) => setIsFavorite(!isFavorite)}
      onAddToCompare={() => {}}
    />
  );

      
      case 'marketplace':
      
  return (
    <ProductListingScreen
      category="Industrial Acids"
      products={products}
      onBack={() => goBack()}
      onProductSelect={(product: Product) => {
        setSelectedProduct(product);
        goTo('productDetail', { product });
      }}
      onToggleFavorite={(id: string) => setIsFavorite(!isFavorite)}
      onAddToCompare={(product: Product) => {}}
    />
  );
      
      case 'productDetail':
        return (
          <ProductDetail
            product={nav.screenParams?.product || selectedProduct || ({} as Product)}
            isFavorite={isFavorite}
            onBack={() => goBack()}
            onAddToCart={(qty: number) => goTo('cart')}
            onBuyNow={(qty: number) => goTo('cart')}
            onToggleFavorite={() => setIsFavorite(!isFavorite)}
            onAddToCompare={() => {}}
            onEnquire={(msg: string) => {}}
          />
        );
      
      case 'cart':
        return (
          <CartScreen
            onBack={() => goBack()}
            onCheckoutSuccess={() => goTo('orderHistory')}
          />
        );
      
      case 'orderHistory':
        return (
          <OrderHistoryScreen
            onBack={() => goBack()}
            
          />
        );
      
      case 'orderTracking':
        return (
          <OrderTracking
            onBack={() => goBack()}
            order={nav.screenParams?.order}
          />
        );
      
      case 'buyerProfile':
        return (
          <CompanyProfileScreen
            profile={profile || user}
            onBack={() => goBack()}
          />
        );
      
      case 'buyerHelp':
        return (
          <HelpScreen
            onBack={() => goBack()}
          />
        );
      
      case 'notifications':
        return (
          <NotificationScreen
            onBack={() => goBack()}
          />
        );

      
      default:
        return <BuyerDashboard profile={profile || user} onBrowse={() => {}} onOrders={() => {}} onTrack={() => {}} onHelp={() => {}} onNotifications={() => {}} onLogout={() => {}} />;
    }
  }

  // Handle Seller Flow
  if (user.role === 'seller') {
    switch (nav.currentScreen) {
      case 'sellerDashboard':
        return (
          <SellerDashboard
            profile={profile || user}
            onLogout={() => {
              useAuthStore.setState({ user: null });
              goTo('login');
            }}
            onAddChemical={() => goTo('addChemical')}
            onManageChemicals={() => goTo('manageChemicals')}
            onOrders={() => goTo('orderHistory')}
            onHelp={() => goTo('sellerHelp')}
          />
        );
      
      case 'addChemical':
        return (
          <SellerAddChemical
            onBack={() => goBack()}
            onSuccess={() => {
              setProducts([...products]); // trigger refresh
              goTo('sellerDashboard');
            }}
          />
        );
      
      case 'manageChemicals':
        return (
          <SellerManageChemicals
            products={products}
            onBack={() => goBack()}
            onEdit={(product: Product) => {
              // TODO: Edit functionality
              console.log('Edit product:', product);
            }}
          />
        );
      
      case 'orderHistory':
        return (
          <OrderHistoryScreen
            onBack={() => goBack()}
          
          />
        );
      
      case 'sellerProfile':
        return (
          <CompanyProfileScreen
            profile={profile || user}
            onBack={() => goBack()}
          />
        );
      
      case 'sellerHelp':
        return (
          <HelpScreen
            onBack={() => goBack()}
          />
        );
      
      case 'notifications':
        return (
          <NotificationScreen
            onBack={() => goBack()}
          />
        );
      
      default:
        return <SellerDashboard profile={profile || user} onLogout={() => {}} onAddChemical={() => {}} onManageChemicals={() => {}} onOrders={() => {}} onHelp={() => {}} />;
    }
  }

  return <SplashScreen />;
};
