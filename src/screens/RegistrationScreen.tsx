// File: src/screens/RegistrationScreen.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  Text,
  TextInput,
  HelperText,
  Checkbox,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { checkEmailExists } from '../services/authService';
import { setPhoneAuthSession } from '../services/phoneAuthSession';
import { sendRealPhoneOTP, formatPhoneNumber } from '../services/phoneAuthService';

type RootStackParamList = {
  Login: undefined;
  Registration: { role?: string } | undefined;
  PlanSelection: { formData: any; role?: string };
  OTPVerification: { mobile: string; mode: string; formData: any; webConfirmation?: any; nativeConfirmation?: any; selectedPlan?: any };
  LegalPages: undefined; 
  AboutProchem: undefined; 
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function RegistrationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();

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
    fullName: '', companyName: '', email: '', phoneNumber: '',
    gstin: '', password: '', confirmPassword: '', terms: '',
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
      fullName: '', companyName: '', email: '', phoneNumber: '',
      gstin: '', password: '', confirmPassword: '', terms: '',
    };

    if (!fullName.trim()) { newErrors.fullName = 'Authorized Person Name is required'; isValid = false; }
    if (!companyName.trim()) { newErrors.companyName = 'Registered Entity Name is required'; isValid = false; }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { newErrors.email = 'Valid corporate email required'; isValid = false; }
    if (!countryCode.trim()) { newErrors.phoneNumber = 'Country Code is required'; isValid = false; } 
    else if (!phoneNumber.trim() || phoneNumber.length !== 10) { newErrors.phoneNumber = 'Valid 10-digit mobile number required'; isValid = false; }
    
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (!gstin) { newErrors.gstin = 'GSTIN is required for tax invoicing'; isValid = false; } 
    else if (!gstRegex.test(gstin.toUpperCase())) { newErrors.gstin = 'Invalid GST format (e.g. 24AAAAA0000A1Z5)'; isValid = false; }

    if (!password) { newErrors.password = 'Password is required'; isValid = false; } 
    else if (!isPasswordValid) { newErrors.password = 'Please meet all security requirements.'; isValid = false; }

    if (!confirmPassword) { newErrors.confirmPassword = 'Confirm Password is required'; isValid = false; } 
    else if (password !== confirmPassword) { newErrors.confirmPassword = 'Passwords do not match'; isValid = false; }
    
    if (!acceptTerms) { newErrors.terms = 'You must accept the Terms & Conditions and Privacy Policy'; isValid = false; }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegisterOTP = async () => {
    if (!validate()) {
      if (!acceptTerms) showAlert("Terms Required", "Please accept the Terms & Conditions to proceed.");
      return;
    }

    setLoading(true);
    try {
      const emailExists = await checkEmailExists(email.trim());
      if (emailExists) {
        setErrors(prev => ({ ...prev, email: 'This email is already registered.' }));
        setLoading(false);
        return;
      }

      const fullMobile = formatPhoneNumber(`${countryCode.trim()}${phoneNumber.trim()}`);
      const formData = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        companyName: companyName.trim(),
        countryCode: countryCode.trim(),
        phoneNumber: fullMobile,
        userType: role || 'buyer',
        gstin: gstin.toUpperCase(),
        whatsappOptIn,
        selectedPlan: null,
        subscriptionPlan: 'free',
        subscriptionTier: 'FREE',
      };

      const result = await sendRealPhoneOTP(fullMobile);
      if (!result.success) {
        setLoading(false);
        const err = result.errorMessage || 'Failed to dispatch SMS verification code.';
        showAlert('SMS Delivery Notice', err);
        return;
      }

      setPhoneAuthSession({
        webConfirmation: Platform.OS === 'web' ? result.confirmationResult : undefined,
        nativeConfirmation: Platform.OS !== 'web' ? result.confirmationResult : undefined,
        mobile: result.formattedMobile,
        formData,
        selectedPlan: null,
        mode: 'registration',
      });

      setLoading(false);
      navigation.navigate('OTPVerification', {
        mobile: result.formattedMobile,
        mode: 'registration',
        formData,
        selectedPlan: null,
      });
    } catch (error: any) {
      console.error('Registration validation error:', error);
      showAlert('Error', error.message || 'Validation failed. Please review your details.');
    } finally {
      setLoading(false);
    }
  };

  const openTerms = () => {
    navigation.navigate('LegalPages');
  };

  const isSellerRole = role === 'seller';

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
          {/* Header */}
          <View style={styles.headerBackground}>
            <SafeAreaView edges={['top']}>
              <View style={styles.headerTopBar}>
                <IconButton 
                  icon="arrow-left" 
                  size={24} 
                  iconColor="#FFFFFF" 
                  onPress={() => navigation.goBack()} 
                  style={{ margin: 0 }}
                />
                <View style={styles.roleHeaderBadge}>
                  <Text style={styles.roleHeaderBadgeText}>
                    {isSellerRole ? 'USER ONBOARDING' : 'USER ONBOARDING'}
                  </Text>
                </View>
              </View>

              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Create Enterprise Account</Text>
                <Text style={styles.headerSubtitle}>
                  {isSellerRole 
                    ? 'Connect with verified chemical purchasers and receive live bulk inquiries.'
                    : 'Source certified chemicals directly from verified manufacturers across India.'}
                </Text>
              </View>
            </SafeAreaView>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            
            {/* Section 1: Business Identity */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionNumber}>01</Text>
                <Text style={styles.sectionTitle}>CORPORATE IDENTITY</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>REGISTERED COMPANY NAME *</Text>
                <TextInput
                  placeholder="e.g. Gujarat Alkalies & Chemicals Ltd"
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
                {errors.companyName ? (
                  <HelperText type="error" visible={true} style={styles.errorText}>
                    {errors.companyName}
                  </HelperText>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>GSTIN (TAX IDENTIFIER) *</Text>
                <TextInput
                  placeholder="e.g. 24AAAAA0000A1Z5"
                  value={gstin}
                  onChangeText={(text) => {
                    setGstin(text.toUpperCase());
                    if (errors.gstin) setErrors({ ...errors, gstin: '' });
                  }}
                  autoCapitalize="characters"
                  maxLength={15}
                  mode="outlined"
                  textColor="#0F172A"
                  left={<TextInput.Icon icon="card-account-details-outline" color="#64748B" />}
                  error={!!errors.gstin}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                />
                {errors.gstin ? (
                  <HelperText type="error" visible={true} style={styles.errorText}>
                    {errors.gstin}
                  </HelperText>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>AUTHORIZED REPRESENTATIVE NAME *</Text>
                <TextInput
                  placeholder="e.g. Rajesh Sharma"
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
                {errors.fullName ? (
                  <HelperText type="error" visible={true} style={styles.errorText}>
                    {errors.fullName}
                  </HelperText>
                ) : null}
              </View>
            </View>

            {/* Section 2: Contact & Authentication */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionNumber}>02</Text>
                <Text style={styles.sectionTitle}>CONTACT & SECURITY</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>OFFICIAL CORPORATE EMAIL *</Text>
                <TextInput
                  placeholder="procurement@company.com"
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
                {errors.email ? (
                  <HelperText type="error" visible={true} style={styles.errorText}>
                    {errors.email}
                  </HelperText>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>MOBILE NUMBER (FOR OTP VERIFICATION) *</Text>
                <View style={styles.mobileRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    placeholder="98765 43210"
                    value={phoneNumber}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9]/g, '');
                      setPhoneNumber(cleaned);
                      if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: '' });
                    }}
                    mode="outlined"
                    keyboardType="phone-pad"
                    maxLength={10}
                    textColor="#0F172A"
                    error={!!errors.phoneNumber}
                    style={[styles.input, { flex: 1 }]}
                    outlineStyle={styles.inputOutline}
                  />
                </View>
                {errors.phoneNumber ? (
                  <HelperText type="error" visible={true} style={styles.errorText}>
                    {errors.phoneNumber}
                  </HelperText>
                ) : null}
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>SECURITY PASSWORD *</Text>
                <TextInput
                  placeholder="••••••••••••"
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
                      icon={secureTextEntry ? 'eye-off-outline' : 'eye-outline'}
                      onPress={() => setSecureTextEntry(!secureTextEntry)}
                      color="#64748B"
                      forceTextInputFocus={false}
                    />
                  }
                  error={!!errors.password}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                />

                {/* Password Rule Badges */}
                {password.length > 0 && (
                  <View style={styles.passwordRulesBox}>
                    <View style={styles.ruleItem}>
                      <Text style={[styles.ruleText, hasMinLength && styles.ruleMet]}>
                        {hasMinLength ? '✓' : '•'} 8+ chars
                      </Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Text style={[styles.ruleText, hasUpper && hasLower && styles.ruleMet]}>
                        {hasUpper && hasLower ? '✓' : '•'} Aa letters
                      </Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Text style={[styles.ruleText, hasNumber && styles.ruleMet]}>
                        {hasNumber ? '✓' : '•'} Number
                      </Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Text style={[styles.ruleText, hasSpecial && styles.ruleMet]}>
                        {hasSpecial ? '✓' : '•'} Special
                      </Text>
                    </View>
                  </View>
                )}
                {errors.password ? (
                  <HelperText type="error" visible={true} style={styles.errorText}>
                    {errors.password}
                  </HelperText>
                ) : null}
              </View>

              {/* Confirm Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CONFIRM PASSWORD *</Text>
                <TextInput
                  placeholder="••••••••••••"
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
                      icon={secureConfirmTextEntry ? 'eye-off-outline' : 'eye-outline'}
                      onPress={() => setSecureConfirmTextEntry(!secureConfirmTextEntry)}
                      color="#64748B"
                      forceTextInputFocus={false}
                    />
                  }
                  error={!!errors.confirmPassword}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                />
                {errors.confirmPassword ? (
                  <HelperText type="error" visible={true} style={styles.errorText}>
                    {errors.confirmPassword}
                  </HelperText>
                ) : null}
              </View>
            </View>

            {/* Section 3: Opt-ins & Agreements */}
            <View style={styles.sectionBlock}>
              <View style={styles.optInRow}>
                <Checkbox.Android
                  status={whatsappOptIn ? 'checked' : 'unchecked'}
                  onPress={() => setWhatsappOptIn(!whatsappOptIn)}
                  color="#059669"
                />
                <Text style={styles.optInLabel}>
                  Receive real-time trade alerts & quotation updates on WhatsApp
                </Text>
              </View>

              <View style={styles.termsRow}>
                <Checkbox.Android
                  status={acceptTerms ? 'checked' : 'unchecked'}
                  onPress={() => {
                    setAcceptTerms(!acceptTerms);
                    setErrors({ ...errors, terms: '' });
                  }}
                  color="#0F172A"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.termsLabel}>
                    I confirm the accuracy of our corporate credentials and agree to the{' '}
                    <Text style={styles.termsLink} onPress={openTerms}>Terms of Trade</Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink} onPress={openTerms}>Privacy Policy</Text>.
                  </Text>
                </View>
              </View>
              {errors.terms ? (
                <HelperText type="error" visible={true} style={styles.errorText}>
                  {errors.terms}
                </HelperText>
              ) : null}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && { opacity: 0.7 }]}
              onPress={handleRegisterOTP}
              disabled={loading}
              activeOpacity={0.88}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Transmitting OTP...' : 'Verify Phone via OTP & Register →'}
              </Text>
            </TouchableOpacity>

            {/* Login Prompt */}
            <View style={styles.loginRow}>
              <Text style={styles.loginPromptText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign in here</Text>
              </TouchableOpacity>
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
    paddingBottom: 44,
  },
  headerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  roleHeaderBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 12,
  },
  roleHeaderBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionBlock: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  sectionNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    fontSize: 13,
    height: 44,
  },
  inputOutline: {
    borderRadius: 8,
    borderColor: '#CBD5E1',
  },
  mobileRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeBox: {
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  passwordRulesBox: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  ruleItem: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ruleText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  ruleMet: {
    color: '#059669',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 11,
    marginTop: -4,
    marginBottom: 6,
    paddingHorizontal: 0,
  },
  optInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginLeft: -8,
  },
  optInLabel: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    fontWeight: '500',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: -8,
  },
  termsLabel: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  termsLink: {
    color: '#0F172A',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#0F172A',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginPromptText: {
    fontSize: 12,
    color: '#64748B',
  },
  loginLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
});
