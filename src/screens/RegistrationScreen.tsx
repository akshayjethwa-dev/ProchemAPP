import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
  Image,
  StatusBar,
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
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  Login: undefined;
  Registration: { role?: string } | undefined;
  LegalPages: undefined; 
  AboutProchem: undefined; 
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function RegistrationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const theme = useTheme();

  const { role } = (route.params as { role?: string }) || { role: 'buyer' };

  const [loading, setLoading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gstin, setGstin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState(true);

  // Terms & Conditions & Opt-ins
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);

  // Error States
  const [errors, setErrors] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phoneNumber: '',
    gstin: '',
    password: '',
    confirmPassword: '',
    terms: '',
  });

  // Real-time password validation variables
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

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
      fullName: '',
      companyName: '',
      email: '',
      phoneNumber: '',
      gstin: '',
      password: '',
      confirmPassword: '',
      terms: '',
    };

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
      isValid = false;
    }
    if (!companyName.trim()) {
      newErrors.companyName = 'Company Name is required';
      isValid = false;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Valid Email is required';
      isValid = false;
    }
    if (!countryCode.trim()) {
      newErrors.phoneNumber = 'Country Code is required';
      isValid = false;
    } else if (!phoneNumber.trim() || phoneNumber.length < 5) {
      newErrors.phoneNumber = 'Valid Phone Number is required';
      isValid = false;
    }
    
    // STRICT GSTIN VALIDATION
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (!gstin) {
      newErrors.gstin = 'GST Number is required';
      isValid = false;
    } else if (!gstRegex.test(gstin)) {
      newErrors.gstin = 'Invalid GST format (e.g., 22AAAAA0000A1Z5)';
      isValid = false;
    }

    // PASSWORD VALIDATION
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (!isPasswordValid) {
      newErrors.password = 'Please meet all the password requirements listed below.';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    if (!acceptTerms) {
      newErrors.terms = 'You must accept the Terms & Conditions and Privacy Policy';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

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
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        companyName: companyName.trim(),
        countryCode: countryCode.trim(),
        phoneNumber: phoneNumber.trim(),
        userType: role || 'buyer',
        gstin: gstin.toUpperCase(),
        gstVerified: false, 
        verificationStatus: 'PENDING',
        address: '',
        whatsappOptIn,
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

  const openTerms = () => {
    navigation.navigate('LegalPages');
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
                <Image 
                  source={require('../../assets/icon.png')} // Fallback if logo is missing
                  style={styles.logoImage} 
                  resizeMode="contain"
                />
                <Text style={styles.headerTitle}>Create Account</Text>
                <Text style={styles.headerSubtitle}>Buy, Sell & Source Chemicals across India</Text>
              </View>
            </SafeAreaView>
          </View>

          {/* Floating Form Card */}
          <View style={styles.formCard}>

            <Text style={styles.cardSubtitle}>Join Prochem and grow your business today.</Text>
            
            {/* 3. Full Name */}
            <TextInput
              label="Full Name *"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullName) setErrors({ ...errors, fullName: '' });
              }}
              mode="outlined"
              textColor="#0F172A"
              left={<TextInput.Icon icon="account-outline" color="#64748B" />}
              error={!!errors.fullName}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <HelperText type="error" visible={!!errors.fullName} style={styles.errorText}>
              {errors.fullName}
            </HelperText>

            {/* 4. Company Name */}
            <TextInput
              label="Company Name *"
              value={companyName}
              onChangeText={(text) => {
                setCompanyName(text);
                if (errors.companyName) setErrors({ ...errors, companyName: '' });
              }}
              mode="outlined"
              textColor="#0F172A"
              left={<TextInput.Icon icon="office-building" color="#64748B" />}
              error={!!errors.companyName}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <HelperText type="error" visible={!!errors.companyName} style={styles.errorText}>
              {errors.companyName}
            </HelperText>

            {/* 5. Email */}
            <TextInput
              label="Email Address *"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              textColor="#0F172A"
              left={<TextInput.Icon icon="email-outline" color="#64748B" />}
              error={!!errors.email}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <HelperText type="error" visible={!!errors.email} style={styles.errorText}>
              {errors.email}
            </HelperText>

            {/* 6. Mobile with Manual Country Code */}
            <View style={styles.phoneRowContainer}>
              <View style={styles.countryCodeInputContainer}>
                <TextInput
                  label="Code *"
                  value={countryCode}
                  onChangeText={(text) => {
                    setCountryCode(text);
                    if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: '' });
                  }}
                  mode="outlined"
                  keyboardType="phone-pad"
                  maxLength={5}
                  textColor="#0F172A"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                />
              </View>
              
              <View style={styles.phoneInputBox}>
                <TextInput
                  label="Mobile Number *"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text.replace(/[^0-9]/g, ''));
                    if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: '' });
                  }}
                  mode="outlined"
                  keyboardType="phone-pad"
                  maxLength={15}
                  textColor="#0F172A"
                  error={!!errors.phoneNumber}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                />
              </View>
            </View>
            <HelperText type="error" visible={!!errors.phoneNumber} style={[styles.errorText, { marginTop: -10 }]}>
              {errors.phoneNumber}
            </HelperText>

            {/* 7. GST Number */}
            <TextInput
              label="GST Number *"
              value={gstin}
              onChangeText={(text) => {
                setGstin(text.toUpperCase());
                if (errors.gstin) setErrors({ ...errors, gstin: '' });
              }}
              mode="outlined"
              maxLength={15}
              placeholder="e.g. 22AAAAA0000A1Z5"
              textColor="#0F172A"
              left={<TextInput.Icon icon="certificate-outline" color="#64748B" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              error={!!errors.gstin}
            />
            <HelperText type={errors.gstin ? "error" : "info"} visible={true} style={styles.errorText}>
              {errors.gstin || "Admin will manually verify this GSTIN."}
            </HelperText>

            {/* 8. Password */}
            <TextInput
              label="Password *"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              mode="outlined"
              secureTextEntry={secureTextEntry}
              textColor="#0F172A"
              left={<TextInput.Icon icon="lock-outline" color="#64748B" />}
              right={
                <TextInput.Icon
                  icon={secureTextEntry ? 'eye-off' : 'eye'}
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                  color="#64748B"
                  forceTextInputFocus={false}
                />
              }
              error={!!errors.password}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            
            {/* REAL-TIME PASSWORD CHECKLIST */}
            {password.length > 0 && !isPasswordValid && (
              <View style={styles.passwordRulesContainer}>
                <Text style={[styles.ruleText, hasMinLength ? styles.ruleMet : styles.ruleUnmet]}>
                  <MaterialCommunityIcons name={hasMinLength ? "check-circle" : "close-circle"} size={14} /> At least 8 characters
                </Text>
                <Text style={[styles.ruleText, hasUpper && hasLower ? styles.ruleMet : styles.ruleUnmet]}>
                  <MaterialCommunityIcons name={hasUpper && hasLower ? "check-circle" : "close-circle"} size={14} /> Both uppercase & lowercase letters
                </Text>
                <Text style={[styles.ruleText, hasNumber ? styles.ruleMet : styles.ruleUnmet]}>
                  <MaterialCommunityIcons name={hasNumber ? "check-circle" : "close-circle"} size={14} /> At least one number (0-9)
                </Text>
                <Text style={[styles.ruleText, hasSpecial ? styles.ruleMet : styles.ruleUnmet]}>
                  <MaterialCommunityIcons name={hasSpecial ? "check-circle" : "close-circle"} size={14} /> At least one special character (@$!%*?&)
                </Text>
              </View>
            )}

            <HelperText type="error" visible={!!errors.password} style={[styles.errorText, { paddingHorizontal: 4 }]}>
              {errors.password}
            </HelperText>

            {/* 9. Confirm Password */}
            <TextInput
              label="Confirm Password *"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              mode="outlined"
              secureTextEntry={secureConfirmTextEntry}
              textColor="#0F172A"
              left={<TextInput.Icon icon="lock-check-outline" color="#64748B" />}
              right={
                <TextInput.Icon
                  icon={secureConfirmTextEntry ? 'eye-off' : 'eye'}
                  onPress={() => setSecureConfirmTextEntry(!secureConfirmTextEntry)}
                  color="#64748B"
                  forceTextInputFocus={false}
                />
              }
              error={!!errors.confirmPassword}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <HelperText type="error" visible={!!errors.confirmPassword} style={styles.errorText}>
              {errors.confirmPassword}
            </HelperText>

            {/* 10. Data Safety Banner */}
            <View style={styles.safetyBanner}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#059669" />
              <Text style={styles.safetyText}>Your data is 100% safe and encrypted with us.</Text>
            </View>

            {/* WHATSAPP OPT-IN CHECKBOX */}
            <View style={styles.optInContainer}>
              <Checkbox.Android
                status={whatsappOptIn ? 'checked' : 'unchecked'}
                onPress={() => setWhatsappOptIn(!whatsappOptIn)}
                color="#25D366" 
              />
              <Text style={styles.optInText}>
                Get order updates and alerts on WhatsApp.
              </Text>
            </View>

            {/* 11. TERMS AND PRIVACY CHECKBOX */}
            <View style={styles.termsContainer}>
              <Checkbox.Android
                status={acceptTerms ? 'checked' : 'unchecked'}
                onPress={() => {
                  setAcceptTerms(!acceptTerms);
                  setErrors({ ...errors, terms: '' });
                }}
                color="#2563EB"
              />
              <View style={styles.termsTextWrap}>
                <Text style={{ color: '#64748B', fontSize: 13, lineHeight: 20 }}>I agree to the </Text>
                <TouchableOpacity onPress={openTerms}>
                  <Text style={styles.termsLink}>Terms & Conditions</Text>
                </TouchableOpacity>
                <Text style={{ color: '#64748B', fontSize: 13, lineHeight: 20 }}> and </Text>
                <TouchableOpacity onPress={openTerms}>
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {errors.terms ? (
              <HelperText type="error" visible={true} style={{ marginBottom: 8, paddingHorizontal: 0 }}>
                {errors.terms}
              </HelperText>
            ) : null}

            {/* 12. Submit Button */}
            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading || !acceptTerms}
              style={[styles.btn, !acceptTerms && { backgroundColor: '#94A3B8' }]}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
            >
              Create Account
            </Button>

            {/* 13. Login Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Log in</Text>
              </TouchableOpacity>
            </View>

            {/* 14. App Features */}
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
                <Text style={styles.featureText}>Support</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <MaterialCommunityIcons name="handshake-outline" size={22} color="#2563EB" />
                </View>
                <Text style={styles.featureText}>B2B Net</Text>
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
    backgroundColor: '#F1F5F9', // Changed to soft slate background to make the white card pop
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBackground: {
    backgroundColor: '#2563EB', // Vibrant Blue Header
    paddingBottom: 70, // Space for the card to overlap
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 10,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF', // Ensures logo pops against dark blue
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#E0E7FF', // Light blue text so it's readable
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 16,
    marginTop: -40, // THIS is what pulls the card up over the blue header
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
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
  errorText: {
    paddingHorizontal: 0,
    marginTop: 2,
    marginBottom: 6,
  },
  // --- New Password Rules Styles ---
  passwordRulesContainer: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ruleText: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  ruleMet: {
    color: '#059669', // Emerald Green for matched rules
  },
  ruleUnmet: {
    color: '#EF4444', // Red for missing rules
  },
  // ---------------------------------
  phoneRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  countryCodeInputContainer: {
    width: 80,
    marginRight: 10,
    marginTop: 6,
  },
  phoneInputBox: {
    flex: 1,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5'
  },
  safetyText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  optInContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12, 
  },
  optInText: { 
    flex: 1, 
    color: '#475569', 
    marginLeft: 4,
    fontSize: 13,
  },
  termsContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 16, 
  },
  termsTextWrap: { 
    flex: 1, 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginLeft: 4,
    marginTop: 8,
  },
  termsLink: { 
    color: '#2563EB', 
    fontWeight: '700', 
    fontSize: 13,
    lineHeight: 20
  },
  btn: { 
    marginTop: 10, 
    borderRadius: 12, 
    backgroundColor: '#2563EB',
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnContent: { 
    paddingVertical: 10 
  },
  btnLabel: { 
    fontSize: 16, 
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 30,
  },
  footerText: {
    color: '#64748B',
    fontSize: 15,
  },
  footerLink: { 
    fontWeight: 'bold', 
    color: '#2563EB',
    fontSize: 15
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 24,
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
    height: 60,
  },
});