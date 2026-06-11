// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  ScrollView,
  Dimensions,
  Image,
  StatusBar
} from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// ✅ Updated navigation types with MobileLogin
type RootStackParamList = {
  Login: undefined;
  Registration: undefined;
  OTPVerification: { mobile: string };
  MobileLogin: undefined; // ✅ New route
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();

  // Input States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [loginError, setLoginError] = useState('');

  const handleForgotPassword = async () => {
    if (!email) {
      setLoginError('Please enter your email address to reset password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError('Please enter a valid email address.');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Email Sent 📧',
        `We have sent a password reset link to ${email}. Please check your Inbox and Spam folder.`
      );
      setLoginError('');
    } catch (error: any) {
      console.error("Reset Error:", error);
      if (error.code === 'auth/user-not-found') {
        setLoginError('This email is not registered.');
        Alert.alert('Error', 'Account not found. Please register.');
      } else {
        Alert.alert('Error', error.message || 'Failed to send reset email.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setLoginError('');
    if (!email || !password) {
      setLoginError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.log('Login Error Code:', error.code);
      if (error.code === 'auth/user-not-found') {
        setLoginError('Account not found. Please register first.');
        Alert.alert(
          'Account Not Found',
          'This email is not registered. Do you want to create an account?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register', onPress: () => navigation.navigate('Registration') }
          ]
        );
      }
      else if (error.code === 'auth/wrong-password') {
        setLoginError('Incorrect password. Please try again.');
      }
      else if (error.code === 'auth/invalid-credential') {
        setLoginError('Invalid email or password.');
      }
      else if (error.code === 'auth/invalid-email') {
        setLoginError('Please enter a valid email address.');
      }
      else if (error.code === 'auth/too-many-requests') {
        setLoginError('Too many failed attempts. Try again later.');
      }
      else {
        setLoginError('Login failed. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Stunning Background Header */}
          <View style={styles.headerBackground}>
            <SafeAreaView edges={['top']}>
              <View style={styles.headerContent}>
                {/* 1. Prochem Logo & Tagline */}
                <Image 
                  source={require('../../assets/logo.png')} 
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
                <Text style={styles.taglineText}>India's Trusted Chemical Marketplace</Text>
                
                {/* 2. Welcome Back & Glad to see you again */}
                <View style={styles.welcomeContainer}>
                  <Text style={styles.welcomeSmallText}>Welcome back,</Text>
                  <Text style={styles.welcomeBigText}>Glad to see you again!</Text>
                </View>
              </View>
            </SafeAreaView>
          </View>

          {/* Floating Form Card */}
          <View style={styles.formCard}>
            
            <Text style={styles.cardSubtitle}>Sign in to continue to your business account.</Text>

            {/* Email Form (Tabs removed) */}
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setLoginError('');
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              textColor="#0F172A"
              left={<TextInput.Icon icon="email-outline" color="#64748B" />}
              error={loginError.includes('email') || loginError.includes('Account')}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setLoginError('');
                }}
                mode="outlined"
                secureTextEntry={secureTextEntry}
                style={styles.input}
                outlineStyle={styles.inputOutline}
                textColor="#0F172A"
                left={<TextInput.Icon icon="lock-outline" color="#64748B" />}
                error={loginError.includes('password') || loginError.includes('Incorrect') || loginError.includes('Invalid')}
                right={
                  <TextInput.Icon
                    icon={secureTextEntry ? 'eye-off' : 'eye'}
                    onPress={() => setSecureTextEntry(!secureTextEntry)}
                    forceTextInputFocus={false}
                    color="#64748B"
                  />
                }
              />
            </View>

            {loginError ? (
              <HelperText type="error" visible={!!loginError} style={styles.errorText}>
                {loginError}
              </HelperText>
            ) : null}

            <TouchableOpacity style={styles.forgotPass} onPress={handleForgotPassword}>
              <Text style={styles.forgotPassText}>
                {resetLoading ? 'Sending link...' : 'Forgot Password?'}
              </Text>
            </TouchableOpacity>

            <Button
              mode="contained"
              onPress={handleEmailLogin}
              loading={loading}
              disabled={loading}
              icon="arrow-right"
              style={styles.loginBtn}
              contentStyle={styles.loginBtnContent}
              labelStyle={styles.loginBtnLabel}
            >
              Login
            </Button>

            {/* Security Banner */}
            <View style={styles.safetyBanner}>
              <MaterialCommunityIcons name="shield-lock-outline" size={24} color="#059669" style={{ marginTop: 2 }} />
              <View style={styles.safetyTextContainer}>
                <Text style={styles.safetyTitle}>Your security is our priority</Text>
                <Text style={styles.safetySubtext}>We use industry-standard encryption to protect your data.</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ✅ NEW: Mobile Login CTA */}
            <Button
              mode="outlined"
              icon="cellphone"
              onPress={() => navigation.navigate('MobileLogin')}
              style={styles.mobileLoginBtn}
              contentStyle={styles.mobileLoginBtnContent}
              labelStyle={styles.mobileLoginBtnLabel}
              textColor="#0F172A"
            >
              Continue with mobile number (OTP) (Coming soon)
            </Button>

            {/* Register Section */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>New to Prochem?</Text>
              <Button 
                mode="text" 
                onPress={() => navigation.navigate('Registration')}
                labelStyle={styles.registerBtnLabel}
                textColor="#2563EB"
              >
                Create your account
              </Button>
            </View>

            {/* App Features */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <MaterialCommunityIcons name="lock-outline" size={22} color="#2563EB" />
                </View>
                <Text style={styles.featureText}>Secure</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <MaterialCommunityIcons name="headset" size={22} color="#2563EB" />
                </View>
                <Text style={styles.featureText}>24/7 Support</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <MaterialCommunityIcons name="handshake-outline" size={22} color="#2563EB" />
                </View>
                <Text style={styles.featureText}>B2B Network</Text>
              </View>
            </View>

          </View>

          <View style={styles.bottomSpacer} />

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { 
    flex: 1, 
    backgroundColor: '#F1F5F9',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBackground: {
    backgroundColor: '#2563EB',
    paddingBottom: 70,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerLogo: {
    width: 160,
    height: 60,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  taglineText: {
    fontSize: 13,
    color: '#E0E7FF',
    fontWeight: '500',
    marginBottom: 30,
    letterSpacing: 0.5,
  },
  welcomeContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  welcomeSmallText: {
    fontSize: 16,
    color: '#BFDBFE',
    marginBottom: 4,
  },
  welcomeBigText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -40,
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: { 
    backgroundColor: '#F8FAFC', 
    fontSize: 15,
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passwordContainer: {
    marginTop: 16,
  },
  errorText: {
    paddingHorizontal: 0,
    marginTop: 4,
    marginBottom: -8,
  },
  forgotPass: { 
    alignSelf: 'flex-end', 
    marginTop: 12,
    marginBottom: 24,
  },
  forgotPassText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  loginBtn: { 
    borderRadius: 12, 
    backgroundColor: '#2563EB',
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginBtnContent: { 
    paddingVertical: 10,
    flexDirection: 'row-reverse', 
  },
  loginBtnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#D1FAE5'
  },
  safetyTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  safetyTitle: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  safetySubtext: {
    color: '#059669',
    fontSize: 12,
    lineHeight: 18,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 12,
  },
  mobileLoginBtn: {
    borderRadius: 12,
    borderColor: '#CBD5E1',
    borderWidth: 1.5,
    marginBottom: 24,
  },
  mobileLoginBtnContent: {
    paddingVertical: 8,
  },
  mobileLoginBtnLabel: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  registerContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  registerText: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: -4, // Pulled slightly up to connect with the button text tighter
  },
  registerBtnLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    paddingVertical: 4,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 24,
    marginTop: 24,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#EFF6FF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  }
});