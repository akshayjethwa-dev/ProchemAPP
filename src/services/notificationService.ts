// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// 1. Configure how notifications appear when the app is OPEN (Foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // Shows the popup banner
    shouldShowList: true,   // Shows in the notification center
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotificationsAsync = async (userId: string) => {
  if (!Device.isDevice) {
    console.warn('Must use physical device for Push Notifications');
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notification!');
    return null;
  }

  // Get the Expo Push Token
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) {
    console.error('Project ID not found');
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    
    // Save token to Firestore under the user's document
    if (userId && token) {
      await setDoc(
        doc(db, 'users', userId),
        {
          expoPushToken: token,
          pushTokenUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
    return token;
  } catch (e) {
    console.error('Error getting push token:', e);
    return null;
  }
};

// Helper to configure navigation when a user taps a notification
export const setupNotificationListeners = (navigation: any) => {
  // Listener for when a user taps a notification (foreground or background)
  const responseListener = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      
      // Example: Route based on the notification data payload
      if (data.type === 'NEW_ORDER') {
        navigation.navigate('OrderTracking', { orderId: data.orderId });
      } else if (data.type === 'NEW_REQUIREMENT') {
        navigation.navigate('RequirementDetails', { requirementId: data.requirementId });
      } else if (data.type === 'CHAT') {
        navigation.navigate('NegotiationRoom', { conversationId: data.conversationId });
      }
    }
  );

  return responseListener;
};