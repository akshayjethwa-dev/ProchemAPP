import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  Auth 
} from 'firebase/auth';
// @ts-ignore: TypeScript resolves to web types, but this exists in RN
import { getReactNativePersistence } from 'firebase/auth'; 
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
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
  
  // Initialize Auth with persistence
  // We use a try-catch block to handle potential environment differences safely
  try {
    auth = initializeAuth(app, {
      // @ts-ignore: getReactNativePersistence is valid in React Native context
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (e) {
    console.warn("Failed to initialize custom persistence, falling back to default", e);
    auth = getAuth(app);
  }
} else {
  app = getApp();
  auth = getAuth(app);
}

export const db: Firestore = getFirestore(app);
export { auth };
export default app;