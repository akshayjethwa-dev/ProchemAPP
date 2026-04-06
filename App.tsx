import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3LightTheme, Text, Button } from 'react-native-paper';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// 🚀 Firebase Auth & Firestore imports for saving the token
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { db } from './src/config/firebase'; 

import { RootNavigator } from './src/navigation/RootNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, 
    shouldPlaySound: true, 
    shouldSetBadge: true,  
    shouldShowBanner: true, 
    shouldShowList: true,   
  }),
});

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#004AAD',
    secondary: '#FF6B00',
  },
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
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [checkingVersion, setCheckingVersion] = useState(true);

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
        // Listen for when the user logs in, so we can save their specific token
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

      // 🚀 Get the unique token for this device
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: projectId, // Required for modern Expo apps
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
      // ⚠️ Caught the permission error so it won't crash the app
      console.warn("Skipping version check (Firestore Permission Denied or Not Found):", error.message);
    } finally {
      // Always stop the loading state so the app actually opens
      setCheckingVersion(false);
    }
  };

  if (isUpdateRequired) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <View style={styles.forceUpdateContainer}>
            <Text variant="headlineMedium" style={styles.title}>Update Required</Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              A new version of Prochem is available! Please update the app to continue enjoying the latest features and security improvements.
            </Text>
            <Button 
              mode="contained" 
              style={{ width: '80%', paddingVertical: 8 }}
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

  if (checkingVersion) return null; 

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
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
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontWeight: 'bold',
    color: '#004AAD',
    marginBottom: 16,
  },
  subtitle: {
    textAlign: 'center',
    color: '#64748B',
    marginBottom: 32,
  },
});