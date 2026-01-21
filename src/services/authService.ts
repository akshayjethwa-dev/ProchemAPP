import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserRole } from '../types';

// Email Login
export const loginUser = async (email: string, password: string): Promise<any> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return { 
        ...user, 
        ...userDoc.data() 
      };
    }
    return user;
  } catch (error: any) {
    console.error('Login error:', error);
    throw new Error(error.message || 'Login failed');
  }
};

// ✅ UPDATED: Register with full profile data
export const registerUser = async (
  email: string, 
  password: string, 
  role: UserRole,
  additionalData: {
    companyName: string;
    gstNumber: string;
    phone: string;
    address: string;
    pincode: string;
    documents: any;
  }
): Promise<any> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in Firestore with "Pending" status
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      userType: role,
      companyName: additionalData.companyName,
      gstNumber: additionalData.gstNumber,
      phone: additionalData.phone,
      address: additionalData.address,
      pincode: additionalData.pincode,
      documents: additionalData.documents,
      verified: false, // 🔒 Default to false
      verificationStatus: 'pending', // 🔒 Verification Pending
      createdAt: serverTimestamp(),
    });

    return user;
  } catch (error: any) {
    console.error('Registration error:', error);
    throw new Error(error.message || 'Registration failed');
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Logout error:', error);
    throw new Error(error.message || 'Logout failed');
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw new Error(error.message || 'Password reset failed');
  }
};

export default {
  loginUser,
  registerUser,
  logoutUser,
  resetPassword,
};