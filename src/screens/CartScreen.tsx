import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Card, IconButton, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';

export default function CartScreen() {
  const navigation = useNavigation<any>();
  const { cart, removeFromCart, user } = useAppStore();

  const subtotal = cart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  const gst = subtotal * 0.18;
  const totalAmount = subtotal + gst;

  // ✅ FIX: "Browse" button now finds the Home Tab correctly
  const handleBrowse = () => {
    navigation.navigate('BuyerTabs', { screen: 'HomeTab' });
  };

  const handleProceed = () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    // ✅ FIX: Proceed goes to Checkout Screen
    navigation.navigate('Checkout');
  };

  if (cart.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="headlineSmall" style={{color:'#ccc', marginBottom:10}}>Cart is Empty</Text>
        <Button mode="contained" onPress={handleBrowse}>Browse Chemicals</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{padding: 16}}>
        <Text variant="headlineSmall" style={{fontWeight:'bold', marginBottom: 20}}>My Cart</Text>
        {cart.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Card.Content style={{flexDirection:'row', alignItems:'center'}}>
               <View style={styles.iconBox}><Text style={{fontSize:24}}>🧪</Text></View>
               <View style={{flex:1, paddingHorizontal: 12}}>
                 <Text variant="titleMedium" style={{fontWeight:'bold'}}>{item.name}</Text>
                 <Text variant="bodySmall" style={{color:'#666'}}>{item.quantity} {item.unit} x ₹{item.pricePerUnit}</Text>
                 <Text variant="titleMedium" style={{color:'#004AAD', fontWeight:'bold', marginTop:4}}>
                   ₹{(item.pricePerUnit * item.quantity).toFixed(2)}
                 </Text>
               </View>
               <IconButton icon="delete" iconColor="red" onPress={() => removeFromCart(item.id)} />
            </Card.Content>
          </Card>
        ))}

        <View style={styles.summary}>
          <View style={styles.row}><Text>Subtotal</Text><Text style={{fontWeight:'bold'}}>₹{subtotal.toFixed(2)}</Text></View>
          <View style={styles.row}><Text>GST (18%)</Text><Text style={{fontWeight:'bold'}}>₹{gst.toFixed(2)}</Text></View>
          <Divider style={{marginVertical: 10}} />
          <View style={styles.row}>
             <Text variant="titleLarge" style={{fontWeight:'bold'}}>Total</Text>
             <Text variant="titleLarge" style={{fontWeight:'bold', color:'#004AAD'}}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button mode="contained" onPress={handleProceed} style={styles.checkoutBtn} contentStyle={{height: 50}}>
          Proceed to Checkout
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  emptyContainer: { flex:1, justifyContent:'center', alignItems:'center' },
  card: { marginBottom: 12, backgroundColor: 'white' },
  iconBox: { width: 50, height: 50, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  summary: { marginTop: 20, backgroundColor: 'white', padding: 20, borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  footer: { padding: 16, backgroundColor: 'white', elevation: 10 },
  checkoutBtn: { backgroundColor: '#004AAD', borderRadius: 8 }
});