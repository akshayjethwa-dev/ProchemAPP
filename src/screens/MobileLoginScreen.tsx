// File: src/screens/MobileLoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, TextInput, HelperText, IconButton } from 'react-native-paper';
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
  const [selectedPlanKey, setSelectedPlanKey] = useState<'basic' | 'premium_growth'>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedPlan: PlanDetails = SUBSCRIPTION_PLANS[selectedPlanKey];

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

      // ✅ mode: 'login' → OTPVerification uses processMobileLogin (handles
      //    BOTH new signup and existing login via the isNewUser flag).
      //    selectedPlan is captured here so a new user can go straight to Payment.
      setPhoneAuthSession({
        webConfirmation: Platform.OS === 'web' ? result.confirmationResult : undefined,
        nativeConfirmation: Platform.OS !== 'web' ? result.confirmationResult : undefined,
        mobile: result.formattedMobile,
        selectedPlan,
        mode: 'login',
      });

      setLoading(false);

      navigation.navigate('OTPVerification', {
        mobile: result.formattedMobile,
        mode: 'login',
        selectedPlan,
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
    <SafeAreaView style={styles.mainContainer} edges={['top', 'bottom']}>
      {/* Executive Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor="#FFFFFF"
          onPress={() => navigation.goBack()}
          style={{ margin: 0 }}
        />
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Mobile Access & Membership</Text>
          <Text style={styles.headerSubtitle}>ONE-TAP SMS LOGIN</Text>
        </View>
        <View style={styles.headerStep}>
          <Text style={styles.headerStepText}>Fast Access</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card: Mobile Input */}
          <View style={styles.inputCard}>
            <Text style={styles.cardHeaderTitle}>Enter Registered Mobile Number</Text>
            <Text style={styles.cardHeaderSubtitle}>
              We'll send a 6-digit verification code to confirm your corporate account.
            </Text>

            <View style={styles.phoneInputRow}>
              <View style={styles.flagBox}>
                <Text style={styles.flagText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                placeholder="98765 43210"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                mode="outlined"
                keyboardType="phone-pad"
                maxLength={10}
                style={[styles.input, { flex: 1 }]}
                outlineStyle={styles.inputOutline}
                error={!!error}
              />
            </View>

            {error ? (
              <HelperText type="error" visible={!!error} style={styles.errorText}>
                {error}
              </HelperText>
            ) : null}
          </View>

          {/* Section: Plan Selection */}
          <View style={styles.planSectionHeader}>
            <Text style={styles.planSectionTitle}>Choose Your Membership Plan</Text>
            <Text style={styles.planSectionSub}>
              New users must select and activate a plan to access Prochem. Existing members continue directly.
            </Text>
          </View>

          {/* 1. Premium Growth Plan */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setSelectedPlanKey('premium_growth')}
            style={[
              styles.planCard,
              styles.growthCard,
              selectedPlanKey === 'premium_growth' && styles.growthCardSelected,
            ]}
          >
            <View style={styles.crownBanner}>
              <MaterialCommunityIcons name="crown" size={14} color="#D97706" />
              <Text style={styles.crownBannerText}>RECOMMENDED • HIGH GROWTH</Text>
            </View>

            <View style={styles.planTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>Premium Growth Plan</Text>
                <Text style={styles.planDesc}>
                  Priority bulk chemical leads, 5+ supplier comparisons & dedicated trade desk
                </Text>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  selectedPlanKey === 'premium_growth' && styles.radioOuterSelected,
                ]}
              >
                {selectedPlanKey === 'premium_growth' && <View style={styles.radioInner} />}
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <Text style={styles.priceNumber}>4,999</Text>
              <Text style={styles.priceDuration}>/ month</Text>
            </View>

            <View style={styles.featuresPreview}>
              <Text style={styles.featureItemText}>✓ Dedicated relationship manager</Text>
              <Text style={styles.featureItemText}>✓ Direct WhatsApp & email tender relay</Text>
              <Text style={styles.featureItemText}>✓ 100% upfront escrow payment assurance</Text>
            </View>
          </TouchableOpacity>

          {/* 2. Basic Plan */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setSelectedPlanKey('basic')}
            style={[styles.planCard, selectedPlanKey === 'basic' && styles.planCardSelected]}
          >
            <View style={styles.planTopRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.standardBadge}>
                  <Text style={styles.standardBadgeText}>MARKETPLACE ESSENTIALS</Text>
                </View>
                <Text style={styles.planTitle}>Basic Plan</Text>
                <Text style={styles.planDesc}>
                  Standard access to 1,000+ chemicals with live price negotiation desk
                </Text>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  selectedPlanKey === 'basic' && styles.radioOuterSelected,
                ]}
              >
                {selectedPlanKey === 'basic' && <View style={styles.radioInner} />}
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <Text style={styles.priceNumber}>1,999</Text>
              <Text style={styles.priceDuration}>/ month</Text>
            </View>

            <View style={styles.featuresPreview}>
              <Text style={styles.featureItemText}>✓ Verified chemical catalog search</Text>
              <Text style={styles.featureItemText}>✓ Send unlimited RFQs & counter-offers</Text>
              <Text style={styles.featureItemText}>✓ Integrated order tracking & digital GST invoices</Text>
            </View>
          </TouchableOpacity>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.primarySubmitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSendOTP}
            disabled={loading}
            activeOpacity={0.88}
          >
            <Text style={styles.primarySubmitBtnText}>
              {loading
                ? 'Dispatching SMS Code...'
                : `Send OTP & Subscribe (${selectedPlan.title}) →`}
            </Text>
          </TouchableOpacity>

          {/* Trust Footnote */}
          <View style={styles.trustContainer}>
            <MaterialCommunityIcons name="shield-check-outline" size={16} color="#059669" />
            <Text style={styles.trustText}>
              256-Bit SSL Encrypted • Direct SMS Gateway Delivery
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.6,
  },
  headerStep: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  headerStepText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },

  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Input Card */
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 14,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flagBox: {
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  flagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    backgroundColor: '#F8FAFC',
    fontSize: 14,
    height: 44,
  },
  inputOutline: {
    borderRadius: 8,
    borderColor: '#CBD5E1',
  },
  errorText: {
    paddingHorizontal: 0,
    marginTop: 4,
    marginBottom: 0,
    fontSize: 11,
  },

  /* Plan Selection Section */
  planSectionHeader: {
    marginBottom: 12,
  },
  planSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  planSectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  /* Plan Cards */
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  planCardSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  growthCard: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  growthCardSelected: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },

  crownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  crownBannerText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },

  planTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  standardBadge: {
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  standardBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },

  planTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  planDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginTop: 2,
  },
  radioOuterSelected: {
    borderColor: '#0F172A',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0F172A',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  priceNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 2,
    letterSpacing: -0.5,
  },
  priceDuration: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
  },

  featuresPreview: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  featureItemText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },

  /* Submit Button */
  primarySubmitBtn: {
    backgroundColor: '#0F172A',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primarySubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  trustContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  trustText: {
    fontSize: 11,
    color: '#64748B',
  },
});