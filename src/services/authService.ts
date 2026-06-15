// File: src/services/authService.ts
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  deleteUser,
  fetchSignInMethodsForEmail
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
  whatsappOptIn?: boolean;
}

// ✅ NEW: Check if email exists before sending OTP
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods.length > 0;
  } catch (error) {
    console.error("Error checking email:", error);
    return false;
  }
};

// ✅ NEW: Complete registration after phone is verified
export const completeRegistrationAfterOTP = async (
  firebaseUser: any, 
  formData: RegisterData
): Promise<any> => {
  try {
    // 1. Attach Email and Password to the phone-authenticated user
    await updateEmail(firebaseUser, formData.email);
    await updatePassword(firebaseUser, formData.password);
    await updateProfile(firebaseUser, { displayName: formData.companyName });

    // 2. Prepare user document
    const userData: User = {
      uid: firebaseUser.uid,
      email: formData.email,
      userType: formData.userType,
      companyName: formData.companyName,
      phoneNumber: formData.phoneNumber,
      gstNumber: formData.gstin,
      verified: false,
      kycStatus: 'pending',
      addresses: [], 
      documents: { gstin: false, shopLicense: false, udyogAadhar: false },
      createdAt: new Date().toISOString(),
      
      subscriptionTier: 'FREE',
      subscriptionExpiry: null,
      paymentHistory: [],
      
      whatsappOptIn: formData.whatsappOptIn ?? true, 
      phoneVerified: true, // ✅ Flag marked as true
    };

    // 3. Save User to Firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), userData);

    // 4. Send Welcome Notification
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: firebaseUser.uid,
        title: 'Welcome to Prochem! 🎉',
        message: 'Your account has been created successfully. Our team will review your GST details shortly.',
        type: 'system',
        read: false,
        createdAt: new Date().toISOString()
      });
      
      await addDoc(collection(db, 'notifications'), {
        userId: 'ALL_ADMINS',
        title: 'New User Registration',
        message: `${formData.companyName} just registered as a new ${formData.userType.toUpperCase()}.`,
        type: 'admin_broadcast',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (notifyError) {
      console.warn("Failed to create signup notifications:", notifyError);
    }

    return { ...firebaseUser, ...userData };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to complete registration.');
  }
};

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
  logoutUser,
  resetPassword,
  deleteUserAccount,
  completeRegistrationAfterOTP,
  checkEmailExists,
};