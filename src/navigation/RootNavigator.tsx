// File: src/navigation/RootNavigator.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { RootStackParamList } from './types';
import { theme } from '../theme';

import BuyerNavigator from './BuyerNavigator';
import SellerNavigator from './SellerNavigator';
import AdminNavigator from './AdminNavigator';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import MobileLoginScreen from '../screens/MobileLoginScreen';
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
import KYCVerificationScreen from '../screens/KYCVerificationScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, setUser, viewMode, hasSeenOnboarding, adminImpersonating, stopImpersonating } = useAppStore();
  const [initializing, setInitializing] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!auth) {
      console.error("Firebase auth is undefined. Check your .env variables!");
      if (initializing) setInitializing(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (u: FirebaseUser | null) => {
      if (useAppStore.getState().adminImpersonating) {
        if (initializing) setInitializing(false);
        return;
      }

      if (u) {
        let retries = 6;
        let userFound = false;

        while (retries > 0 && !userFound) {
          try {
            const userDoc = await getDoc(doc(db, 'users', u.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUser({ uid: u.uid, email: u.email || '', ...userData } as any);
              userFound = true;
            } else {
              console.log(`Document not found, waiting 1s... (Retries left: ${retries})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              retries--;
            }
          } catch (error: any) {
            console.warn("Firestore access denied when fetching user:", error.message);
            break; 
          }
        }

        if (!userFound) {
          console.warn("User authenticated but document was never created in Firestore.");
          setUser(null);
        }

        if (initializing) setInitializing(false);

      } else {
        setUser(null);
        if (initializing) setInitializing(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.colors.textPrimary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {adminImpersonating && (
        <View style={{ backgroundColor: '#D32F2F', paddingTop: Math.max(insets.top, theme.spacing.xs) }}>
          <View style={{ padding: theme.spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: theme.typography.sizes.caption, flex: 1 }}>
              👀 Viewing as: {user?.companyName || user?.email}
            </Text>
            <TouchableOpacity onPress={stopImpersonating} style={{ backgroundColor: 'white', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: 6 }}>
              <Text style={{ color: '#D32F2F', fontWeight: 'bold', fontSize: theme.typography.sizes.caption }}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <NavigationContainer key={adminImpersonating ? 'impersonating-mode' : 'admin-mode'}>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            headerBackTitle: '', 
            headerTintColor: theme.colors.textPrimary, 
            headerShadowVisible: false, 
            headerStyle: { backgroundColor: theme.colors.surface }, 
            headerTitleStyle: { fontSize: theme.typography.sizes.bodyLarge, fontWeight: '600', color: theme.colors.textPrimary },
            headerTitleAlign: 'center',
            animation: 'slide_from_right', 
            animationDuration: 250,
          }}
        >
          {!user ? (
            <Stack.Group screenOptions={{ animation: 'fade' }}>
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="MobileLogin" component={MobileLoginScreen} />
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
                  {/* ✅ ENABLE HEADER POLICY FOR ADD CHEMICAL HERE */}
                  <Stack.Screen name="AddChemical" component={SellerAddChemical} options={{ animation: 'slide_from_bottom', headerShown: true, title: 'Add New Chemical' }} />
                </>
              ) : (
                <>
                  <Stack.Screen name="BuyerApp" component={BuyerNavigator} />
                </>
              )}
              
              {/* ✅ ENABLE HEADER POLICY FOR FORMS/PROFILE/KYC HERE */}
              <Stack.Screen name="KYCVerification" component={KYCVerificationScreen} options={{ animation: 'slide_from_bottom', headerShown: true, title: 'Identity Verification' }} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ animation: 'slide_from_bottom', headerShown: true, title: 'Edit Profile' }} />
              
              <Stack.Screen name="OrderTracking" component={OrderTracking} options={{ headerShown: true, title: 'Order Details' }} />
              <Stack.Screen name="ProductDetail" component={ProductDetail} />
              <Stack.Screen name="Negotiation" component={NegotiationScreen} />
              <Stack.Screen name="Notifications" component={NotificationScreen} options={{ headerShown: true, title: 'Notifications' }} />
              <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} options={{ headerShown: true, title: 'Notification' }} />
              <Stack.Screen name="LegalPages" component={LegalPagesScreen} />
              <Stack.Screen name="AboutProchem" component={AboutProchemScreen} />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
};