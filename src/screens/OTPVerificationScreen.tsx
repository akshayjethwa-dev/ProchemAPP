// File: src/screens/OTPVerificationScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, IconButton, useTheme, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { completeRegistrationAfterOTP, processMobileLogin } from '../services/authService';
import { getPhoneAuthSession, setPhoneAuthSession, clearPhoneAuthSession } from '../services/phoneAuthSession';
import { sendRealPhoneOTP, parsePhoneAuthError } from '../services/phoneAuthService';
import { useAppStore } from '../store/appStore'; 

let nativeAuth: any = null;
try {
  if (Platform.OS !== 'web') {
    nativeAuth = require('@react-native-firebase/auth').default;
  }
} catch (e) {}

export default function OTPVerificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const session = getPhoneAuthSession();
  
  const mobile = route.params?.mobile || session?.mobile || '';
  const mode = route.params?.mode || session?.mode || 'login';
  const formData = route.params?.formData || session?.formData;
  
  const webConfirmation = session?.webConfirmation || route.params?.webConfirmation;
  const nativeConfirmation = session?.nativeConfirmation || route.params?.nativeConfirmation;
  
  const theme = useTheme();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    setErrorMsg('');
    if (otp.length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code received via SMS');
      return;
    }

    setLoading(true);
    
    try {
      let userCredential: any = null;

      if (Platform.OS === 'web') {
        if (!webConfirmation || typeof webConfirmation.confirm !== 'function') {
          throw new Error('No active web session found. Please request a fresh SMS code.');
        }
        userCredential = await webConfirmation.confirm(otp);
      } else {
        if (!nativeAuth) throw new Error('Native Auth module missing.');
        
        if (nativeConfirmation && typeof nativeConfirmation.confirm === 'function') {
          userCredential = await nativeConfirmation.confirm(otp);
        } else if (nativeConfirmation?.verificationId) {
          // Properly use Native Auth credential builder instead of mixing with Web SDK
          const credential = nativeAuth.PhoneAuthProvider.credential(nativeConfirmation.verificationId, otp);
          userCredential = await nativeAuth().signInWithCredential(credential);
        } else {
          throw new Error('No active native session found. Please request a fresh SMS code.');
        }
      }

      if (!userCredential?.user) {
        throw new Error('Authentication succeeded but user record could not be retrieved.');
      }

      if (mode === 'registration' && formData) {
        const createdUser = await completeRegistrationAfterOTP(userCredential.user, formData);
        const planToPay = formData.selectedPlan || route.params?.selectedPlan || session?.selectedPlan;
        clearPhoneAuthSession();

        if (planToPay) {
          useAppStore.getState().setUser({
            ...createdUser,
            uid: userCredential.user.uid,
          });

          navigation.navigate('Payment', {
            plan: planToPay,
            user: {
              ...createdUser,
              uid: userCredential.user.uid,
              email: formData.email,
              companyName: formData.companyName,
              phoneNumber: formData.phoneNumber,
            },
            userId: userCredential.user.uid,
          });
          return;
        }
      } else {
        const planToPay = route.params?.selectedPlan || session?.selectedPlan;
        const mobileUser = await processMobileLogin(userCredential.user, mobile, planToPay);
        clearPhoneAuthSession();

        if (planToPay) {
          const hasActiveSubscription = mobileUser.subscriptionStatus === 'active' && 
            (mobileUser.subscriptionTier === 'BASIC' || mobileUser.subscriptionTier === 'GROWTH_PACKAGE');

          useAppStore.getState().setUser({
            ...mobileUser,
            uid: userCredential.user.uid,
          });

          if (!hasActiveSubscription) {
            navigation.navigate('Payment', {
              plan: planToPay,
              user: {
                ...mobileUser,
                uid: userCredential.user.uid,
                phoneNumber: mobile,
                companyName: mobileUser.companyName || 'Prochem Member',
              },
              userId: userCredential.user.uid,
            });
            return;
          }
        }
      }
      
      useAppStore.getState().resetOnboarding();

    } catch (error: any) {
      console.error('OTP Verification Error:', error);
      setLoading(false);
      
      const errorCode = error.code || '';
      if (errorCode.includes('invalid-verification-code') || errorCode.includes('invalid-credential')) {
        setErrorMsg('Invalid verification code. Please check the SMS and try again.');
      } else if (errorCode.includes('code-expired') || errorCode.includes('session-expired')) {
        setErrorMsg('This code has expired. Please tap "Request again" below.');
      } else {
        Alert.alert('Verification Failed', error.message || 'Failed to verify OTP. Please try again.');
      }
    } 
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resending || !mobile) return;

    setResending(true);
    try {
      const result = await sendRealPhoneOTP(mobile);

      if (!result.success) {
        setResending(false);
        Alert.alert('Unable to Resend SMS', result.errorMessage || 'Unable to dispatch SMS.');
        return;
      }

      setPhoneAuthSession({
        ...session,
        webConfirmation: Platform.OS === 'web' ? result.confirmationResult : undefined,
        nativeConfirmation: Platform.OS !== 'web' ? result.confirmationResult : undefined,
        mobile: result.formattedMobile,
      });

      setResendTimer(60);
      setResending(false);
      Alert.alert('OTP Dispatched', 'A new 6-digit verification code has been dispatched via SMS.');
    } catch (err: any) {
      setResending(false);
      Alert.alert('Unable to Resend SMS', parsePhoneAuthError(err));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} disabled={loading} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <Text variant="displaySmall" style={styles.title}>Enter OTP</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          A 6-digit verification code was sent via carrier SMS to{' '}
          <Text style={{ fontWeight: 'bold', color: '#111827' }}>{mobile}</Text>
        </Text>

        <View style={styles.smsSentCard}>
          <View style={styles.smsSentHeader}>
            <MaterialCommunityIcons name="cellphone-check" size={20} color="#16A34A" />
            <Text style={styles.smsSentTitle}>Carrier SMS Dispatched</Text>
          </View>
          <Text style={styles.smsSentDesc}>
            A 6-digit verification code has been sent via SMS to your mobile phone. Please check your SMS inbox and enter the code below.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            mode="outlined"
            label="6-Digit Code"
            value={otp}
            onChangeText={(text) => {
              setOtp(text.replace(/[^0-9]/g, '').slice(0, 6));
              setErrorMsg('');
            }}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
            contentStyle={styles.inputText}
            error={!!errorMsg}
            disabled={loading}
            autoFocus
          />
          {errorMsg ? (
            <HelperText type="error" visible={!!errorMsg} style={{ textAlign: 'center', marginTop: 8 }}>
              {errorMsg}
            </HelperText>
          ) : null}
        </View>

        <Button 
          mode="contained" 
          onPress={handleVerify} 
          loading={loading}
          disabled={loading || otp.length !== 6}
          style={styles.verifyBtn}
          contentStyle={{ height: 50 }}
        >
          Verify OTP & Continue
        </Button>

        <TouchableOpacity 
          onPress={handleResend} 
          disabled={resendTimer > 0 || loading || resending}
          style={styles.resendContainer}
        >
          <Text style={{ color: resendTimer > 0 ? '#9CA3AF' : theme.colors.primary, fontWeight: 'bold' }}>
            {resendTimer > 0 
              ? `Resend OTP in ${resendTimer}s` 
              : resending 
                ? 'Sending new SMS code...' 
                : "Didn't receive SMS? Request again"}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { paddingHorizontal: 10 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { color: '#6B7280', marginBottom: 24, fontSize: 15, lineHeight: 22 },
  smsSentCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  smsSentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  smsSentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
  },
  smsSentDesc: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  inputContainer: { marginBottom: 24 },
  input: { backgroundColor: '#F9FAFB', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  inputText: { textAlign: 'center', letterSpacing: 4, fontSize: 24 },
  verifyBtn: { borderRadius: 12, marginBottom: 20, backgroundColor: '#004AAD' },
  resendContainer: { alignItems: 'center', padding: 10 },
});