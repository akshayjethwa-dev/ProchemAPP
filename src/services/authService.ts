import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  collection,   
  addDoc,       
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, UserRole } from '../types';

interface RegisterData {
  email: string;
  password: string;
  companyName: string;
  phoneNumber: string;
  userType: UserRole;
  gstin: string;
  gstVerified?: boolean;
  verificationStatus?: string;
}

export const loginUser = async (email: string, password: string): Promise<any> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return { ...user, ...userDoc.data() };
    }
    return user;
  } catch (error: any) {
    throw new Error(error.message || 'Login failed');
  }
};

export const registerUser = async ({ email, password, companyName, phoneNumber, userType, gstin, verificationStatus }: RegisterData): Promise<any> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userData: User = {
      uid: user.uid,
      email: email,
      userType: userType,
      companyName: companyName,
      phoneNumber: phoneNumber,
      gstNumber: gstin,
      verified: false,
      kycStatus: 'pending',
      addresses: [], 
      documents: { gstin: false, shopLicense: false, udyogAadhar: false },
      createdAt: new Date().toISOString(),
      
      // ✅ NEW: Default subscription fields for all new users
      subscriptionTier: 'FREE',
      subscriptionExpiry: null,
      paymentHistory: [],
    };

    // 1. Save User to Firestore
    await setDoc(doc(db, 'users', user.uid), userData);
    await updateProfile(user, { displayName: companyName });

    // 2. Send Welcome Notification to the User
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        title: 'Welcome to Prochem! 🎉',
        message: 'Your account has been created successfully. Our team will review your GST details shortly.',
        type: 'system',
        read: false,
        createdAt: new Date().toISOString()
      });
      
      // 3. Send Alert to Admins
      await addDoc(collection(db, 'notifications'), {
        userId: 'ALL_ADMINS',
        title: 'New User Registration',
        message: `${companyName} just registered as a new ${userType.toUpperCase()}.`,
        type: 'admin_broadcast',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (notifyError) {
      console.warn("Failed to create signup notifications:", notifyError);
    }

    return { ...user, ...userData };
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Logout failed');
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(error.message || 'Password reset failed');
  }
};

export const deleteUserAccount = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No user is currently logged in.");

    await deleteDoc(doc(db, 'users', user.uid));
    await deleteUser(user);
  } catch (error: any) {
    console.error('Account deletion error:', error);
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('For security reasons, please log out and log back in before deleting your account.');
    }
    throw new Error(error.message || 'Failed to delete account.');
  }
};

export default {
  loginUser,
  registerUser,
  logoutUser,
  resetPassword,
  deleteUserAccount,
};