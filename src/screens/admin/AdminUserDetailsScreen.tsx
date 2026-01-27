import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Card, Button, Avatar, Chip, ActivityIndicator, IconButton, SegmentedButtons, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Order, Product } from '../../types';

export default function AdminUserDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user } = route.params || {}; // Safety check

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>No user data provided</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [view, setView] = useState('orders');
  const [stats, setStats] = useState({ totalSpent: 0, totalSales: 0 });

  useEffect(() => { loadDeepData(); }, [user]);

  const loadDeepData = async () => {
    try {
      const buyerQ = query(collection(db, 'orders'), where('buyerId', '==', user.uid));
      const sellerQ = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
      const [buyerSnap, sellerSnap] = await Promise.all([getDocs(buyerQ), getDocs(sellerQ)]);
      
      const buyOrders = buyerSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      const sellOrders = sellerSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      
      const prodQ = query(collection(db, 'products'), where('sellerId', '==', user.uid));
      const prodSnap = await getDocs(prodQ);
      const userProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));

      setOrders([...buyOrders, ...sellOrders]);
      setProducts(userProducts);
      setStats({
        totalSpent: buyOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        totalSales: sellOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
      });
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const toggleVerification = async () => {
    await updateDoc(doc(db, 'users', user.uid), { verified: !user.verified });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{fontWeight:'bold'}}>User Details</Text>
        <Button mode="text" compact onPress={toggleVerification} textColor={user.verified ? 'red' : 'green'}>
          {user.verified ? 'Revoke KYC' : 'Approve KYC'}
        </Button>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 40}}>
        <Card style={styles.card}>
          <Card.Content style={{alignItems:'center'}}>
             <Avatar.Text size={60} label={user.companyName?.[0] || 'U'} style={{backgroundColor: user.verified ? '#2E7D32' : '#F57C00'}} />
             <Text variant="headlineSmall" style={{fontWeight:'bold', marginTop:10}}>{user.companyName}</Text>
             <Text style={{color:'#666'}}>{user.email}</Text>
             <View style={{flexDirection:'row', marginTop:8, gap: 10}}>
                <Chip icon={user.verified ? "check" : "alert"} compact style={{backgroundColor: user.verified ? '#DCFCE7' : '#FFF3E0'}}>
                  {user.verified ? 'Verified' : 'Pending'}
                </Chip>
             </View>
          </Card.Content>
        </Card>

        <View style={styles.statsRow}>
           <Card style={[styles.statCard, {backgroundColor:'#E3F2FD'}]}>
             <Card.Content>
               <Text variant="bodySmall" style={{color:'#004AAD', fontWeight:'bold'}}>TOTAL SPEND</Text>
               <Text variant="titleLarge" style={{fontWeight:'bold'}}>₹{stats.totalSpent.toLocaleString()}</Text>
             </Card.Content>
           </Card>
           <Card style={[styles.statCard, {backgroundColor:'#E8F5E9'}]}>
             <Card.Content>
               <Text variant="bodySmall" style={{color:'#2E7D32', fontWeight:'bold'}}>TOTAL REVENUE</Text>
               <Text variant="titleLarge" style={{fontWeight:'bold'}}>₹{stats.totalSales.toLocaleString()}</Text>
             </Card.Content>
           </Card>
        </View>

        <View style={{paddingHorizontal: 16, marginBottom: 10}}>
          <SegmentedButtons value={view} onValueChange={setView} buttons={[{ value: 'orders', label: 'Orders' }, { value: 'products', label: 'Listings' }]} />
        </View>

        {loading ? <ActivityIndicator /> : (
          <View style={{paddingHorizontal:16}}>
             {view === 'orders' ? orders.map(o => (
                <Card key={o.id} style={{marginBottom:10, backgroundColor:'white'}}>
                  <List.Item title={`Order #${o.id.slice(0,6)}`} description={`₹${o.totalAmount}`} right={() => <Chip compact>{o.status}</Chip>} />
                </Card>
             )) : products.map(p => (
                <Card key={p.id} style={{marginBottom:10, backgroundColor:'white'}}>
                  <List.Item title={p.name} description={`₹${p.pricePerUnit}/${p.unit}`} right={() => <Text>{p.active ? 'Active' : 'Hidden'}</Text>} />
                </Card>
             ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding: 10, backgroundColor:'white' },
  card: { margin: 16, backgroundColor: 'white' },
  statsRow: { flexDirection:'row', paddingHorizontal:16, marginBottom: 20, gap: 10 },
  statCard: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});