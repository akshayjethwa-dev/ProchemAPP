// File: src/services/phoneAuthService.ts
import { Platform, Alert } from 'react-native';
import { auth as webAuth } from '../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber as webSignInWithPhoneNumber } from 'firebase/auth';

let nativeAuth: any = null;
try {
  if (Platform.OS !== 'web') {
    nativeAuth = require('@react-native-firebase/auth').default;
  }
} catch (e) {}

let globalWebVerifier: RecaptchaVerifier | null = null;

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = (phone || '').trim().replace(/[\s-]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) return `+${digitsOnly}`;
  if (digitsOnly.length === 10) return `+91${digitsOnly}`;
  return `+91${digitsOnly.replace(/^0+/, '')}`;
};

export interface PhoneOTPSendResult {
  success: boolean;
  confirmationResult?: any;
  formattedMobile: string;
  error?: any;
  errorMessage?: string;
}

export const getFreshRecaptchaVerifier = async (): Promise<RecaptchaVerifier> => {
  if (Platform.OS !== 'web' || !webAuth || typeof document === 'undefined') {
    throw new Error('reCAPTCHA is only supported in browser environments.');
  }

  if (globalWebVerifier) return globalWebVerifier;

  const containerId = 'global-firebase-recaptcha';
  let container = document.getElementById(containerId);
  
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'fixed';
    container.style.bottom = '12px';
    container.style.right = '12px';
    container.style.zIndex = '999999';
    document.body.appendChild(container);
  }

  const verifier = new RecaptchaVerifier(webAuth, containerId, {
    size: 'invisible',
    callback: () => console.log('✅ reCAPTCHA verified successfully.'),
    'expired-callback': () => {
      console.warn('⚠️ reCAPTCHA expired.');
      if (globalWebVerifier) {
        globalWebVerifier.clear();
        globalWebVerifier = null;
      }
    },
  });

  try {
    await verifier.render();
    globalWebVerifier = verifier; 
  } catch (renderErr) {
    throw renderErr;
  }

  return verifier;
};

export const parsePhoneAuthError = (error: any): string => {
  const code = error?.code || '';
  const currentHost = (typeof window !== 'undefined' && window.location?.hostname) 
    ? `${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}` 
    : 'localhost';

  if (code.includes('invalid-app-credential') || code.includes('app-not-authorized')) {
    return `Firebase security blocked the request.\n\nYou must add "${currentHost}" to Authorized Domains in your Firebase Console (Authentication -> Settings -> Authorized Domains).`;
  }

  if (code.includes('quota-exceeded')) return 'SMS quota exhausted for today (Firebase Spark plan limit reached).';
  if (code.includes('too-many-requests')) return 'Too many SMS requests sent. Please wait a few moments.';
  if (code.includes('captcha-check-failed')) return 'reCAPTCHA verification failed. Check your network.';

  return error?.message || 'Failed to dispatch verification code via SMS.';
};

export const sendRealPhoneOTP = async (
  phoneNumber: string
): Promise<PhoneOTPSendResult> => {
  const formattedMobile = formatPhoneNumber(phoneNumber);

  if (!formattedMobile || formattedMobile.length < 12) {
    throw new Error('Please provide a valid 10-digit mobile number.');
  }

  try {
    let confirmationResult: any = null;

    if (Platform.OS === 'web' || !nativeAuth) {
      if (!webAuth) throw new Error('Firebase Auth is not configured.');
      
      console.log(`📡 Dispatched Web SMS request to ${formattedMobile}...`);
      const verifier = await getFreshRecaptchaVerifier();
      confirmationResult = await webSignInWithPhoneNumber(webAuth, formattedMobile, verifier);
      console.log(`✅ Web SMS OTP dispatched successfully via Firebase.`);
    } else {
      console.log(`📡 Dispatched Native SMS request to ${formattedMobile}...`);
      confirmationResult = await nativeAuth().signInWithPhoneNumber(formattedMobile, true);
    }

    return { success: true, confirmationResult, formattedMobile };

  } catch (error: any) {
    console.error('Carrier SMS dispatch error:', error?.message || error);
    
    if (globalWebVerifier) {
      try { globalWebVerifier.clear(); } catch(e) {}
      globalWebVerifier = null;
    }

    return {
      success: false,
      formattedMobile,
      errorMessage: parsePhoneAuthError(error),
      error,
    };
  }
};