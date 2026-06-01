// src/screens/CheckoutScreen.tsx

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, BackHandler, ActivityIndicator } from 'react-native'; 
import { Text, Card, Button, Divider, IconButton, useTheme } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native'; 
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { getFunctions, httpsCallable } from 'firebase/functions';

import { useAppStore } from '../store/appStore';
import { placeOrder, updateOrderStatus } from '../services/orderService';
import { db } from '../config/firebase';
import { Address, User } from '../types';

// ✅ Imports our new multi-platform wrapper
import { startCashfreePayment, removeCashfreeCallback } from '../services/cashfree/CashfreeService';

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

  const [errors, setErrors] = useState({ address: false });

  // --- NAVIGATION HANDLERS ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />,
      title: "Secure Checkout"
    });
  }, [navigation]);

  useEffect(() => {
    const backAction = () => { navigation.goBack(); return true; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => {
      backHandler.remove();
      removeCashfreeCallback(); // ✅ Clean up native listeners on unmount
    };
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
    if (activeCart.length === 0) {
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
  const handlePaymentSuccess = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'PENDING_SELLER'); 
      await updateDoc(doc(db, 'orders', orderId), { paymentStatus: 'completed' });

      if (negotiatedItem && negotiatedItem.customRequirementId) {
        await updateDoc(doc(db, 'customRequirements', negotiatedItem.customRequirementId), {
          status: 'FULFILLED',
          finalOrderId: orderId
        });
      }

      if (!negotiatedItem) {
        clearCart();
      }

      navigation.navigate('PaymentSuccess', {
        orderId: orderId.slice(0, 10).toUpperCase(),
        totalAmount: finalPayableAmount.toFixed(2),
        productName: activeCart.length > 1 ? 'Multiple Products' : activeCart[0]?.name,
        quantity: activeCart[0]?.quantity,
        unit: activeCart[0]?.unit || 'kg',
        buyerName: user?.companyName || user?.businessName || 'Prochem Buyer',
        date: new Date().toLocaleDateString()
      });

    } catch (error) {
      console.error("Error in post-payment logic:", error);
    } finally {
      setLoading(false);
    }
  };


  // --- SUBMIT ORDER & TRIGGER CASHFREE ---
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setErrors({ address: true });
      Alert.alert("Required Fields", "Please select a Delivery Address.");
      return;
    }

    setLoading(true);

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
        paymentMode: 'BANK_TRANSFER', 
        sellerPayoutStatus: 'PENDING',
        paymentReference: 'CASHFREE_GATEWAY', 
        createdAt: new Date().toISOString(),
        date: new Date().toISOString(),
      } as any);

      // 2. Call backend to get Cashfree session
      const functions = getFunctions();
      const createCashfreeOrderFn = httpsCallable(functions, 'createCashfreeOrder');
      
      const response: any = await createCashfreeOrderFn({
        amount: finalPayableAmount.toFixed(2),
        type: 'product',
        referenceId: orderId,
        customerDetails: {
          phone: user?.phoneNumber || "9999999999", 
          email: user?.email || "buyer@prochem.com",
          name: user?.companyName || user?.businessName || "Prochem Buyer"
        }
      });

      const paymentSessionId = response.data.payment_session_id;

      if (!paymentSessionId) {
        throw new Error("Could not retrieve payment session from server.");
      }

      // 3. ✅ Trigger our Multi-Platform Cashfree Wrapper
      await startCashfreePayment(
        paymentSessionId, 
        orderId, 
        handlePaymentSuccess, 
        (error, oid) => {
          console.error("Payment Error:", error);
          setLoading(false);
          // If on web, error.message might be different, fallback to standard message
          Alert.alert("Payment Failed", error?.message || "The payment could not be completed.");
        }
      );

    } catch (error: any) {
      console.error("Order Generation Failure:", error);
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to initialize payment gateway.');
    }
  };

  if (calculatingTax || activeCart.length === 0) {
    return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 1. Address Section */}
      <Card style={[styles.card, errors.address && { borderColor: theme.colors.error, borderWidth: 1 }]}>
        <Card.Title title="Delivery To" left={(props) => <Text {...props}>📍</Text>} />
        <Card.Content>
          {selectedAddress ? (
            <View>
              <Text style={{fontWeight:'bold'}}>{selectedAddress.label}</Text>
              <Text>{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state}</Text>
            </View>
          ) : (
            <Text style={{color: errors.address ? theme.colors.error : 'orange'}}>
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

           <Divider style={{marginVertical: 5}} />
           
           <View style={styles.row}><Text>Platform Fee (1.5%)</Text><Text>₹{platformFeeBuyer.toFixed(2)}</Text></View>
           
           <Divider style={{marginVertical: 10}} />
           <View style={styles.row}>
              <Text variant="titleMedium" style={{fontWeight:'bold'}}>Total Payable</Text>
              <Text variant="titleMedium" style={{fontWeight:'bold', color: theme.colors.primary}}>₹{finalPayableAmount.toFixed(2)}</Text>
           </View>
           
           <Text style={{fontSize: 12, color: '#D97706', marginTop: 10, fontStyle: 'italic', textAlign: 'center'}}>
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
        style={{backgroundColor: theme.colors.primary, marginTop: 10, marginBottom: 30}} 
        contentStyle={{height: 50}}
        icon="shield-check"
      >
        {loading ? 'Processing...' : 'Pay Securely'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#F8FAFC', flexGrow: 1 },
  card: { marginBottom: 16, backgroundColor: 'white', borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems:'center' }
});