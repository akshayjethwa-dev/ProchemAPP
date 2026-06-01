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
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [gstin, setGstin] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Terms & Conditions & Opt-ins
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);

  // Error States
  const [errors, setErrors] = useState({
    companyName: '',
    email: '',
    phoneNumber: '',
    password: '',
    gstin: '',
    terms: '',
  });

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
                <Text style={styles.headerTitle}>Create Your Account</Text>
                <Text style={styles.headerSubtitle}>Join Prochem and grow your business with us</Text>
              </View>
            </SafeAreaView>
          </View>

          {/* Overlapping Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Sign Up</Text>
            
            <TextInput
              label="Company Name"
              value={companyName}
              onChangeText={(text) => {
                setCompanyName(text);
                if (errors.companyName) setErrors({ ...errors, companyName: '' });
              }}
              mode="outlined"
              textColor="#1E293B"
              left={<TextInput.Icon icon="office-building" color="#94A3B8" />}
              error={!!errors.companyName}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <HelperText type="error" visible={!!errors.companyName} style={styles.errorText}>
              {errors.companyName}
            </HelperText>

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
              textColor="#1E293B"
              left={<TextInput.Icon icon="certificate" color="#94A3B8" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              error={!!errors.gstin}
            />
            <HelperText type={errors.gstin ? "error" : "info"} visible={true} style={styles.errorText}>
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
              textColor="#1E293B"
              left={<TextInput.Icon icon="email-outline" color="#94A3B8" />}
              error={!!errors.email}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <HelperText type="error" visible={!!errors.email} style={styles.errorText}>
              {errors.email}
            </HelperText>

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
              textColor="#1E293B"
              left={<TextInput.Icon icon="phone" color="#94A3B8" />}
              error={!!errors.phoneNumber}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <HelperText type="error" visible={!!errors.phoneNumber} style={styles.errorText}>
              {errors.phoneNumber}
            </HelperText>

            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              mode="outlined"
              secureTextEntry={secureTextEntry}
              textColor="#1E293B"
              left={<TextInput.Icon icon="lock-outline" color="#94A3B8" />}
              right={
                <TextInput.Icon
                  icon={secureTextEntry ? 'eye-off' : 'eye'}
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                  color="#94A3B8"
                  forceTextInputFocus={false}
                />
              }
              error={!!errors.password}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <HelperText type="error" visible={!!errors.password} style={styles.errorText}>
              {errors.password}
            </HelperText>

            {/* WHATSAPP OPT-IN CHECKBOX */}
            <View style={styles.optInContainer}>
              <Checkbox.Android
                status={whatsappOptIn ? 'checked' : 'unchecked'}
                onPress={() => setWhatsappOptIn(!whatsappOptIn)}
                color="#25D366" // WhatsApp Green
              />
              <Text style={styles.optInText}>
                Receive order updates and market alerts on WhatsApp from Prochem.
              </Text>
            </View>

            {/* TERMS CHECKBOX */}
            <View style={styles.termsContainer}>
              <Checkbox.Android
                status={acceptTerms ? 'checked' : 'unchecked'}
                onPress={() => {
                  setAcceptTerms(!acceptTerms);
                  setErrors({ ...errors, terms: '' });
                }}
                color="#004AAD"
              />
              <View style={styles.termsTextWrap}>
                <Text style={{ color: '#64748B', fontSize: 13 }}>I accept the </Text>
                <TouchableOpacity onPress={openTerms}>
                  <Text style={styles.termsLink}>
                    Terms and Conditions
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {errors.terms ? (
              <HelperText type="error" visible={true} style={{ marginBottom: 8, paddingHorizontal: 0 }}>
                {errors.terms}
              </HelperText>
            ) : null}

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.btn}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
            >
              Create Account
            </Button>

            <Button 
              mode="outlined" 
              icon="information-outline" 
              onPress={() => navigation.navigate('AboutProchem')} 
              style={styles.infoBtn}
              contentStyle={styles.infoBtnContent}
              labelStyle={{ fontSize: 15, fontWeight: '600' }}
              textColor="#004AAD"
            >
              What is Prochem?
            </Button>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Footer Section */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Login</Text>
              </TouchableOpacity>
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
    paddingBottom: 60, // Extra padding for the overlap
    shadowColor: '#004AAD',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: { 
    backgroundColor: '#F1F5F9', // Light gray background
    fontSize: 15,
  },
  inputOutline: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  errorText: {
    paddingHorizontal: 0,
    marginTop: 4,
    marginBottom: -4,
  },
  optInContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12, 
    marginTop: 12, 
    backgroundColor: '#F0FDF4', 
    padding: 12, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#BBF7D0' 
  },
  optInText: { 
    flex: 1, 
    color: '#166534', 
    marginLeft: 4,
    fontSize: 13,
    lineHeight: 18
  },
  termsContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 4, 
    marginTop: 4 
  },
  termsTextWrap: { 
    flex: 1, 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginLeft: 4,
    alignItems: 'center'
  },
  termsLink: { 
    color: '#004AAD', 
    fontWeight: '700', 
    textDecorationLine: 'underline',
    fontSize: 13
  },
  btn: { 
    marginTop: 20, 
    borderRadius: 14, 
    backgroundColor: '#004AAD',
    shadowColor: '#004AAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnContent: { 
    paddingVertical: 12 
  },
  btnLabel: { 
    fontSize: 16, 
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  infoBtn: {
    marginTop: 16, 
    borderRadius: 14, 
    borderColor: '#004AAD',
    borderWidth: 1,
    backgroundColor: '#F8FAFC' // Slight contrast background
  },
  infoBtnContent: {
    paddingVertical: 8
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
  footerLink: { 
    fontWeight: 'bold', 
    color: '#004AAD',
    fontSize: 15
  },
  bottomSpacer: {
    height: 40,
  }
});