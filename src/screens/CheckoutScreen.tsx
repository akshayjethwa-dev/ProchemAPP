import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, BackHandler, Platform } from 'react-native';
import { Text, Card, Button, Divider, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { placeOrder } from '../services/orderService';
import { Address } from '../types';

// ⚠️ REPLACE WITH YOUR ACTUAL RAZORPAY KEY ID
const RAZORPAY_KEY_ID = 'rzp_test_SAMhkX5Fl1FrAf'; 

// Conditionally require native module to prevent Web Crashes
let RazorpayCheckout: any = null;
if (Platform.OS !== 'web') {
  RazorpayCheckout = require('react-native-razorpay').default;
}

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { cart, user, clearCart } = useAppStore();
  
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  // --- NAVIGATION HANDLERS ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <IconButton icon="arrow-left" onPress={() => navigation.navigate('BuyerTabs', { screen: 'HomeTab' })} />
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const backAction = () => {
      navigation.navigate('BuyerTabs', { screen: 'HomeTab' });
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // --- FINANCIAL CALCULATIONS ---
  const productTotal = cart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  const gstAmount = productTotal * 0.18; 
  const subTotalWithTax = productTotal + gstAmount;
  const platformFee = subTotalWithTax * 0.02; 
  const finalPayableAmount = subTotalWithTax + platformFee;

  useEffect(() => {
    if (route.params?.selectedAddress) {
      setSelectedAddress(route.params.selectedAddress);
    } else if (user?.addresses && user.addresses.length > 0) {
      setSelectedAddress(user.addresses[0]); 
    } else if (user?.address) {
      setSelectedAddress({ id: 'legacy', label: 'Default', street: user.address, city: '', state: '', zipCode: '', country: 'India' });
    }
  }, [user, route.params]);

  // ✅ HELPER: Load Razorpay Script for Web
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (Platform.OS !== 'web') {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please add a delivery address.');
      return;
    }

    setLoading(true);

    const options = {
      description: 'Chemical Purchase',
      image: 'https://cdn-icons-png.flaticon.com/512/2965/2965335.png',
      currency: 'INR',
      key: RAZORPAY_KEY_ID,
      amount: (finalPayableAmount * 100).toFixed(0), 
      name: 'ProChem Marketplace',
      prefill: {
        email: user?.email || 'buyer@example.com',
        contact: user?.phone || '9999999999',
        name: user?.companyName || 'Buyer'
      },
      theme: { color: '#004AAD' },
      // Handler for Web Success
      handler: function (response: any) {
        console.log('Web Payment Success:', response.razorpay_payment_id);
        createOrderInBackend(response.razorpay_payment_id);
      }
    };

    // 🌐 WEB PAYMENT FLOW
    if (Platform.OS === 'web') {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        Alert.alert('Error', 'Razorpay SDK failed to load. Check internet connection.');
        setLoading(false);
        return;
      }

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function (response: any){
          Alert.alert('Payment Failed', response.error.description);
          setLoading(false);
      });
      paymentObject.open();
    } 
    // 📱 MOBILE APP PAYMENT FLOW
    else {
      if (RazorpayCheckout) {
        RazorpayCheckout.open(options)
          .then(async (data: any) => {
            console.log('Native Payment Success:', data.razorpay_payment_id);
            await createOrderInBackend(data.razorpay_payment_id);
          })
          .catch((error: any) => {
            setLoading(false);
            if (error.code && error.code !== 0) {
              Alert.alert('Payment Failed', error.description || 'Something went wrong');
            }
          });
      } else {
        Alert.alert("Configuration Error", "Native Payment Module Missing");
        setLoading(false);
      }
    }
  };

  const createOrderInBackend = async (paymentId: string) => {
    try {
      const orderId = await placeOrder({
        buyerId: user!.uid,
        sellerId: cart[0].sellerId,
        items: cart,
        totalAmount: finalPayableAmount,
        subTotal: productTotal,
        taxAmount: gstAmount,
        platformFeeBuyer: platformFee, 
        shippingAddress: JSON.stringify(selectedAddress),
        status: 'PENDING_SELLER', 
        paymentStatus: 'completed',
        paymentId: paymentId,
        createdAt: new Date().toISOString(),
        date: new Date().toISOString(),
      });
      
      clearCart();
      setLoading(false);
      navigation.navigate('OrderTracking', { orderId: orderId });

    } catch (error) {
      console.error(error);
      setLoading(false);
      Alert.alert('Order Error', 'Payment received but order creation failed.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Delivery Location" left={(props) => <Text {...props}>📍</Text>} />
        <Card.Content>
          {selectedAddress ? (
            <View>
              <Text style={{fontWeight:'bold'}}>{selectedAddress.label}</Text>
              <Text>{selectedAddress.street}, {selectedAddress.city}</Text>
            </View>
          ) : (
            <Text style={{color:'orange'}}>No address selected</Text>
          )}
          <Button mode="text" onPress={() => navigation.navigate('AddressList', { selectable: true })}>
            {selectedAddress ? 'Change' : 'Add Address'}
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Bill Details" />
        <Card.Content>
           {cart.map((item) => (
             <View key={item.id} style={styles.row}>
                <Text style={{flex:1}}>{item.name} x {item.quantity}</Text>
                <Text>₹{(item.pricePerUnit * item.quantity).toFixed(2)}</Text>
             </View>
           ))}
           <Divider style={{marginVertical: 10}} />
           
           <View style={styles.row}>
             <Text style={{color:'#666'}}>Item Total</Text>
             <Text>₹{productTotal.toFixed(2)}</Text>
           </View>
           <View style={styles.row}>
             <Text style={{color:'#666'}}>GST (18%)</Text>
             <Text>₹{gstAmount.toFixed(2)}</Text>
           </View>
           <View style={[styles.row, {backgroundColor: '#F0F9FF', padding: 4, borderRadius: 4, marginTop: 4}]}>
             <Text style={{color:'#004AAD', fontWeight:'bold'}}>Platform Fee (2%)</Text>
             <Text style={{color:'#004AAD', fontWeight:'bold'}}>₹{platformFee.toFixed(2)}</Text>
           </View>
           <Divider style={{marginVertical: 10}} />
           <View style={styles.row}>
              <Text variant="titleMedium" style={{fontWeight:'bold'}}>Total Payable</Text>
              <Text variant="titleMedium" style={{fontWeight:'bold', color:'#004AAD'}}>₹{finalPayableAmount.toFixed(2)}</Text>
           </View>
        </Card.Content>
      </Card>

      <Button 
        mode="contained" 
        onPress={handlePayment} 
        loading={loading}
        disabled={loading}
        style={{backgroundColor: '#004AAD', marginTop: 10}} 
        contentStyle={{height: 50}}
        icon="check-decagram"
      >
        Pay Now
      </Button>
      
      <Text style={{textAlign:'center', color:'#999', fontSize:10, marginTop: 10, marginBottom: 30}}>
        Secured by Razorpay • NetBanking / NEFT / Cards
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#F8FAFC', flexGrow: 1 },
  card: { marginBottom: 16, backgroundColor: 'white', borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems:'center' }
});