// src/navigation/RootNavigator.tsx

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, SafeAreaView, TouchableOpacity, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { RootStackParamList } from './types';

// Navigators
import BuyerNavigator from './BuyerNavigator';
import SellerNavigator from './SellerNavigator';
import AdminNavigator from './AdminNavigator';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegistrationScreen from '../screens/RegistrationScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import LegalPagesScreen from '../screens/LegalPagesScreen';
import AboutProchemScreen from '../screens/AboutProchemScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import ProductDetail from '../screens/ProductDetail';
import NegotiationScreen from '../screens/NegotiationScreen';
import OrderTracking from '../screens/OrderTracking';
import SellerAddChemical from '../screens/SellerAddChemical';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationScreen from '../screens/NotificationScreen';
import NotificationDetailScreen from '../screens/NotificationDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, setUser, viewMode, hasSeenOnboarding, adminImpersonating, stopImpersonating } = useAppStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u: FirebaseUser | null) => {
      // 🚀 IF IMPERSONATING: Ignore Firebase Auth state changes
      if (useAppStore.getState().adminImpersonating) {
        if (initializing) setInitializing(false);
        return;
      }

      if (u) {
        try {
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
    <View style={{ flex: 1 }}>
      {/* 🚀 ADMIN IMPERSONATION BANNER */}
      {adminImpersonating && (
        <SafeAreaView style={{ backgroundColor: '#D32F2F' }}>
          <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Platform.OS === 'android' ? 25 : 0 }}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13, flex: 1 }}>
              👀 Viewing as: {user?.companyName || user?.email}
            </Text>
            <TouchableOpacity onPress={stopImpersonating} style={{ backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}>
              <Text style={{ color: '#D32F2F', fontWeight: 'bold', fontSize: 12 }}>Exit</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      <NavigationContainer>
        {/* 🚀 KEY FIX: Added user.uid and adminImpersonating to force React Navigation to rebuild the stack */}
        <Stack.Navigator 
          key={user ? `auth-${user.uid}-${viewMode}-${adminImpersonating}` : 'public'} 
          screenOptions={{ headerShown: false }}
        >
          {!user ? (
            <Stack.Group>
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Registration" component={RegistrationScreen} />
              <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
              <Stack.Screen name="LegalPages" component={LegalPagesScreen} />
              <Stack.Screen name="AboutProchem" component={AboutProchemScreen} /> 
            </Stack.Group>
          ) : !hasSeenOnboarding ? (
            <Stack.Group>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            </Stack.Group>
          ) : (
            <Stack.Group>
              
              {/* 🛡️ ADMIN CHECK: Only show AdminApp if NOT impersonating */}
              {(user.userType === 'admin' && !adminImpersonating) ? (
                <Stack.Screen name="AdminApp" component={AdminNavigator} />
              
              /* 🏭 SELLER CHECK */
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
              
              {/* Shared Screens */}
              <Stack.Screen name="ProductDetail" component={ProductDetail} />
              <Stack.Screen name="Negotiation" component={NegotiationScreen} />
              <Stack.Screen name="OrderTracking" component={OrderTracking} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="Notifications" component={NotificationScreen} />
              <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
              <Stack.Screen name="LegalPages" component={LegalPagesScreen} />
              <Stack.Screen name="AboutProchem" component={AboutProchemScreen} />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
};