import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, IconButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

// ✅ Import Firebase Auth methods
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function OTPVerificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  
  // ✅ Extract both mobile and verificationId from route params
  const mobile = route.params?.mobile || '';
  const verificationId = route.params?.verificationId || '';
  const theme = useTheme();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit OTP');
      return;
    }

    if (!verificationId) {
      Alert.alert('Error', 'Missing Verification ID. Please request a new OTP.');
      return;
    }

    setLoading(true);
    
    try {
      // ✅ 1. Create a Firebase credential using the verification ID and the user's entered OTP
      const credential = PhoneAuthProvider.credential(verificationId, otp);

      // ✅ 2. Sign in to Firebase with this credential
      const userCredential = await signInWithCredential(auth, credential);

      // Success! Phone is verified. 
      // The onAuthStateChanged listener in RootNavigator will catch the new user state 
      // and automatically route the user to the dashboard or onboarding.
      console.log('Successfully logged in with UID:', userCredential.user.uid);

    } catch (error: any) {
      console.error('OTP Verification Error:', error);
      
      // Handle common Firebase verification errors gracefully
      if (error.code === 'auth/invalid-verification-code') {
        Alert.alert('Error', 'Invalid OTP. Please check the code and try again.');
      } else if (error.code === 'auth/code-expired') {
        Alert.alert('Error', 'The OTP has expired. Please go back and request a new one.');
      } else {
        Alert.alert('Error', error.message || 'Failed to verify OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    // For React Native Firebase Web SDK flows, it's often cleanest to have the user 
    // go back to the previous screen to trigger the Recaptcha again for a new SMS.
    Alert.alert(
      'Resend OTP', 
      'To securely send a new OTP, please go back and request a new code.',
      [{ text: 'Go Back', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <Text variant="displaySmall" style={styles.title}>Enter OTP</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>Sent to {mobile}</Text>

        <View style={styles.inputContainer}>
          <TextInput
            mode="outlined"
            label="6-Digit Code"
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
            contentStyle={styles.inputText}
          />
        </View>

        <Button 
          mode="contained" 
          onPress={handleVerify} 
          loading={loading}
          disabled={loading || otp.length !== 6}
          style={styles.verifyBtn}
          contentStyle={{ height: 50 }}
        >
          Verify OTP
        </Button>

        <TouchableOpacity 
          onPress={handleResend} 
          disabled={resendTimer > 0}
          style={styles.resendContainer}
        >
          <Text style={{ color: resendTimer > 0 ? '#9CA3AF' : theme.colors.primary, fontWeight: 'bold' }}>
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Didn't receive code? Request again"}
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
  subtitle: { color: '#6B7280', marginBottom: 40 },
  inputContainer: { marginBottom: 30 },
  input: { backgroundColor: '#F9FAFB', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  inputText: { textAlign: 'center', letterSpacing: 4, fontSize: 24 },
  verifyBtn: { borderRadius: 12, marginBottom: 20 },
  resendContainer: { alignItems: 'center', padding: 10 },
});