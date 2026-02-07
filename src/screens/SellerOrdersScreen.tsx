import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, Modal, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text, Button, Card, Divider, TextInput, Chip, SegmentedButtons, IconButton, useTheme, ActivityIndicator, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import * as DocumentPicker from 'expo-document-picker'; 
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { sellerAcceptOrder, sellerDeclineOrder } from '../services/orderService';
import { Order } from '../types';

export default function SellerOrdersScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAppStore();
  const theme = useTheme();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('requests'); 

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  
  const [docs, setDocs] = useState({ 
    qualityFile: null as any, 
    purity: '', 
    grade: '' 
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(data);
      setLoading(false);
    }, (error) => {
      console.error("Seller Order Query Error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const pendingOrders = orders.filter(o => o.status === 'PENDING_SELLER');
  const historyOrders = orders.filter(o => o.status !== 'PENDING_SELLER');

  const handleAcceptClick = (order: Order) => {
    setSelectedOrder(order);
    setShowDocModal(true);
  };

  const handleDecline = (orderId: string) => {
    Alert.alert(
      'Decline Order',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: async () => await sellerDeclineOrder(orderId) }
      ]
    );
  };

  // ✅ UPDATED: Open WhatsApp for Invoice Request
  const handleRequestInvoice = async (order: Order) => {
    const phoneNumber = '+918460852903'; // REPLACE with your Admin/Support WhatsApp Number
    const message = `Hello, I need the Seller Invoice for Order #${order.id.slice(0,6).toUpperCase()}.`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${phoneNumber}`;
    
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('WhatsApp not installed', 'Please contact support.');
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.assets && result.assets.length > 0) {
        setDocs({ ...docs, qualityFile: result.assets[0] });
      }
    } catch (err) { console.error("Error: ", err); }
  };

  const uploadFileToStorage = async (file: any) => {
    return new Promise<string>((resolve) => {
      setTimeout(() => resolve(`https://mock-url.com/${file.name}`), 1000);
    });
  };

  const submitDocuments = async () => {
    if (!selectedOrder) return;
    if (!docs.qualityFile || !docs.purity || !docs.grade) {
      Alert.alert('Missing Info', 'Please fill all fields and upload document.');
      return;
    }
    setSubmitting(true);
    try {
      const fileUrl = await uploadFileToStorage(docs.qualityFile);
      await sellerAcceptOrder(selectedOrder.id, {
        qualityReport: fileUrl,     
        fileName: docs.qualityFile.name, 
        purityCertificate: docs.purity,
        gradeSheet: docs.grade
      });
      setShowDocModal(false);
      setDocs({ qualityFile: null, purity: '', grade: '' });
      Alert.alert('Success', 'Order accepted!');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const isRequest = item.status === 'PENDING_SELLER';
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text variant="titleMedium" style={{fontWeight:'bold'}}>Order #{item.id.slice(0,6).toUpperCase()}</Text>
            <Text variant="bodySmall" style={{color:'#666'}}>{new Date(item.createdAt).toDateString()}</Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
             <Chip 
               compact 
               style={{backgroundColor: isRequest ? '#FFF3E0' : '#E8F5E9', marginBottom: 4}} 
               textStyle={{color: isRequest ? '#E65100' : '#2E7D32', fontWeight:'bold', fontSize:10}}
             >
               {item.status.replace('_', ' ')}
             </Chip>
             {/* ✅ UPDATED LINK ACTION */}
             <TouchableOpacity onPress={() => handleRequestInvoice(item)}>
               <Text style={{color: '#004AAD', fontSize: 12, fontWeight:'bold', textDecorationLine: 'underline'}}>
                 Request Invoice
               </Text>
             </TouchableOpacity>
          </View>
        </View>
        <Divider style={{marginVertical: 10}} />
        <Card.Content style={{paddingHorizontal:0}}>
           {item.items.map((prod, idx) => (
             <View key={idx} style={styles.productRow}>
               <Text style={{fontWeight:'bold', flex:1}}>{prod.name}</Text>
               <Text style={{color:'#666'}}>{prod.quantity} {prod.unit}</Text>
               <Text style={{fontWeight:'bold', color: theme.colors.primary, marginLeft:10}}>₹{prod.pricePerUnit * prod.quantity}</Text>
             </View>
           ))}
           <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:15}}>
             <Text style={{fontWeight:'bold'}}>Total Payout</Text>
             <Text variant="titleMedium" style={{fontWeight:'bold', color: theme.colors.primary}}>₹{item.totalAmount}</Text>
           </View>
        </Card.Content>
        {isRequest && (
          <Card.Actions style={{paddingHorizontal:0, marginTop:10}}>
             <Button mode="outlined" textColor="#D32F2F" style={{flex:1, marginRight:8}} onPress={() => handleDecline(item.id)}>Decline</Button>
             <Button mode="contained" style={{flex:1, marginLeft:8}} onPress={() => handleAcceptClick(item)}>Accept</Button>
          </Card.Actions>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{fontWeight:'bold'}}>Manage Orders</Text>
      </View>

      <View style={{paddingHorizontal: 16, paddingBottom: 10}}>
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'requests', label: `Requests (${pendingOrders.length})` },
            { value: 'history', label: 'History' },
          ]}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{marginTop:50}} size="large" color="#004AAD" />
      ) : (
        <FlatList 
          data={tab === 'requests' ? pendingOrders : historyOrders}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          contentContainerStyle={{padding: 16, paddingBottom: 80}}
          ListEmptyComponent={
            <View style={{alignItems:'center', marginTop: 50}}>
              <Text style={{color:'#999'}}>{tab === 'requests' ? 'No new requests.' : 'No history found.'}</Text>
            </View>
          }
        />
      )}

      {/* DOCUMENT UPLOAD MODAL */}
      <Modal visible={showDocModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="titleLarge" style={{fontWeight:'bold', marginBottom: 20}}>Upload Documents</Text>
            
            <View style={styles.uploadArea}>
              {docs.qualityFile ? (
                <View style={styles.filePreview}>
                   <Text numberOfLines={1}>{docs.qualityFile.name}</Text>
                   <IconButton icon="close-circle" iconColor="red" onPress={() => setDocs({...docs, qualityFile: null})} />
                </View>
              ) : (
                <TouchableOpacity onPress={pickDocument} style={styles.uploadBtn}>
                  <Text style={{color:'#004AAD'}}>Click to Upload Quality Report</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput label="Purity (%)" value={docs.purity} onChangeText={t => setDocs({...docs, purity: t})} mode="outlined" style={styles.input} />
            <TextInput label="Grade" value={docs.grade} onChangeText={t => setDocs({...docs, grade: t})} mode="outlined" style={styles.input} />

            <View style={{flexDirection:'row', justifyContent:'flex-end', marginTop: 10}}>
              <Button onPress={() => setShowDocModal(false)}>Cancel</Button>
              <Button mode="contained" onPress={submitDocuments} loading={submitting}>Submit</Button>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor:'white', borderBottomWidth:1, borderBottomColor:'#eee' },
  card: { backgroundColor: 'white', marginBottom: 15, padding: 15, borderRadius: 12, elevation: 2 },
  cardHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' },
  productRow: { flexDirection:'row', justifyContent:'space-between', marginBottom: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 16 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  uploadArea: { marginBottom: 15 },
  uploadBtn: { borderStyle:'dashed', borderWidth:1, borderColor:'#004AAD', borderRadius:10, padding:20, alignItems:'center', backgroundColor:'#F5F9FF' },
  filePreview: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:10, backgroundColor:'#F5F5F5', borderRadius:10 }
});