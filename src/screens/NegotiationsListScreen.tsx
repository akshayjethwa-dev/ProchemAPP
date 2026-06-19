// src/screens/NegotiationsListScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Avatar, IconButton, Chip, useTheme, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore'; 
import { db } from '../config/firebase'; 
import { useAppStore } from '../store/appStore';
import { RFQ } from '../types';

import { GSTRequiredModal } from '../components/GSTRequiredModal';

interface UnifiedListItem {
  id: string; // rfqId or conversationId
  type: 'rfq' | 'custom_req';
  productName: string;
  buyerName: string;
  sellerName: string;
  updatedAt: any;
  status: string;
  targetQuantity: string | number;
  targetPrice: string | number;
  unit: string;
  requirementId?: string;
  quoteId?: string;
  conversationId?: string;
}

export default function NegotiationsListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  
  const { user, viewMode } = useAppStore();
  const isBuyer = viewMode === 'buyer';
  const isAdminView = route.params?.isAdminView || user?.userType === 'admin' || user?.userType === 'sub_admin';

  const [rfqsList, setRfqsList] = useState<UnifiedListItem[]>([]);
  const [reqChatsList, setReqChatsList] = useState<UnifiedListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGSTModal, setShowGSTModal] = useState(false);

  useEffect(() => {
    if (!user && !isAdminView) return;

    // ✅ FIX: TypeScript error 'user' is possibly 'null'. Added fallback user?.uid || ''
    // 1. Fetch Standard RFQs
    const qRfqs = isAdminView 
      ? query(collection(db, 'rfqs'))
      : query(collection(db, 'rfqs'), where(isBuyer ? 'buyerId' : 'sellerId', '==', user?.uid || ''));

    const unsubRfqs = onSnapshot(qRfqs, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data() as RFQ;
        return {
          id: doc.id,
          type: 'rfq',
          productName: d.productName,
          buyerName: d.buyerName || 'Buyer',
          sellerName: d.sellerName || 'Supplier',
          updatedAt: d.updatedAt,
          status: d.status,
          targetQuantity: d.targetQuantity,
          targetPrice: d.targetPrice,
          unit: d.unit
        } as UnifiedListItem;
      });
      setRfqsList(data);
    });

    // ✅ FIX: TypeScript error 'user' is possibly 'null'. Added fallback user?.uid || ''
    // 2. Fetch Custom Requirement Chats (from conversations collection)
    const qChats = isAdminView
      ? query(collection(db, 'conversations'))
      : query(collection(db, 'conversations'), where(isBuyer ? 'buyerUserId' : 'sellerUserId', '==', user?.uid || ''));

    const unsubChats = onSnapshot(qChats, async (snapshot) => {
      const chats: UnifiedListItem[] = [];
      for (const docSnap of snapshot.docs) {
        const cData = docSnap.data();
        // If it's a custom requirement chat
        if (cData.requirementId && cData.quoteId) {
          try {
            const reqSnap = await getDoc(doc(db, 'customRequirements', cData.requirementId));
            const quoteSnap = await getDoc(doc(db, 'supplierQuotes', cData.quoteId));
            
            if (reqSnap.exists() && quoteSnap.exists()) {
              const req = reqSnap.data();
              const quote = quoteSnap.data();
              chats.push({
                id: docSnap.id, 
                type: 'custom_req',
                productName: req.productName,
                buyerName: req.buyerName || 'Buyer',
                sellerName: quote.supplierName || 'Supplier',
                updatedAt: cData.updatedAt || req.createdAt,
                status: cData.status === 'open' ? 'NEGOTIATING' : (cData.status === 'won' ? 'CONVERTED' : 'CLOSED'),
                targetQuantity: req.quantity,
                targetPrice: quote.pricePerUnit, // Using quote price as the target indicator
                unit: req.unit,
                requirementId: cData.requirementId,
                quoteId: cData.quoteId,
                conversationId: docSnap.id
              });
            }
          } catch (err) {
            console.error("Error fetching req chat details", err);
          }
        }
      }
      setReqChatsList(chats);
      setLoading(false);
    });

    return () => {
      unsubRfqs();
      unsubChats();
    };
  }, [user, isBuyer, isAdminView]);

  // Combine and sort
  const unifiedList = [...rfqsList, ...reqChatsList].sort((a, b) => {
    const timeA = new Date(a.updatedAt).getTime() || 0;
    const timeB = new Date(b.updatedAt).getTime() || 0;
    return timeB - timeA;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: '#FEF3C7', text: '#B45309' }; 
      case 'NEGOTIATING': return { bg: '#DBEAFE', text: '#1D4ED8' }; 
      case 'CONVERTED': return { bg: '#DCFCE7', text: '#15803D' }; 
      case 'REJECTED': case 'CLOSED': return { bg: '#FEE2E2', text: '#B91C1C' }; 
      default: return { bg: '#F1F5F9', text: '#475569' }; 
    }
  };

  const handleNegotiationTap = (item: UnifiedListItem) => {
    if (user?.registrationType === 'mobile' && !user?.gstNumber) {
      setShowGSTModal(true);
      return;
    }
    if (item.type === 'rfq') {
      navigation.navigate('NegotiationRoom', { rfqId: item.id });
    } else {
      navigation.navigate('NegotiationRoom', { 
        requirementId: item.requirementId, 
        quoteId: item.quoteId,
        conversationId: item.conversationId
      });
    }
  };

  const renderItem = ({ item }: { item: UnifiedListItem }) => {
    const statusTheme = getStatusColor(item.status);
    const dateStr = new Date(item.updatedAt).toLocaleDateString();

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => handleNegotiationTap(item)}>
        <View style={styles.cardHeader}>
           <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
              <Avatar.Icon size={40} icon={item.type === 'custom_req' ? "clipboard-text-outline" : "handshake-outline"} style={{backgroundColor: '#F1F5F9', marginRight: 12}} color="#64748B" />
              <View style={{flex: 1}}>
                 <Text variant="titleMedium" style={{fontWeight: 'bold', color: '#1E293B'}} numberOfLines={1}>
                   {item.productName}
                 </Text>
                 <Text style={{fontSize: 12, color: '#64748B'}}>
                   {isAdminView 
                    ? `Buyer: ${item.buyerName} • Seller: ${item.sellerName}`
                    : (isBuyer ? `To: ${item.type === 'custom_req' ? item.sellerName : 'Prochem Supplier'}` : `From: ${item.buyerName}`)
                   }
                 </Text>
                 <Text style={{fontSize: 11, color: '#94A3B8'}}>{dateStr} • {item.type === 'custom_req' ? 'Custom Req' : 'RFQ'}</Text>
              </View>
           </View>
           <Chip style={{backgroundColor: statusTheme.bg, height: 28}}>
              <Text style={{fontSize: 10, color: statusTheme.text, fontWeight: 'bold'}}>{item.status}</Text>
           </Chip>
        </View>

        <Divider style={{marginVertical: 12}} />

        <View style={styles.cardBody}>
           <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Qty</Text>
              <Text style={styles.infoValue}>{item.targetQuantity} {item.unit}</Text>
           </View>
           <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Price</Text>
              <Text style={styles.infoValue}>₹{item.targetPrice}</Text>
           </View>
           <View style={[styles.infoCol, {alignItems: 'flex-end'}]}>
              <Text style={styles.infoLabel}>Total Est.</Text>
              <Text style={[styles.infoValue, {color: theme.colors.primary}]}>
                ₹{(Number(item.targetQuantity) * Number(item.targetPrice)).toLocaleString()}
              </Text>
           </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <GSTRequiredModal visible={showGSTModal} onDismiss={() => setShowGSTModal(false)} onAction={() => { setShowGSTModal(false); navigation.navigate('EditProfile'); }} />

      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{fontWeight: 'bold'}}>
          {isAdminView ? 'All Negotiations' : 'Negotiations & RFQs'}
        </Text>
      </View>

      {loading ? (
         <View style={{flex: 1, justifyContent: 'center'}}><ActivityIndicator size="large" color="#004AAD" /></View>
      ) : (
        <FlatList
          data={unifiedList}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{padding: 16, flexGrow: 1}}
          ListEmptyComponent={
            <View style={styles.emptyState}>
               <Avatar.Icon size={80} icon="text-box-search-outline" style={{backgroundColor: 'transparent'}} color="#CBD5E1" />
               <Text style={{marginTop: 16, color: '#64748B', fontSize: 16, fontWeight: 'bold'}}>No Active Quotes</Text>
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
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }
});