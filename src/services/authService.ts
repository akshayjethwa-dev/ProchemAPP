import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser // ✅ Added for Account Deletion
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, // ✅ Added for Account Deletion
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

export const registerUser = async ({ email, password, companyName, phoneNumber, userType }: RegisterData): Promise<any> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userData: User = {
      uid: user.uid,
      email: email,
      userType: userType,
      companyName: companyName,
      phoneNumber: phoneNumber,
      verified: false,
      kycStatus: 'pending',
      addresses: [], 
      documents: { gstin: false, shopLicense: false, udyogAadhar: false },
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    await updateProfile(user, { displayName: companyName });

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

// ✅ NEW FUNCTION: Delete User Account
export const deleteUserAccount = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No user is currently logged in.");

    // 1. Delete user data from Firestore
    await deleteDoc(doc(db, 'users', user.uid));

    // 2. Delete the user from Firebase Authentication
    await deleteUser(user);
  } catch (error: any) {
    console.error('Account deletion error:', error);
    // Firebase requires a recent login to delete an account for security reasons
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