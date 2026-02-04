import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  ScrollView 
} from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>P</Text>
              </View>
              <Text variant="headlineMedium" style={styles.title} numberOfLines={1}>
                Welcome Back
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Sign in to your business account
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.form}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setLoginError('');
                }}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                left={<TextInput.Icon icon="email-outline" />}
                error={loginError.includes('email') || loginError.includes('Account')}
              />

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
                left={<TextInput.Icon icon="lock-outline" />}
                error={loginError.includes('password') || loginError.includes('Incorrect') || loginError.includes('Invalid')}
                right={
                  <TextInput.Icon
                    icon={secureTextEntry ? 'eye-off' : 'eye'}
                    onPress={() => setSecureTextEntry(!secureTextEntry)}
                    forceTextInputFocus={false}
                  />
                }
              />

              <HelperText type="error" visible={!!loginError}>
                {loginError}
              </HelperText>

              {/* Forgot Password Button */}
              <TouchableOpacity style={styles.forgotPass} onPress={handleForgotPassword}>
                <Text style={{ color: theme.colors.primary }}>
                  {resetLoading ? 'Sending Email...' : 'Forgot Password?'}
                </Text>
              </TouchableOpacity>

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.loginBtn}
                contentStyle={{ paddingVertical: 8 }}
              >
                Login
              </Button>

              {/* Footer Section */}
              <View style={styles.footer}>
                <Text>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Registration')}>
                  <Text style={[styles.link, { color: theme.colors.primary }]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: { 
    padding: 24,
    paddingBottom: 40,
  },
  logoContainer: { 
    alignItems: 'center', 
    marginBottom: 40 
  },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: '#004AAD',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 5
  },
  logoText: { 
    fontSize: 40, 
    color: 'white', 
    fontWeight: 'bold' 
  },
  title: { 
    fontWeight: 'bold', 
    color: '#1E293B',
    textAlign: 'center',
  },
  subtitle: { 
    color: '#64748B', 
    marginTop: 8,
    textAlign: 'center',
  },
  form: { 
    width: '100%' 
  },
  input: { 
    marginBottom: 12, 
    backgroundColor: 'white' 
  },
  forgotPass: { 
    alignSelf: 'flex-end', 
    marginBottom: 24 
  },
  loginBtn: { 
    borderRadius: 10, 
    backgroundColor: '#004AAD' 
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 30 
  },
  link: { 
    fontWeight: 'bold' 
  }
});
