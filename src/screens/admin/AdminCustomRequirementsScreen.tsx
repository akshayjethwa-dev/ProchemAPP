// src/screens/admin/AdminCustomRequirementsScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Linking, Alert } from 'react-native';
import { Text, Card, Chip, IconButton, Button, useTheme } from 'react-native-paper';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';

interface Requirement {
  id: string;
  buyerId: string; // ✅ Ensure buyerId is here to fetch profile
  buyerName?: string;
  buyerPhone?: string;
  productName: string;
  quantity: string;
  unit: string;
  targetPrice?: string;
  description?: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED' | 'QUOTED' | 'FULFILLED';
  createdAt: string;
}

export default function AdminCustomRequirementsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ Cache to hold dynamically fetched user details
  const [userCache, setUserCache] = useState<Record<string, { phone: string, name: string }>>({});

  useEffect(() => {
    const q = query(collection(db, 'customRequirements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Requirement));
      setRequirements(data);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ✅ New useEffect: Fetch user profiles for any requirements missing phone numbers
  useEffect(() => {
    // Find unique buyer IDs that we haven't fetched yet
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
            // Document doesn't exist, store empty to prevent infinite retries
            newCache[id] = { phone: '', name: '' }; 
          }
        } catch (error) {
          console.error(`Error fetching user ${id}:`, error);
          newCache[id] = { phone: '', name: '' };
        }
      }
      
      setUserCache(prev => ({ ...prev, ...newCache }));
    };

    fetchMissingUsers();
  }, [requirements]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'customRequirements', id), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleCallBuyer = (phone: string) => {
    if (!phone) {
      Alert.alert('No Number', 'Buyer did not provide a phone number in their profile.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const renderItem = ({ item }: { item: Requirement }) => {
    const isPending = item.status === 'PENDING';
    
    // ✅ Determine final phone and name (Fallback to cache if not in item)
    const finalPhone = item.buyerPhone || userCache[item.buyerId]?.phone || '';
    const finalName = item.buyerName || userCache[item.buyerId]?.name || 'Unknown Buyer';
    
    return (
      <Card style={[styles.card, isPending && { borderColor: theme.colors.error, borderWidth: 1 }]}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={{flex: 1}}>
               <Text variant="titleMedium" style={styles.productName}>{item.productName}</Text>
               <Text style={styles.date}>
                 {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now'}
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
             
             {/* ✅ Use the dynamically fetched Name & Phone */}
             <View style={styles.row}><Text style={styles.label}>Buyer Name:</Text><Text style={styles.value}>{finalName}</Text></View>
             <View style={styles.row}><Text style={styles.label}>Contact No:</Text><Text style={styles.value}>{finalPhone || 'N/A'}</Text></View>
             
             {item.description ? (
                <View style={{marginTop: 8}}>
                  <Text style={styles.label}>Notes:</Text>
                  <Text style={{fontSize: 13, color: '#334155', marginTop: 2}}>{item.description}</Text>
                </View>
             ) : null}
          </View>

          <View style={styles.actionRow}>
            {/* ✅ Pass dynamically fetched phone to call button */}
            <Button 
               mode="contained-tonal" 
               icon="phone" 
               onPress={() => handleCallBuyer(finalPhone)}
               style={{flex: 1, marginRight: 10}}
            >
              Call Buyer
            </Button>
            
            {isPending ? (
              <Button 
                 mode="contained" 
                 buttonColor="#10B981" 
                 onPress={() => handleUpdateStatus(item.id, 'RESOLVED')}
                 style={{flex: 1}}
              >
                Mark Resolved
              </Button>
            ) : (
              <Button 
                 mode="outlined" 
                 onPress={() => handleUpdateStatus(item.id, 'PENDING')}
                 style={{flex: 1}}
              >
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
          ListEmptyComponent={
            <View style={styles.center}>
               <Text style={{color: '#64748B'}}>No custom requirements posted yet.</Text>
            </View>
          }
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
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' }
});