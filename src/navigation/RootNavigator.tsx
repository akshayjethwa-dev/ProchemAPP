import React, { useState } from 'react';
import { View } from 'react-native';
import { useAppStore } from '../store/appStore';
import { User, UserProfile, Product, UserRole } from '../types';

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

import NotificationScreen from '../screens/NotificationScreen';

type Screen =
  | 'splash'
  | 'login'
  | 'otp'
  | 'register'
  | 'roleSelect'
  | 'buyerDashboard'
  | 'marketplace'
  | 'browse'
  | 'productDetail'
  | 'cart'
  | 'orderHistory'
  | 'orderTracking'
  | 'buyerProfile'
  | 'buyerHelp'
  | 'sellerDashboard'
  | 'addChemical'
  | 'manageChemicals'
  | 'sellerProfile'
  | 'sellerHelp'
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
  // ✅ Get state from unified store
  const user = useAppStore((state) => state.user);
  const products = useAppStore((state) => state.products);

  const [nav, setNav] = useState<NavigationState>({ currentScreen: 'splash' });
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Navigation helpers
  const goTo = (screen: Screen, params?: NavigationState['screenParams']) => {
    setNav({ currentScreen: screen, screenParams: params });
  };

  const goBack = () => {
    const backMap: Record<Screen, Screen> = {
      splash: 'splash',
      login: 'splash',
      otp: 'login',
      register: 'roleSelect',
      roleSelect: 'otp',
      buyerDashboard: 'buyerDashboard',
      marketplace: 'buyerDashboard',
      productDetail: 'marketplace',
      browse: 'browse',
      cart: 'buyerDashboard',
      orderHistory: 'buyerDashboard',
      orderTracking: 'orderHistory',
      buyerProfile: 'buyerDashboard',
      buyerHelp: 'buyerDashboard',
      sellerDashboard: 'sellerDashboard',
      addChemical: 'sellerDashboard',
      manageChemicals: 'sellerDashboard',
      sellerProfile: 'sellerDashboard',
      sellerHelp: 'sellerDashboard',
      notifications: 'buyerDashboard',
    };
    goTo(backMap[nav.currentScreen] || 'splash');
  };

  // ✅ Handle Auth Flow - Not Logged In
  if (!user) {
    switch (nav.currentScreen) {
      case 'splash':
        return <SplashScreen onContinue={() => goTo('login')} />;

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
            onSelect={(role: UserRole) =>
              goTo('register', {
                role: role,
                mobile: nav.screenParams?.mobile,
              })
            }
          />
        );

      case 'register':
        return (
          <RegistrationScreen
            mobile={nav.screenParams?.mobile || ''}
            role={nav.screenParams?.role || 'buyer'}
            onBack={() => goBack()}
            onRegister={(userData: UserProfile) => {
              // Convert UserProfile to User for store
              const user: User = {
                uid: userData.uid,
                email: userData.email,
                phone: userData.phone,
                userType: userData.userType,
                verified: userData.verified,
                profile: userData,
              };
              useAppStore.setState({ user });
              goTo(
                userData.userType === 'buyer'
                  ? 'buyerDashboard'
                  : 'sellerDashboard'
              );
            }}
          />
        );

      default:
         return <SplashScreen onContinue={() => goTo('login')} />;
    }
  }

  // ✅ Handle Buyer Flow
  if (user.userType === 'buyer') {
    // Create UserProfile from User for screen props
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      phone: user.phone || '',
      userType: user.userType,
      verified: user.verified,
      ...user.profile,
    };

    switch (nav.currentScreen) {
      case 'buyerDashboard':
        return (
          <BuyerDashboard
            profile={userProfile}
            onBrowse={() => goTo('marketplace')}
            onOrders={() => goTo('orderHistory')}
            onTrack={() => goTo('orderTracking')}
            onHelp={() => goTo('buyerHelp')}
            onNotifications={() => goTo('notifications')}
            onLogout={() => {
              useAppStore.setState({ user: null });
              goTo('login');
            }}
          />
        );

      case 'browse':
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
            onAddToCompare={() => {}}
          />
        );

      case 'productDetail':
        return (
          <ProductDetail
            product={
              nav.screenParams?.product || selectedProduct || ({} as Product)
            }
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
        return <OrderHistoryScreen onBack={() => goBack()} />;

      case 'orderTracking':
        return (
          <OrderTracking
            onBack={() => goBack()}
            order={nav.screenParams?.order}
          />
        );

      case 'buyerProfile':
        return (
          <CompanyProfileScreen profile={userProfile} onBack={() => goBack()} />
        );


      case 'notifications':
        return <NotificationScreen onBack={() => goBack()} />;

      default:
        return (
          <BuyerDashboard
            profile={userProfile}
            onBrowse={() => {}}
            onOrders={() => {}}
            onTrack={() => {}}
            onHelp={() => {}}
            onNotifications={() => {}}
            onLogout={() => {}}
          />
        );
    }
  }

  // ✅ Handle Seller Flow
  if (user.userType === 'seller') {
    // Create UserProfile from User for screen props
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      phone: user.phone || '',
      userType: user.userType,
      verified: user.verified,
      ...user.profile,
    };

    switch (nav.currentScreen) {
      case 'sellerDashboard':
        return (
          <SellerDashboard
            profile={userProfile}
            onLogout={() => {
              useAppStore.setState({ user: null });
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
              goTo('sellerDashboard');
            }}
          />
        );

      case 'manageChemicals':
        return (
          <SellerManageChemicals
            onBack={() => goBack()}
            onEdit={(product: Product) => {
              // TODO: Edit functionality
              console.log('Edit product:', product);
            }}
          />
        );

      case 'orderHistory':
        return <OrderHistoryScreen onBack={() => goBack()} />;

      case 'sellerProfile':
        return (
          <CompanyProfileScreen profile={userProfile} onBack={() => goBack()} />
        );


      case 'notifications':
        return <NotificationScreen onBack={() => goBack()} />;

      default:
        return (
          <SellerDashboard
            profile={userProfile}
            onLogout={() => {}}
            onAddChemical={() => {}}
            onManageChemicals={() => {}}
            onOrders={() => {}}
            onHelp={() => {}}
          />
        );
    }
  }

  return <SplashScreen onContinue={() => goTo('login')} />;
};