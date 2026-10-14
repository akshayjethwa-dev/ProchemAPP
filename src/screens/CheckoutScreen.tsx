// src/screens/CheckoutScreen.tsx

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Alert, BackHandler, ActivityIndicator, Modal, Platform } from 'react-native';
import { Text, Card, Button, Divider, IconButton, useTheme } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { useAppStore } from '../store/appStore';
import { placeOrder, updateOrderStatus } from '../services/orderService';
import { cancelJuspayOrder } from '../services/payment';
import { db } from '../config/firebase';
import { Address, User } from '../types';
import { JuspayApiError } from '../services/payment';


export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  const { cart, user, clearCart } = useAppStore();

  const negotiatedItem = route.params?.negotiatedItem;
  const activeCart = negotiatedItem ? [negotiatedItem] : cart;

  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [sellerState, setSellerState] = useState<string | null>(null);
  const [calculatingTax, setCalculatingTax] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [firestoreOrderId, setFirestoreOrderId] = useState<string | null>(null);
  const paymentPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Guard so we don't call cancel() twice for the same order
  const cancelCalledRef = useRef(false);

  const [errors, setErrors] = useState({ address: false });

  // --- NAVIGATION HANDLERS ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <IconButton icon="arrow-left" onPress={() => handleAbortCheckout()} />,
      title: "Secure Checkout"
    });
  }, [navigation]);

  useEffect(() => {
    const backAction = () => { handleAbortCheckout(); return true; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => {
      backHandler.remove();
      if (paymentPollRef.current) clearInterval(paymentPollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- ADDRESS & SELLER LOGIC ---
  useEffect(() => {
    if (route.params?.selectedAddress) {
      setSelectedAddress(route.params.selectedAddress);
      setErrors(prev => ({ ...prev, address: false }));
    } else if (user?.addresses && user.addresses.length > 0) {
      setSelectedAddress(user.addresses[0]);
    } else if (user?.address) {
      setSelectedAddress({
        id: 'legacy', label: 'Default', street: user.address, city: '', state: '', zipCode: '', country: 'India'
      });
    }

    fetchSellerDetails();
  }, [user, route.params]);

  const fetchSellerDetails = async () => {
    if (!activeCart || activeCart.length === 0 || !activeCart[0].sellerId) {
      setCalculatingTax(false);
      return;
    }

    try {
      const sellerId = activeCart[0].sellerId;
      const sellerRef = doc(db, 'users', sellerId);
      const sellerSnap = await getDoc(sellerRef);

      if (sellerSnap.exists()) {
        const sellerData = sellerSnap.data() as User;
        let state = null;
        if (sellerData.addresses && sellerData.addresses.length > 0) {
          state = sellerData.addresses[0].state;
        }
        setSellerState(state || 'Gujarat');
      }
    } catch (error) {
      console.error("Error fetching seller details:", error);
    } finally {
      setCalculatingTax(false);
    }
  };

  // --- FINANCIAL CALCULATIONS ---
  const BUYER_PLATFORM_FEE_PERCENT = 0.015;
  const SELLER_PLATFORM_FEE_PERCENT = 0.01;
  const SELLER_SAFETY_FEE_PERCENT = 0.0025;
  const SELLER_FREIGHT_FEE_PERCENT = 0.0025;

  const productTotal = activeCart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  const totalGstAmount = activeCart.reduce((sum, item) => sum + ((item.pricePerUnit * item.quantity) * ((item.gstPercent || 18) / 100)), 0);

  let cgst = 0, sgst = 0, igst = 0;
  let isInterState = true;

  if (selectedAddress?.state && sellerState) {
    if (selectedAddress.state.toLowerCase() === sellerState.toLowerCase()) {
      isInterState = false;
      cgst = totalGstAmount / 2;
      sgst = totalGstAmount / 2;
    } else {
      igst = totalGstAmount;
    }
  } else {
    igst = totalGstAmount;
  }

  const productTotalWithTax = productTotal + totalGstAmount;
  const platformFeeBuyer = productTotalWithTax * BUYER_PLATFORM_FEE_PERCENT;
  const finalPayableAmount = productTotalWithTax + platformFeeBuyer;

  const platformFeeSeller = productTotalWithTax * SELLER_PLATFORM_FEE_PERCENT;
  const safetyFee = productTotalWithTax * SELLER_SAFETY_FEE_PERCENT;
  const freightFee = productTotalWithTax * SELLER_FREIGHT_FEE_PERCENT;
  const payoutAmount = productTotalWithTax - platformFeeSeller - safetyFee - freightFee;


  // --- SUCCESS HANDLER ---
  const handlePaymentSuccess = async (originalFirestoreOrderId: string) => {
    try {
      await updateOrderStatus(originalFirestoreOrderId, 'PENDING_SELLER');
      await updateDoc(doc(db, 'orders', originalFirestoreOrderId), { paymentStatus: 'completed' });

      if (negotiatedItem && negotiatedItem.customRequirementId) {
        await updateDoc(doc(db, 'customRequirements', negotiatedItem.customRequirementId), {
          status: 'FULFILLED',
          finalOrderId: originalFirestoreOrderId
        });
      }

      if (!negotiatedItem) {
        clearCart();
      }

      navigation.replace('OrderTracking', { orderId: originalFirestoreOrderId });

    } catch (error) {
      console.error("Error in post-payment logic:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CANCEL / ABORT HANDLER ---
  // Called on back-press, header-left, or WebView close while payment is in-flight.
  const handleAbortCheckout = async () => {
    // If no payment session was created yet, just go back
    if (!paymentOrderId) {
      navigation.goBack();
      return;
    }

    // If cancel was already attempted for this order, just navigate away
    if (cancelCalledRef.current) {
      navigation.goBack();
      return;
    }
    cancelCalledRef.current = true;

    const doCancel = async () => {
      if (paymentPollRef.current) {
        clearInterval(paymentPollRef.current);
        paymentPollRef.current = null;
      }
      try {
        setPaymentUrl(null);
        const result = await cancelJuspayOrder(paymentOrderId, 'User Cancelled');
        if (result.success) {
          console.log('[Checkout] Order cancelled successfully.');
        } else {
          console.warn('[Checkout] Order was not cancellable:', result.message);
        }
      } catch (err: any) {
        console.error('[Checkout] Cancel failed:', err);
      } finally {
        setPaymentOrderId(null);
        setLoading(false);
        navigation.goBack();
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Cancel this payment? The payment link will become unusable.'
      );
      if (confirmed) {
        await doCancel();
      } else {
        cancelCalledRef.current = false;
      }
    } else {
      Alert.alert(
        'Cancel Payment?',
        'Are you sure you want to cancel this payment? The payment link will become unusable.',
        [
          { text: 'No, Continue', style: 'cancel', onPress: () => { cancelCalledRef.current = false; } },
          { text: 'Yes, Cancel', style: 'destructive', onPress: async () => { await doCancel(); } },
        ]
      );
    }
  };


  // --- SUBMIT ORDER & TRIGGER DBS SESSION ---
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setErrors({ address: true });
      if (Platform.OS === 'web') {
        window.alert("Please select a Delivery Address.");
      } else {
        Alert.alert("Required Fields", "Please select a Delivery Address.");
      }
      return;
    }

    setLoading(true);
    const paymentWindow = Platform.OS === 'web'
      ? window.open('', '_blank', 'width=480,height=800')
      : null;
    if (Platform.OS === 'web' && !paymentWindow) {
      setLoading(false);
      window.alert('Please allow pop-ups to open Juspay checkout.');
      return;
    }

    try {
      // 1. Save the Order to Firestore FIRST
      const orderId = await placeOrder({
        buyerId: user!.uid,
        sellerId: activeCart[0].sellerId,
        items: activeCart,
        shippingAddress: JSON.stringify(selectedAddress),
        subTotal: productTotal,
        taxAmount: totalGstAmount,
        cgst: cgst,
        sgst: sgst,
        igst: igst,
        platformFeeBuyer: platformFeeBuyer,
        platformFeeSeller: platformFeeSeller,
        safetyFee: safetyFee,
        freightFee: freightFee,
        totalAmount: finalPayableAmount,
        payoutAmount: payoutAmount,
        status: 'PENDING_SELLER',
        paymentStatus: 'pending',
        paymentMode: 'JUSPAY',
        sellerPayoutStatus: 'PENDING',
        paymentReference: 'JUSPAY_HYPERCHECKOUT',
        createdAt: new Date().toISOString(),
        date: new Date().toISOString(),
      } as any);
      setFirestoreOrderId(orderId);

      // 2. Call the server to create a DBS Session and get the payment link
      const app = getApp();
      const functions = getFunctions(app, 'asia-south1');
      const createSessionFn = httpsCallable(functions, 'createDBSSession');

      let safePhone = user?.phoneNumber || user?.phone || "9876543210";
      safePhone = safePhone.replace(/[^0-9]/g, '');
      if (safePhone.length > 10) safePhone = safePhone.slice(-10);
      if (safePhone.length < 10) safePhone = "9876543210";

      const response: any = await createSessionFn({
        // ✅ Session API parameters (matches functions/dbs.js)
        orderId: orderId,
        amount: Number(finalPayableAmount.toFixed(2)),
        customerId: user!.uid,
        customerEmail: user?.email || "buyer@prochem.com",
        customerPhone: safePhone,
        description: negotiatedItem ? "Custom Order" : `Prochem order ${orderId}`,
        firstName: user?.companyName || user?.businessName || "Prochem",
        lastName: "Buyer",
        // Optional:
        // options: { get_upi_deep_links: true },
        // metadata: { "JUSPAY:gateway_reference_id": orderId },
      });

      // ✅ DBS returns { sdk_payload, payment_links: { web: "..." }, order_id, ... }
      const links = response.data?.payment_links;
      const juspayOrderId = response.data?.order_id;
      const webUrl = links?.web || response.data?.payment_url;

      if (!webUrl || !juspayOrderId) {
        throw new Error("Could not retrieve Juspay payment session from server.");
      }

      setPaymentOrderId(juspayOrderId);

      // ── WEB PLATFORM: open in popup window and poll ──
      if (Platform.OS === 'web') {
        paymentWindow!.location.href = webUrl;

        const checkPayment = async () => {
          try {
            const statusResponse: any = await httpsCallable(
              getFunctions(getApp(), 'asia-south1'),
              'getDBSOrderStatus'
            )({
              orderId: juspayOrderId,
              expectedAmount: finalPayableAmount,   // ✅ fraud-prevention amount check
              customerId: user!.uid,
              includeFullGatewayResponse: false,
            });

            const action = statusResponse.data?.action;
            const status = String(statusResponse.data?.status || '').toUpperCase();

            if (action === 'fulfil' || status === 'CHARGED') {
              if (paymentPollRef.current) clearInterval(paymentPollRef.current);
              setPaymentOrderId(null);
              if (firestoreOrderId) {
                await handlePaymentSuccess(firestoreOrderId);
              }
            } else if (action === 'decline' || ['FAILED', 'DECLINED', 'CANCELLED', 'AUTHORIZATION_FAILED'].includes(status)) {
              if (paymentPollRef.current) clearInterval(paymentPollRef.current);
              setPaymentOrderId(null);
              setLoading(false);
              window.alert(`Payment not completed: ${status}`);
            }

            if (paymentWindow!.closed && action !== 'fulfil' && action !== 'decline') {
              if (paymentPollRef.current) clearInterval(paymentPollRef.current);
              setPaymentOrderId(null);
              setLoading(false);
            }
          } catch (error) {
            console.error('Juspay status polling failed:', error);
          }
        };

        void checkPayment();
        paymentPollRef.current = setInterval(checkPayment, 2500);
        return;
      }

      // ── NATIVE PLATFORM: open in WebView modal ──
      setPaymentUrl(webUrl);
      setLoading(false);

    } catch (error: any) {
  if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
  console.error("Order Generation Failure:", error);
  setLoading(false);

  // ─── Structured error handling ───
  const isJuspayError = error instanceof JuspayApiError;
  const userAction: string = isJuspayError ? error.userAction : 'unknown';
  const friendlyMessage: string = isJuspayError
    ? error.message
    : error?.message || 'Failed to initialize payment gateway.';

  // DUPLICATE_ORDER_ID — the safest recovery is to generate a new order ID.
  // We surface this clearly so the user knows to retry the checkout from scratch.
  if (userAction === 'new_order_id') {
    const msg =
      'This order was already submitted. Please start the checkout again with a fresh order.';
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Order Already Exists', msg, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
    return;
  }

  // Retryable — offer a Retry button that re-runs handlePlaceOrder
  if (userAction === 'retry') {
    if (Platform.OS === 'web') {
      const retry = window.confirm(`${friendlyMessage}\n\nRetry now?`);
      if (retry) {
        // Re-invoke after a short delay so UI can settle
        setTimeout(() => void handlePlaceOrder(), 400);
      }
    } else {
      Alert.alert(
        'Payment Gateway Busy',
        friendlyMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Retry',
            onPress: () => setTimeout(() => void handlePlaceOrder(), 400),
          },
        ]
      );
    }
    return;
  }

  // Config / auth / origin issues — user must contact support
  if (userAction === 'contact_support') {
    if (Platform.OS === 'web') window.alert(friendlyMessage);
    else Alert.alert('Payment Unavailable', friendlyMessage);
    return;
  }

  // Default fallback for fix_request / unknown
  if (Platform.OS === 'web') {
    window.alert(friendlyMessage);
  } else {
    Alert.alert('Error', friendlyMessage);
  }
}
  };

  // --- RECONCILE ON WEBVIEW CLOSE ---
  const reconcileJuspayPayment = async () => {
    if (!paymentOrderId) {
      setPaymentUrl(null);
      return;
    }
    try {
      const functions = getFunctions(getApp(), 'asia-south1');
      const getStatus = httpsCallable(functions, 'getDBSOrderStatus');
      const response: any = await getStatus({
        orderId: paymentOrderId,
        expectedAmount: finalPayableAmount,   // ✅ fraud-prevention
        customerId: user!.uid,
        includeFullGatewayResponse: false,
      });

      const action = response.data?.action;
      setPaymentUrl(null);
      setPaymentOrderId(null);

      if (action === 'fulfil' && firestoreOrderId) {
        await handlePaymentSuccess(firestoreOrderId);
      } else {
        // If user closes without paying, cancel the order
        if (action === 'unknown' || action === 'pending') {
          try {
            await cancelJuspayOrder(paymentOrderId, 'User Closed Checkout');
          } catch (cancelErr) {
            console.warn('[Checkout] Cancel on close failed:', cancelErr);
          }
        }
        setLoading(false);
        Alert.alert(
          'Payment not completed',
          `Juspay status: ${response.data?.status || 'PENDING'}`
        );
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert(
        'Payment verification failed',
        error.message || 'Please check your order status shortly.'
      );
    }
  };

  if (calculatingTax || activeCart.length === 0) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        {/* 1. Address Section */}
        <Card style={[styles.card, errors.address && { borderColor: theme.colors.error, borderWidth: 1 }]}>
          <Card.Title title="Delivery To" left={(props) => <Text {...props}>📍</Text>} />
          <Card.Content>
            {selectedAddress ? (
              <View>
                <Text style={{ fontWeight: 'bold' }}>{selectedAddress.label}</Text>
                <Text>{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state}</Text>
              </View>
            ) : (
              <Text style={{ color: errors.address ? theme.colors.error : 'orange' }}>
                {errors.address ? '⚠️ Address is required' : 'No address selected'}
              </Text>
            )}
            <Button mode="text" onPress={() => navigation.navigate('AddressList', { selectable: true })}>
              {selectedAddress ? 'Change' : 'Add Address'}
            </Button>
          </Card.Content>
        </Card>

        {/* 2. Bill Details */}
        <Card style={styles.card}>
          <Card.Title title={negotiatedItem ? "Custom Order Summary" : "Order Summary"} />
          <Card.Content>
            <View style={styles.row}><Text>Item Total</Text><Text>₹{productTotal.toFixed(2)}</Text></View>

            {!isInterState ? (
              <>
                <View style={styles.row}>
                  <Text>CGST</Text>
                  <Text>₹{cgst.toFixed(2)}</Text>
                </View>
                <View style={styles.row}>
                  <Text>SGST</Text>
                  <Text>₹{sgst.toFixed(2)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.row}>
                <Text>IGST</Text>
                <Text>₹{igst.toFixed(2)}</Text>
              </View>
            )}

            <Divider style={{ marginVertical: 5 }} />

            <View style={styles.row}><Text>Platform Fee (1.5%)</Text><Text>₹{platformFeeBuyer.toFixed(2)}</Text></View>

            <Divider style={{ marginVertical: 10 }} />
            <View style={styles.row}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Total Payable</Text>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>₹{finalPayableAmount.toFixed(2)}</Text>
            </View>

            <Text style={{ fontSize: 12, color: '#D97706', marginTop: 10, fontStyle: 'italic', textAlign: 'center' }}>
              * Delivery charges are not included and will be billed separately.
            </Text>
          </Card.Content>
        </Card>

        {/* 3. SUBMIT BUTTON */}
        <Button
          mode="contained"
          onPress={handlePlaceOrder}
          loading={loading}
          disabled={loading}
          style={{ backgroundColor: theme.colors.primary, marginTop: 10, marginBottom: 30 }}
          contentStyle={{ height: 50 }}
          icon="shield-check"
        >
          {loading ? 'Processing...' : 'Pay Securely'}
        </Button>
      </ScrollView>

      {/* 4. WebView Modal (native platforms) */}
      <Modal
        visible={Platform.OS !== 'web' && !!paymentUrl}
        animationType="slide"
        onRequestClose={reconcileJuspayPayment}
      >
        <View style={styles.paymentModal}>
          <View style={styles.paymentHeader}>
            <Text variant="titleMedium">Secure Juspay Checkout</Text>
            <IconButton icon="close" onPress={reconcileJuspayPayment} />
          </View>
          {paymentUrl && (
            <WebView
              source={{ uri: paymentUrl }}
              onNavigationStateChange={(state) => {
                // Detect return URL redirect and reconcile
                if (
                  state.url.startsWith(
                    'https://asia-south1-prochemapp-dev.cloudfunctions.net/juspayReturn'
                  ) ||
                  state.url.startsWith('prochemapp://payment/callback')
                ) {
                  reconcileJuspayPayment();
                }
              }}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#F8FAFC', flexGrow: 1 },
  card: { marginBottom: 16, backgroundColor: 'white', borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  paymentModal: { flex: 1, paddingTop: 35, backgroundColor: 'white' },
  paymentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }
});