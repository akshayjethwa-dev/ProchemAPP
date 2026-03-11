// App.tsx

import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3LightTheme, Text, Button } from 'react-native-paper';

// 🚀 1. Import Notification Libraries
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// 🚀 2. Import Force Update Libraries
import Constants from 'expo-constants';
import { doc, getDoc } from 'firebase/firestore'; 
import { db } from './src/config/firebase'; 

import { RootNavigator } from './src/navigation/RootNavigator';

// 🚀 FIXED TYPESCRIPT ERROR: 
// Added `shouldShowBanner` and `shouldShowList` for newer Expo SDK compatibility
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, 
    shouldPlaySound: true, 
    shouldSetBadge: true,  
    shouldShowBanner: true, // ✅ Required for new Expo versions
    shouldShowList: true,   // ✅ Required for new Expo versions
  }),
});

// Optional: Define your custom theme colors here
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#004AAD',
    secondary: '#FF6B00',
  },
};

// 🚀 Helper function to compare semantic versions (e.g., '1.0.2' vs '1.0.10')
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
  
  // 🚀 Force Update States
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [checkingVersion, setCheckingVersion] = useState(true);

  // Request permissions on app launch AND check for force updates
  useEffect(() => {
    registerForPushNotificationsAsync();
    checkForForceUpdate();
  }, []);

  // 🚀 Version Check Logic
  const checkForForceUpdate = async () => {
    try {
      // Get current app version from Expo config (e.g., "1.0.0")
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      
      // Fetch required version from Firestore
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
    } catch (error) {
      console.error("Failed to check app version:", error);
    } finally {
      setCheckingVersion(false);
    }
  };

  // Function to ask the user for permission and configure Android
  async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX, // Max importance ensures banner shows
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // If permission hasn't been asked yet, ask for it
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('User denied push notification permissions!');
        return;
      }

      // At this point, permissions are granted!
      // (Later, you will get the Expo Push Token here to save to Firebase)
      
    } else {
      console.log('Must use physical device for Push Notifications');
    }
  }

  // 🚀 Render Blocking Screen if Update is Required
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

  // If still checking version, render nothing so the old app doesn't flash
  if (checkingVersion) {
    return null; 
  }

  return (
    // 1. SafeAreaProvider prevents content from hiding behind the notch/status bar
    <SafeAreaProvider>
      {/* 2. PaperProvider enables the UI components we used (Buttons, Cards, etc.) */}
      <PaperProvider theme={theme}>
        {/* 3. StatusBar controls the battery/time icons color */}
        <StatusBar style="dark" />
        
        {/* 4. The main navigation structure */}
        <RootNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

// 🚀 Styles for the Force Update screen
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