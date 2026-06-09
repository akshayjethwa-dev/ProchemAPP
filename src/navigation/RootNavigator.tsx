import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, SafeAreaView, TouchableOpacity, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { RootStackParamList } from './types';

import BuyerNavigator from './BuyerNavigator';
import SellerNavigator from './SellerNavigator';
import AdminNavigator from './AdminNavigator';

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

// ✅ NEW: Import KYC Verification Screen
import KYCVerificationScreen from '../screens/KYCVerificationScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, setUser, viewMode, hasSeenOnboarding, adminImpersonating, stopImpersonating } = useAppStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u: FirebaseUser | null) => {
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
            console.warn("User authenticated but document not found in Firestore.");
            setUser(null);
          }
        } catch (error: any) {
          console.warn("Firestore access denied when fetching user:", error.message);
          setUser(null);
        } finally {
          if (initializing) setInitializing(false);
        }
      } else {
        setUser(null);
        if (initializing) setInitializing(false);
      }
    });
    
    return () => unsubscribe();
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

      <NavigationContainer key={adminImpersonating ? 'impersonating-mode' : 'admin-mode'}>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            headerBackTitle: '', 
            headerTintColor: '#1F2937', 
            headerShadowVisible: false, 
            headerStyle: { backgroundColor: '#FFFFFF' }, 
            headerTitleStyle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
            headerTitleAlign: 'center',
            // MOTION POLISH: Apply a smooth, native-feeling slide animation to all transitions
            animation: 'slide_from_right', 
            // MOTION POLISH: Prevent layout jumps during transitions
            animationDuration: 250,
          }}
        >
          {!user ? (
            <Stack.Group screenOptions={{ animation: 'fade' }}>
              {/* Fade is better for auth/splash screens to prevent jarring sliding */}
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Registration" component={RegistrationScreen} />
              <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
              <Stack.Screen name="LegalPages" component={LegalPagesScreen} />
              <Stack.Screen name="AboutProchem" component={AboutProchemScreen} /> 
            </Stack.Group>
          ) : !hasSeenOnboarding ? (
            <Stack.Group screenOptions={{ animation: 'fade' }}>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            </Stack.Group>
          ) : (
            <Stack.Group>
              {((user.userType === 'admin' || user.userType === 'sub_admin') && !adminImpersonating) ? (
                <Stack.Screen name="AdminApp" component={AdminNavigator} />
              ) : viewMode === 'seller' ? (
                <>
                  <Stack.Screen name="SellerApp" component={SellerNavigator} />
                  <Stack.Screen name="AddChemical" component={SellerAddChemical} options={{ animation: 'slide_from_bottom' }} />
                </>
              ) : (
                <>
                  <Stack.Screen name="BuyerApp" component={BuyerNavigator} />
                </>
              )}
              
              {/* ✅ NEW: Global KYC Screen added for Unverified user redirects */}
              <Stack.Screen name="KYCVerification" component={KYCVerificationScreen} options={{ animation: 'slide_from_bottom' }} />

              <Stack.Screen name="ProductDetail" component={ProductDetail} />
              <Stack.Screen name="Negotiation" component={NegotiationScreen} />
              <Stack.Screen name="OrderTracking" component={OrderTracking} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ animation: 'slide_from_bottom' }} />
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