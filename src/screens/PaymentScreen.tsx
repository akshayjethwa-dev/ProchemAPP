import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Checkbox, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlanDetails, SubscriptionTier } from '../types';
import { SUBSCRIPTION_PLANS } from '../config/plans';
import { useAppStore } from '../store/appStore';

type NavigationProp = NativeStackNavigationProp<any>;
export default function PaymentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const theme = useTheme();
  const currentUser = useAppStore((state) => state.user);
  const updateUser = useAppStore((state) => state.updateUser);
  const { plan: paramPlan, userId: paramUserId, user: paramUser } = route.params || {};
  const plan: PlanDetails = paramPlan || SUBSCRIPTION_PLANS.basic;
  const effectiveUserId = paramUserId || paramUser?.uid || currentUser?.uid;

  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const paymentPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (paymentPollRef.current) clearInterval(paymentPollRef.current);
  }, []);

  const basePrice = plan.price;
  const gstAmount = Math.round(basePrice * 0.18);
  const totalAmount = basePrice + gstAmount;

  const finishVerifiedPayment = (orderId: string, tier: SubscriptionTier, expiry: string) => {
    updateUser({
      subscriptionTier: tier,
      subscriptionPlan: plan.id,
      subscriptionExpiry: expiry,
      paymentHistory: [...(currentUser?.paymentHistory || []), orderId],
    });
    useAppStore.getState().completeOnboarding();
    navigation.replace('PaymentSuccess', {
      isSubscription: true,
      planName: plan.title,
      planTier: tier,
      totalAmount,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      paymentReference: orderId,
      buyerName: paramUser?.companyName || currentUser?.companyName || 'Prochem Member',
    });
  };

  const handleInitiateJuspay = async () => {
    if (!acceptedTerms) {
      const message = 'Please review and accept the Terms and Privacy Policy to continue.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Terms required', message);
      return;
    }

    if (!currentUser?.uid || currentUser.uid !== effectiveUserId) {
      const message = 'Sign in as the account owner before making this payment.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Sign-in required', message);
      return;
    }

    const paymentWindow = Platform.OS === 'web' ? window.open('', '_blank', 'width=480,height=800') : null;
    if (Platform.OS === 'web' && !paymentWindow) {
      window.alert('Please allow pop-ups to open Juspay checkout.');
      return;
    }

    setLoading(true);
    try {
      const functions = getFunctions(getApp(), 'asia-south1');
      const createSession = httpsCallable(functions, 'createJuspaySession');
      const response: any = await createSession({
        amount: totalAmount,
        type: 'subscription',
        referenceId: plan.id,
        platform: Platform.OS === 'web' ? 'web' : 'mobile',
        customerDetails: {
          name: paramUser?.companyName || currentUser.companyName || 'Prochem Member',
          email: paramUser?.email || currentUser.email || 'member@prochem.in',
          phone: paramUser?.phoneNumber || currentUser.phoneNumber || '9999999999',
        },
      });

      const orderId = response.data?.order_id;
      const checkoutUrl = response.data?.payment_url;
      if (!orderId || !checkoutUrl) throw new Error('Juspay did not return a valid checkout session.');

      if (Platform.OS === 'web') paymentWindow!.location.href = checkoutUrl;
      else setPaymentUrl(checkoutUrl);

      let attempts = 0;
      const pollStatus = async () => {
        attempts += 1;
        try {
          const statusResponse: any = await httpsCallable(functions, 'getJuspayOrderStatus')({ orderId });
          const status = String(statusResponse.data?.status || '').toUpperCase();
          if (status === 'CHARGED') {
            if (paymentPollRef.current) clearInterval(paymentPollRef.current);
            setPaymentUrl(null);
            if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
            const session = statusResponse.data?.session;
            if (!session?.planTier || !session?.subscriptionExpiry) {
              throw new Error('Payment was charged but subscription details are not available yet.');
            }
            setLoading(false);
            finishVerifiedPayment(orderId, session.planTier, session.subscriptionExpiry);
          } else if (['FAILED', 'DECLINED', 'CANCELLED'].includes(status) || attempts >= 120) {
            if (paymentPollRef.current) clearInterval(paymentPollRef.current);
            setPaymentUrl(null);
            setLoading(false);
            const message = attempts >= 120 && !['FAILED', 'DECLINED', 'CANCELLED'].includes(status)
              ? 'Payment is still pending. Please check its status before trying again.'
              : `Payment status: ${status}`;
            if (Platform.OS === 'web') window.alert(message);
            else Alert.alert('Payment not completed', message);
          }
        } catch (error: any) {
          console.error('Juspay payment status check failed:', error);
          if (error?.code === 'functions/permission-denied') {
            if (paymentPollRef.current) clearInterval(paymentPollRef.current);
            setPaymentUrl(null);
            setLoading(false);
            if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
          }
        }
      };

      void pollStatus();
      paymentPollRef.current = setInterval(pollStatus, 2500);
    } catch (error: any) {
      if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
      console.error('Juspay session creation failed:', error);
      const message = error.message || 'Could not initialize Juspay payment. No subscription was activated.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Payment setup failed', message);
      setLoading(false);
    }
  };

  const methods: { key: PaymentMethod; icon: string; title: string; description: string }[] = [
    { key: 'UPI', icon: 'cellphone-check', title: 'UPI', description: 'Google Pay, PhonePe, Paytm, BHIM' },
    { key: 'CARD', icon: 'credit-card-outline', title: 'Credit / Debit Cards', description: 'Visa, Mastercard, RuPay' },
    { key: 'NB', icon: 'bank-outline', title: 'Net Banking', description: 'Corporate and personal bank accounts' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} disabled={loading} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Secure Checkout</Text>
          <Text style={styles.headerSubtitle}>Juspay HyperCheckout</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={styles.planCard} elevation={1}>
          <View style={styles.planHeading}>
            <View style={styles.planIcon}>
              <MaterialCommunityIcons name={plan.id === 'premium_growth' ? 'crown' : 'check-decagram'} size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planDescription}>{plan.duration}</Text>
            </View>
          </View>
          {plan.highlights.slice(0, 4).map((highlight, index) => (
            <View key={`${highlight}-${index}`} style={styles.highlight}>
              <MaterialCommunityIcons name="check-circle" size={17} color="#15803D" />
              <Text style={styles.highlightText}>{highlight}</Text>
            </View>
          ))}
          <View style={styles.separator} />
          <View style={styles.amountRow}><Text>Membership fee</Text><Text>₹{basePrice.toLocaleString('en-IN')}</Text></View>
          <View style={styles.amountRow}><Text>GST (18%)</Text><Text>₹{gstAmount.toLocaleString('en-IN')}</Text></View>
          <View style={[styles.amountRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total payable</Text>
            <Text style={styles.totalAmount}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </Surface>

        <Text variant="titleMedium" style={styles.sectionTitle}>Payment methods</Text>
        <Text style={styles.paymentMethodsIntro}>Available methods are shown securely in Juspay checkout.</Text>
        {methods.map((method) => (
          <View key={method.key} style={styles.methodCard}>
            <MaterialCommunityIcons name={method.icon as any} size={24} color={theme.colors.primary} />
            <View style={styles.methodCopy}>
              <Text style={styles.methodTitle}>{method.title}</Text>
              <Text style={styles.methodDescription}>{method.description}</Text>
            </View>
          </View>
        ))}
        <View style={styles.securityNote}>
          <MaterialCommunityIcons name="shield-check" size={20} color="#475569" />
          <Text style={styles.securityText}>Prochem activates your plan only after the payment is verified with Juspay.</Text>
        </View>
        <View style={styles.termsRow}>
          <Checkbox status={acceptedTerms ? 'checked' : 'unchecked'} onPress={() => setAcceptedTerms((accepted) => !accepted)} />
          <Text style={styles.termsText}>
            I have read and agree to Prochem's{' '}
            <Text style={styles.termsLink} onPress={() => navigation.navigate('LegalPages')}>Terms and Conditions and Privacy Policy</Text>.
          </Text>
        </View>
      </ScrollView>

      <Surface style={styles.bottomBar} elevation={3}>
        <View>
          <Text style={styles.bottomLabel}>Amount due</Text>
          <Text style={styles.bottomAmount}>₹{totalAmount.toLocaleString('en-IN')}</Text>
        </View>
        <Button mode="contained" onPress={handleInitiateJuspay} loading={loading} disabled={loading || !acceptedTerms} icon="shield-lock">
          {loading ? 'Verifying payment...' : 'Pay securely'}
        </Button>
      </Surface>

      <Modal visible={!!paymentUrl} animationType="slide" onRequestClose={() => {}}>
        {paymentUrl && <WebView source={{ uri: paymentUrl }} />}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  headerSubtitle: { marginTop: 2, fontSize: 11, fontWeight: '600', color: '#15803D' },
  content: { padding: 16, paddingBottom: 120 },
  planCard: { padding: 18, borderRadius: 12, backgroundColor: 'white' },
  planHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  planIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  planTitle: { fontWeight: '800', color: '#0F172A' },
  planDescription: { marginTop: 3, color: '#64748B' },
  highlight: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, gap: 8 },
  highlightText: { flex: 1, color: '#334155', fontSize: 13, lineHeight: 18 },
  separator: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, color: '#475569' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 14, marginTop: 14 },
  totalLabel: { fontWeight: '700', color: '#0F172A' },
  totalAmount: { fontSize: 18, fontWeight: '800', color: '#004AAD' },
  sectionTitle: { marginTop: 24, marginBottom: 10, fontWeight: '700', color: '#0F172A' },
  paymentMethodsIntro: { marginBottom: 10, color: '#64748B', fontSize: 12 },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 14, marginBottom: 8 },
  methodCopy: { flex: 1, marginLeft: 12 },
  methodTitle: { fontWeight: '700', color: '#0F172A' },
  methodDescription: { marginTop: 3, fontSize: 12, color: '#64748B' },
  securityNote: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 14, borderRadius: 8, backgroundColor: '#F1F5F9' },
  securityText: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 17 },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 12 },
  termsText: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 18 },
  termsLink: { color: '#004AAD', fontWeight: '700', textDecorationLine: 'underline' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  bottomLabel: { fontSize: 11, color: '#64748B' },
  bottomAmount: { marginTop: 2, fontSize: 17, fontWeight: '800', color: '#0F172A' },
});
