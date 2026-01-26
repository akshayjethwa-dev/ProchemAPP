import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, Platform } from 'react-native'; // ✅ Added Platform
import { Text, Button, Card, List, IconButton } from 'react-native-paper';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { adminVerifyOrder } from '../../services/orderService';
import { Order } from '../../types';

export default function AdminOrderVerification() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Only fetch orders waiting for Admin
    const q = query(collection(db, 'orders'), where('status', '==', 'PENDING_ADMIN'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
    return unsubscribe;
  }, []);

  const handleVerify = async (orderId: string, approved: boolean) => {
    // ✅ FIX: Web Compatibility Check
    if (Platform.OS === 'web') {
      const message = approved 
        ? 'Approve Order: Mark this order as Accepted and notify the buyer?' 
        : 'Reject Order: Reject this order documentation?';
      
      if (window.confirm(message)) {
        await adminVerifyOrder(orderId, approved);
      }
    } else {
      // Mobile Native Alert
      Alert.alert(
        approved ? 'Approve Order' : 'Reject Order',
        approved ? 'Mark this order as Accepted and notify the buyer?' : 'Reject this order documentation?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Confirm', 
            onPress: async () => await adminVerifyOrder(orderId, approved) 
          }
        ]
      );
    }
  };

  const renderItem = ({ item }: { item: Order }) => (
    <Card style={{ margin: 10, borderColor: '#FFA000', borderWidth: 1, backgroundColor: 'white' }}>
      <Card.Title 
        title={`Verification Request`} 
        subtitle={`Order ID: ${item.id.slice(0, 6)}`}
        left={(props) => <IconButton {...props} icon="shield-alert" iconColor="#FFA000" />}
      />
      <Card.Content>
        <Text style={{fontWeight:'bold', marginBottom: 5}}>Submitted Documents:</Text>
        {/* ✅ FIX: Add fallback text if docs are missing to prevent crashes */}
        <List.Item title="Quality Report" description={item.sellerDocuments?.qualityReport || 'N/A'} left={() => <List.Icon icon="file-check" />} />
        <List.Item title="Purity" description={item.sellerDocuments?.purityCertificate || 'N/A'} left={() => <List.Icon icon="flask" />} />
        <List.Item title="Grade" description={item.sellerDocuments?.gradeSheet || 'N/A'} left={() => <List.Icon icon="star-circle" />} />
      </Card.Content>
      <Card.Actions>
        <Button textColor="red" onPress={() => handleVerify(item.id, false)}>Reject</Button>
        <Button mode="contained" buttonColor="#2E7D32" onPress={() => handleVerify(item.id, true)}>
          Verify & Accept
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{padding:16}}>
         <Text variant="headlineSmall" style={{fontWeight:'bold'}}>Pending Verification</Text>
         <Text style={{color:'#666'}}>Orders waiting for compliance check</Text>
      </View>
      <FlatList 
        data={orders} 
        renderItem={renderItem} 
        keyExtractor={i => i.id}
        ListEmptyComponent={<Text style={{padding:20, textAlign:'center', color:'#999'}}>No pending verifications.</Text>}
      />
    </View>
  );
}