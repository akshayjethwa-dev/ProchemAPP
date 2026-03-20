// src/screens/SellerLiveLeadsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Portal, Modal, TextInput, useTheme } from 'react-native-paper';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { BroadcastLead } from '../types';

export default function SellerLiveLeadsScreen() {
  const theme = useTheme();
  const { user } = useAppStore();
  const [leads, setLeads] = useState<BroadcastLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<BroadcastLead | null>(null);
  
  // Quote Form State
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [dispatchDays, setDispatchDays] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch OPEN leads from the Live Market
    const q = query(collection(db, 'broadcastLeads'), where('status', '==', 'OPEN'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BroadcastLead));
      setLeads(fetchedLeads);
    });
    return () => unsubscribe();
  }, []);

  const submitQuote = async () => {
    if (!price || !quantity || !dispatchDays) {
      Alert.alert('Error', 'Please fill all fields to submit your quote.');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'supplierQuotes'), {
        leadId: selectedLead?.id,
        productName: selectedLead?.productName,
        supplierId: user?.uid,
        supplierName: user?.businessName || user?.companyName || 'Verified Supplier',
        pricePerUnit: Number(price),
        availableQuantity: quantity,
        dispatchDays: dispatchDays,
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Success', 'Your quote has been sent to the Admin.');
      setSelectedLead(null);
      setPrice(''); setQuantity(''); setDispatchDays('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit quote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLead = ({ item }: { item: BroadcastLead }) => (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.productName}</Text>
          <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>LIVE</Text>
        </View>
        {item.casNumber && <Text variant="bodySmall" style={{ color: 'gray' }}>CAS: {item.casNumber}</Text>}
        
        <View style={styles.detailBox}>
          <Text variant="bodyMedium">Required: <Text style={{fontWeight: 'bold'}}>{item.quantityRequired} {item.unit}</Text></Text>
          <Text variant="bodyMedium">Delivery To: <Text style={{fontWeight: 'bold'}}>{item.deliveryRegion}</Text></Text>
        </View>
      </Card.Content>
      <Card.Actions>
        <Button mode="contained" onPress={() => setSelectedLead(item)}>Submit Quote</Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.pageTitle}>Live Market Requirements</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>Submit your best price and availability. Quotes go directly to Admin.</Text>
      
      <FlatList
        data={leads}
        keyExtractor={(item) => item.id!}
        renderItem={renderLead}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No live requirements right now.</Text>}
      />

      <Portal>
        <Modal visible={!!selectedLead} onDismiss={() => setSelectedLead(null)} contentContainerStyle={styles.modalContent}>
          <Text variant="titleLarge" style={{ marginBottom: 15, fontWeight: 'bold' }}>Quote for {selectedLead?.productName}</Text>
          
          <TextInput
            label={`Price per ${selectedLead?.unit} (₹)`}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Quantity you can supply"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Estimated Dispatch (e.g., 2 Days)"
            value={dispatchDays}
            onChangeText={setDispatchDays}
            mode="outlined"
            style={styles.input}
          />
          
          <Button mode="contained" onPress={submitQuote} loading={isSubmitting} style={{ marginTop: 15 }}>
            Send to Admin
          </Button>
          <Button mode="text" onPress={() => setSelectedLead(null)} style={{ marginTop: 5 }}>
            Cancel
          </Button>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailBox: { marginTop: 10, backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8 },
  emptyText: { textAlign: 'center', marginTop: 50, color: 'gray' },
  modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 10 },
  input: { marginBottom: 10, backgroundColor: 'white' }
});