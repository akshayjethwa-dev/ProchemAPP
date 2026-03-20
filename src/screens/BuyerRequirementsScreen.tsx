// src/screens/BuyerRequirementsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, useTheme, Chip } from 'react-native-paper';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { useNavigation } from '@react-navigation/native';

export default function BuyerRequirementsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAppStore();
  const [requirements, setRequirements] = useState<any[]>([]);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'customRequirements'), where('buyerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually to keep newest first
      reqs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRequirements(reqs);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handleAcceptQuote = async (req: any) => {
    setIsAccepting(req.id);
    try {
      // 1. Generate an official Order document
      const totalAmount = Number(req.quantity) * Number(req.quotedPrice);
      
      const newOrder = {
        buyerId: user?.uid,
        sellerId: req.quotedSupplierId,
        status: 'ACCEPTED', // Pre-accepted by seller and buyer
        totalAmount: totalAmount,
        shippingAddress: user?.address || 'Address pending', // Can be updated in cart/checkout logic
        paymentMode: 'BANK_TRANSFER', // Defaulting for B2B
        createdAt: serverTimestamp(),
        date: serverTimestamp(),
        items: [{
          productId: 'CUSTOM_SOURCED',
          productName: req.productName,
          quantity: Number(req.quantity),
          pricePerUnit: Number(req.quotedPrice),
          total: totalAmount
        }],
        subTotal: totalAmount,
        taxAmount: 0, // Add GST logic if needed
        payoutAmount: totalAmount,
        platformFeeSeller: 0,
        safetyFee: 0,
      };

      const orderRef = await addDoc(collection(db, 'orders'), newOrder);

      // 2. Mark Requirement as FULFILLED
      await updateDoc(doc(db, 'customRequirements', req.id), {
        status: 'FULFILLED',
        finalOrderId: orderRef.id
      });

      Alert.alert('Order Created!', 'Your custom requirement has been converted into an active order.', [
        { text: 'View Order', onPress: () => navigation.navigate('Orders') }
      ]);

    } catch (error) {
      Alert.alert('Error', 'Failed to convert to order. Please try again.');
    } finally {
      setIsAccepting(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={{fontWeight: 'bold', flex: 1}}>{item.productName}</Text>
          <Chip 
            compact 
            style={{ backgroundColor: item.status === 'QUOTED' ? '#D1FAE5' : '#E2E8F0' }}
            textStyle={{ color: item.status === 'QUOTED' ? '#065F46' : 'black', fontSize: 10, fontWeight: 'bold' }}
          >
            {item.status}
          </Chip>
        </View>

        <Text variant="bodyMedium">Requested: {item.quantity} {item.unit}</Text>

        {item.status === 'QUOTED' && item.quotedPrice && (
          <View style={styles.quoteBox}>
            <Text variant="titleSmall" style={{color: '#065F46', fontWeight: 'bold'}}>✨ Market Quote Found!</Text>
            <Text variant="bodyMedium" style={{marginTop: 5}}>
              Price: <Text style={{fontWeight: 'bold'}}>₹{item.quotedPrice} / {item.unit}</Text>
            </Text>
            <Text variant="bodyMedium">
              Total: <Text style={{fontWeight: 'bold'}}>₹{(Number(item.quantity) * Number(item.quotedPrice)).toLocaleString()}</Text>
            </Text>
          </View>
        )}
      </Card.Content>
      
      {item.status === 'QUOTED' && (
        <Card.Actions>
          <Button 
            mode="contained" 
            buttonColor="#004AAD" 
            onPress={() => handleAcceptQuote(item)}
            loading={isAccepting === item.id}
          >
            Accept & Create Order
          </Button>
        </Card.Actions>
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.pageTitle}>My Sourcing Requests</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>Track your custom chemical requirements here.</Text>

      <FlatList
        data={requirements}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>You haven't submitted any custom requirements.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 15 },
  pageTitle: { fontWeight: 'bold', color: '#1E293B' },
  subtitle: { color: '#64748B', marginBottom: 15 },
  card: { marginBottom: 12, backgroundColor: 'white' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  quoteBox: { marginTop: 15, backgroundColor: '#ECFDF5', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94A3B8' }
});