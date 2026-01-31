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
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { registerUser } from '../services/authService';
import { verifyGSTAndFetchDetails } from '../services/gstService'; // ✅ Updated Import

export default function RegistrationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();

  // Get params if available, otherwise default
  const { role } = route.params || { role: 'buyer' };

  const [loading, setLoading] = useState(false);
  const [gstLoading, setGstLoading] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [gstin, setGstin] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // GST Verification State
  const [gstVerified, setGstVerified] = useState(false);
  const [gstData, setGstData] = useState<{ legalName?: string, address?: string } | null>(null);

  // Error States
  const [errors, setErrors] = useState({
    companyName: '',
    email: '',
    phoneNumber: '',
    password: '',
    gstin: '',
  });

  /**
   * Validate form fields
   */
  const validate = () => {
    let isValid = true;
    let newErrors = {
      companyName: '',
      email: '',
      phoneNumber: '',
      password: '',
      gstin: '',
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

    // ✅ GST VERIFICATION IS MANDATORY
    if (!gstVerified) {
      newErrors.gstin = 'Please verify your GST Number first';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Handle GST Verification via Razorpay Service
   */
  const handleVerifyGST = async () => {
    // 1. Basic Length Check
    if (!gstin || gstin.length !== 15) {
      setErrors({ ...errors, gstin: 'GSTIN must be exactly 15 characters' });
      return;
    }

    setGstLoading(true);
    setErrors({ ...errors, gstin: '' });

    try {
      // 2. Call the Razorpay Service
      const result = await verifyGSTAndFetchDetails(gstin);

      if (result.isValid) {
        setGstVerified(true);
        setGstData({ legalName: result.legalName, address: result.address });
        
        // ✅ Auto-fill Company Name if available
        if (result.legalName) {
          setCompanyName(result.legalName);
        }
        
        Alert.alert('Success', `Verified: ${result.legalName || 'GST Valid'}`);
      } else {
        setGstVerified(false);
        setErrors({ ...errors, gstin: result.message || 'Verification failed' });
        Alert.alert('Verification Failed', result.message);
      }
    } catch (error: any) {
      console.error('GST Verification Error:', error);
      setGstVerified(false);
      setErrors({ ...errors, gstin: 'Unable to connect to verification server.' });
    } finally {
      setGstLoading(false);
    }
  };

  /**
   * Handle User Registration
   */
  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const registrationData: any = {
        email: email.trim(),
        password,
        companyName: companyName.trim(),
        phoneNumber: phoneNumber.trim(),
        userType: role || 'buyer', // Use role passed from previous screen
        gstin: gstin.toUpperCase(),
        gstVerified: true,
        address: gstData?.address || '', // Save address if returned from API
        verificationStatus: 'PENDING',   // B2B accounts usually pending initially
      };

      await registerUser(registrationData);

      Alert.alert('Success', 'Account created successfully! Please login.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error: any) {
      console.error('Registration Error:', error);
      Alert.alert(
        'Registration Failed',
        error.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearGST = () => {
    setGstin('');
    setGstVerified(false);
    setGstData(null);
    setCompanyName(''); // Optional: clear company name too
    setErrors({ ...errors, gstin: '' });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: 'white' }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text variant="displaySmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
            Create Account
          </Text>
          <Text variant="bodyLarge" style={{ color: '#64748B', marginTop: 5 }}>
            Join the Chemical Marketplace
          </Text>
        </View>

        <View style={styles.formContainer}>
          
          {/* --- GST SECTION (First Priority for B2B) --- */}
          <TextInput
            label="GSTIN (15 characters) *"
            value={gstin}
            onChangeText={(text) => {
              setGstin(text.toUpperCase());
              setGstVerified(false); // Reset verification on edit
              if (errors.gstin) setErrors({ ...errors, gstin: '' });
            }}
            mode="outlined"
            maxLength={15}
            placeholder="22AAAAA0000A1Z5"
            left={<TextInput.Icon icon="card-account-details-outline" />}
            right={gstVerified ? <TextInput.Icon icon="check-circle" color="green" /> : null}
            editable={!gstVerified}
            style={[styles.input, gstVerified && styles.inputDisabled]}
            error={!!errors.gstin}
          />
          
          {errors.gstin ? (
            <HelperText type="error" visible={true}>{errors.gstin}</HelperText>
          ) : (
             !gstVerified && <HelperText type="info" visible={true}>Format: 15 characters (e.g. 22AAAAA0000A1Z5)</HelperText>
          )}

          {!gstVerified && (
            <Button
              mode="contained-tonal"
              onPress={handleVerifyGST}
              loading={gstLoading}
              disabled={gstLoading || gstin.length < 15}
              style={styles.verifyBtn}
            >
              {gstLoading ? 'Verifying...' : 'Verify GSTIN'}
            </Button>
          )}

          {/* Verification Success Message */}
          {gstVerified && (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>✓ Verified Supplier</Text>
              <Text style={styles.successText}>{gstData?.legalName}</Text>
              <TouchableOpacity onPress={handleClearGST}>
                 <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* --- COMPANY DETAILS --- */}
          <TextInput
            label="Company Name *"
            value={companyName}
            onChangeText={setCompanyName}
            mode="outlined"
            left={<TextInput.Icon icon="domain" />}
            error={!!errors.companyName}
            style={styles.input}
            // Only disable if auto-filled and verified to prevent tampering
            disabled={gstVerified && !!gstData?.legalName} 
          />
          <HelperText type="error" visible={!!errors.companyName}>{errors.companyName}</HelperText>

          <TextInput
            label="Email Address *"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email-outline" />}
            error={!!errors.email}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.email}>{errors.email}</HelperText>

          <TextInput
            label="Phone Number *"
            value={phoneNumber}
            onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
            mode="outlined"
            keyboardType="phone-pad"
            maxLength={10}
            left={<TextInput.Icon icon="phone" />}
            error={!!errors.phoneNumber}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.phoneNumber}>{errors.phoneNumber}</HelperText>

          <TextInput
            label="Password *"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={secureTextEntry}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={secureTextEntry ? 'eye' : 'eye-off'}
                onPress={() => setSecureTextEntry(!secureTextEntry)}
              />
            }
            error={!!errors.password}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.password}>{errors.password}</HelperText>

          {/* Register Button */}
          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading || !gstVerified}
            style={[styles.btn, !gstVerified && styles.btnDisabled]}
            contentStyle={{ height: 50 }}
          >
            Create Account
          </Button>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={{ color: '#64748B' }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'white',
  },
  headerContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: 'white',
    fontSize: 15,
    marginBottom: 2,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  verifyBtn: {
    marginVertical: 10,
    borderRadius: 8,
  },
  successCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  successTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#047857',
  },
  successText: {
    fontSize: 14,
    color: '#065F46',
    marginTop: 2,
  },
  changeLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  btn: {
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#004AAD',
  },
  btnDisabled: {
    backgroundColor: '#94A3B8',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20
  },
});