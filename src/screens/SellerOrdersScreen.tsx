import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, Modal, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, Card, Divider, TextInput, Chip, SegmentedButtons, IconButton, useTheme, ActivityIndicator, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import * as DocumentPicker from 'expo-document-picker'; // ✅ Import Document Picker
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { sellerAcceptOrder, sellerDeclineOrder } from '../services/orderService';
import { Order } from '../types';

export default function SellerOrdersScreen() {
  const { user } = useAppStore();
  const theme = useTheme();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('requests'); 

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  
  // ✅ Updated State to hold the File object
  const [docs, setDocs] = useState({ 
    qualityFile: null as any, // Holds the file object
    purity: '', 
    grade: '' 
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Sort Client-Side (Newest First) to avoid index issues
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

  // ✅ New Helper: Pick Document
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all file types (PDF, Images)
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        setDocs({ ...docs, qualityFile: result.assets[0] });
      }
    } catch (err) {
      console.error("Unknown Error: ", err);
    }
  };

  // ✅ New Helper: Mock Upload (Replace with Real Firebase Storage later)
  const uploadFileToStorage = async (file: any) => {
    // 1. In a real app, you would use: ref(storage, 'path'), uploadBytes, getDownloadURL
    // 2. For now, we simulate a delay and return a fake URL so the flow works.
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(`https://firebasestorage.googleapis.com/v0/b/mock-project/o/${file.name}?alt=media`);
      }, 1500);
    });
  };

  const submitDocuments = async () => {
    if (!selectedOrder) return;
    
    // Validation
    if (!docs.qualityFile) {
      Alert.alert('Missing Document', 'Please upload the Quality Report document.');
      return;
    }
    if (!docs.purity || !docs.grade) {
      Alert.alert('Missing Details', 'Please enter Purity and Grade values.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload File
      const fileUrl = await uploadFileToStorage(docs.qualityFile);

      // 2. Update Order
      await sellerAcceptOrder(selectedOrder.id, {
        qualityReport: fileUrl,     // Save the URL, not the file object
        fileName: docs.qualityFile.name, // Save name for display
        purityCertificate: docs.purity,
        gradeSheet: docs.grade
      });
      
      setShowDocModal(false);
      setDocs({ qualityFile: null, purity: '', grade: '' });
      Alert.alert('Success', 'Order accepted! Documents sent to Admin.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to submit. Please try again.');
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
          <Chip 
            compact 
            style={{backgroundColor: isRequest ? '#FFF3E0' : '#E8F5E9'}} 
            textStyle={{color: isRequest ? '#E65100' : '#2E7D32', fontWeight:'bold', fontSize:10}}
          >
            {item.status.replace('_', ' ')}
          </Chip>
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
           {item.status === 'PENDING_ADMIN' && (
             <View style={styles.infoBox}>
               <Text style={{fontSize:12, color:'#E65100'}}>⏳ Documents Submitted. Waiting for Admin.</Text>
             </View>
           )}
        </Card.Content>
        {isRequest && (
          <Card.Actions style={{paddingHorizontal:0, marginTop:10}}>
             <Button mode="outlined" textColor="#D32F2F" style={{flex:1, marginRight:8, borderColor:'#D32F2F'}} onPress={() => handleDecline(item.id)}>Decline</Button>
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

      {/* ✅ DOCUMENT UPLOAD MODAL */}
      <Modal visible={showDocModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:5}}>
               <Text variant="titleLarge" style={{fontWeight:'bold'}}>Upload Documents</Text>
               <IconButton icon="close" size={20} onPress={() => setShowDocModal(false)} />
            </View>
            
            <Text style={{color:'#666', marginBottom:20, fontSize:13}}>
              Upload the quality report/certificate for Admin approval.
            </Text>

            {/* 1. File Upload Area */}
            <View style={styles.uploadArea}>
              {docs.qualityFile ? (
                <View style={styles.filePreview}>
                  <Avatar.Icon size={40} icon="file-document" style={{backgroundColor:'#E3F2FD'}} color="#004AAD" />
                  <View style={{flex:1, marginLeft:10}}>
                    <Text variant="bodyMedium" numberOfLines={1} style={{fontWeight:'bold'}}>{docs.qualityFile.name}</Text>
                    <Text variant="bodySmall" style={{color:'#666'}}>{(docs.qualityFile.size / 1024).toFixed(0)} KB</Text>
                  </View>
                  <IconButton icon="close-circle" iconColor="red" onPress={() => setDocs({...docs, qualityFile: null})} />
                </View>
              ) : (
                <TouchableOpacity onPress={pickDocument} style={styles.uploadBtn}>
                  <IconButton icon="cloud-upload" size={30} iconColor="#004AAD" />
                  <Text style={{color:'#004AAD', fontWeight:'bold'}}>Click to Upload Quality Report</Text>
                  <Text style={{fontSize:10, color:'#999', marginTop:4}}>PDF, JPG, or PNG</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 2. Metadata Inputs */}
            <Text style={{fontWeight:'bold', marginBottom:8, marginTop:10}}>Verify Values</Text>
            <View style={{flexDirection:'row'}}>
              <TextInput 
                label="Purity (%)" 
                value={docs.purity} 
                onChangeText={t => setDocs({...docs, purity: t})} 
                mode="outlined" 
                keyboardType="numeric"
                style={[styles.input, {flex:1, marginRight:8}]}
              />
              <TextInput 
                label="Grade" 
                value={docs.grade} 
                onChangeText={t => setDocs({...docs, grade: t})} 
                mode="outlined" 
                placeholder="e.g. Technical"
                style={[styles.input, {flex:1}]}
              />
            </View>

            <Button 
              mode="contained" 
              onPress={submitDocuments} 
              loading={submitting} 
              style={{marginTop:15, borderRadius:8}}
              contentStyle={{height:50}}
            >
              Submit & Accept Order
            </Button>
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
  infoBox: { marginTop: 10, padding: 8, backgroundColor: '#FFF3E0', borderRadius: 6, alignSelf:'flex-start' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 16 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  
  // New Upload Styles
  uploadArea: { marginBottom: 15 },
  uploadBtn: { borderStyle:'dashed', borderWidth:1, borderColor:'#004AAD', borderRadius:10, padding:20, alignItems:'center', backgroundColor:'#F5F9FF' },
  filePreview: { flexDirection:'row', alignItems:'center', padding:10, backgroundColor:'#F5F5F5', borderRadius:10, borderLeftWidth:4, borderLeftColor:'#004AAD' }
});