// File: App.tsx
import React, { useEffect, useState } from 'react';
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

import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppStore } from './src/store/appStore';

// 🎨 Import unified internal theme
import { theme as internalTheme } from './src/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, 
    shouldPlaySound: true, 
    shouldSetBadge: true,  
    shouldShowBanner: true, 
    shouldShowList: true,   
  }),
});

// 🛠 Map internal semantic typography to React Native Paper's variants
const fontConfig = {
  headlineMedium: { 
    fontSize: internalTheme.typography.sizes.pageTitle, 
    fontWeight: internalTheme.typography.weights.bold 
  },
  displayLarge: { 
    fontSize: internalTheme.typography.sizes.pageTitle, 
    fontWeight: internalTheme.typography.weights.bold 
  },
  titleLarge: { 
    fontSize: internalTheme.typography.sizes.sectionTitle, 
    fontWeight: internalTheme.typography.weights.semiBold 
  },
  bodyLarge: { 
    fontSize: internalTheme.typography.sizes.bodyLarge, 
    fontWeight: internalTheme.typography.weights.regular 
  },
  bodyMedium: { 
    fontSize: internalTheme.typography.sizes.body, 
    fontWeight: internalTheme.typography.weights.regular 
  },
  labelLarge: { 
    fontSize: internalTheme.typography.sizes.label, 
    fontWeight: internalTheme.typography.weights.medium 
  },
  bodySmall: { 
    fontSize: internalTheme.typography.sizes.caption, 
    fontWeight: internalTheme.typography.weights.regular 
  },
};

// 🎨 Merge our custom global theme with the paper font configuration
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

  // Zustand state hydration check
  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setIsHydrated(true);
    } else {
      const unsubFinishHydration = useAppStore.persist.onFinishHydration(() => setIsHydrated(true));
      return () => unsubFinishHydration();
    }
  }, []);

  useEffect(() => {
    checkForForceUpdate();
    setupPushNotifications();
  }, []);

  // 🚀 Register for Push Notifications AND Sync to Firebase User
  const setupPushNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      
      if (token) {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                expoPushToken: token
              });
              console.log("Push token saved to user profile!");
            } catch (error: any) {
              console.warn("Failed to save push token to user (Check Firestore Rules):", error.message);
            }
          }
        });
        
        return () => unsubscribe();
      }
    } catch (err) {
      console.warn("Push notification setup failed:", err);
    }
  };

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
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: projectId, 
        })).data;
        return token;
      } catch (e) {
        console.log("Error getting push token:", e);
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
      console.warn("Skipping version check (Firestore Permission Denied or Not Found):", error.message);
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
            <Text variant="headlineMedium" style={styles.title}>Update Required</Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              A new version of Prochem is available! Please update the app to continue enjoying the latest features and security improvements.
            </Text>
            <Button 
              mode="contained" 
              style={{ width: '80%', paddingVertical: internalTheme.spacing.sm, borderRadius: internalTheme.radius.md }}
              onPress={() => {
                if (storeUrl) {
                  Linking.openURL(storeUrl).catch(err => console.error("Couldn't open store url", err));
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