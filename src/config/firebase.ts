// src/config/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  Auth,
  // @ts-ignore
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Warn early if env config is missing
if (!process.env.EXPO_PUBLIC_FIREBASE_API_KEY) {
  console.error(
    'CRITICAL ERROR: Firebase API Key is missing. Check EXPO_PUBLIC_FIREBASE_* env variables.'
  );
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

if (!getApps().length) {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);

    // Optional: allow local OTP testing without reCAPTCHA on web localhost only
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost'
    ) {
      try {
        // This disables app verification only in local dev
        // DO NOT use this in production
        (auth as any).settings.appVerificationDisabledForTesting = true;
        console.warn(
          'Phone auth appVerificationDisabledForTesting is ENABLED on localhost.'
        );
      } catch (e) {
        console.warn('Failed to set appVerificationDisabledForTesting:', e);
      }
    }
  } else {
    console.warn('Skipping Firebase initialization due to missing config.');
  }
} else {
  app = getApp();
  auth = getAuth(app);
}

export const db: Firestore = app ? getFirestore(app) : ({} as Firestore);
export const storage: FirebaseStorage = app ? getStorage(app) : ({} as FirebaseStorage);

const exportedAuth = auth as Auth;
const exportedApp = app as FirebaseApp;

export { exportedAuth as auth };
export default exportedApp;