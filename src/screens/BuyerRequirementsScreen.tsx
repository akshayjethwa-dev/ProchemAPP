// src/screens/BuyerRequirementsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, IconButton, useTheme, FAB, Card, Divider, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { Conversation } from '../types';

export default function BuyerRequirementsScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { user } = useAppStore();
  
  const [requirements, setRequirements] = useState<any[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Fetch Requirements
    const qReqs = query(collection(db, 'customRequirements'), where('buyerId', '==', user.uid));
    const unsubReqs = onSnapshot(qReqs, (snapshot) => {
      const reqs: any[] = [];
      snapshot.forEach((doc) => reqs.push({ id: doc.id, ...doc.data() }));
      reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequirements(reqs);
    });

    // Fetch active Conversations related to requirements
    const qChats = query(collection(db, 'conversations'), where('buyerUserId', '==', user.uid));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const chats: Conversation[] = [];
      snapshot.forEach(doc => chats.push({ id: doc.id, ...doc.data() } as Conversation));
      setConversations(chats);
      setLoading(false);
    });

    return () => { unsubReqs(); unsubChats(); };
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QUOTED': return { bg: '#DCFCE7', text: '#166534' };
      case 'PENDING': return { bg: '#FEF3C7', text: '#D97706' };
      case 'CLOSED': return { bg: '#F1F5F9', text: '#64748B' };
      case 'RESOLVED': return { bg: '#DBEAFE', text: '#1E40AF' };
      default: return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusStyle = getStatusColor(item.status || 'PENDING');
    
    // Find if there are active approved chats for this requirement
    const activeChats = conversations.filter(c => c.requirementId === item.id);
    
    return (
      <Card style={styles.card} mode="elevated" onPress={() => {}}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status || 'PENDING'}</Text>
          </View>
        </View>
        
        <Text style={styles.productName}>{item.productName}</Text>
        
        <View style={styles.specsRow}>
          <Text style={styles.specText}>Target: ₹{item.targetPrice}/{item.unit}</Text>
          <Text style={styles.specText}>Qty: {item.quantity} {item.unit}</Text>
        </View>

        <Divider style={{ marginVertical: 12, backgroundColor: '#F1F5F9' }} />
        
        <View style={styles.footerRow}>
           <Text style={styles.locationText}>📍 {item.deliveryPincode || 'N/A'}</Text>
           <Text style={styles.timelineText}>⏳ {item.timeline || 'Standard'}</Text>
        </View>

        {/* 🚀 ACTION CTA: Open negotiation rooms if admin approved quotes */}
        {activeChats.length > 0 && (
           <View style={{ marginTop: 12 }}>
             <Button 
                mode="contained" 
                buttonColor="#004AAD"
                onPress={() => navigation.navigate('NegotiationsList')}
             >
                View Negotiations ({activeChats.length})
             </Button>
           </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{fontWeight:'bold'}}>My Sourcing Requests</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          data={requirements}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{fontSize: 50}}>📝</Text>
              <Text style={styles.emptyTitle}>No Requests Yet</Text>
              <Text style={styles.emptySub}>Post a custom chemical requirement to get competitive quotes from verified suppliers.</Text>
            </View>
          }
        />
      )}

      <FAB icon="plus" label="Post Requirement" style={styles.fab} color="white" onPress={() => navigation.navigate('PostRequirement')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 8 },
  listContent: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  card: { backgroundColor: 'white', marginBottom: 12, borderRadius: 12, padding: 16, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  
  productName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  specsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  specText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  locationText: { fontSize: 12, color: '#64748B' },
  timelineText: { fontSize: 12, color: '#64748B' },

  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 20, backgroundColor: '#004AAD' }
});