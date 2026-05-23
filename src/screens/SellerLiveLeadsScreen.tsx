// src/screens/SellerLiveLeadsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, Button, Portal, Modal, TextInput, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BroadcastLead, RFQ } from '../types';

export default function SellerLiveLeadsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAppStore();
  
  const [rawLeads, setRawLeads] = useState<BroadcastLead[]>([]);
  const [activeRfqs, setActiveRfqs] = useState<RFQ[]>([]);
  const [leads, setLeads] = useState<BroadcastLead[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedLead, setSelectedLead] = useState<BroadcastLead | null>(null);
  const [quotesUsedThisMonth, setQuotesUsedThisMonth] = useState(0);
  const isPremium = user?.subscriptionTier === 'GROWTH_PACKAGE';

  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [dispatchDays, setDispatchDays] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);

    const unsubLeads = onSnapshot(query(collection(db, 'broadcastLeads'), where('status', '==', 'OPEN')), snap => {
      setRawLeads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BroadcastLead)));
    });

    const unsubRfqs = onSnapshot(query(collection(db, 'rfqs'), where('sellerId', '==', user.uid)), snap => {
      setActiveRfqs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RFQ)).filter(rfq => rfq.status === 'PENDING' || rfq.status === 'NEGOTIATING'));
    });

    const unsubQuotes = onSnapshot(query(collection(db, 'supplierQuotes'), where('supplierId', '==', user.uid)), snap => {
      const now = new Date();
      setQuotesUsedThisMonth(snap.docs.filter(doc => {
        const data = doc.data();
        if (!data.createdAt) return false;
        const dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        return dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
      }).length);
      setLoading(false);
    });

    return () => { unsubLeads(); unsubRfqs(); unsubQuotes(); };
  }, [user?.uid]);

  useEffect(() => {
    const filtered = rawLeads.filter(lead => {
      if (lead.excludedSellerId === user?.uid) return false;
      if (user?.uid && lead.excludedSellerIds && lead.excludedSellerIds.includes(user.uid)) return false;
      const isNegotiating = activeRfqs.some(rfq => 
        (lead.rfqId && lead.rfqId === rfq.id) || 
        (lead.originalOrderId && lead.originalOrderId === rfq.id) || 
        (rfq.productName.toLowerCase() === lead.productName.toLowerCase() && String(rfq.targetQuantity) === String(lead.quantityRequired))
      );
      return !isNegotiating;
    });
    setLeads(filtered);
  }, [rawLeads, activeRfqs, user?.uid]);

  const submitQuote = async () => {
    if (!user?.uid || !selectedLead?.id) return Alert.alert('Error', 'Missing information.');
    if (!price || !quantity || !dispatchDays) return Alert.alert('Error', 'Fill all fields.');

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'supplierQuotes'), {
        leadId: selectedLead.id, productName: selectedLead.productName, supplierId: user.uid,
        supplierName: user.companyName || 'Verified Supplier', pricePerUnit: Number(price),
        availableQuantity: quantity, dispatchDays: dispatchDays, status: 'PENDING', createdAt: serverTimestamp(),
      });
      Alert.alert('Success', 'Quote sent to Admin.');
      setSelectedLead(null); setPrice(''); setQuantity(''); setDispatchDays('');
    } catch (error) { Alert.alert('Error', 'Failed to submit quote.'); } 
    finally { setIsSubmitting(false); }
  };

  const renderLead = ({ item }: { item: BroadcastLead }) => (
    <View style={styles.compactRow}>
      <View style={styles.mainInfo}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
           <Text style={styles.productName}>{item.productName}</Text>
           <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
        </View>
        {/* 🚀 FIX: explicitly casted targetPrice and timeline to any to clear TS error */}
        <Text style={styles.detailsText}>Target: <Text style={{fontWeight: 'bold', color: theme.colors.primary}}>₹{(item as any).targetPrice || 'N/A'}</Text> • Req: {item.quantityRequired} {item.unit}</Text>
        <Text style={styles.metaText}>📍 {item.deliveryRegion} • ⏳ {(item as any).timeline || 'Flexible'}</Text>
      </View>
      <View style={styles.actionCol}>
        {isPremium ? (
          <Button mode="contained" compact labelStyle={{fontSize: 11, marginHorizontal: 10}} style={{backgroundColor: '#10B981', borderRadius: 6}} onPress={() => setSelectedLead(item)}>Quote</Button>
        ) : quotesUsedThisMonth < 3 ? (
          <Button mode="contained" compact labelStyle={{fontSize: 11, marginHorizontal: 10}} style={{backgroundColor: '#10B981', borderRadius: 6}} onPress={() => setSelectedLead(item)}>
            Quote <Text style={{fontSize: 9, color: 'white'}}>({3 - quotesUsedThisMonth} left)</Text>
          </Button>
        ) : (
          <Button mode="contained" compact labelStyle={{fontSize: 10, marginHorizontal: 10}} style={{backgroundColor: '#F59E0B', borderRadius: 6}} onPress={() => navigation.navigate('BusinessGrowth')}>
            👑 Upgrade
          </Button>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View>
          <Text style={{fontWeight:'bold', fontSize: 18, color: '#1E293B'}}>Live Market Requirements</Text>
          <Text style={{fontSize: 12, color: '#64748B'}}>Submit prices. Quotes go to Admin.</Text>
        </View>
      </View>

      {loading ? (
         <View style={{flex: 1, justifyContent: 'center'}}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id!}
          renderItem={renderLead}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<View style={{alignItems: 'center', marginTop: 50}}><Text style={{color: '#94A3B8'}}>No live requirements right now.</Text></View>}
        />
      )}

      <Portal>
        <Modal visible={!!selectedLead} onDismiss={() => setSelectedLead(null)} contentContainerStyle={styles.modalContent}>
          <Text style={{ fontSize: 18, marginBottom: 15, fontWeight: 'bold' }}>Quote: {selectedLead?.productName}</Text>
          <TextInput label={`Price per ${selectedLead?.unit || 'Unit'} (₹)`} value={price} onChangeText={setPrice} keyboardType="numeric" mode="outlined" style={styles.input} />
          <TextInput label="Quantity you can supply" value={quantity} onChangeText={setQuantity} keyboardType="numeric" mode="outlined" style={styles.input} />
          <TextInput label="Est. Dispatch (e.g., 2 Days)" value={dispatchDays} onChangeText={setDispatchDays} mode="outlined" style={styles.input} />
          <Button mode="contained" onPress={submitQuote} loading={isSubmitting} style={{ marginTop: 15 }}>Send to Admin</Button>
          <Button mode="text" onPress={() => setSelectedLead(null)} style={{ marginTop: 5 }}>Cancel</Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 8 },
  
  compactRow: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1, alignItems: 'center' },
  mainInfo: { flex: 1, paddingRight: 8 },
  productName: { fontWeight: 'bold', fontSize: 14, color: '#1E293B' },
  liveBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  liveText: { fontSize: 9, fontWeight: 'bold', color: '#DC2626' },
  detailsText: { fontSize: 13, color: '#475569', marginBottom: 4 },
  metaText: { fontSize: 11, color: '#94A3B8' },
  
  actionCol: { justifyContent: 'center' },
  
  modalContent: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 16 },
  input: { marginBottom: 10, backgroundColor: 'white' }
});