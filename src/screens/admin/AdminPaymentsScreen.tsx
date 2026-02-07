import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, ActivityIndicator, Avatar, Divider, Chip } from 'react-native-paper';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Order } from '../../types';

export default function AdminPaymentsScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState({ totalRevenue: 0, grossVolume: 0 });

  useEffect(() => { loadFinancials(); }, []);

  const loadFinancials = async () => {
    try {
      const q = query(collection(db, 'orders'), where('status', 'in', ['delivered', 'shipped', 'ACCEPTED']));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      
      let netRevenue = 0;
      let grossVol = 0;
      data.forEach(order => {
        const orderVal = order.totalAmount || 0;
        grossVol += orderVal;
        
        // ✅ UPDATED: Calculate exact revenue from stored fees
        // Fallback to legacy calc if fees are missing on old orders
        const fees = (order.platformFeeBuyer || 0) + 
                     (order.logisticFee || 0) + 
                     (order.platformFeeSeller || 0) + 
                     (order.safetyFee || 0) + 
                     (order.freightFee || 0);
        
        if (fees > 0) {
          netRevenue += fees;
        } else {
          // Legacy calculation for old orders (approx 4.75%)
          netRevenue += (orderVal * 0.0475);
        }
      });

      setOrders(data);
      setFinancials({ totalRevenue: netRevenue, grossVolume: grossVol });
    } catch (error) { 
      console.error("Payment Error:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.revenueHeader}>
         <Text variant="titleMedium" style={{color:'white', fontWeight:'bold'}}>PLATFORM NET REVENUE</Text>
         <Text variant="displayMedium" style={{color:'white', fontWeight:'bold'}}>₹{financials.totalRevenue.toLocaleString()}</Text>
         <Text style={{color:'rgba(255,255,255,0.7)', marginTop:5}}>Gross Volume: ₹{financials.grossVolume.toLocaleString()}</Text>
      </View>
      {loading ? <ActivityIndicator style={{marginTop: 20}} /> : (
        <FlatList 
          data={orders}
          keyExtractor={i => i.id}
          renderItem={({ item }) => {
            const fees = (item.platformFeeBuyer || 0) + (item.logisticFee || 0) + (item.platformFeeSeller || 0) + (item.safetyFee || 0) + (item.freightFee || 0);
            const revenueDisplay = fees > 0 ? fees : (item.totalAmount! * 0.0475);

            return (
              <Card style={styles.card}>
                <Card.Title 
                  title={`Order #${item.id.slice(0,6).toUpperCase()}`} 
                  subtitle={`Total: ₹${item.totalAmount?.toFixed(2)}`} 
                  right={(props) => <Text {...props} style={{fontWeight:'bold', color:'green', marginRight:16}}>+ ₹{revenueDisplay.toFixed(2)}</Text>} 
                />
              </Card>
            );
          }}
          contentContainerStyle={{padding: 16}}
          ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20, color:'#999'}}>No completed orders found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  revenueHeader: { backgroundColor: '#004AAD', padding: 30, alignItems: 'center', marginBottom: 10 },
  card: { backgroundColor: 'white', marginBottom: 10 }
});