// src/screens/PlanSelectionScreen.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { Text, Surface, Button, useTheme, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SUBSCRIPTION_PLANS } from '../config/plans';
import { PlanDetails } from '../types';
import { setPhoneAuthSession } from '../services/phoneAuthSession';
import { sendRealPhoneOTP, formatPhoneNumber } from '../services/phoneAuthService';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<any>;

export default function PlanSelectionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const theme = useTheme();

  const { formData } = route.params || {};

  const [selectedPlanKey, setSelectedPlanKey] = useState<'basic' | 'premium_growth'>('basic');
  const [loading, setLoading] = useState(false);

  const selectedPlan: PlanDetails = SUBSCRIPTION_PLANS[selectedPlanKey];

  const handleProceed = async () => {
    if (!formData || !formData.phoneNumber) {
      Alert.alert('Missing Info', 'Registration details were not found. Please fill out the registration form first.');
      navigation.goBack();
      return;
    }

    setLoading(true);

    const fullMobile = formatPhoneNumber(formData.phoneNumber);

    const enrichedFormData = {
      ...formData,
      phoneNumber: fullMobile,
      selectedPlan,
      subscriptionPlan: selectedPlan.id,
    };

    try {
      // ✅ Updated: No longer requires passing a container ID string
      const result = await sendRealPhoneOTP(fullMobile);

      if (!result.success) {
        setLoading(false);
        const err = result.errorMessage || 'Failed to dispatch SMS verification code.';
        Alert.alert('SMS Delivery Notice', err);
        return;
      }

      setPhoneAuthSession({
        webConfirmation: Platform.OS === 'web' ? result.confirmationResult : undefined,
        nativeConfirmation: Platform.OS !== 'web' ? result.confirmationResult : undefined,
        mobile: result.formattedMobile,
        formData: enrichedFormData,
        selectedPlan,
        mode: 'registration',
      });

      setLoading(false);

      navigation.navigate('OTPVerification', {
        mobile: result.formattedMobile,
        mode: 'registration',
        formData: enrichedFormData,
        selectedPlan,
      });
    } catch (error: any) {
      setLoading(false);
      console.error('Phone validation error in PlanSelection:', error);
      Alert.alert('Phone Number Error', error?.message || 'Please check your mobile number and try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* ✅ Removed the nativeID View that was causing React/Firebase DOM collisions */}

      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          disabled={loading}
        />
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Select Your Membership Plan</Text>
          <Text style={styles.headerSubtitle}>Step 2 of 3 • Choose access level</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.stepDot, styles.stepCompleted]}>
          <MaterialCommunityIcons name="check" size={14} color="white" />
        </View>
        <View style={[styles.stepLine, styles.stepLineActive]} />
        <View style={[styles.stepDot, styles.stepActive]}>
          <Text style={styles.stepNumber}>2</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepDot}>
          <Text style={[styles.stepNumber, { color: '#94A3B8' }]}>3</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introBox}>
          <Text style={styles.greetingText}>
            Welcome, <Text style={{ fontWeight: '700', color: '#004AAD' }}>{formData?.companyName || 'Valued Partner'}</Text>
          </Text>
          <Text style={styles.introSubtitle}>
            Select the plan that fits your business scale. All plans include 100% verified Indian chemical suppliers, direct inquiries, and logistics support.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setSelectedPlanKey('basic')}
          style={[
            styles.planCard,
            selectedPlanKey === 'basic' && styles.planCardSelected,
          ]}
        >
          <View style={styles.planCardHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={styles.standardBadge}>
                  <Text style={styles.standardBadgeText}>MARKETPLACE ESSENTIALS</Text>
                </View>
              </View>
              <Text style={styles.planTitle}>Basic Plan</Text>
              <Text style={styles.planTagline}>Ideal for active buyers & registered chemical traders</Text>
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
          <Text style={styles.taxNotice}>+ Applicable taxes • Cancel anytime</Text>

          <View style={styles.divider} />

          <View style={styles.featuresList}>
            {SUBSCRIPTION_PLANS.basic.highlights.map((item, idx) => (
              <View key={idx} style={styles.featureRow}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color="#10B981"
                  style={styles.featureIcon}
                />
                <Text style={styles.featureLabel}>{item}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

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
            <MaterialCommunityIcons name="crown" size={16} color="#F59E0B" />
            <Text style={styles.popularBannerText}>MOST POPULAR • HIGH GROWTH</Text>
          </View>

          <View style={styles.planCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planTitle, { color: '#0F172A' }]}>Premium Growth Plan</Text>
              <Text style={styles.planTagline}>
                Complete access + high-volume leads, 5+ comparisons & dedicated manager
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
            <Text style={[styles.currencySymbol, { color: '#004AAD' }]}>₹</Text>
            <Text style={[styles.priceNumber, { color: '#004AAD' }]}>4,999</Text>
            <Text style={styles.priceDuration}>/ month</Text>
          </View>
          <Text style={styles.taxNotice}>+ Applicable taxes • Maximum ROI guarantee</Text>

          <View style={styles.divider} />

          <View style={styles.featuresList}>
            {SUBSCRIPTION_PLANS.premium_growth.highlights.map((item, idx) => (
              <View key={idx} style={styles.featureRow}>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={20}
                  color="#004AAD"
                  style={styles.featureIcon}
                />
                <Text style={[styles.featureLabel, { fontWeight: idx < 3 ? '600' : '400' }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        <View style={styles.assuranceBox}>
          <MaterialCommunityIcons name="shield-check" size={24} color="#004AAD" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.assuranceTitle}>Bank-Grade Secure Transactions</Text>
            <Text style={styles.assuranceSub}>
              Processed through Juspay HyperCheckout with support for UPI, Cards, and Net Banking.
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Surface style={styles.bottomBar} elevation={4}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomPlanName}>
            {selectedPlan.title}
          </Text>
          <Text style={styles.bottomPrice}>
            ₹{selectedPlan.price.toLocaleString('en-IN')}{' '}
            <Text style={{ fontSize: 13, color: '#64748B', fontWeight: 'normal' }}>/ month</Text>
          </Text>
        </View>

        <Button
          mode="contained"
          onPress={handleProceed}
          loading={loading}
          disabled={loading}
          style={styles.proceedButton}
          contentStyle={styles.proceedButtonContent}
          labelStyle={styles.proceedButtonLabel}
          icon="arrow-right"
        >
          {loading ? 'Sending Code...' : 'Proceed to Verify'}
        </Button>
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: '#004AAD',
  },
  stepCompleted: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#10B981',
  },
  scrollContent: {
    padding: 16,
  },
  introBox: {
    marginBottom: 18,
  },
  greetingText: {
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 6,
  },
  introSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  planCardSelected: {
    borderColor: '#004AAD',
    backgroundColor: '#F8FAFF',
  },
  premiumCard: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
  },
  premiumCardSelected: {
    borderColor: '#004AAD',
    backgroundColor: '#F0F7FF',
  },
  popularBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  popularBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  standardBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  standardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  planTagline: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
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
    marginLeft: 12,
  },
  radioOuterSelected: {
    borderColor: '#004AAD',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#004AAD',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 14,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  priceNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    marginHorizontal: 2,
  },
  priceDuration: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  taxNotice: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  featuresList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  featureLabel: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    lineHeight: 18,
  },
  assuranceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginTop: 4,
  },
  assuranceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  assuranceSub: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 15,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomInfo: {
    flex: 1,
  },
  bottomPlanName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bottomPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#004AAD',
  },
  proceedButton: {
    backgroundColor: '#004AAD',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  proceedButtonContent: {
    height: 48,
    flexDirection: 'row-reverse',
  },
  proceedButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});