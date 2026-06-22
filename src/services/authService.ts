// File: src/services/authService.ts
import { Platform } from 'react-native';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
  fetchSignInMethodsForEmail,
  EmailAuthProvider as WebEmailAuthProvider,
  linkWithCredential as webLinkWithCredential,
  updateProfile as webUpdateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection,   
  addDoc
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

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods.length > 0;
  } catch (error) {
    console.error("Error checking email:", error);
    return false;
  }
};

// 🚀 NEW: Helper to patch user profiles explicitly
export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update user profile.');
  }
};

// 🚀 NEW: Helper for processing pure mobile logins/registrations
export const processMobileLogin = async (firebaseUser: any, phoneNumber: string): Promise<any> => {
  try {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      // User exists, just return the data
      return { ...firebaseUser, ...userDocSnap.data() };
    } else {
      // NEW USER via Mobile-only flow
      const newUserData: Partial<User> = {
        uid: firebaseUser.uid,
        email: '', 
        userType: 'buyer', // Default fallback
        phoneNumber: phoneNumber,
        phone: phoneNumber,
        verified: false,
        kycStatus: 'pending',
        createdAt: new Date().toISOString(),
        
        registrationType: 'mobile',
        hasPassword: false,
        isGSTVerified: false,
        
        subscriptionTier: 'FREE',
        whatsappOptIn: true, 
        phoneVerified: true, 
      };

      await setDoc(userDocRef, newUserData);
      return { ...firebaseUser, ...newUserData };
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to process mobile login.');
  }
}

// Complete full registration after phone is verified
export const completeRegistrationAfterOTP = async (
  firebaseUser: any, 
  formData: RegisterData
): Promise<any> => {
  try {
    try {
      // 🚀 FIX: Unified linking process. 
      // 'firebaseUser' is compatible with WebEmailAuthProvider everywhere now.
      const credential = WebEmailAuthProvider.credential(formData.email, formData.password);
      await webLinkWithCredential(firebaseUser, credential);
      await webUpdateProfile(firebaseUser, { displayName: formData.companyName });
    } catch (linkError: any) {
      console.error("Linking error:", linkError);
      if (linkError.code === 'auth/provider-already-linked' || linkError.code === 'auth/credential-already-in-use') {
        console.log("Account is already linked to an email.");
      } else if (linkError.code === 'auth/email-already-in-use') {
        throw new Error('This email is already associated with another account.');
      } else if (linkError.code === 'auth/operation-not-allowed') {
        throw new Error('Email/Password login is not enabled in Firebase Console.');
      } else {
        throw new Error(linkError.message || 'Failed to attach email to account.');
      }
    }

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
      
      registrationType: 'full',
      hasPassword: true,
      isGSTVerified: formData.gstVerified || false,
      
      subscriptionTier: 'FREE',
      subscriptionExpiry: null,
      paymentHistory: [],
      
      whatsappOptIn: formData.whatsappOptIn ?? true, 
      phoneVerified: true, 
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userData);

    try {
      await addDoc(collection(db, 'notifications'), {
        userId: firebaseUser.uid,
        title: 'Welcome to Prochem! 🎉',
        message: 'Your account has been created successfully.',
        type: 'system',
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
  updateUserProfile,
  processMobileLogin
};