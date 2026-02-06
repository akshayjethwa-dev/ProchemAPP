import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { Text, Button, Card, Chip, Searchbar, TextInput, Divider, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker'; // ✅ Import Picker
import { db } from '../../config/firebase';
import { Order, User } from '../../types';
import { getAllUsers } from '../../services/adminService'; // ✅ Import User Service

export default function AdminPaymentsScreen() {
  const theme = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellers, setSellers] = useState<User[]>([]); // ✅ State for Sellers
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [txId, setTxId] = useState('');
  const [payoutSellerId, setPayoutSellerId] = useState(''); // ✅ State for Selected Seller
  const [modalVisible, setModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loadingSellers, setLoadingSellers] = useState(true);

  useEffect(() => {
    // 1. Fetch Orders
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(data);
    });

    // 2. Fetch Sellers (for the dropdown)
    loadSellers();

    return unsubscribe;
  }, []);

  const loadSellers = async () => {
    try {
      const allUsers = await getAllUsers();
      // Filter only sellers or users who can sell
      const sellerList = allUsers.filter(u => u.userType === 'seller' || u.userType === 'dual');
      setSellers(sellerList);
    } catch (error) {
      console.error("Failed to load sellers", error);
    } finally {
      setLoadingSellers(false);
    }
  };

  const handleOpenPayout = (order: Order) => {
    setSelectedOrder(order);
    setTxId('');
    setPayoutSellerId(order.sellerId); // ✅ Default to current seller
    setModalVisible(true);
  };

  const confirmPayout = async () => {
    if (!selectedOrder || !txId || !payoutSellerId) {
      Alert.alert('Error', 'Please enter Transaction ID and select a Seller');
      return;
    }

    setProcessing(true);
    try {
      // Find the selected seller details to update name if needed
      const selectedSellerUser = sellers.find(s => s.uid === payoutSellerId);
      const newSellerName = selectedSellerUser?.companyName || selectedSellerUser?.businessName || 'Unknown Seller';

      const orderRef = doc(db, 'orders', selectedOrder.id);
      
      await updateDoc(orderRef, {
        sellerPayoutStatus: 'COMPLETED',
        sellerPayoutTxId: txId,
        sellerPayoutDate: new Date().toISOString(),
        
        // ✅ CRITICAL: Update seller info to match who we actually paid
        sellerId: payoutSellerId,
        sellerName: newSellerName 
      });
      
      Alert.alert('Success', `Payment released to ${newSellerName}`);
      setModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update payment status');
    } finally {
      setProcessing(false);
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const isPaid = item.sellerPayoutStatus === 'COMPLETED';

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.row}>
            <Text variant="titleMedium" style={{fontWeight:'bold'}}>Order #{item.id.substring(0,6).toUpperCase()}</Text>
            <Chip 
              icon={isPaid ? "check" : "clock"} 
              style={{ backgroundColor: isPaid ? '#E8F5E9' : '#FFF3E0' }}
              textStyle={{ color: isPaid ? '#2E7D32' : '#E65100', fontSize: 10 }}
            >
              {isPaid ? 'PAID' : 'PENDING'}
            </Chip>
          </View>
          
          <Text style={{color:'#666', fontSize:12, marginBottom:10}}>
            Date: {new Date(item.createdAt).toDateString()}
          </Text>

          <Divider style={{marginVertical: 8}}/>

          {/* Financial Breakdown */}
          <View style={styles.statRow}>
             <Text style={styles.label}>Order Value (Inc Tax)</Text>
             <Text style={styles.value}>₹{(item.subTotal + (item.taxAmount || 0)).toFixed(2)}</Text>
          </View>
          <View style={styles.statRow}>
             <Text style={styles.label}>- Seller Fee (2.5%)</Text>
             <Text style={[styles.value, {color:'#D32F2F'}]}>- ₹{(item.platformFeeSeller || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.statRow}>
             <Text style={styles.label}>- Safety Fee (0.75%)</Text>
             <Text style={[styles.value, {color:'#D32F2F'}]}>- ₹{(item.safetyFee || 0).toFixed(2)}</Text>
          </View>
          
          <Divider style={{marginVertical: 8}}/>
          
          <View style={styles.statRow}>
             <Text style={{fontWeight:'bold', fontSize:16}}>Net Payout</Text>
             <Text style={{fontWeight:'bold', fontSize:16, color: theme.colors.primary}}>
               ₹{(item.payoutAmount || 0).toFixed(2)}
             </Text>
          </View>

          {/* Action Button */}
          {!isPaid && (
            <Button 
              mode="contained" 
              style={{marginTop: 15, backgroundColor: theme.colors.primary}}
              onPress={() => handleOpenPayout(item)}
            >
              Release Payment
            </Button>
          )}

          {isPaid && (
             <Text style={{fontSize:10, color:'#888', marginTop:10, textAlign:'right'}}>
               Ref: {item.sellerPayoutTxId}
             </Text>
          )}

        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{fontWeight:'bold', color:'white'}}>Seller Payouts</Text>
      </View>
      
      <View style={{padding: 16}}>
        <Searchbar
          placeholder="Search Order ID"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={{backgroundColor:'white', marginBottom:10}}
        />
        
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{paddingBottom: 50}}
        />
      </View>

      {/* Payout Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
              <Text variant="headlineSmall" style={{marginBottom:15, fontWeight:'bold'}}>Release Payout</Text>
              
              <Text style={{color:'#666', marginBottom:20}}>
                Transfer <Text style={{fontWeight:'bold', color:'black'}}>₹{(selectedOrder?.payoutAmount || 0).toFixed(2)}</Text>.
              </Text>

              {/* ✅ NEW: Seller Selector */}
              <Text style={{fontWeight:'bold', marginBottom:5}}>Select Recipient Seller:</Text>
              <View style={styles.pickerContainer}>
                {loadingSellers ? (
                  <ActivityIndicator />
                ) : (
                  <Picker
                    selectedValue={payoutSellerId}
                    onValueChange={(itemValue) => setPayoutSellerId(itemValue)}
                  >
                    <Picker.Item label="Select Seller..." value="" />
                    {sellers.map(s => (
                       <Picker.Item 
                         key={s.uid} 
                         label={`${s.companyName || s.businessName || s.email} (${s.uid.slice(0,4)})`} 
                         value={s.uid} 
                       />
                    ))}
                  </Picker>
                )}
              </View>

              <TextInput
                label="Transaction ID / UTR"
                value={txId}
                onChangeText={setTxId}
                mode="outlined"
                style={{marginBottom: 20}}
              />

              <View style={{flexDirection:'row', justifyContent:'flex-end', gap: 10}}>
                <Button mode="text" onPress={() => setModalVisible(false)}>Cancel</Button>
                <Button mode="contained" onPress={confirmPayout} loading={processing}>Confirm</Button>
              </View>
           </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#1E293B', padding: 20 },
  card: { marginBottom: 15, backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label: { color: '#666', fontSize: 13 },
  value: { color: '#333', fontSize: 13, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 12 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 15, height: 50, justifyContent: 'center' }
});