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
  StatusBar
} from 'react-native';
import { Text, TextInput, Button, HelperText, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

type RootStackParamList = {
  Login: undefined;
  Registration: undefined;
  RoleSelection: undefined;
  OTPVerification: { mobile: string };
  MobileLogin: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();

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
        `We have sent a password reset link to ${email}. Please check your inbox and spam folder.`
      );
      setLoginError('');
    } catch (error: any) {
      console.error("Reset Error:", error);
      if (error.code === 'auth/user-not-found') {
        setLoginError('This email is not registered.');
        Alert.alert('Account Not Found', 'This email is not registered. Please create a new account.');
      } else {
        Alert.alert('Reset Failed', error.message || 'Failed to send reset email.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setLoginError('');
    if (!email.trim() || !password) {
      setLoginError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      console.log('Login Error Code:', error.code);
      if (error.code === 'auth/user-not-found') {
        setLoginError('Account not found with this email.');
        Alert.alert(
          'Account Not Found',
          'This email is not registered. Would you like to create a new account?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register', onPress: () => navigation.navigate('Registration') }
          ]
        );
      }
      else if (error.code === 'auth/wrong-password') {
        setLoginError('Incorrect password. Please verify and try again.');
      }
      else if (error.code === 'auth/invalid-credential') {
        setLoginError('Invalid email or password combination.');
      }
      else if (error.code === 'auth/invalid-email') {
        setLoginError('Please enter a valid email address.');
      }
      else if (error.code === 'auth/too-many-requests') {
        setLoginError('Too many failed attempts. Please try again in a few minutes.');
      }
      else {
        setLoginError('Login failed. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Executive Header Banner */}
          <View style={styles.headerBackground}>
            <SafeAreaView edges={['top']}>
              <View style={styles.headerContent}>
                <View style={styles.brandRow}>
                  <Text style={styles.brandTitle}>PROCHEM</Text>
                  <View style={styles.exchangeBadge}>
                    <Text style={styles.exchangeBadgeText}>EXCHANGE</Text>
                  </View>
                </View>
                <Text style={styles.taglineText}>India's Industrial Chemical Trading Network</Text>
                
                <View style={styles.welcomeContainer}>
                  <Text style={styles.welcomeSmallText}>SECURE BUSINESS PORTAL</Text>
                  <Text style={styles.welcomeBigText}>Sign In to Account</Text>
                </View>
              </View>
            </SafeAreaView>
          </View>

          {/* Clean Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardSubtitle}>
              Enter your registered corporate credentials to access live markets and negotiations.
            </Text>

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CORPORATE EMAIL</Text>
              <TextInput
                placeholder="name@company.com"
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
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <TouchableOpacity onPress={handleForgotPassword} disabled={resetLoading}>
                  <Text style={styles.forgotPassText}>
                    {resetLoading ? 'Sending link...' : 'Forgot password?'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                placeholder="••••••••••••"
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
                    icon={secureTextEntry ? 'eye-off-outline' : 'eye-outline'}
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

            {/* Primary Sign In Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleEmailLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              <Text style={styles.loginBtnText}>
                {loading ? 'Authenticating...' : 'Sign In to Account'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR SIGN IN VIA</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Mobile OTP Login Shortcut */}
            <TouchableOpacity
              style={styles.mobileLoginBtn}
              onPress={() => navigation.navigate('MobileLogin')}
              activeOpacity={0.85}
            >
              <IconButton icon="cellphone" size={18} iconColor="#0F172A" style={{ margin: 0 }} />
              <Text style={styles.mobileLoginBtnText}>Instant Mobile Number & OTP</Text>
            </TouchableOpacity>

            {/* Register Shortcut */}
            <View style={styles.registerPrompt}>
              <Text style={styles.registerPromptText}>Don't have an enterprise account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Registration')}>
                <Text style={styles.registerPromptLink}>Register here</Text>
              </TouchableOpacity>
            </View>

            {/* Security Guarantee Banner */}
            <View style={styles.safetyBanner}>
              <IconButton icon="shield-check" size={20} iconColor="#059669" style={{ margin: 0 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.safetyTitle}>Bank-Grade 256-Bit SSL Encryption</Text>
                <Text style={styles.safetySubtext}>
                  All trade negotiations, price quotes, and enterprise data are confidential.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { 
    flex: 1, 
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerBackground: {
    backgroundColor: '#0F172A',
    paddingBottom: 50,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  exchangeBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exchangeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  taglineText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 24,
  },
  welcomeContainer: {
    width: '100%',
  },
  welcomeSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  welcomeBigText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -30,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPassText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#004AAD',
    marginBottom: 6,
  },
  input: { 
    backgroundColor: '#F8FAFC', 
    fontSize: 14,
    height: 46,
  },
  inputOutline: {
    borderRadius: 8,
    borderColor: '#CBD5E1',
  },
  errorText: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 10,
    paddingHorizontal: 0,
  },
  loginBtn: {
    backgroundColor: '#0F172A',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginHorizontal: 12,
    letterSpacing: 0.5,
  },
  mobileLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  mobileLoginBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 4,
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  registerPromptText: {
    fontSize: 13,
    color: '#64748B',
  },
  registerPromptLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 16,
    gap: 8,
  },
  safetyTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  safetySubtext: {
    fontSize: 10,
    color: '#15803D',
    lineHeight: 14,
  },
});
