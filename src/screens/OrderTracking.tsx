// File: src/screens/OrderTracking.tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, TextStyle, BackHandler, Alert } from 'react-native';
import { Text, Card, IconButton, Divider, useTheme, Avatar, Button } from 'react-native-paper';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { doc, onSnapshot, query, collection, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { Order } from '../types';

// 💳 Refund flow
import { getJuspayCheckoutStatus } from '../services/payment';

export default function OrderTracking() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAppStore();

  // Get Order ID from navigation params
  const { orderId: paramOrderId } = route.params || {};

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // 💳 Refund loading state (only for the "Request Refund" button)
  const [refundLoading, setRefundLoading] = useState(false);

  // ✅ FIX: Custom Back Navigation Handler
  // Navigates to Orders tab instead of going back to Checkout/Cart
  const handleBackNavigation = () => {
    try {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'BuyerTabs',
              state: {
                routes: [{ name: 'Orders' }],
              },
            },
          ],
        })
      );
    } catch {
      try {
        navigation.navigate('BuyerTabs', { screen: 'Orders' });
      } catch {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    }
  };

  // ✅ FIX: Handle Android Hardware Back Button
  useEffect(() => {
    const backAction = () => {
      handleBackNavigation();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchOrder = async () => {
      try {
        let targetOrderId = paramOrderId;

        // 1. If no ID passed, auto-find the latest active order
        if (!targetOrderId) {
          if (!user) { setLoading(false); return; }

          const q = query(
            collection(db, 'orders'),
            where('buyerId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
          );

          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            targetOrderId = snapshot.docs[0].id;
          } else {
            setLoading(false);
            return;
          }
        }

        // 2. Listen to the specific Order ID
        if (targetOrderId) {
          unsubscribe = onSnapshot(doc(db, 'orders', targetOrderId), (docSnap) => {
            if (docSnap.exists()) {
              setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
            } else {
              setOrder(null);
            }
            setLoading(false);
          }, (error) => {
            console.error("Tracking Snapshot Error:", error);
            setLoading(false);
          });
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        setLoading(false);
      }
    };

    fetchOrder();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [paramOrderId, user]);

  // ─────────────────────────────────────────────────────────────
  // 💳 Refund handler — Option 2: Fetch fresh amounts first
  // ─────────────────────────────────────────────────────────────
  const handleOpenRefunds = async () => {
    if (!order || !order.id) return;

    try {
      setRefundLoading(true);

      // 1. Fetch the authoritative state from DBS via our Cloud Function.
      //    We don't pass expectedAmount here because we're not verifying
      //    a charge — we just want the current refundable balance.
      const status = await getJuspayCheckoutStatus(
        order.id,          // DBS order_id (same as Firestore doc ID)
        undefined,         // skip expectedAmount check for this call
        user?.uid          // x-routing-id
      );

      // 2. Guard: only proceed if the order was actually charged
      if (status.action !== 'fulfil' && status.status !== 'CHARGED') {
        Alert.alert(
          'Refund Unavailable',
          'This order cannot be refunded because the payment was not completed.'
        );
        return;
      }

      // 3. Compute numeric values (API may return strings)
      const effectiveAmount = Number(
        status.effective_amount ?? status.amount ?? 0
      );
      const amountRefunded = Number(status.amount_refunded ?? 0);

      // 4. Guard: don't open refund screen if already fully refunded
      if (effectiveAmount - amountRefunded < 1) {
        Alert.alert(
          'Nothing to Refund',
          'This order has already been fully refunded.'
        );
        return;
      }

      // 5. Navigate to the refund screen with fresh amounts
      navigation.navigate('OrderRefund', {
        orderId: order.id,
        effectiveAmount,
        amountRefunded,
        customerId: user?.uid,
      });
    } catch (err: any) {
      console.error('[OrderTracking] Refund fetch failed:', err);
      Alert.alert(
        'Error',
        err?.message || 'Unable to load refund details. Please try again.'
      );
    } finally {
      setRefundLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#004AAD" /></View>;
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Avatar.Icon size={80} icon="package-variant" style={{ backgroundColor: '#F1F5F9' }} color="#999" />
        <Text variant="headlineSmall" style={{ color: '#999', marginTop: 20, fontWeight: 'bold' }}>No Active Orders</Text>
        <Button mode="contained" onPress={handleBackNavigation} style={{ marginTop: 20 }}>Start Shopping</Button>
      </View>
    );
  }

  const steps = [
    { title: 'Order Placed', description: 'Request sent to Seller', key: 'PENDING_SELLER' },
    { title: 'Seller Approval', description: 'Docs uploaded by Seller', key: 'PENDING_ADMIN' },
    { title: 'Quality Verified', description: 'Admin approved documents', key: 'ACCEPTED' },
    { title: 'Dispatched', description: 'On the way', key: 'shipped' },
    { title: 'Delivered', description: 'Package received', key: 'delivered' }
  ];

  const getStepStatus = (stepKey: string) => {
    const statusOrder = ['PENDING_SELLER', 'PENDING_ADMIN', 'ACCEPTED', 'shipped', 'delivered'];
    const currentIdx = statusOrder.indexOf(order.status);
    const stepIdx = statusOrder.indexOf(stepKey);

    // If status is ACCEPTED, we want that step to show as Completed (Green)
    if (order.status === 'ACCEPTED' && stepKey === 'ACCEPTED') {
      return 'completed';
    }

    if (currentIdx > stepIdx) return 'completed';
    if (currentIdx === stepIdx) return 'current';
    return 'pending';
  };

  if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {/* ✅ FIX: Use Custom Back Handler */}
          <IconButton icon="arrow-left" onPress={handleBackNavigation} />
          <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>Track Order</Text>
        </View>
        <Card style={[styles.card, { backgroundColor: '#FFEBEE', borderColor: '#EF5350', borderWidth: 1 }]}>
          <Card.Content style={{ alignItems: 'center', padding: 30 }}>
            <Avatar.Icon size={60} icon="alert-circle" style={{ backgroundColor: '#EF5350' }} />
            <Text variant="headlineSmall" style={{ color: '#D32F2F', fontWeight: 'bold', marginTop: 10 }}>{order.status}</Text>
            <Text style={{ textAlign: 'center', color: '#C62828', marginTop: 5 }}>
              {order.status === 'CANCELLED' ? 'Order cancelled.' : 'Documents rejected by Admin.'}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  // 💳 Show the refund button only when payment has completed
  const canShowRefundButton = order.paymentStatus === 'completed';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* ✅ FIX: Use Custom Back Handler */}
        <IconButton icon="arrow-left" onPress={handleBackNavigation} />
        <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>Track Shipment</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Card style={styles.banner}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>
                ORDER REF: {order.id.slice(0, 10).toUpperCase()}
              </Text>
              <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.5)' }}>
                <Text style={{ color: '#A7F3D0', fontSize: 11, fontWeight: 'bold' }}>
                  {order.paymentStatus === 'completed' ? 'PAID' : 'PAYMENT VERIFIED'}
                </Text>
              </View>
            </View>
            <Text variant="headlineMedium" style={{ color: 'white', fontWeight: 'bold', marginTop: 8 }}>
              {order.status ? order.status.replace(/_/g, ' ') : 'IN PROGRESS'}
            </Text>
            <Text style={{ color: 'white', opacity: 0.85, marginTop: 2 }}>
              {order.createdAt ? new Date(order.createdAt).toDateString() : new Date().toDateString()}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.timelineContainer}>
          {steps.map((step, index) => {
            const status = getStepStatus(step.key);
            const isLast = index === steps.length - 1;

            let iconColor = '#E0E0E0';
            let icon = 'circle';
            let lineColor = '#E0E0E0';

            let titleStyle: TextStyle = { color: '#999', fontWeight: 'normal' };

            if (status === 'completed') {
              iconColor = '#2E7D32';
              icon = 'check-circle';
              lineColor = '#2E7D32';
              titleStyle = { color: 'black', fontWeight: 'bold' };
            } else if (status === 'current') {
              iconColor = '#004AAD';
              icon = 'record-circle-outline';
              lineColor = '#E0E0E0';
              titleStyle = { color: '#004AAD', fontWeight: 'bold' };
            }

            return (
              <View key={index} style={styles.stepRow}>
                <View style={{ alignItems: 'center', width: 40 }}>
                  <IconButton icon={icon} iconColor={iconColor} size={24} style={{ margin: 0 }} />
                  {!isLast && <View style={[styles.line, { backgroundColor: status === 'completed' ? lineColor : '#E0E0E0' }]} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 30, justifyContent: 'center' }}>
                  <Text variant="titleMedium" style={titleStyle}>{step.title}</Text>
                  <Text variant="bodySmall" style={{ color: '#666' }}>{step.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Card style={styles.detailsCard}>
          <Card.Title title="Order Summary" left={(props) => <Avatar.Icon {...props} icon="receipt" size={40} style={{ backgroundColor: '#F1F5F9' }} color="black" />} />
          <Divider />
          <Card.Content style={{ marginTop: 10 }}>
            {(order.items || []).map((item: any, idx: number) => {
              const itemName = item.name || item.productName || 'Chemical Item';
              const qty = item.quantity || 1;
              const unit = item.unit || 'units';
              const price = item.pricePerUnit || item.price || 0;
              const lineTotal = item.total || (price * qty);
              return (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ flex: 1, marginRight: 8 }} numberOfLines={1}>{itemName} ({qty} {unit})</Text>
                  <Text style={{ fontWeight: 'bold' }}>₹{Number(lineTotal).toFixed(2)}</Text>
                </View>
              );
            })}
            <Divider style={{ marginVertical: 10 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Total Amount</Text>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#004AAD' }}>₹{Number(order.totalAmount || 0).toFixed(2)}</Text>
            </View>
          </Card.Content>
        </Card>

        <View style={{ gap: 12, marginBottom: 40 }}>
          {/* 💳 Refund button — only visible after payment is complete */}
          {canShowRefundButton && (
            <Button
              mode="outlined"
              textColor="#B45309"
              icon="cash-refund"
              onPress={handleOpenRefunds}
              loading={refundLoading}
              disabled={refundLoading}
              style={{ borderRadius: 12, borderColor: '#F59E0B' }}
              contentStyle={{ paddingVertical: 6 }}
            >
              {refundLoading ? 'Loading refund details...' : 'Request Refund'}
            </Button>
          )}

          <Button
            mode="contained"
            buttonColor="#004AAD"
            icon="clipboard-list"
            onPress={handleBackNavigation}
            style={{ borderRadius: 12 }}
            contentStyle={{ paddingVertical: 6 }}
          >
            View All My Orders
          </Button>
          <Button
            mode="outlined"
            textColor="#004AAD"
            icon="storefront"
            onPress={() => navigation.navigate('BuyerTabs', { screen: 'HomeTab' })}
            style={{ borderRadius: 12, borderColor: '#004AAD' }}
            contentStyle={{ paddingVertical: 6 }}
          >
            Continue Shopping
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'white', elevation: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { margin: 20 },
  banner: { backgroundColor: '#004AAD', borderRadius: 12, marginBottom: 20 },
  timelineContainer: { paddingLeft: 10 },
  stepRow: { flexDirection: 'row' },
  line: { width: 2, flex: 1, marginVertical: 4 },
  detailsCard: { backgroundColor: 'white', marginTop: 10, marginBottom: 30 }
});