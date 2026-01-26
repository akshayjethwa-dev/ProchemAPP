import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [loginError, setLoginError] = useState('');

  // ✅ 1. Forgot Password Functionality
  const handleForgotPassword = async () => {
    if (!email) {
      setLoginError('Please enter your email address first.');
      return;
    }
    
    // Simple Email Regex Check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError('Please enter a valid email address.');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send password reset link to ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Email', 
          onPress: async () => {
            try {
              setResetLoading(true);
              await sendPasswordResetEmail(auth, email);
              Alert.alert('Email Sent', 'Check your inbox (and spam) for the password reset link.');
              setLoginError(''); // Clear errors on success
            } catch (error: any) {
              if (error.code === 'auth/user-not-found') {
                Alert.alert('Error', 'This email is not registered.');
              } else {
                Alert.alert('Error', error.message);
              }
            } finally {
              setResetLoading(false);
            }
          }
        }
      ]
    );
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
      // RootNavigator handles the rest automatically
    } catch (error: any) {
      console.log('Login Error Code:', error.code);
      
      // ✅ 2. Fixed Error Handling Logic
      if (error.code === 'auth/user-not-found') {
        // STRICTLY for non-existent emails
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
        // STRICTLY for wrong passwords
        setLoginError('Incorrect password. Please try again.');
      } 
      else if (error.code === 'auth/invalid-credential') {
        // CATCH-ALL (Google often groups wrong pass/no user here for security)
        // We change the message to be less confusing than "Account not found"
        setLoginError('Invalid email or password. Please check your credentials.');
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>P</Text>
            </View>
            <Text variant="headlineMedium" style={styles.title}>Welcome Back</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Sign in to your business account</Text>
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
              left={<TextInput.Icon icon="email" forceTextInputFocus={false} />}
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
              left={<TextInput.Icon icon="lock" forceTextInputFocus={false} />}
              error={loginError.includes('password') || loginError.includes('Incorrect') || loginError.includes('Invalid')}
              right={
                <TextInput.Icon 
                  icon={secureTextEntry ? "eye" : "eye-off"} 
                  onPress={() => setSecureTextEntry(!secureTextEntry)} 
                  forceTextInputFocus={false} 
                />
              }
            />

            <HelperText type="error" visible={!!loginError}>
              {loginError}
            </HelperText>

            {/* Forgot Password Button */}
            <TouchableOpacity 
              onPress={handleForgotPassword} 
              disabled={resetLoading}
              style={styles.forgotPass}
            >
              <Text style={{ color: theme.colors.primary }}>
                {resetLoading ? 'Sending...' : 'Forgot Password?'}
              </Text>
            </TouchableOpacity>

            <Button 
              mode="contained" 
              onPress={handleLogin} 
              loading={loading} 
              style={styles.loginBtn}
              contentStyle={{ height: 50 }}
            >
              Login
            </Button>
          </View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <Text variant="bodyMedium" style={{ color: '#666' }}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Registration')}>
              <Text style={[styles.link, { color: theme.colors.primary }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
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
  logoText: { fontSize: 40, color: 'white', fontWeight: 'bold' },
  title: { fontWeight: 'bold', color: '#1E293B' },
  subtitle: { color: '#64748B', marginTop: 8 },
  form: { width: '100%' },
  input: { marginBottom: 12, backgroundColor: 'white' },
  forgotPass: { alignSelf: 'flex-end', marginBottom: 24 },
  loginBtn: { borderRadius: 10, backgroundColor: '#004AAD' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  link: { fontWeight: 'bold' }
});