import { UserProfile, UserRole, AuthResponse } from '../types';

/**
 * Mock Authentication Service
 * TODO: Replace with Firebase Authentication
 */

interface OTPData {
  phone: string;
  otp: string;
  expiresAt: Date;
}

// Store OTP data temporarily (in-memory)
let otpStore: { [key: string]: OTPData } = {};

export const authService = {
  /**
   * Step 1: Send OTP to user's phone
   * @param phone User phone number
   * @returns Promise with success status
   */
  sendOTP: async (phone: string): Promise<AuthResponse> => {
    try {
      // Validate phone
      if (!phone || phone.length < 10) {
        return { success: false, message: 'Invalid phone number' };
      }

      // Generate mock OTP (in production, Firebase/SMS service sends this)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      otpStore[phone] = { phone, otp, expiresAt };

      console.log(`[AUTH] OTP sent to ${phone}: ${otp}`); // Debug log

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        success: true,
        message: `OTP sent to ${phone}. Use: ${otp}`,
      };
    } catch (error) {
      console.error('sendOTP error:', error);
      return { success: false, message: 'Failed to send OTP' };
    }
  },

  /**
   * Step 2: Verify OTP
   * @param phone User phone number
   * @param otp OTP entered by user
   * @returns Promise with verification status
   */
  verifyOTP: async (phone: string, otp: string): Promise<AuthResponse> => {
    try {
      if (!phone || !otp) {
        return { success: false, message: 'Phone and OTP required' };
      }

      const storedData = otpStore[phone];

      if (!storedData) {
        return { success: false, message: 'OTP not found. Request new OTP.' };
      }

      // Check if OTP expired
      if (new Date() > storedData.expiresAt) {
        delete otpStore[phone];
        return { success: false, message: 'OTP expired. Request new OTP.' };
      }

      // Check if OTP matches
      if (storedData.otp !== otp) {
        return { success: false, message: 'Invalid OTP. Try again.' };
      }

      // OTP verified - clean up
      delete otpStore[phone];

      console.log(`[AUTH] OTP verified for ${phone}`);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return { success: true, message: 'OTP verified successfully' };
    } catch (error) {
      console.error('verifyOTP error:', error);
      return { success: false, message: 'Verification failed' };
    }
  },

  /**
   * Step 3: Create User Profile
   * @param profile UserProfile data
   * @returns Promise with user data and auth token
   */
  createUserProfile: async (profile: UserProfile): Promise<AuthResponse<UserProfile & { token: string }>> => {
    try {
      // Validate required fields
      if (!profile.companyName || !profile.phone || !profile.email) {
        return {
          success: false,
          message: 'Company name, phone, and email are required',
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profile.email)) {
        return { success: false, message: 'Invalid email format' };
      }

      // Validate role
      if (!profile.role) {
        return { success: false, message: 'User role is required' };
      }

      // For BUSINESS/SELLER role, GST is required
      if ((profile.role === UserRole.BUSINESS || profile.role === UserRole.SELLER) && !profile.gstNumber) {
        return { success: false, message: 'GST number required for business accounts' };
      }

      // Create user object
      const newUser: UserProfile & { token: string } = {
        ...profile,
        uid: `user_${Date.now()}`,
        verified: false,
        createdAt: new Date(),
        verificationStatus: 'PENDING',
        token: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      console.log('[AUTH] User profile created:', newUser);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // TODO: Save to Firebase Firestore
      // await db.collection('users').doc(newUser.uid).set(newUser);

      // TODO: Save auth token to secure storage
      // await SecureStore.setItemAsync('authToken', newUser.token);

      return {
        success: true,
        message: 'Profile created successfully',
        user: newUser,
      };
    } catch (error) {
      console.error('createUserProfile error:', error);
      return { success: false, message: 'Failed to create profile' };
    }
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    try {
      console.log('[AUTH] User logged out');
      // TODO: Clear secure storage
      // await SecureStore.deleteItemAsync('authToken');
      otpStore = {};
    } catch (error) {
      console.error('logout error:', error);
    }
  },
};