// src/config/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  Auth,
  // @ts-ignore
  getReactNativePersistence 
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Safety check to warn if env variables are missing
if (!process.env.EXPO_PUBLIC_FIREBASE_API_KEY) {
  console.error("CRITICAL ERROR: Firebase API Key is missing. Check EAS environment variables.");
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '', 
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || ''
};

// ✅ FIX: Explicitly initialize to undefined to satisfy TypeScript's definite assignment checks
let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;

if (!getApps().length) {
  // Only initialize if we have a valid API key to prevent hard crashes
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    
    // specific check for Web vs Native to avoid the "not a function" error
    if (Platform.OS === 'web') {
      auth = getAuth(app);
    } else {
      try {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage)
        });
      } catch (e) {
        console.warn("Auth init error, falling back to default:", e);
        auth = getAuth(app);
      }
    }
  } else {
    console.warn("Skipping Firebase initialization due to missing config.");
  }
} else {
  app = getApp();
  auth = getAuth(app);
}

// Ensure app is initialized before exporting services. If not, export empty dummy objects.
export const db: Firestore = app ? getFirestore(app) : ({} as Firestore);
export const storage: FirebaseStorage = app ? getStorage(app) : ({} as FirebaseStorage);

// ✅ FIX: Cast variables to their expected types so other files importing them don't throw type errors
const exportedAuth = auth as Auth;
const exportedApp = app as FirebaseApp;

export { exportedAuth as auth };
export default exportedApp;