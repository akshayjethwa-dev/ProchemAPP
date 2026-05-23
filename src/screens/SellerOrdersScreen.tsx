// src/screens/SellerOrdersScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, Modal, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text, Button, Divider, TextInput, SegmentedButtons, IconButton, ActivityIndicator } from 'react-native-paper';
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
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('requests'); 

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docs, setDocs] = useState({ qualityFile: null as any, purity: '', grade: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const pendingOrders = orders.filter(o => o.status === 'PENDING_SELLER');
  const historyOrders = orders.filter(o => o.status !== 'PENDING_SELLER');

  const handleAcceptClick = (order: Order) => { setSelectedOrder(order); setShowDocModal(true); };

  const handleDecline = (orderId: string) => {
    Alert.alert('Decline Order', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => await sellerDeclineOrder(orderId) }
    ]);
  };

  const handleRequestInvoice = async (order: Order) => {
    const phoneNumber = '+918460852903';
    const message = `Hello, I need the Seller Invoice for Order #${order.id.slice(0,6).toUpperCase()}.`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${phoneNumber}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('WhatsApp not installed', 'Please contact support.');
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.assets && result.assets.length > 0) setDocs({ ...docs, qualityFile: result.assets[0] });
    } catch (err) { console.error("Error: ", err); }
  };

  const submitDocuments = async () => {
    if (!selectedOrder || !docs.qualityFile || !docs.purity || !docs.grade) {
      Alert.alert('Missing Info', 'Please fill all fields and upload document.'); return;
    }
    setSubmitting(true);
    try {
      const fileUrl = await new Promise<string>((res) => setTimeout(() => res(`https://mock-url.com/${docs.qualityFile.name}`), 1000));
      await sellerAcceptOrder(selectedOrder.id, { qualityReport: fileUrl, fileName: docs.qualityFile.name, purityCertificate: docs.purity, gradeSheet: docs.grade });
      setShowDocModal(false);
      setDocs({ qualityFile: null, purity: '', grade: '' });
      Alert.alert('Success', 'Order accepted!');
    } catch (error) { Alert.alert('Error', 'Failed to submit.'); } 
    finally { setSubmitting(false); }
  };

  const getStatusStyle = (status: string) => {
    if (status === 'PENDING_SELLER') return { bg: '#FEF3C7', text: '#D97706' };
    if (status === 'DELIVERED') return { bg: '#DCFCE7', text: '#16A34A' };
    return { bg: '#F1F5F9', text: '#64748B' };
  };

  const renderItem = ({ item }: { item: Order }) => {
    const isRequest = item.status === 'PENDING_SELLER';
    const status = getStatusStyle(item.status);
    const prodName = item.items[0]?.name || 'Chemical Product';

    return (
      <View style={styles.compactRow}>
        <View style={styles.rowTop}>
          <View style={styles.iconBox}><Text style={{fontSize: 20}}>📦</Text></View>
          <View style={styles.middleCol}>
            <Text style={styles.orderId}>Order #{item.id.slice(-6).toUpperCase()}</Text>
            {/* 🚀 FIX: explicitly checked for buyerName or used fallback */}
            <Text style={styles.buyerText} numberOfLines={1}>{(item as any).buyerName || 'Buyer'} • {new Date(item.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.productText} numberOfLines={1}>{prodName}</Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={styles.priceText}>₹{item.totalAmount}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{item.status.replace('_', ' ')}</Text>
            </View>
          </View>
        </View>

        <Divider style={{marginVertical: 10, backgroundColor: '#F1F5F9'}} />

        <View style={styles.actionRow}>
          {!isRequest && (
            <TouchableOpacity onPress={() => handleRequestInvoice(item)}>
              <Text style={styles.invoiceLink}>Request Invoice</Text>
            </TouchableOpacity>
          )}
          <View style={{flex: 1}} /> 
          {isRequest && (
            <View style={{flexDirection: 'row'}}>
              <Button mode="text" textColor="#D32F2F" compact onPress={() => handleDecline(item.id)}>Decline</Button>
              <Button mode="contained" buttonColor="#10B981" compact style={{marginLeft: 8, borderRadius: 6}} onPress={() => handleAcceptClick(item)}>Accept</Button>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={{fontWeight:'bold', fontSize: 20, color: '#1E293B'}}>Manage Orders</Text>
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
          ListEmptyComponent={<View style={{alignItems:'center', marginTop: 50}}><Text style={{color:'#999'}}>{tab === 'requests' ? 'No new requests.' : 'No history found.'}</Text></View>}
        />
      )}

      {/* DOCUMENT UPLOAD MODAL */}
      <Modal visible={showDocModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{fontSize: 18, fontWeight:'bold', marginBottom: 20}}>Upload Documents</Text>
            <View style={styles.uploadArea}>
              {docs.qualityFile ? (
                <View style={styles.filePreview}>
                   <Text numberOfLines={1} style={{flex: 1}}>{docs.qualityFile.name}</Text>
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
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 8 },
  
  compactRow: { backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 12, elevation: 1 },
  rowTop: { flexDirection: 'row' },
  iconBox: { width: 44, height: 44, backgroundColor: '#F8FAFC', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  middleCol: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  orderId: { fontWeight: 'bold', fontSize: 14, color: '#1E293B' },
  buyerText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  productText: { fontSize: 12, color: '#334155', marginTop: 4, fontWeight: '500' },
  
  rightCol: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  priceText: { fontWeight: 'bold', fontSize: 14, color: '#0F172A', marginBottom: 6 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: 'bold' },

  actionRow: { flexDirection: 'row', alignItems: 'center' },
  invoiceLink: { color: '#004AAD', fontSize: 12, fontWeight:'bold', textDecorationLine: 'underline' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 16 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  uploadArea: { marginBottom: 15 },
  uploadBtn: { borderStyle:'dashed', borderWidth:1, borderColor:'#004AAD', borderRadius:10, padding:20, alignItems:'center', backgroundColor:'#F5F9FF' },
  filePreview: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:10, backgroundColor:'#F5F5F5', borderRadius:10 }
});