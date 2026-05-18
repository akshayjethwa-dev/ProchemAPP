// src/screens/admin/AdminBroadcastBidsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Card, Button, useTheme, Portal, Modal, TextInput } from 'react-native-paper';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore'; 
import { db } from '../../config/firebase';
import { SupplierQuote } from '../../types';

export default function AdminBroadcastBidsScreen() {
  const theme = useTheme();
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<SupplierQuote | null>(null);
  const [adminFinalPrice, setAdminFinalPrice] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Cache to dynamically hold supplier contact info
  const [userCache, setUserCache] = useState<Record<string, { phone: string }>>({});

  useEffect(() => {
    const q = query(collection(db, 'supplierQuotes'), where('status', '==', 'PENDING'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedQuotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierQuote));
      setQuotes(fetchedQuotes);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Fetch user profiles for any suppliers missing phone numbers in our cache
  useEffect(() => {
    const missingIds = [...new Set(quotes.map(q => q.supplierId).filter(id => id && !userCache[id]))];
    
    if (missingIds.length === 0) return;

    const fetchMissingUsers = async () => {
      const newCache: Record<string, { phone: string }> = {};
      
      for (const id of missingIds) {
        try {
          const userSnap = await getDoc(doc(db, 'users', id));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            newCache[id] = {
              phone: uData.phone || uData.phoneNumber || ''
            };
          } else {
            newCache[id] = { phone: '' }; 
          }
        } catch (error) {
          console.error(`Error fetching user ${id}:`, error);
          newCache[id] = { phone: '' };
        }
      }
      
      setUserCache(prev => ({ ...prev, ...newCache }));
    };

    fetchMissingUsers();
  }, [quotes]);

  const confirmAcceptQuote = async () => {
    if (!adminFinalPrice) {
      Alert.alert('Error', 'Please enter the final price for the buyer.');
      return;
    }
    setIsProcessing(true);
    try {
      // 1. Fetch the original lead to get the original ID and source type
      const leadRef = doc(db, 'broadcastLeads', selectedQuote!.leadId);
      const leadSnap = await getDoc(leadRef);
      const leadData = leadSnap.data();
      const originalReqId = leadData?.originalOrderId || leadData?.rfqId;
      const sourceType = leadData?.sourceType; 

      // 2. Mark Quote as Accepted
      await updateDoc(doc(db, 'supplierQuotes', selectedQuote!.id!), { status: 'ACCEPTED' });
      
      // ❌ REMOVED: We DO NOT close the Live Lead here anymore. 
      // The lead stays 'OPEN' on the Live Market until the Buyer officially accepts it.

      // 3. Handle based on where the requirement originated from
      if (originalReqId) {
        if (sourceType === 'RFQ' || leadData?.rfqId) {
           await updateDoc(doc(db, 'rfqs', originalReqId), {
              adminOffer: {
                 price: Number(adminFinalPrice),
                 quantity: Number(selectedQuote!.availableQuantity) || 0,
                 supplierId: selectedQuote!.supplierId,
                 timestamp: Date.now()
              },
              updatedAt: new Date().toISOString()
           });

        } else {
           await updateDoc(doc(db, 'customRequirements', originalReqId), {
             status: 'QUOTED',
             quotedPrice: Number(adminFinalPrice),
             quotedSupplierId: selectedQuote!.supplierId,
             quotedSupplierName: selectedQuote!.supplierName 
           });
        }
      }

      Alert.alert('Success', 'Quote accepted and sent to the buyer!');
      setSelectedQuote(null);
      setAdminFinalPrice('');
    } catch (error) {
      console.error("Accept Quote Error:", error);
      Alert.alert('Error', 'Failed to accept quote.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCallSupplier = (phone: string) => {
    if (!phone) {
      Alert.alert('No Number', 'Supplier did not provide a phone number in their profile.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const renderQuote = ({ item }: { item: SupplierQuote }) => {
    // Determine the phone number from our cache
    const finalPhone = userCache[item.supplierId]?.phone || '';

    return (
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.productName}</Text>
          <View style={styles.supplierBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
               <Text variant="bodyMedium" style={{ color: '#64748B' }}>Supplier:</Text>
               <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.supplierName}</Text>
            </View>
            {/* ✅ Added Contact Details visually */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
               <Text variant="bodyMedium" style={{ color: '#64748B' }}>Contact No:</Text>
               <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{finalPhone || 'N/A'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
               <Text variant="bodyMedium" style={{ color: '#64748B' }}>Supplier Price:</Text>
               <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>₹{item.pricePerUnit} / unit</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
               <Text variant="bodyMedium" style={{ color: '#64748B' }}>Can Supply:</Text>
               <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.availableQuantity}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
               <Text variant="bodyMedium" style={{ color: '#64748B' }}>Dispatch In:</Text>
               <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.dispatchDays}</Text>
            </View>
          </View>
        </Card.Content>
        <Card.Actions style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 }}>
          {/* ✅ Call Supplier Button Added */}
          <Button 
            mode="contained-tonal" 
            icon="phone" 
            onPress={() => handleCallSupplier(finalPhone)}
            style={{ flex: 1, marginRight: 10 }}
          >
            Call
          </Button>
          <Button 
            mode="contained" 
            onPress={() => { setSelectedQuote(item); setAdminFinalPrice(item.pricePerUnit.toString()); }} 
            buttonColor="#10B981"
            style={{ flex: 1 }}
          >
            Accept Quote
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.pageTitle}>Supplier Bids</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>Review quotes and set final price for the buyer.</Text>
      
      <FlatList
        data={quotes}
        keyExtractor={(item) => item.id!}
        renderItem={renderQuote}
        ListEmptyComponent={<Text style={styles.emptyText}>No pending bids from suppliers.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Portal>
        <Modal visible={!!selectedQuote} onDismiss={() => setSelectedQuote(null)} contentContainerStyle={styles.modalContent}>
          <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 10 }}>Set Final Buyer Price</Text>
          <Text style={{marginBottom: 15, color: 'gray'}}>Supplier quoted: ₹{selectedQuote?.pricePerUnit}</Text>
          
          <TextInput
            label="Final Price to Buyer (₹)"
            value={adminFinalPrice}
            onChangeText={setAdminFinalPrice}
            keyboardType="numeric"
            mode="outlined"
            style={{ marginBottom: 20, backgroundColor: 'white' }}
          />
          <Button mode="contained" onPress={confirmAcceptQuote} loading={isProcessing}>
            Send to Buyer
          </Button>
          <Button mode="text" onPress={() => setSelectedQuote(null)} style={{ marginTop: 5 }}>Cancel</Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 15 },
  pageTitle: { fontWeight: 'bold', color: '#1E293B' },
  subtitle: { color: '#64748B', marginBottom: 15 },
  card: { marginBottom: 12, backgroundColor: 'white' },
  supplierBox: { marginTop: 10, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyText: { textAlign: 'center', marginTop: 50, color: 'gray' },
  modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 10 },
});