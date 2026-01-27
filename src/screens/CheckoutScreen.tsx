import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { Address } from '../types';
import { placeOrder } from '../services/orderService';

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { cart, user, clearCart } = useAppStore();
  
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  // ✅ FIX: GST Calculation Logic Restored
  const subtotal = cart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  const gstAmount = subtotal * 0.18;
  const finalTotal = subtotal + gstAmount;

  // Load Address Logic
  useEffect(() => {
    if (route.params?.selectedAddress) {
      setSelectedAddress(route.params.selectedAddress);
    } else if (user?.addresses && user.addresses.length > 0) {
      setSelectedAddress(user.addresses[0]); 
    } else if (user?.address) {
      setSelectedAddress({ id: 'legacy', label: 'Default', street: user.address, city: '', state: '', zipCode: '', country: 'India' });
    }
  }, [user, route.params]);

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please add a delivery address.');
      return;
    }

    setLoading(true);
    try {
      // 1. Submit Order
      const orderId = await placeOrder({
        buyerId: user!.uid,
        sellerId: cart[0].sellerId,
        items: cart,
        totalAmount: finalTotal, // ✅ Sends total with GST
        shippingAddress: JSON.stringify(selectedAddress),
        status: 'PENDING_SELLER',
        createdAt: new Date().toISOString(),
        date: new Date().toISOString(),
        paymentStatus: 'pending'
      });
      
      // 2. Clear Cart
      clearCart();

      // 3. ✅ FIX: Navigate DIRECTLY to OrderTracking with the new ID
      // This matches your original flow perfectly.
      navigation.navigate('OrderTracking', { orderId: orderId });

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Address Card */}
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

      {/* Order Summary */}
      <Card style={styles.card}>
        <Card.Title title="Order Summary" />
        <Card.Content>
           {cart.map((item) => (
             <View key={item.id} style={styles.row}>
                <Text style={{flex:1}}>{item.name} x {item.quantity}</Text>
                <Text>₹{(item.pricePerUnit * item.quantity).toFixed(0)}</Text>
             </View>
           ))}
           <Divider style={{marginVertical: 10}} />
           
           {/* ✅ FIX: Display Financial Breakdown */}
           <View style={styles.row}><Text>Subtotal</Text><Text>₹{subtotal.toFixed(2)}</Text></View>
           <View style={styles.row}><Text>GST (18%)</Text><Text>₹{gstAmount.toFixed(2)}</Text></View>
           
           <Divider style={{marginVertical: 10}} />
           <View style={styles.row}>
              <Text variant="titleMedium" style={{fontWeight:'bold'}}>Total Amount</Text>
              <Text variant="titleMedium" style={{fontWeight:'bold', color:'#004AAD'}}>₹{finalTotal.toFixed(2)}</Text>
           </View>
        </Card.Content>
      </Card>

      {/* Confirm Button */}
      <Button 
        mode="contained" 
        onPress={handlePlaceOrder} 
        loading={loading}
        disabled={loading}
        style={{backgroundColor: '#2E7D32', marginTop: 10}}
        contentStyle={{height: 50}}
      >
        Confirm & Place Order
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#F8FAFC', flexGrow: 1 },
  card: { marginBottom: 16, backgroundColor: 'white', borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }
});