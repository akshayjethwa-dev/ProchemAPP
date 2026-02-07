import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, Platform, ScrollView, Modal, StyleSheet } from 'react-native'; 
import { Text, Button, Card, List, IconButton, SegmentedButtons, Chip, Badge, Divider, Menu, Provider } from 'react-native-paper';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { adminVerifyOrder, updateOrderStatus } from '../../services/orderService';
import { Order, OrderStatus } from '../../types';

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING_SELLER', 
  'PENDING_ADMIN', 
  'ACCEPTED', 
  'CANCELLED', 
  'REJECTED', 
  'shipped', 
  'delivered'
];

export default function AdminOrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [viewMode, setViewMode] = useState<'pending' | 'all'>('pending');
  
  // Menu State for Status Change
  const [visibleMenuId, setVisibleMenuId] = useState<string | null>(null);

  useEffect(() => {
    let q;
    if (viewMode === 'pending') {
      // Fetch only Pending Verification
      q = query(collection(db, 'orders'), where('status', '==', 'PENDING_ADMIN'));
    } else {
      // Fetch ALL Orders for Management
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
    return unsubscribe;
  }, [viewMode]);

  // --- HANDLERS ---
  const handleVerify = async (orderId: string, approved: boolean) => {
    if (Platform.OS === 'web') {
      if (window.confirm(approved ? 'Approve this order?' : 'Reject this order?')) {
        await adminVerifyOrder(orderId, approved);
      }
    } else {
      Alert.alert(
        approved ? 'Approve Order' : 'Reject Order',
        approved ? 'Mark as Accepted?' : 'Reject documentation?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: async () => await adminVerifyOrder(orderId, approved) }
        ]
      );
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setVisibleMenuId(null); // Close menu
    try {
      await updateOrderStatus(orderId, newStatus);
      // Optional: Show feedback
      if (Platform.OS === 'web') alert(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  // --- RENDERERS ---
  const renderItem = ({ item }: { item: Order }) => {
    const isPendingVerification = item.status === 'PENDING_ADMIN';

    return (
      <Card style={[styles.card, isPendingVerification && styles.highlightBorder]}>
        <Card.Title 
          title={`Order #${item.id.slice(0, 6).toUpperCase()}`}
          subtitle={`Status: ${item.status}`}
          subtitleStyle={{ color: getStatusColor(item.status), fontWeight:'bold' }}
          right={(props) => (
             <View style={{flexDirection:'row', alignItems:'center'}}>
               {/* STATUS CHANGE MENU */}
               <Menu
                 visible={visibleMenuId === item.id}
                 onDismiss={() => setVisibleMenuId(null)}
                 anchor={
                   <IconButton {...props} icon="pencil-circle" iconColor="#004AAD" onPress={() => setVisibleMenuId(item.id)} />
                 }
               >
                 <Menu.Item title="Change Status To:" disabled />
                 <Divider />
                 {STATUS_OPTIONS.map(status => (
                   <Menu.Item 
                     key={status} 
                     onPress={() => handleStatusChange(item.id, status)} 
                     title={status}
                     style={item.status === status ? {backgroundColor:'#E3F2FD'} : {}}
                   />
                 ))}
               </Menu>
             </View>
          )}
        />
        
        <Card.Content>
          <Text style={{fontSize: 12, color: '#666'}}>Date: {new Date(item.createdAt).toDateString()}</Text>
          <Text style={{fontSize: 12, color: '#666', marginBottom: 5}}>Total: ₹{item.totalAmount?.toFixed(2)}</Text>
          
          {/* Show Documents if present (Mainly for Verification view) */}
          {(item.sellerDocuments || isPendingVerification) && (
            <View style={styles.docContainer}>
              <Text style={{fontWeight:'bold', marginBottom: 5, fontSize: 12}}>Compliance Docs:</Text>
              <View style={{flexDirection:'row', flexWrap:'wrap', gap: 5}}>
                 <Chip icon="file" compact textStyle={{fontSize:10}}>{item.sellerDocuments?.qualityReport ? 'Quality Rep.' : 'Missing'}</Chip>
                 <Chip icon="flask" compact textStyle={{fontSize:10}}>{item.sellerDocuments?.purityCertificate ? 'Purity Cert.' : 'Missing'}</Chip>
              </View>
            </View>
          )}
        </Card.Content>

        {/* Verification Actions (Only show in Pending Verification Mode) */}
        {isPendingVerification && viewMode === 'pending' && (
          <Card.Actions>
            <Button textColor="red" onPress={() => handleVerify(item.id, false)}>Reject</Button>
            <Button mode="contained" buttonColor="#2E7D32" onPress={() => handleVerify(item.id, true)}>
              Verify & Accept
            </Button>
          </Card.Actions>
        )}
      </Card>
    );
  };

  return (
    <Provider>
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        
        {/* HEADER & TOGGLE */}
        <View style={{padding: 16, backgroundColor: 'white', elevation: 2}}>
          <Text variant="headlineSmall" style={{fontWeight:'bold', marginBottom: 10}}>Order Management</Text>
          
          <SegmentedButtons
            value={viewMode}
            onValueChange={val => setViewMode(val as 'pending' | 'all')}
            buttons={[
              {
                value: 'pending',
                label: 'Verification',
                icon: 'shield-alert',
                style: viewMode === 'pending' ? {backgroundColor: '#FFF3E0'} : {}
              },
              {
                value: 'all',
                label: 'All Orders',
                icon: 'format-list-bulleted',
              },
            ]}
          />
        </View>

        <FlatList 
          data={orders} 
          renderItem={renderItem} 
          keyExtractor={i => i.id}
          contentContainerStyle={{padding: 10, paddingBottom: 50}}
          ListEmptyComponent={
            <View style={{padding:40, alignItems:'center'}}>
              <Text style={{color:'#999'}}>No orders found in this category.</Text>
            </View>
          }
        />
      </View>
    </Provider>
  );
}

// Helper to colorize status
const getStatusColor = (status: OrderStatus) => {
  switch(status) {
    case 'PENDING_SELLER': return 'orange';
    case 'PENDING_ADMIN': return '#D84315'; // Deep Orange
    case 'ACCEPTED': return '#2E7D32'; // Green
    case 'delivered': return '#1565C0'; // Blue
    case 'CANCELLED': 
    case 'REJECTED': return 'red';
    default: return 'gray';
  }
};

const styles = StyleSheet.create({
  card: { marginBottom: 12, backgroundColor: 'white', elevation: 1 },
  highlightBorder: { borderColor: '#FF9800', borderWidth: 1.5 },
  docContainer: { marginTop: 10, padding: 8, backgroundColor: '#F5F5F5', borderRadius: 8 }
});