import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile // ✅ Added to set display name immediately
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, UserRole } from '../types';

// ✅ Define Interface for Registration Data
interface RegisterData {
  email: string;
  password: string;
  companyName: string;
  phoneNumber: string;
  userType: UserRole;
}

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

// ✅ UPDATED: Register accepts a single object now
export const registerUser = async ({ 
  email, 
  password, 
  companyName, 
  phoneNumber, 
  userType 
}: RegisterData): Promise<any> => {
  try {
    // 1. Create Auth User
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Prepare Firestore Data
    const userData: User = {
      uid: user.uid,
      email: email,
      userType: userType,
      companyName: companyName,
      phoneNumber: phoneNumber, // ✅ Phone Number Saved
      verified: false,
      kycStatus: 'pending',
      // Initialize empty/defaults
      addresses: [], 
      documents: { gstin: false, shopLicense: false, udyogAadhar: false },
      createdAt: new Date().toISOString() // or serverTimestamp() if preferred
    };

    // 3. Save to Firestore
    await setDoc(doc(db, 'users', user.uid), userData);

    // 4. Update Auth Profile (Optional but recommended)
    await updateProfile(user, { displayName: companyName });

    return { ...user, ...userData };
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