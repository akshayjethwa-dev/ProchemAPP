import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Avatar, IconButton, Chip, useTheme, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { db } from '../config/firebase'; 
import { useAppStore } from '../store/appStore';
import { RFQ } from '../types';

export default function NegotiationsListScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  
  // 🚀 FIXED: Extracted viewMode from store to handle dual-role accounts correctly
  const { user, viewMode } = useAppStore();
  const isBuyer = viewMode === 'buyer'; // 🚀 FIXED: Relying on viewMode

  // REAL-TIME STATE
  const [rfqsList, setRfqsList] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);

  // ATTACH FIREBASE LISTENER
  useEffect(() => {
    if (!user) return;

    // Use isBuyer to determine which side of the transaction to query
    const q = query(
      collection(db, 'rfqs'),
      where(isBuyer ? 'buyerId' : 'sellerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as RFQ);
      // Sort in JS to avoid needing complex Firestore indexes right away
      const sortedData = data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setRfqsList(sortedData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching RFQs: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isBuyer]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: '#FEF3C7', text: '#B45309' }; 
      case 'NEGOTIATING': return { bg: '#DBEAFE', text: '#1D4ED8' }; 
      case 'CONVERTED': return { bg: '#DCFCE7', text: '#15803D' }; 
      case 'REJECTED': return { bg: '#FEE2E2', text: '#B91C1C' }; 
      default: return { bg: '#F1F5F9', text: '#475569' }; 
    }
  };

  const renderItem = ({ item }: { item: RFQ }) => {
    const statusTheme = getStatusColor(item.status);
    const dateStr = new Date(item.updatedAt).toLocaleDateString();

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('NegotiationRoom', { rfqId: item.id })}
      >
        <View style={styles.cardHeader}>
           <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
              <Avatar.Icon size={40} icon="handshake-outline" style={{backgroundColor: '#F1F5F9', marginRight: 12}} color="#64748B" />
              <View style={{flex: 1}}>
                 <Text variant="titleMedium" style={{fontWeight: 'bold', color: '#1E293B'}} numberOfLines={1}>
                   {item.productName}
                 </Text>
                 <Text style={{fontSize: 12, color: '#64748B'}}>
                   {isBuyer ? `To: Prochem Verified Supplier` : `From: Verified Buyer`} • {dateStr}
                 </Text>
              </View>
           </View>
           <Chip style={{backgroundColor: statusTheme.bg, height: 28}}>
              <Text style={{fontSize: 10, color: statusTheme.text, fontWeight: 'bold'}}>{item.status}</Text>
           </Chip>
        </View>

        <Divider style={{marginVertical: 12}} />

        <View style={styles.cardBody}>
           <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Requested Qty</Text>
              <Text style={styles.infoValue}>{item.targetQuantity} {item.unit}</Text>
           </View>
           <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Target Price</Text>
              <Text style={styles.infoValue}>₹{item.targetPrice} / {item.unit}</Text>
           </View>
           <View style={[styles.infoCol, {alignItems: 'flex-end'}]}>
              <Text style={styles.infoLabel}>Total Est.</Text>
              <Text style={[styles.infoValue, {color: theme.colors.primary}]}>
                ₹{(item.targetQuantity * item.targetPrice).toLocaleString()}
              </Text>
           </View>
        </View>

        {item.status === 'PENDING' && !isBuyer && (
          <View style={styles.actionRow}>
            <Text style={{color: '#D97706', fontSize: 12, fontWeight: 'bold'}}>Action Required: Reply to Quote</Text>
            <IconButton icon="chevron-right" size={20} iconColor="#D97706" style={{margin: 0}} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{fontWeight: 'bold'}}>Negotiations & RFQs</Text>
      </View>

      {loading ? (
         <View style={{flex: 1, justifyContent: 'center'}}><ActivityIndicator size="large" color="#004AAD" /></View>
      ) : (
        <FlatList
          data={rfqsList}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{padding: 16, flexGrow: 1}}
          ListEmptyComponent={
            <View style={styles.emptyState}>
               <Avatar.Icon size={80} icon="text-box-search-outline" style={{backgroundColor: 'transparent'}} color="#CBD5E1" />
               <Text style={{marginTop: 16, color: '#64748B', fontSize: 16, fontWeight: 'bold'}}>No Active Quotes</Text>
               <Text style={{color: '#94A3B8', textAlign: 'center', marginTop: 8, paddingHorizontal: 20}}>
                 {isBuyer 
                   ? "You haven't requested any custom quotes yet."
                   : "You have no incoming quote requests from buyers."}
               </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'white', elevation: 2 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between' },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  actionRow: { marginTop: 16, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }
});