import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, IconButton, Surface, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { createOrder } from '../services/orderService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

export default function CartScreen() {
  // ✅ Explicitly typed navigation
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const { cart, removeFromCart, clearCart, user } = useAppStore();
  const [loading, setLoading] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to checkout');
      // ✅ Explicit cast to avoid overload errors if params are strictly checked
      navigation.navigate('Login' as any);
      return;
    }

    setLoading(true);
    try {
      const sellerId = cart[0]?.sellerId;
      
      await createOrder({
        buyerId: user.uid,
        sellerId: sellerId,
        items: cart.map(i => ({
          productId: i.id,
          productName: i.name,
          quantity: i.quantity,
          pricePerUnit: i.pricePerUnit,
          total: i.pricePerUnit * i.quantity
        })),
        totalAmount: total,
        status: 'pending',
        shippingAddress: (user as any).address || 'Default Address'
      });

      clearCart();
      Alert.alert('Success', 'Order placed successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemImage}>
        <Text style={{fontSize: 24}}>🧪</Text>
      </View>
      <View style={styles.itemDetails}>
        <Text variant="titleMedium" style={{fontWeight:'bold'}}>{item.name}</Text>
        <Text variant="bodySmall" style={{color: '#666'}}>
          {item.quantity} {item.unit} x ₹{item.pricePerUnit}
        </Text>
        <Text variant="titleMedium" style={{color: theme.colors.primary, fontWeight:'bold', marginTop: 4}}>
          ₹{item.quantity * item.pricePerUnit}
        </Text>
      </View>
      <IconButton 
        icon="delete-outline" 
        iconColor="red" 
        onPress={() => removeFromCart(item.id)} 
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineSmall" style={{fontWeight:'bold'}}>My Cart</Text>
      </View>

      <FlatList
        data={cart}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="headlineSmall">🛒</Text>
            <Text style={{marginTop: 10}}>Your cart is empty</Text>
          </View>
        }
      />

      {cart.length > 0 && (
        <Surface style={styles.footer} elevation={4}>
          <View style={styles.summaryRow}>
            <Text>Subtotal</Text>
            <Text>₹{subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>GST (18%)</Text>
            <Text>₹{gst.toLocaleString()}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 8 }]}>
            <Text variant="titleMedium" style={{fontWeight:'bold'}}>Total</Text>
            <Text variant="titleMedium" style={{fontWeight:'bold', color: theme.colors.primary}}>
              ₹{total.toLocaleString()}
            </Text>
          </View>
          
          <Button 
            mode="contained" 
            onPress={handleCheckout} 
            loading={loading}
            style={styles.checkoutBtn}
            contentStyle={{height: 50}}
          >
            Place Order
          </Button>
        </Surface>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'white' },
  list: { padding: 16 },
  itemContainer: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center' },
  itemImage: { width: 60, height: 60, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  itemDetails: { flex: 1 },
  footer: { padding: 24, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  checkoutBtn: { marginTop: 16, borderRadius: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 }
});