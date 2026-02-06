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

const firebaseConfig = {
  apiKey: "AIzaSyC0cRo4vmdwsbNkdiIKwStxGsxJhuhRpYo", 
  authDomain: "prochemapp-dev.firebaseapp.com",
  projectId: "prochemapp-dev",
  storageBucket: "prochemapp-dev.firebasestorage.app",
  messagingSenderId: "193158013078",
  appId: "1:193158013078:web:af1b9968ab61a561a662b7"
};

let app: FirebaseApp;
let auth: Auth;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  
  // ✅ FIX: specific check for Web vs Native to avoid the "not a function" error
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
  app = getApp();
  auth = getAuth(app);
}

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export { auth };
export default app;