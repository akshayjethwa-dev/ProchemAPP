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
  Image
} from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

const { width } = Dimensions.get('window');

// ✅ Define your navigation types
type RootStackParamList = {
  Login: undefined;
  Registration: undefined;
  // Add other screens if needed
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleLogin = async () => {
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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Curved Header Section */}
          <View style={styles.headerBackground}>
            <SafeAreaView edges={['top']}>
              <View style={styles.headerContent}>
                <Image 
  source={require('../../assets/logo.png')} 
  style={styles.headerLogo}
  resizeMode="contain"
/>
                <Text style={styles.headerTitle}>Welcome Back,</Text>
                <Text style={styles.headerSubtitle}>Sign in to your Prochem account!</Text>
              </View>
            </SafeAreaView>
          </View>

          {/* Overlapping Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Glad to see you again!</Text>
            
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
              textColor="#1E293B"
              left={<TextInput.Icon icon="email-outline" color="#94A3B8" />}
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
                textColor="#1E293B"
                left={<TextInput.Icon icon="lock-outline" color="#94A3B8" />}
                error={loginError.includes('password') || loginError.includes('Incorrect') || loginError.includes('Invalid')}
                right={
                  <TextInput.Icon
                    icon={secureTextEntry ? 'eye-off' : 'eye'}
                    onPress={() => setSecureTextEntry(!secureTextEntry)}
                    forceTextInputFocus={false}
                    color="#94A3B8"
                  />
                }
              />
            </View>

            {loginError ? (
              <HelperText type="error" visible={!!loginError} style={styles.errorText}>
                {loginError}
              </HelperText>
            ) : null}

            {/* Forgot Password Button */}
            <TouchableOpacity style={styles.forgotPass} onPress={handleForgotPassword}>
              <Text style={styles.forgotPassText}>
                {resetLoading ? 'Sending...' : 'Forgot Password?'}
              </Text>
            </TouchableOpacity>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginBtn}
              contentStyle={styles.loginBtnContent}
              labelStyle={styles.loginBtnLabel}
            >
              Sign In
            </Button>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Footer Section */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Registration')}>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom spacing for scroll */}
          <View style={styles.bottomSpacer} />

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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBackground: {
    backgroundColor: '#004AAD',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: 60, // Extra padding to allow the card to overlap
    shadowColor: '#004AAD',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: { 
    fontSize: 32, 
    color: '#004AAD', 
    fontWeight: '900' 
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E2E8F0',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: -40, // Pulls the card up over the blue header
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'left',
  },
  input: { 
    backgroundColor: '#F1F5F9', // Light gray background for input
    fontSize: 16,
  },
  inputOutline: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent', // Borderless look, relies on background color
  },
  passwordContainer: {
    marginTop: 12,
  },
  errorText: {
    paddingHorizontal: 0,
    marginTop: 4,
    marginBottom: -8,
  },
  forgotPass: { 
    alignSelf: 'flex-end', 
    marginTop: 16,
    marginBottom: 24,
  },
  forgotPassText: {
    color: '#004AAD',
    fontWeight: '600',
    fontSize: 14,
  },
  loginBtn: { 
    borderRadius: 14, 
    backgroundColor: '#004AAD',
    shadowColor: '#004AAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginBtnContent: { 
    paddingVertical: 12,
  },
  loginBtnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  footerText: {
    color: '#64748B',
    fontSize: 15,
  },
  link: { 
    fontWeight: 'bold',
    fontSize: 15,
    color: '#004AAD',
  },
  headerLogo: {
  width: 190,
  height: 100,
  marginBottom: 16,
  borderRadius: 20, // Optional: if your logo looks better rounded
},
  bottomSpacer: {
    height: 40,
  }
});