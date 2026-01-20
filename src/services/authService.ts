import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  ConfirmationResult,
  signInWithPhoneNumber,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface UserProfile {
  email: string;
  userType: 'buyer' | 'seller';
  verified: boolean;
  createdAt?: any;
}

// Email Login
export const loginUser = async (email: string, password: string): Promise<any> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user profile from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return { 
        ...user, 
        profile: userDoc.data() as UserProfile 
      };
    }
    return { 
      ...user, 
      profile: null 
    };
  } catch (error: any) {
    console.error('Login error:', error);
    throw new Error(error.message || 'Login failed');
  }
};

// Email Registration
export const registerUser = async (
  email: string, 
  password: string, 
  userType: 'buyer' | 'seller'
): Promise<any> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      userType: userType,
      createdAt: serverTimestamp(),
      verified: false
    });

    return user;
  } catch (error: any) {
    console.error('Registration error:', error);
    throw new Error(error.message || 'Registration failed');
  }
};

// Logout
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Logout error:', error);
    throw new Error(error.message || 'Logout failed');
  }
};

// Send Password Reset Email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw new Error(error.message || 'Password reset failed');
  }
};

// Phone Authentication (Optional - for future)
export const sendPhoneVerification = async (phoneNumber: string): Promise<ConfirmationResult> => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber);
    return confirmationResult;
  } catch (error: any) {
    console.error('Phone verification error:', error);
    throw new Error(error.message || 'Phone verification failed');
  }
};

export default {
  loginUser,
  registerUser,
  logoutUser,
  resetPassword,
  sendPhoneVerification
};
