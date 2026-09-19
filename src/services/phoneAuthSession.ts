// File: src/services/phoneAuthSession.ts

export interface PhoneAuthSession {
  webConfirmation?: any;
  nativeConfirmation?: any;
  mobile?: string;
  formData?: any;
  selectedPlan?: any;
  mode?: 'login' | 'registration';
  errorMessage?: string;
}

let activeSession: PhoneAuthSession | null = null;

export const setPhoneAuthSession = (session: PhoneAuthSession) => {
  activeSession = session;
};

export const getPhoneAuthSession = (): PhoneAuthSession | null => {
  return activeSession;
};

export const clearPhoneAuthSession = () => {
  activeSession = null;
};