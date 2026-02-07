import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { RootStackParamList } from './types';

// 1. Import All Navigators
import BuyerNavigator from './BuyerNavigator';
import SellerNavigator from './SellerNavigator';
import AdminNavigator from './AdminNavigator';
import TransporterNavigator from './TransporterNavigator'; 

// Auth Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegistrationScreen from '../screens/RegistrationScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import LegalPagesScreen from '../screens/LegalPagesScreen';

// Feature Screens
import ProductDetail from '../screens/ProductDetail';
import NegotiationScreen from '../screens/NegotiationScreen';
import OrderTracking from '../screens/OrderTracking';
import SellerAddChemical from '../screens/SellerAddChemical';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationScreen from '../screens/NotificationScreen';
import NotificationDetailScreen from '../screens/NotificationDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, setUser, viewMode } = useAppStore();
  const [initializing, setInitializing] = useState(true);

  // Debugging: Check your logs to see if the user type is updating!
  console.log("Logged In User Type:", user?.userType); 
  console.log("Current View Mode:", viewMode);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u: FirebaseUser | null) => {
      if (u) {
        try {
          // Fetch fresh data from Firestore to get the 'userType'
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({ uid: u.uid, email: u.email || '', ...userData } as any);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error("Auth Error:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#004AAD" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {/* ✅ KEY UPDATE: 
         We include `user.userType` in the key. 
         This forces the Navigator to DESTROY and REBUILD if the user role changes.
      */}
      <Stack.Navigator 
        key={user ? `auth-${user.userType}-${viewMode}` : 'public'} 
        screenOptions={{ headerShown: false }}
      >
        {!user ? (
          // 1. Public Stack (Not Logged In)
          <Stack.Group>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Registration" component={RegistrationScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            <Stack.Screen name="LegalPages" component={LegalPagesScreen} />
          </Stack.Group>
        ) : (
          // 2. Authenticated Stack
          <Stack.Group>
            
            {/* 🛡️ ADMIN CHECK */}
            {user.userType === 'admin' ? (
              <Stack.Screen name="AdminApp" component={AdminNavigator} />
            
            /* 🚛 TRANSPORTER CHECK */
            ) : user.userType === 'transporter' ? (
               <Stack.Screen name="TransporterApp" component={TransporterNavigator} />

            /* 🏭 SELLER CHECK (Based on Toggle) */
            ) : viewMode === 'seller' ? (
              <>
                <Stack.Screen name="SellerApp" component={SellerNavigator} />
                <Stack.Screen name="AddChemical" component={SellerAddChemical} />
              </>

            /* 🛒 BUYER CHECK (Default) */
            ) : (
              <>
                <Stack.Screen name="BuyerApp" component={BuyerNavigator} />
              </>
            )}
            
            {/* Shared Screens (Accessible by everyone) */}
            <Stack.Screen name="ProductDetail" component={ProductDetail} />
            <Stack.Screen name="Negotiation" component={NegotiationScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTracking} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationScreen} />
            <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
            <Stack.Screen name="LegalPages" component={LegalPagesScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};