// File: src/screens/MobileLoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Image, 
  Alert, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { Text, TextInput, Button, HelperText, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { setPhoneAuthSession } from '../services/phoneAuthSession';
import { sendRealPhoneOTP, formatPhoneNumber } from '../services/phoneAuthService';
import { SUBSCRIPTION_PLANS } from '../config/plans';
import { PlanDetails } from '../types';

export default function MobileLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    setError('');
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    const fullPhoneNumber = formatPhoneNumber(cleanPhone);

    try {
      const result = await sendRealPhoneOTP(fullPhoneNumber);

      if (!result.success) {
        setLoading(false);
        const err = result.errorMessage || 'Failed to dispatch SMS verification code.';
        setError(err);
        Alert.alert('SMS Delivery Notice', err);
        return;
      }

      setPhoneAuthSession({
        webConfirmation: Platform.OS === 'web' ? result.confirmationResult : undefined,
        nativeConfirmation: Platform.OS !== 'web' ? result.confirmationResult : undefined,
        mobile: result.formattedMobile,
        selectedPlan: null,
        mode: 'login',
      });

      setLoading(false);

      navigation.navigate('OTPVerification', { 
        mobile: result.formattedMobile, 
        mode: 'login',
        selectedPlan: null,
      });
    } catch (err: any) {
      setLoading(false);
      console.error('MobileLogin error:', err);
      const msg = err?.message || 'Failed to process mobile number.';
      setError(msg);
      Alert.alert('SMS Delivery Notice', msg);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="headlineMedium" style={styles.title}>Continue with Mobile</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter your 10-digit mobile number to receive an SMS verification code and access your free account.
          </Text>

          {/* Phone Input */}
          <Text style={styles.fieldLabel}>Mobile Number</Text>
          <TextInput
            placeholder="Enter 10-digit number"
            value={phone}
            onChangeText={(text) => {
              setPhone(text.replace(/[^0-9]/g, ''));
              setError('');
            }}
            mode="outlined"
            keyboardType="phone-pad"
            maxLength={10}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Affix text="+91 " />}
            error={!!error}
          />

          {error ? (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          ) : null}

          {/* Free Plan Benefit Banner */}
          <View style={styles.freePlanBanner}>
            <MaterialCommunityIcons name="check-decagram" size={22} color="#16A34A" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.freePlanTitle}>Free Account Access</Text>
              <Text style={styles.freePlanDesc}>
                Browse verified suppliers, send inquiries, and start negotiating with zero subscription charges.
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <Button
            mode="contained"
            onPress={handleSendOTP}
            loading={loading}
            disabled={loading}
            icon="message-processing-outline"
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
          >
            {loading ? 'Sending Code...' : 'Send OTP & Continue'}
          </Button>

          {/* Trust Footnote */}
          <View style={styles.trustContainer}>
            <MaterialCommunityIcons name="shield-check-outline" size={16} color="#64748B" />
            <Text style={styles.trustText}>256-Bit SSL Encrypted • Instant Trading Access</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 10,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  logo: {
    width: 120,
    height: 40,
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: { 
    backgroundColor: '#F8FAFC', 
    fontSize: 16,
    marginBottom: 4,
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  errorText: {
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  freePlanBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  freePlanTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 2,
  },
  freePlanDesc: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  planCard: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  planCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F7FF',
  },
  growthPlanCard: {
    borderColor: '#FEF3C7',
    backgroundColor: '#FFFDF5',
  },
  growthPlanCardSelected: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  planTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  standardBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  standardBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#2563EB',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  priceAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginLeft: 2,
  },
  priceDuration: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  featureList: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  btn: { 
    borderRadius: 8, 
    backgroundColor: '#0F172A',
    marginTop: 18,
  },
  btnContent: { 
    paddingVertical: 10,
  },
  btnLabel: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  trustContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  trustText: {
    fontSize: 12,
    color: '#64748B',
  },
});
