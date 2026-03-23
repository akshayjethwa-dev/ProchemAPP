// src/screens/BuyerRequirementsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, Button, useTheme, Chip } from 'react-native-paper';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { useNavigation } from '@react-navigation/native';

export default function BuyerRequirementsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAppStore();
  const [requirements, setRequirements] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'customRequirements'), where('buyerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // ✅ Cast the mapped document to 'any' to resolve TypeScript errors
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Sort manually to keep newest first
      reqs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRequirements(reqs);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handleAcceptQuote = (req: any) => {
    // ✅ Package the quoted requirement into a "Cart Item" format
    const negotiatedItem = {
      id: `custom_${req.id}`,
      productId: 'CUSTOM_SOURCED',
      name: req.productName,
      quantity: Number(req.quantity),
      pricePerUnit: Number(req.quotedPrice),
      unit: req.unit || 'kg',
      sellerId: req.quotedSupplierId,
      gstPercent: 18, // Default B2B GST rate
      customRequirementId: req.id // We pass this so Checkout knows what to mark as FULFILLED
    };

    // ✅ Send the user to the Checkout Screen to finish the order
    navigation.navigate('Checkout', { negotiatedItem });
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
          >
            Accept & Checkout
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