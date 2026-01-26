import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { Text, Button, Card, IconButton, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { placeOrder } from '../services/orderService';
import { CartItem } from '../types';

export default function CartScreen() {
  const navigation = useNavigation<any>();
  const { cart, removeFromCart, clearCart, user } = useAppStore();
  const [loading, setLoading] = useState(false);

  // Helper: Cross-Platform Alert
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const calculateTotal = (items: CartItem[]) => {
    return items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  };

  const subtotal = calculateTotal(cart);
  const gst = subtotal * 0.18; // 18% GST
  const totalAmount = subtotal + gst;

  const handleCheckout = async () => {
    if (!user) {
      showAlert('Login Required', 'Please login to place an order.');
      navigation.navigate('Login');
      return;
    }

    if (cart.length === 0) {
      showAlert('Empty Cart', 'Add items to cart first.');
      return;
    }

    setLoading(true);

    try {
      // 1. Group items by Seller
      const ordersBySeller: { [key: string]: CartItem[] } = {};
      
      cart.forEach(item => {
        const sellerId = item.sellerId || 'unknown';
        if (!ordersBySeller[sellerId]) {
          ordersBySeller[sellerId] = [];
        }
        ordersBySeller[sellerId].push(item);
      });

      // 2. Create Orders & CAPTURE IDs
      const orderPromises = Object.keys(ordersBySeller).map(async (sellerId) => {
        const items = ordersBySeller[sellerId];
        const orderSubtotal = calculateTotal(items);
        const orderGst = orderSubtotal * 0.18;
        const orderTotal = orderSubtotal + orderGst;

        // ✅ This now returns the new Order ID
        return await placeOrder({
          buyerId: user.uid,
          sellerId: sellerId,
          items: items,
          totalAmount: orderTotal,
          status: 'PENDING_SELLER',
          createdAt: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          shippingAddress: user.address || 'Address not provided'
        });
      });

      // Wait for all orders to be created
      const createdOrderIds = await Promise.all(orderPromises);

      // 3. Success & Navigation
      clearCart();
      // showAlert('Request Sent', 'Your order request has been sent to the seller(s).'); // Optional: remove alert to make flow smoother
      
      // ✅ FIX: Pass the FIRST order ID to the tracking screen
      if (createdOrderIds.length > 0) {
        navigation.navigate('OrderTracking', { orderId: createdOrderIds[0] });
      } else {
        navigation.navigate('Home');
      }

    } catch (error: any) {
      console.error("Checkout Error:", error);
      showAlert('Error', 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="headlineSmall" style={{color:'#ccc', marginBottom:10}}>Cart is Empty</Text>
        <Button mode="contained" onPress={() => navigation.navigate('Home')}>Browse Chemicals</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{padding: 16}}>
        <Text variant="headlineSmall" style={{fontWeight:'bold', marginBottom: 20}}>My Cart</Text>
        
        {cart.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Card.Content style={styles.cardRow}>
               <View style={styles.iconBox}><Text style={{fontSize:24}}>🧪</Text></View>
               <View style={{flex:1, paddingHorizontal: 12}}>
                 <Text variant="titleMedium" style={{fontWeight:'bold'}}>{item.name}</Text>
                 <Text variant="bodySmall" style={{color:'#666'}}>{item.quantity} {item.unit} x ₹{item.pricePerUnit}</Text>
                 <Text variant="titleMedium" style={{color:'#004AAD', fontWeight:'bold', marginTop:4}}>
                   ₹{item.pricePerUnit * item.quantity}
                 </Text>
               </View>
               <IconButton icon="delete" iconColor="red" onPress={() => removeFromCart(item.id)} />
            </Card.Content>
          </Card>
        ))}

        <View style={styles.summary}>
          <View style={styles.row}>
             <Text>Subtotal</Text>
             <Text style={{fontWeight:'bold'}}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
             <Text>GST (18%)</Text>
             <Text style={{fontWeight:'bold'}}>₹{gst.toFixed(2)}</Text>
          </View>
          <Divider style={{marginVertical: 10}} />
          <View style={styles.row}>
             <Text variant="titleLarge" style={{fontWeight:'bold'}}>Total</Text>
             <Text variant="titleLarge" style={{fontWeight:'bold', color:'#004AAD'}}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleCheckout} 
          loading={loading}
          style={styles.checkoutBtn}
          contentStyle={{height: 50}}
        >
          Request Order
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  emptyContainer: { flex:1, justifyContent:'center', alignItems:'center' },
  card: { marginBottom: 12, backgroundColor: 'white' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 50, height: 50, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  summary: { marginTop: 20, backgroundColor: 'white', padding: 20, borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  footer: { padding: 16, backgroundColor: 'white', elevation: 10 },
  checkoutBtn: { backgroundColor: '#004AAD', borderRadius: 8 }
});