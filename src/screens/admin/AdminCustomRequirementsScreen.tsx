// src/screens/admin/AdminCustomRequirementsScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Linking, Alert } from 'react-native';
import { Text, Card, Chip, IconButton, Button, useTheme, Divider } from 'react-native-paper';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { createConversation } from '../../services/conversationService';
import { SupplierQuote } from '../../types';

interface Requirement {
  id: string;
  buyerId: string;
  buyerName?: string;
  buyerPhone?: string;
  productName: string;
  quantity: string;
  unit: string;
  targetPrice?: string;
  description?: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED' | 'QUOTED' | 'FULFILLED';
  createdAt: any;
}

// ✅ Helper to safely parse Firebase Timestamps, strings, or numbers
const parseDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
  const parsed = new Date(dateVal);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
};

const formatDate = (dateVal: any) => {
  const date = parseDate(dateVal);
  if (!date) return 'Just now';
  return date.toLocaleString();
};

export default function AdminCustomRequirementsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [userCache, setUserCache] = useState<Record<string, { phone: string, name: string }>>({});

  useEffect(() => {
    // 1. Fetch Requirements
    const qReqs = query(collection(db, 'customRequirements'), orderBy('createdAt', 'desc'));
    const unsubReqs = onSnapshot(qReqs, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Requirement));
      setRequirements(data);
    });

    // 2. Fetch all Supplier Quotes
    const qQuotes = query(collection(db, 'supplierQuotes'), orderBy('createdAt', 'desc'));
    const unsubQuotes = onSnapshot(qQuotes, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierQuote));
      setQuotes(data);
      setLoading(false);
    });

    return () => {
      unsubReqs();
      unsubQuotes();
    };
  }, []);

  useEffect(() => {
    const missingIds = [...new Set(requirements.map(r => r.buyerId).filter(id => id && !userCache[id]))];
    if (missingIds.length === 0) return;

    const fetchMissingUsers = async () => {
      const newCache: Record<string, { phone: string, name: string }> = {};
      for (const id of missingIds) {
        try {
          const userSnap = await getDoc(doc(db, 'users', id));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            newCache[id] = {
              phone: uData.phone || uData.phoneNumber || '',
              name: uData.companyName || uData.businessName || uData.name || ''
            };
          } else {
            newCache[id] = { phone: '', name: '' }; 
          }
        } catch (error) {
          newCache[id] = { phone: '', name: '' };
        }
      }
      setUserCache(prev => ({ ...prev, ...newCache }));
    };

    fetchMissingUsers();
  }, [requirements]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'customRequirements', id), { status: newStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleCallBuyer = (phone: string) => {
    if (!phone) return Alert.alert('No Number', 'Buyer did not provide a phone number.');
    Linking.openURL(`tel:${phone}`);
  };

  const handleApproveQuote = async (req: Requirement, quote: SupplierQuote) => {
    Alert.alert(
      "Approve Quote",
      "This will grant the seller chat access with the buyer. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Approve", 
          onPress: async () => {
            try {
              // 1. Mark Quote as Accepted
              await updateDoc(doc(db, 'supplierQuotes', quote.id!), { status: 'ACCEPTED' });
              
              // 2. Mark Requirement as Quoted if it was pending
              if (req.status === 'PENDING') {
                await updateDoc(doc(db, 'customRequirements', req.id), { status: 'QUOTED' });
              }

              // 3. Create the Conversation Room
              await createConversation({
                buyerUserId: req.buyerId,
                sellerUserId: quote.supplierId,
                requirementId: req.id,
                quoteId: quote.id!
              });

              Alert.alert('Success', 'Quote approved and chat room created.');
            } catch (error) {
               console.error("Error approving quote:", error);
               Alert.alert('Error', 'Could not process approval.');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Requirement }) => {
    const isPending = item.status === 'PENDING';
    const finalPhone = item.buyerPhone || userCache[item.buyerId]?.phone || '';
    const finalName = item.buyerName || userCache[item.buyerId]?.name || 'Unknown Buyer';
    
    // Filter quotes for this specific requirement
    const reqQuotes = quotes.filter(q => q.leadId === item.id);

    return (
      <Card style={[styles.card, isPending && { borderColor: theme.colors.error, borderWidth: 1 }]}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={{flex: 1}}>
               <Text variant="titleMedium" style={styles.productName}>{item.productName}</Text>
               <Text style={styles.date}>
                 {/* ✅ Safely formatted date */}
                 {formatDate(item.createdAt)}
               </Text>
            </View>
            <Chip 
               style={{ backgroundColor: isPending ? '#FEE2E2' : (item.status === 'RESOLVED' || item.status === 'FULFILLED' ? '#DCFCE7' : '#F1F5F9') }}
               textStyle={{ color: isPending ? '#B91C1C' : (item.status === 'RESOLVED' || item.status === 'FULFILLED' ? '#166534' : '#64748B'), fontSize: 10, fontWeight: 'bold' }}
            >
               {item.status}
            </Chip>
          </View>

          <View style={styles.detailsBox}>
             <View style={styles.row}><Text style={styles.label}>Quantity:</Text><Text style={styles.value}>{item.quantity} {item.unit}</Text></View>
             {item.targetPrice ? <View style={styles.row}><Text style={styles.label}>Target Price:</Text><Text style={styles.value}>₹{item.targetPrice}</Text></View> : null}
             <View style={styles.row}><Text style={styles.label}>Buyer Name:</Text><Text style={styles.value}>{finalName}</Text></View>
             <View style={styles.row}><Text style={styles.label}>Contact No:</Text><Text style={styles.value}>{finalPhone || 'N/A'}</Text></View>
          </View>

          {/* Quotes Section */}
          {reqQuotes.length > 0 && (
             <View style={{ marginTop: 8, marginBottom: 12 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 8, color: '#334155' }}>Submitted Quotes ({reqQuotes.length})</Text>
                {reqQuotes.map(quote => (
                   <View key={quote.id} style={styles.quoteRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{quote.supplierName}</Text>
                        <Text style={{ fontSize: 12, color: '#64748B' }}>₹{quote.pricePerUnit} • {quote.availableQuantity} qty • {quote.dispatchDays}</Text>
                      </View>
                      {quote.status === 'PENDING' ? (
                        <Button mode="contained" compact buttonColor="#004AAD" labelStyle={{ fontSize: 11 }} onPress={() => handleApproveQuote(item, quote)}>Approve Chat</Button>
                      ) : (
                        <Chip textStyle={{ fontSize: 10, color: '#166534' }} style={{ backgroundColor: '#DCFCE7' }}>{quote.status}</Chip>
                      )}
                   </View>
                ))}
             </View>
          )}

          <View style={styles.actionRow}>
            <Button mode="contained-tonal" icon="phone" onPress={() => handleCallBuyer(finalPhone)} style={{flex: 1, marginRight: 10}}>
              Call Buyer
            </Button>
            {isPending || item.status === 'QUOTED' ? (
              <Button mode="contained" buttonColor="#10B981" onPress={() => handleUpdateStatus(item.id, 'RESOLVED')} style={{flex: 1}}>
                Mark Resolved
              </Button>
            ) : (
              <Button mode="outlined" onPress={() => handleUpdateStatus(item.id, 'PENDING')} style={{flex: 1}}>
                Reopen
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{fontWeight: 'bold'}}>Custom Requirements</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#004AAD" /></View>
      ) : (
        <FlatList
          data={requirements}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={<View style={styles.center}><Text style={{color: '#64748B'}}>No custom requirements posted yet.</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  card: { marginBottom: 16, backgroundColor: 'white', borderRadius: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  productName: { fontWeight: 'bold', color: '#0F172A' },
  date: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  detailsBox: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#64748B', fontSize: 13 },
  value: { fontWeight: 'bold', color: '#334155', fontSize: 13 },
  quoteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }
});