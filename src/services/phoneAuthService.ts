// File: src/services/phoneAuthService.ts
import { Platform } from 'react-native';
import { auth as webAuth } from '../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber as webSignInWithPhoneNumber } from 'firebase/auth';

let nativeAuth: any = null;
try {
  if (Platform.OS !== 'web') {
    nativeAuth = require('@react-native-firebase/auth').default;
  }
} catch (e) {
  // Native Firebase not installed in web environment
}

let globalWebVerifier: RecaptchaVerifier | null = null;

/**
 * Format a phone number to standard E.164 (+91XXXXXXXXXX)
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = (phone || '').trim().replace(/[\s-]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If already starts with 91 and has 12 digits, prepend +
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }

  // If 10 digits, prepend +91
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  // Fallback
  return `+91${digitsOnly.replace(/^0+/, '')}`;
};

export interface PhoneOTPSendResult {
  success: boolean;
  confirmationResult?: any;
  formattedMobile: string;
  error?: any;
  errorMessage?: string;
}

/**
 * Get or create an active RecaptchaVerifier on Web.
 */
export const getFreshRecaptchaVerifier = async (
  containerId = 'recaptcha-container',
  size: 'invisible' | 'normal' = 'invisible'
): Promise<RecaptchaVerifier> => {
  if (Platform.OS !== 'web' || !webAuth || typeof document === 'undefined') {
    throw new Error('reCAPTCHA is only supported in browser environments.');
  }

  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'fixed';
    container.style.bottom = '12px';
    container.style.right = '12px';
    container.style.zIndex = '999999';
    document.body.appendChild(container);
  } else {
    try {
      container.innerHTML = '';
    } catch (e) {}
  }

  if (globalWebVerifier) {
    try {
      globalWebVerifier.clear();
    } catch (e) {}
    globalWebVerifier = null;
  }

  const verifier = new RecaptchaVerifier(webAuth, containerId, {
    size,
    callback: () => {
      console.log('✅ reCAPTCHA verified successfully for real SMS dispatch.');
    },
    'expired-callback': () => {
      console.warn('⚠️ reCAPTCHA response expired.');
    },
  });

  try {
    await verifier.render();
  } catch (renderErr) {
    console.warn('reCAPTCHA render notice:', renderErr);
  }

  globalWebVerifier = verifier;
  return verifier;
};

/**
 * Parse Firebase errors into actionable human messages
 */
export const parsePhoneAuthError = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || '';

  const currentHost = (typeof window !== 'undefined' && window.location?.hostname) 
    ? window.location.hostname 
    : 'localhost';

  if (code === 'auth/invalid-app-credential') {
    return (
      `Firebase rejected the SMS verification request (auth/invalid-app-credential).\n\n` +
      `Here is why and how to fix it in Firebase Console (prochemapp-dev):\n\n` +
      `1. AUTHORIZED DOMAINS:\n` +
      `Your current browser origin is "${currentHost}".\n` +
      `Go to Firebase Console -> Authentication -> Settings -> Authorized Domains, and add "${currentHost}". (If running locally on your PC, also add "127.0.0.1").\n\n` +
      `2. SMS REGION POLICY:\n` +
      `Go to Authentication -> Settings -> SMS Region Policy. Make sure India (+91) is enabled and allowed to receive SMS.\n\n` +
      `3. PHONE PROVIDER:\n` +
      `Go to Authentication -> Sign-in method -> Phone and verify it is toggled to Enabled.`
    );
  }

  if (code === 'auth/quota-exceeded') {
    return 'The SMS quota for your Firebase project has been reached (Firebase Spark plan allows 10 SMS/day). Upgrade to Blaze or check project quotas in Firebase Console.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Too many SMS requests sent to this number. Please wait a few moments before trying again.';
  }

  if (code === 'auth/invalid-phone-number') {
    return 'The phone number format is invalid. Please enter a 10-digit Indian mobile number.';
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Phone authentication is not enabled in your Firebase project. Please enable it in Firebase Console -> Authentication -> Sign-in method -> Phone.';
  }

  if (code === 'auth/captcha-check-failed') {
    return 'reCAPTCHA verification failed. Please check your network connection and try again.';
  }

  return message || 'Failed to dispatch verification code via SMS. Please try again.';
};

/**
 * Send real carrier SMS OTP using Firebase Auth.
 */
export const sendRealPhoneOTP = async (
  phoneNumber: string,
  containerId = 'recaptcha-container'
): Promise<PhoneOTPSendResult> => {
  const formattedMobile = formatPhoneNumber(phoneNumber);

  if (!formattedMobile || formattedMobile.length < 12) {
    throw new Error('Please provide a valid 10-digit mobile number.');
  }

  try {
    let confirmationResult: any = null;

    if (Platform.OS === 'web') {
      if (!webAuth) {
        throw new Error('Firebase Auth is not configured in this application.');
      }

      console.log(`📡 Dispatched real carrier SMS request to ${formattedMobile}...`);
      const verifier = await getFreshRecaptchaVerifier(containerId);
      confirmationResult = await webSignInWithPhoneNumber(webAuth, formattedMobile, verifier);
      console.log(`✅ Carrier SMS OTP dispatched successfully by Firebase to ${formattedMobile}`);
    } else {
      if (!nativeAuth) {
        throw new Error('Native Firebase Auth is not available.');
      }
      console.log(`📡 Dispatched native carrier SMS request to ${formattedMobile}...`);
      confirmationResult = await nativeAuth().signInWithPhoneNumber(formattedMobile);
      console.log(`✅ Native carrier SMS OTP dispatched successfully to ${formattedMobile}`);
    }

    return {
      success: true,
      confirmationResult,
      formattedMobile,
    };
  } catch (error: any) {
    console.error('Carrier SMS dispatch error:', error?.message || error);
    const friendlyMessage = parsePhoneAuthError(error);

    return {
      success: false,
      formattedMobile,
      errorMessage: friendlyMessage,
      error,
    };
  }
};
