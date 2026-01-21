import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { RootStackParamList } from './types';

// Screens
import LoginScreen from '../screens/LoginScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import RegistrationScreen from '../screens/RegistrationScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import SplashScreen from '../screens/SplashScreen';
import BuyerDashboard from '../screens/BuyerDashboard';
import ProductListingScreen from '../screens/ProductListingScreen';
import ProductDetail from '../screens/ProductDetail';
import NegotiationScreen from '../screens/NegotiationScreen';
import CartScreen from '../screens/CartScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import SellerDashboard from '../screens/SellerDashboard';
import SellerAddChemical from '../screens/SellerAddChemical';
import SellerManageChemicals from '../screens/SellerManageChemicals';
import LegalPagesScreen from '../screens/LegalPagesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, setUser } = useAppStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u: FirebaseUser | null) => {
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            setUser({ uid: u.uid, email: u.email || '', ...userDoc.data() } as any);
          } else {
            setUser(null);
          }
        } catch (e) { setUser(null); }
      } else {
        setUser(null);
      }
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator size="large" color="#004AAD"/></View>;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // 🛑 Public Stack
          <Stack.Group>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            <Stack.Screen name="Registration" component={RegistrationScreen} />
            <Stack.Screen name="LegalPages" component={LegalPagesScreen} />
          </Stack.Group>
        ) : user.userType === 'seller' ? (
          // 🚚 Seller Stack
          <Stack.Group>
            <Stack.Screen name="SellerDashboard" component={SellerDashboard} />
            <Stack.Screen name="AddChemical" component={SellerAddChemical} />
            <Stack.Screen name="ManageChemicals" component={SellerManageChemicals} />
            <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
          </Stack.Group>
        ) : (
          // 🏭 Buyer Stack
          <Stack.Group>
            <Stack.Screen name="BuyerDashboard" component={BuyerDashboard} />
            <Stack.Screen name="Marketplace" component={ProductListingScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetail} />
            <Stack.Screen name="Negotiation" component={NegotiationScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};