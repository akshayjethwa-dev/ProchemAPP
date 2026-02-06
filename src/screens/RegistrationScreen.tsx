import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  HelperText,
  useTheme,
  Checkbox,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { registerUser } from '../services/authService';

// ✅ Add navigation types
type RootStackParamList = {
  Login: undefined;
  Registration: { role?: string } | undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function RegistrationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const theme = useTheme();

  // Get params if available, otherwise default
  const { role } = (route.params as { role?: string }) || { role: 'buyer' };

  const [loading, setLoading] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [gstin, setGstin] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Terms & Conditions
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Error States
  const [errors, setErrors] = useState({
    companyName: '',
    email: '',
    phoneNumber: '',
    password: '',
    gstin: '',
    terms: '',
  });

  // ✅ HELPER: Web-Compatible Alert
  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, onOk ? [{ text: "OK", onPress: onOk }] : undefined);
    }
  };

  const validate = () => {
    let isValid = true;
    let newErrors = {
      companyName: '',
      email: '',
      phoneNumber: '',
      password: '',
      gstin: '',
      terms: '',
    };

    if (!companyName.trim()) {
      newErrors.companyName = 'Company Name is required';
      isValid = false;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Valid Email is required';
      isValid = false;
    }
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      newErrors.phoneNumber = 'Valid 10-digit Phone Number is required';
      isValid = false;
    }
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }
    // ✅ CHANGED: Manual check only (Length must be 15)
    if (!gstin || gstin.length !== 15) {
      newErrors.gstin = 'Enter a valid 15-digit GST Number';
      isValid = false;
    }
    if (!acceptTerms) {
      newErrors.terms = 'You must accept the Terms & Conditions';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Handle User Registration
   */
  const handleRegister = async () => {
    if (!validate()) {
      if (!acceptTerms) {
        showAlert("Required", "Please accept the Terms and Conditions to proceed.");
      }
      return;
    }

    setLoading(true);
    try {
      const registrationData: any = {
        email: email.trim(),
        password,
        companyName: companyName.trim(),
        phoneNumber: phoneNumber.trim(),
        userType: role || 'buyer',
        gstin: gstin.toUpperCase(),
        // ✅ CHANGED: Set verification to false so Admin must approve it
        gstVerified: false, 
        verificationStatus: 'PENDING',
        address: '', 
      };

      await registerUser(registrationData);

      showAlert('Success', 'Account created! Admin will verify your GST details manually.', () => {
        navigation.navigate('Login');
      });

    } catch (error: any) {
      console.error('Registration Error:', error);
      showAlert('Registration Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fixed Terms Link for Web & Mobile
  const openTerms = () => {
    const title = "Terms & Conditions";
    const message = `This is a dummy Terms and Conditions page.\n\n1. All chemicals must be handled with care.\n2. GST verification is mandatory.\n3. Payments are subject to verification.\n4. Admin has the right to ban users.\n\n(In a real app, this would open a page.)`;
    
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: '#1E293B' }}>
              Create Account
            </Text>
            <Text variant="bodyMedium" style={{ color: '#64748B', marginTop: 8 }}>
              Join the Chemical Marketplace
            </Text>
          </View>

          <View style={styles.formContainer}>
            
            {/* --- COMPANY DETAILS --- */}
            <TextInput
              label="Company Name"
              value={companyName}
              onChangeText={(text) => {
                setCompanyName(text);
                if (errors.companyName) setErrors({ ...errors, companyName: '' });
              }}
              mode="outlined"
              left={<TextInput.Icon icon="office-building" />}
              error={!!errors.companyName}
              style={styles.input}
            />
            <HelperText type="error" visible={!!errors.companyName}>{errors.companyName}</HelperText>

            {/* GST SECTION (Manual Entry) */}
            <TextInput
              label="GST Number (GSTIN)"
              value={gstin}
              onChangeText={(text) => {
                setGstin(text.toUpperCase());
                if (errors.gstin) setErrors({ ...errors, gstin: '' });
              }}
              mode="outlined"
              maxLength={15}
              placeholder="22AAAAA0000A1Z5"
              left={<TextInput.Icon icon="certificate" />}
              style={styles.input}
              error={!!errors.gstin}
            />
            <HelperText type={errors.gstin ? "error" : "info"} visible={true}>
              {errors.gstin || "Enter your 15-digit GSTIN for verification."}
            </HelperText>

            <TextInput
              label="Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email-outline" />}
              error={!!errors.email}
              style={styles.input}
            />
            <HelperText type="error" visible={!!errors.email}>{errors.email}</HelperText>

            <TextInput
              label="Phone Number"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text.replace(/[^0-9]/g, ''));
                if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: '' });
              }}
              mode="outlined"
              keyboardType="phone-pad"
              maxLength={10}
              left={<TextInput.Icon icon="phone" />}
              error={!!errors.phoneNumber}
              style={styles.input}
            />
            <HelperText type="error" visible={!!errors.phoneNumber}>{errors.phoneNumber}</HelperText>

            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              mode="outlined"
              secureTextEntry={secureTextEntry}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={secureTextEntry ? 'eye-off' : 'eye'}
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                />
              }
              error={!!errors.password}
              style={styles.input}
            />
            <HelperText type="error" visible={!!errors.password}>{errors.password}</HelperText>

            {/* TERMS CHECKBOX */}
            <View style={styles.termsContainer}>
              <Checkbox.Android
                status={acceptTerms ? 'checked' : 'unchecked'}
                onPress={() => {
                  setAcceptTerms(!acceptTerms);
                  setErrors({ ...errors, terms: '' });
                }}
                color={theme.colors.primary}
              />
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', marginLeft: 8 }}>
                <Text style={{ color: '#666' }}>I accept the </Text>
                <TouchableOpacity onPress={openTerms}>
                  <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    Terms and Conditions
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {errors.terms ? (
              <HelperText type="error" visible={true} style={{ marginBottom: 5 }}>{errors.terms}</HelperText>
            ) : null}

            {/* Register Button */}
            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.btn}
              contentStyle={{ paddingVertical: 8 }}
            >
              Create Account
            </Button>

            {/* Footer */}
            <View style={styles.footer}>
              <Text>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40, backgroundColor: 'white' },
  headerContainer: { marginBottom: 30, alignItems: 'center' },
  formContainer: { width: '100%' },
  input: { backgroundColor: 'white', fontSize: 15, marginBottom: 2 },
  btn: { marginTop: 16, borderRadius: 8, backgroundColor: '#004AAD' },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, marginTop: 5 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 20 },
});