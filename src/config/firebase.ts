import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyC0cRo4vmdwsbNkdiIKwStxGsxJhuhRpYo",
  authDomain: "prochemapp-dev.firebaseapp.com",
  projectId: "prochemapp-dev",
  storageBucket: "prochemapp-dev.firebasestorage.app",
  messagingSenderId: "193158013078",
  appId: "1:193158013078:web:af1b9968ab61a561a662b7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);

export default app;
