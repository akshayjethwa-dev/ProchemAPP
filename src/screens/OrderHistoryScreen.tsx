import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Linking, Alert } from 'react-native';
import { Text, SegmentedButtons, Card, Button, Chip, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { Order } from '../types';

export default function OrderHistoryScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { user } = useAppStore();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active'); 

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(data);
      setLoading(false);
    }, (error) => {
      console.error("Buyer order fetch error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const activeStatuses = ['PENDING_SELLER', 'PENDING_ADMIN', 'ACCEPTED', 'SHIPPED', 'PENDING', 'IN_TRANSIT'];
  const pastStatuses = ['DELIVERED', 'CANCELLED', 'REJECTED', 'RETURNED'];

  const filteredOrders = orders.filter(o => {
    const status = o.status?.toUpperCase() || ''; 
    if (tab === 'active') return activeStatuses.includes(status);
    if (tab === 'past') return pastStatuses.includes(status);
    return true; 
  });

  const formatDate = (date: any) => {
    if (!date) return '';
    try {
        if (typeof date === 'string') return new Date(date).toDateString();
        if (date.seconds) return new Date(date.seconds * 1000).toDateString();
    } catch(e) { return '' }
    return '';
  };

  // ✅ UPDATED: Open WhatsApp for Invoice Request
  const handleRequestInvoice = async (order: Order) => {
    const phoneNumber = '+918460852903'; // REPLACE with your Admin/Support WhatsApp Number
    const message = `Hello, I need the invoice for Order #${order.id.slice(0,6).toUpperCase()}.`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${phoneNumber}`;

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp not installed', 'Please contact support at support@prochem.com');
    }
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <Card 
      style={styles.card} 
      onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
    >
      <Card.Content>
        <View style={styles.row}>
          <Text style={{fontWeight:'bold'}}>Order #{item.id.slice(0, 6).toUpperCase()}</Text>
          <Chip 
            compact 
            textStyle={{fontSize:10, fontWeight:'bold'}} 
            style={{backgroundColor: theme.colors.surfaceVariant}}
          >
            {item.status?.replace('_', ' ') || 'UNKNOWN'}
          </Chip>
        </View>
        
        <Text style={{color:'#666', marginTop: 4, fontWeight:'bold'}}>
          ₹{item.totalAmount}
        </Text>
        <Text style={{color:'#888', fontSize:12}}>
          {formatDate(item.createdAt)} • {item.items?.length || 0} Items
        </Text>
        
        <View style={{flexDirection:'row', marginTop: 12, justifyContent: 'flex-end', gap: 10}}>
          {/* ✅ UPDATED BUTTON ACTION */}
          <Button 
            mode="outlined" 
            compact 
            icon="whatsapp" 
            onPress={() => handleRequestInvoice(item)}
          >
            Request Invoice
          </Button>

          {activeStatuses.includes(item.status?.toUpperCase()) && (
             <Button 
               mode="contained" 
               compact 
               onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
             >
               Track
             </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{fontWeight:'bold'}}>My Purchases</Text>
      </View>
      
      <View style={{paddingHorizontal: 16, paddingBottom: 10}}>
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'active', label: 'Active' },
            { value: 'past', label: 'History' },
          ]}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#004AAD" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={item => item.id}
          contentContainerStyle={{padding: 16}}
          ListEmptyComponent={
            <View style={{alignItems:'center', marginTop:50}}>
              <Text style={{color:'#999'}}>No orders found in {tab} tab.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20 },
  card: { marginBottom: 12, backgroundColor: 'white', elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});