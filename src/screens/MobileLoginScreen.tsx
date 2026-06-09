import React, { useState, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { Text, TextInput, Button, HelperText, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

// ✅ Firebase imports for Phone Auth
import { PhoneAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';

// ✅ Expo Recaptcha import (required for Firebase web SDK in React Native)
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';

export default function MobileLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  // ✅ Ref to hold the Recaptcha verifier instance
  const recaptchaVerifier = useRef(null);

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    setError('');
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    
    setLoading(true);
    
    try {
      // 1. Format the phone number to E.164 standard (+91 for India)
      const phoneNumber = `+91${phone}`;

      // 2. Initialize the Phone Auth Provider with your Firebase auth instance
      const phoneProvider = new PhoneAuthProvider(auth);

      // 3. Trigger Firebase to send the SMS and get the verification ID
      const verificationId = await phoneProvider.verifyPhoneNumber(
        phoneNumber,
        recaptchaVerifier.current as any
      );

      // 4. Navigate to OTPVerification screen with the mobile number and verification ID
      setLoading(false);
      navigation.navigate('OTPVerification', { 
        mobile: phoneNumber, 
        verificationId: verificationId 
      });

    } catch (err: any) {
      console.error("SMS Send Error:", err);
      setLoading(false);
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <View style={styles.mainContainer}>
      
      {/* ✅ Invisible Recaptcha Modal required by Firebase */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options} // Dynamically gets config from your initialized Firebase auth
        attemptInvisibleVerification={true}
      />

      <SafeAreaView edges={['top']} style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="headlineMedium" style={styles.title}>Continue with Mobile</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter your mobile number to login or create a new account. We'll send you an OTP to verify.
          </Text>

          <TextInput
            label="Mobile Number"
            value={phone}
            onChangeText={(text) => {
              setPhone(text.replace(/[^0-9]/g, ''));
              setError('');
            }}
            mode="outlined"
            keyboardType="phone-pad"
            maxLength={10}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Affix text="+91 " />}
            error={!!error}
          />

          {error ? (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSendOTP}
            loading={loading}
            disabled={loading}
            icon="message-processing-outline"
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
          >
            Send OTP
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 10,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  logo: {
    width: 120,
    height: 40,
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748B',
    marginBottom: 32,
    lineHeight: 22,
  },
  input: { 
    backgroundColor: '#F8FAFC', 
    fontSize: 16,
    marginBottom: 8,
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  errorText: {
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  btn: { 
    borderRadius: 12, 
    backgroundColor: '#2563EB',
    marginTop: 16,
  },
  btnContent: { 
    paddingVertical: 10,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});