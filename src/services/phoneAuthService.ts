// File: src/services/phoneAuthService.ts
import { Platform } from 'react-native';
import { auth as webAuth } from '../config/firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber as webSignInWithPhoneNumber,
} from 'firebase/auth';

const RECAPTCHA_CONTAINER_ID = 'global-firebase-recaptcha';

let globalWebVerifier: RecaptchaVerifier | null = null;
let verifierRenderPromise: Promise<RecaptchaVerifier> | null = null;

// ---------------------------------------------------------------------------
// Phone number formatting
// ---------------------------------------------------------------------------
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = (phone || '').trim().replace(/[\s-]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) return `+${digitsOnly}`;
  if (digitsOnly.length === 10) return `+91${digitsOnly}`;
  return `+91${digitsOnly.replace(/^0+/, '')}`;
};

// ---------------------------------------------------------------------------
// reCAPTCHA container management (web only)
// ---------------------------------------------------------------------------
const ensureRecaptchaContainer = (): HTMLElement => {
  if (typeof document === 'undefined') {
    throw new Error('reCAPTCHA requires a browser environment.');
  }

  let container = document.getElementById(RECAPTCHA_CONTAINER_ID);

  if (!container) {
    container = document.createElement('div');
    container.id = RECAPTCHA_CONTAINER_ID;
    container.style.position = 'fixed';
    container.style.bottom = '0';
    container.style.right = '0';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    document.body.appendChild(container);
    console.log('🆕 Created reCAPTCHA container div');
  }

  return container;
};

export const getFreshRecaptchaVerifier = async (): Promise<RecaptchaVerifier> => {
  if (Platform.OS !== 'web' || !webAuth) {
    throw new Error('reCAPTCHA is only available on web.');
  }

  if (verifierRenderPromise) return verifierRenderPromise;

  verifierRenderPromise = (async () => {
    ensureRecaptchaContainer();

    if (globalWebVerifier) {
      try {
        globalWebVerifier.clear();
      } catch {
        /* ignore */
      }
      globalWebVerifier = null;
    }

    const verifier = new RecaptchaVerifier(webAuth, RECAPTCHA_CONTAINER_ID, {
      size: 'invisible',
      callback: () => console.log('✅ reCAPTCHA solved'),
      'expired-callback': () => {
        console.warn('⚠️ reCAPTCHA expired — will re-render on next attempt');
        try {
          verifier.clear();
        } catch {}
        if (globalWebVerifier === verifier) globalWebVerifier = null;
        verifierRenderPromise = null;
      },
    });

    await verifier.render();
    globalWebVerifier = verifier;
    return verifier;
  })();

  try {
    return await verifierRenderPromise;
  } catch (err) {
    verifierRenderPromise = null;
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Error parsing
// ---------------------------------------------------------------------------
export const parsePhoneAuthError = (error: any): string => {
  const code = error?.code || '';
  const currentHost =
    typeof window !== 'undefined' && window.location?.hostname
      ? `${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
      : 'localhost';

  if (code.includes('invalid-app-credential') || code.includes('app-not-authorized')) {
    return `Firebase blocked the request.\n\nAdd "${currentHost}" to Firebase Console → Authentication → Settings → Authorized Domains.`;
  }
  if (code.includes('quota-exceeded')) return 'SMS quota exceeded for today (Firebase Spark limit).';
  if (code.includes('too-many-requests')) return 'Too many SMS requests. Wait a moment and retry.';
  if (code.includes('captcha-check-failed')) return 'reCAPTCHA verification failed. Check your network and retry.';
  if (code.includes('invalid-phone-number')) return 'Invalid phone number format.';
  return error?.message || 'Failed to send verification code.';
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export interface PhoneOTPSendResult {
  success: boolean;
  confirmationResult?: any;
  formattedMobile: string;
  error?: any;
  errorMessage?: string;
}

export const sendRealPhoneOTP = async (
  phoneNumber: string,
): Promise<PhoneOTPSendResult> => {
  const formattedMobile = formatPhoneNumber(phoneNumber);

  if (!formattedMobile || formattedMobile.length < 12) {
    throw new Error('Please provide a valid 10-digit mobile number.');
  }

  try {
    if (Platform.OS !== 'web') {
      throw new Error('This build only supports web.');
    }
    if (!webAuth) throw new Error('Firebase Auth is not configured.');

    console.log(`📲 Dispatching web SMS to ${formattedMobile}…`);
    const verifier = await getFreshRecaptchaVerifier();
    const confirmationResult = await webSignInWithPhoneNumber(
      webAuth,
      formattedMobile,
      verifier,
    );

    console.log('✅ OTP dispatched successfully.');
    return { success: true, confirmationResult, formattedMobile };
  } catch (error: any) {
    console.error('❌ SMS dispatch failed:', error?.code || error?.message || error);

    if (globalWebVerifier) {
      try {
        globalWebVerifier.clear();
      } catch {}
      globalWebVerifier = null;
    }
    verifierRenderPromise = null;

    return {
      success: false,
      formattedMobile,
      error,
      errorMessage: parsePhoneAuthError(error),
    };
  }
};