import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCdEtRWgcA_xyzO7x7t1-pMTDR76X78x_E",
  authDomain: "prochem--app.firebaseapp.com",
  projectId: "prochem--app",
  storageBucket: "prochem--app.firebasestorage.app",
  messagingSenderId: "782460455688",
  appId: "1:782460455688:web:7c9ee491eb86b42433babd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);

export default app;
