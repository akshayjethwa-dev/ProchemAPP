// File: App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, StyleSheet, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, Text, Button, configureFonts } from 'react-native-paper';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// 🚀 Firebase Auth & Firestore
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './src/config/firebase';

// 🚀 React Navigation Ref (Required for handling Notification Taps)
import { createNavigationContainerRef } from '@react-navigation/native';

import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppStore } from './src/store/appStore';

// 🎨 Import unified internal theme
import { theme as internalTheme } from './src/theme';

// 💳 Hypercheckout SDK bootstrap (Stage 1 – App load)
import {
  initiateHyperSdk,
  registerHyperCallbackHandler,
  unregisterHyperCallbackHandler,
} from './src/services/hyperSdk';

// 🚀 Export navigationRef so you can pass it to NavigationContainer in RootNavigator.tsx
export const navigationRef = createNavigationContainerRef<any>();

// 🛠 Configure foreground notification appearance
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // Shows in-app banner
    shouldShowList: true,   // Shows in notification center
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 🛠 Map internal semantic typography to React Native Paper's variants
const fontConfig = {
  headlineMedium: {
    fontSize: internalTheme.typography.sizes.pageTitle,
    fontWeight: internalTheme.typography.weights.bold,
  },
  displayLarge: {
    fontSize: internalTheme.typography.sizes.pageTitle,
    fontWeight: internalTheme.typography.weights.bold,
  },
  titleLarge: {
    fontSize: internalTheme.typography.sizes.sectionTitle,
    fontWeight: internalTheme.typography.weights.semiBold,
  },
  bodyLarge: {
    fontSize: internalTheme.typography.sizes.bodyLarge,
    fontWeight: internalTheme.typography.weights.regular,
  },
  bodyMedium: {
    fontSize: internalTheme.typography.sizes.body,
    fontWeight: internalTheme.typography.weights.regular,
  },
  labelLarge: {
    fontSize: internalTheme.typography.sizes.label,
    fontWeight: internalTheme.typography.weights.medium,
  },
  bodySmall: {
    fontSize: internalTheme.typography.sizes.caption,
    fontWeight: internalTheme.typography.weights.regular,
  },
};

const paperTheme = {
  ...internalTheme,
  fonts: configureFonts({ config: fontConfig }),
};

const isVersionOlder = (current: string, required: string) => {
  const v1 = current.split('.').map(Number);
  const v2 = required.split('.').map(Number);
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    if (num1 < num2) return true;
    if (num1 > num2) return false;
  }
  return false;
};

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [checkingVersion, setCheckingVersion] = useState(true);

  // 🛡 Guard: `initiate` must fire exactly once per app lifecycle to avoid JP_017
  const sdkBootstrappedRef = useRef(false);

  // ────────────────────────────────────────────────────────────────────────
  // 💳 STAGE 1 – Boot Hypercheckout SDK as soon as the app loads
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (sdkBootstrappedRef.current) return;
    sdkBootstrappedRef.current = true;

    initiateHyperSdk();

    registerHyperCallbackHandler((event, data) => {
      if (event === 'process_result') {
        console.log('[App] process_result received:', data);
      }
    });

    return () => {
      unregisterHyperCallbackHandler();
    };
  }, []);

  // Zustand state hydration check
  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setIsHydrated(true);
    } else {
      const unsubFinishHydration = useAppStore.persist.onFinishHydration(() =>
        setIsHydrated(true)
      );
      return () => unsubFinishHydration();
    }
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // 🔔 PUSH NOTIFICATIONS SETUP & LISTENERS
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    checkForForceUpdate();

    // 1. Register for push notifications & sync token to Firebase
    let authUnsubscribe: (() => void) | undefined;

    const initPush = async () => {
      const token = await registerForPushNotificationsAsync();

      if (token) {
        const auth = getAuth();
        // Listen for auth changes so we save the token when user logs in
        authUnsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                expoPushToken: token,
                pushTokenUpdatedAt: new Date().toISOString(),
              });
              console.log('Push token saved to user profile!');
            } catch (error: any) {
              console.warn('Failed to save push token (Check Firestore Rules):', error.message);
            }
          }
        });
      }
    };

    initPush();

    // 2. Listener: When user taps an Android popup notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        // Only navigate if the app is ready
        if (navigationRef.isReady() && data) {
          if (data.type === 'NEW_ORDER' && data.orderId) {
            navigationRef.navigate('OrderTracking', { orderId: data.orderId });
          } else if (data.type === 'NEW_REQUIREMENT' && data.requirementId) {
            // navigationRef.navigate('RequirementDetails', { requirementId: data.requirementId });
          } else if (data.type === 'CHAT' && data.conversationId) {
            // navigationRef.navigate('NegotiationRoom', { conversationId: data.conversationId });
          }
        }
      }
    );

    // Cleanup on unmount
    return () => {
      if (authUnsubscribe) authUnsubscribe();
      // ✅ FIX: Use the built-in .remove() method on the listener object
      responseListener.remove();
    };
  }, []);

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('User denied push notification permissions!');
        return null;
      }

      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ||
          Constants.easConfig?.projectId;
        token = (
          await Notifications.getExpoPushTokenAsync({ projectId })
        ).data;
        return token;
      } catch (e) {
        console.log('Error getting push token:', e);
        return null;
      }
    } else {
      console.log('Must use physical device for Push Notifications');
      return null;
    }
  }

  const checkForForceUpdate = async () => {
    try {
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const docRef = doc(db, 'app_settings', 'app_config');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const minRequiredVersion = data.minRequiredVersion;

        if (minRequiredVersion && isVersionOlder(currentVersion, minRequiredVersion)) {
          setIsUpdateRequired(true);
          setStoreUrl(data.playStoreUrl || '');
        }
      }
    } catch (error: any) {
      console.warn(
        'Skipping version check (Firestore Permission Denied or Not Found):',
        error.message
      );
    } finally {
      setCheckingVersion(false);
    }
  };

  // Wait for both version check and state hydration to finish
  if (checkingVersion || !isHydrated) return null;

  if (isUpdateRequired) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <View style={styles.forceUpdateContainer}>
            <Text variant="headlineMedium" style={styles.title}>
              Update Required
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              A new version of Prochem is available! Please update the app to
              continue enjoying the latest features and security improvements.
            </Text>
            <Button
              mode="contained"
              style={{
                width: '80%',
                paddingVertical: internalTheme.spacing.sm,
                borderRadius: internalTheme.radius.md,
              }}
              onPress={() => {
                if (storeUrl) {
                  Linking.openURL(storeUrl).catch((err) =>
                    console.error("Couldn't open store url", err)
                  );
                }
              }}
            >
              Update Now
            </Button>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <StatusBar style="dark" />
        <RootNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  forceUpdateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: internalTheme.spacing.lg,
    backgroundColor: internalTheme.colors.background,
  },
  title: {
    color: internalTheme.colors.primary,
    marginBottom: internalTheme.spacing.md,
  },
  subtitle: {
    textAlign: 'center',
    color: internalTheme.colors.textSecondary,
    marginBottom: internalTheme.spacing.xl,
  },
});