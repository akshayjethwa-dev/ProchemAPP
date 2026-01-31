import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, TextStyle, BackHandler } from 'react-native';
import { Text, Card, IconButton, Divider, useTheme, Avatar, Button } from 'react-native-paper';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { doc, onSnapshot, query, collection, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { Order } from '../types';

export default function OrderTracking() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAppStore();
  
  // Get Order ID from navigation params
  const { orderId: paramOrderId } = route.params || {};

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ FIX: Custom Back Navigation Handler
  // Navigates to Home instead of going back to Checkout/Cart
  const handleBackNavigation = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'BuyerApp',
            state: {
              routes: [{ name: 'BuyerTabs', params: { screen: 'HomeTab' } }],
            },
          },
        ],
      })
    );
    // Fallback if reset doesn't work in your specific stack structure:
    // navigation.navigate('BuyerApp', { screen: 'BuyerTabs', params: { screen: 'HomeTab' } });
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

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#004AAD" /></View>;
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Avatar.Icon size={80} icon="package-variant" style={{backgroundColor:'#F1F5F9'}} color="#999" />
        <Text variant="headlineSmall" style={{color:'#999', marginTop:20, fontWeight:'bold'}}>No Active Orders</Text>
        <Button mode="contained" onPress={handleBackNavigation} style={{marginTop:20}}>Start Shopping</Button>
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
          <Text variant="headlineSmall" style={{fontWeight:'bold'}}>Track Order</Text>
        </View>
        <Card style={[styles.card, {backgroundColor: '#FFEBEE', borderColor: '#EF5350', borderWidth: 1}]}>
          <Card.Content style={{alignItems:'center', padding: 30}}>
            <Avatar.Icon size={60} icon="alert-circle" style={{backgroundColor:'#EF5350'}} />
            <Text variant="headlineSmall" style={{color:'#D32F2F', fontWeight:'bold', marginTop:10}}>{order.status}</Text>
            <Text style={{textAlign:'center', color:'#C62828', marginTop:5}}>
              {order.status === 'CANCELLED' ? 'Order cancelled.' : 'Documents rejected by Admin.'}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* ✅ FIX: Use Custom Back Handler */}
        <IconButton icon="arrow-left" onPress={handleBackNavigation} />
        <Text variant="headlineSmall" style={{fontWeight:'bold'}}>Track Shipment</Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
        <Card style={styles.banner}>
          <Card.Content>
             <Text style={{color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:'bold', letterSpacing:1}}>
               ORDER ID: {order.id.slice(0,8).toUpperCase()}
             </Text>
             <Text variant="headlineMedium" style={{color:'white', fontWeight:'bold', marginTop:5}}>
               {order.status.replace('_', ' ')}
             </Text>
             <Text style={{color:'white', opacity:0.9}}>{new Date(order.createdAt).toDateString()}</Text>
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
                <View style={{alignItems:'center', width: 40}}>
                  <IconButton icon={icon} iconColor={iconColor} size={24} style={{margin:0}} />
                  {!isLast && <View style={[styles.line, {backgroundColor: status === 'completed' ? lineColor : '#E0E0E0'}]} />}
                </View>
                <View style={{flex:1, paddingBottom: 30, justifyContent:'center'}}>
                   <Text variant="titleMedium" style={titleStyle}>{step.title}</Text>
                   <Text variant="bodySmall" style={{color:'#666'}}>{step.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Card style={styles.detailsCard}>
           <Card.Title title="Order Summary" left={(props) => <Avatar.Icon {...props} icon="receipt" size={40} style={{backgroundColor:'#F1F5F9'}} color="black" />} />
           <Divider />
           <Card.Content style={{marginTop:10}}>
             {order.items.map((item: any, idx: number) => (
                <View key={idx} style={{flexDirection:'row', justifyContent:'space-between', marginBottom:5}}>
                   <Text>{item.name} (x{item.quantity})</Text>
                   <Text style={{fontWeight:'bold'}}>₹{item.pricePerUnit * item.quantity}</Text>
                </View>
             ))}
             <Divider style={{marginVertical:10}} />
             <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                <Text variant="titleMedium" style={{fontWeight:'bold'}}>Total Amount</Text>
                <Text variant="titleMedium" style={{fontWeight:'bold', color:'#004AAD'}}>₹{order.totalAmount}</Text>
             </View>
           </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection:'row', alignItems:'center', padding: 10, backgroundColor:'white', elevation: 2 },
  center: { flex: 1, justifyContent:'center', alignItems:'center', padding: 20 },
  card: { margin: 20 },
  banner: { backgroundColor: '#004AAD', borderRadius: 12, marginBottom: 20 },
  timelineContainer: { paddingLeft: 10 },
  stepRow: { flexDirection: 'row' },
  line: { width: 2, flex: 1, marginVertical: 4 },
  detailsCard: { backgroundColor: 'white', marginTop: 10, marginBottom: 30 }
});