// src/screens/PlanSelectionScreen.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { Text, Surface, IconButton, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SUBSCRIPTION_PLANS } from '../config/plans';
import { PlanDetails } from '../types';
import { setPhoneAuthSession } from '../services/phoneAuthSession';
import { sendRealPhoneOTP, formatPhoneNumber } from '../services/phoneAuthService';

type NavigationProp = NativeStackNavigationProp<any>;

export default function PlanSelectionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();

  // ✅ `mode` distinguishes mobile-login users from full-registration users.
  //    RegistrationScreen → navigate('PlanSelection', { ..., mode: 'registration' })
  //    MobileLoginScreen  → navigate('PlanSelection', { ..., mode: 'login' })
  //    Default `'registration'` is used if the caller omits it (backward compat).
  const { formData, role, mode = 'registration' } = route.params || {};

  // ✅ Premium is now the flagship / default selection.
  const [selectedPlanKey, setSelectedPlanKey] = useState<'basic' | 'premium_growth'>('premium_growth');
  const [loading, setLoading] = useState(false);

  // ✅ AUTO-PAY ON BY DEFAULT — kept from the current implementation.
  //    NOTE: the current Juspay default payment page handles its own mandate flow,
  //    so this toggle is a UI affordance that will be wired to the backend when
  //    mandate configuration is re-enabled.
  const [autoPayEnabled, setAutoPayEnabled] = useState(true);

  const selectedPlan: PlanDetails = SUBSCRIPTION_PLANS[selectedPlanKey];

  const handleProceed = async () => {
    if (!formData || !formData.phoneNumber) {
      Alert.alert(
        'Missing Registration Details',
        'Please complete the registration form before selecting a plan.'
      );
      navigation.goBack();
      return;
    }

    setLoading(true);

    const fullMobile = formatPhoneNumber(formData.phoneNumber);

    // ✅ Enrich formData differently based on how we got here:
    //    - registration: full enrichment — downstream OTPVerification calls
    //      completeRegistrationAfterOTP which reads email/password/companyName/etc.
    //    - login: minimal — downstream OTPVerification calls processMobileLogin
    //      which only needs the phone number; adding registration fields here
    //      would confuse that path.
    const enrichedFormData =
      mode === 'registration'
        ? {
            ...formData,
            phoneNumber: fullMobile,
            selectedPlan,
            subscriptionPlan: selectedPlan.id,
            autoPayEnabled,
            mandateConfig: autoPayEnabled
              ? {
                  maxAmount: selectedPlan.price,
                  frequency: 'MONTHLY' as const,
                  amountRule: 'FIXED' as const,
                  revokableByCustomer: true,
                }
              : null,
          }
        : {
            ...formData,
            phoneNumber: fullMobile,
          };

    try {
      const result = await sendRealPhoneOTP(fullMobile);

      if (!result.success) {
        setLoading(false);
        const err = result.errorMessage || 'Failed to dispatch SMS verification code.';
        Alert.alert('SMS Delivery Notice', err);
        return;
      }

      // ✅ Store mode in the phone-auth session so OTPVerificationScreen can
      //    pick it up even if route params are lost on a web refresh.
      setPhoneAuthSession({
        webConfirmation: Platform.OS === 'web' ? result.confirmationResult : undefined,
        nativeConfirmation: Platform.OS !== 'web' ? result.confirmationResult : undefined,
        mobile: result.formattedMobile,
        formData: enrichedFormData,
        selectedPlan,
        mode, // ✅ propagate the real mode (login OR registration)
      });

      setLoading(false);

      navigation.navigate('OTPVerification', {
        mobile: result.formattedMobile,
        mode, // ✅ propagate the real mode
        formData: enrichedFormData,
        selectedPlan,
        autoPayEnabled,
      });
    } catch (error: any) {
      setLoading(false);
      console.error('Phone validation error in PlanSelection:', error);
      Alert.alert(
        'Phone Verification Error',
        error?.message || 'Please check your mobile number and try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Executive Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor="#FFFFFF"
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={{ margin: 0 }}
        />
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Select Membership Plan</Text>
          <Text style={styles.headerSubtitle}>STEP 2 OF 3 • REQUIRED MEMBERSHIP</Text>
        </View>
        <View style={styles.planStepBadge}>
          <Text style={styles.planStepBadgeText}>Step 2</Text>
        </View>
      </View>

      {/* Progress Tracker */}
      <View style={styles.progressRow}>
        <View style={[styles.stepDot, styles.stepCompleted]}>
          <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" />
        </View>
        <View style={[styles.stepLine, styles.stepLineActive]} />
        <View style={[styles.stepDot, styles.stepActive]}>
          <Text style={styles.stepNumberActive}>2</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepDot}>
          <Text style={styles.stepNumber}>3</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introBox}>
          <Text style={styles.greetingText}>
            Welcome,{' '}
            <Text style={{ fontWeight: '800', color: '#0F172A' }}>
              {mode === 'registration'
                ? formData?.companyName || 'Enterprise Member'
                : 'Valued Partner'}
            </Text>
          </Text>
          <Text style={styles.introSubtitle}>
            Select a verified membership plan to activate your Prochem account. All plans include 100% verified Indian chemical suppliers, direct inquiries, and logistics support.
          </Text>
        </View>

        {/* 1. Premium Growth Plan (Flagship / Recommended) */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setSelectedPlanKey('premium_growth')}
          style={[
            styles.planCard,
            styles.premiumCard,
            selectedPlanKey === 'premium_growth' && styles.premiumCardSelected,
          ]}
        >
          <View style={styles.popularBanner}>
            <MaterialCommunityIcons name="crown" size={15} color="#D97706" />
            <Text style={styles.popularBannerText}>MOST POPULAR • MAXIMUM VOLUME & LEADS</Text>
          </View>

          <View style={styles.planCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle}>Premium Growth Plan</Text>
              <Text style={styles.planTagline}>
                Priority bulk leads, 5+ supplier price comparisons & dedicated trade desk
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
            <Text style={[styles.currencySymbol, { color: '#0F172A' }]}>₹</Text>
            <Text style={[styles.priceNumber, { color: '#0F172A' }]}>4,999</Text>
            <Text style={styles.priceDuration}>/ month</Text>
          </View>
          <Text style={styles.taxNotice}>+ 18% GST • Maximum ROI & priority dispatch</Text>

          <View style={styles.divider} />

          <View style={styles.featuresList}>
            {SUBSCRIPTION_PLANS.premium_growth.highlights.map((item, idx) => (
              <View key={idx} style={styles.featureRow}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={16}
                  color="#059669"
                  style={styles.featureIcon}
                />
                <Text
                  style={[
                    styles.featureLabel,
                    { fontWeight: idx < 3 ? '700' : '400', color: '#1E293B' },
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* 2. Basic Plan */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setSelectedPlanKey('basic')}
          style={[styles.planCard, selectedPlanKey === 'basic' && styles.planCardSelected]}
        >
          <View style={styles.planCardHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={styles.standardBadge}>
                  <Text style={styles.standardBadgeText}>MARKETPLACE ESSENTIALS</Text>
                </View>
              </View>
              <Text style={styles.planTitle}>Basic Plan</Text>
              <Text style={styles.planTagline}>
                Full standard access for active chemical buyers & traders
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
          <Text style={styles.taxNotice}>+ 18% GST • Standard chemical marketplace</Text>

          <View style={styles.divider} />

          <View style={styles.featuresList}>
            {SUBSCRIPTION_PLANS.basic.highlights.map((item, idx) => (
              <View key={idx} style={styles.featureRow}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={16}
                  color="#059669"
                  style={styles.featureIcon}
                />
                <Text style={styles.featureLabel}>{item}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* ✅ AUTO-PAY TOGGLE — ON BY DEFAULT */}
        <View style={styles.autoPayBox}>
          <View style={styles.autoPayHeader}>
            <View style={styles.autoPayIconWrap}>
              <MaterialCommunityIcons name="autorenew" size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoPayTitle}>Enable Auto-Renewal</Text>
              <Text style={styles.autoPaySubtitle}>
                Your plan renews automatically every month via UPI Autopay / Card Mandate. Cancel anytime from your bank app or the Prochem app.
              </Text>
            </View>
            <Switch
              value={autoPayEnabled}
              onValueChange={setAutoPayEnabled}
              color="#0F172A"
            />
          </View>

          {autoPayEnabled && (
            <View style={styles.autoPayBadge}>
              <MaterialCommunityIcons name="check-circle" size={14} color="#16A34A" />
              <Text style={styles.autoPayBadgeText}>
                Monthly renewal • Pause or cancel anytime
              </Text>
            </View>
          )}

          {!autoPayEnabled && (
            <View style={[styles.autoPayBadge, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="information" size={14} color="#B45309" />
              <Text style={[styles.autoPayBadgeText, { color: '#B45309' }]}>
                One-time payment • You'll be reminded before renewal
              </Text>
            </View>
          )}
        </View>

        {/* Trust Guarantee */}
        <View style={styles.assuranceBox}>
          <MaterialCommunityIcons name="shield-check" size={24} color="#059669" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.assuranceTitle}>Bank-Grade Payment Security</Text>
            <Text style={styles.assuranceSub}>
              Direct UPI, Corporate Net Banking & Card settlements backed by 256-bit encryption.
            </Text>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating Bottom Bar */}
      <Surface style={styles.bottomBar} elevation={4}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomPlanName}>
            {selectedPlan.title}
            {autoPayEnabled ? ' • Auto-Renew' : ''}
          </Text>
          <Text style={styles.bottomPrice}>
            ₹{selectedPlan.price.toLocaleString('en-IN')}{' '}
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: 'normal' }}>
              / mo + GST
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.proceedButton, loading && { opacity: 0.7 }]}
          onPress={handleProceed}
          disabled={loading}
          activeOpacity={0.88}
        >
          <Text style={styles.proceedButtonText}>
            {loading ? 'Sending OTP...' : 'Proceed to Verify →'}
          </Text>
        </TouchableOpacity>
      </Surface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  headerTitleContainer: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.6,
  },
  planStepBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  planStepBadgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Progress tracker */
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCompleted: {
    backgroundColor: '#059669',
  },
  stepActive: {
    backgroundColor: '#0F172A',
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumberActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#059669',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  introBox: {
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },

  /* Plan cards */
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
  },
  planCardSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  premiumCard: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  premiumCardSelected: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },

  popularBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 10,
  },
  popularBannerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  badgeRow: {
    marginBottom: 4,
  },
  standardBadge: {
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  standardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  planTagline: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioOuterSelected: {
    borderColor: '#0F172A',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F172A',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  priceNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 2,
    letterSpacing: -0.5,
  },
  priceDuration: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  taxNotice: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  featuresList: {
    gap: 7,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  featureLabel: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    lineHeight: 17,
  },

  /* Auto-pay toggle */
  autoPayBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  autoPayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoPayIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  autoPayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  autoPaySubtitle: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 15,
  },
  autoPayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  autoPayBadgeText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
    marginLeft: 6,
  },

  /* Trust footer */
  assuranceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 8,
  },
  assuranceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  assuranceSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 1,
    lineHeight: 15,
  },

  /* Bottom bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bottomInfo: {
    flex: 1,
    paddingRight: 10,
  },
  bottomPlanName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  bottomPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    marginTop: 1,
  },
  proceedButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});