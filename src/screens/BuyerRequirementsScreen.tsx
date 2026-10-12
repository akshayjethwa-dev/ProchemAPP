// src/screens/BuyerRequirementsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, IconButton, useTheme, FAB, Divider, ActivityIndicator } from 'react-native-paper';
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
      setLoading(false);
    });

    // Fetch active Conversations related to requirements
    const qChats = query(collection(db, 'conversations'), where('buyerUserId', '==', user.uid));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const chats: Conversation[] = [];
      snapshot.forEach(doc => chats.push({ id: doc.id, ...doc.data() } as Conversation));
      setConversations(chats);
    });

    return () => { unsubReqs(); unsubChats(); };
  }, [user]);

  const renderItem = ({ item }: { item: any }) => {
    // Find if there are active approved chats for this requirement
    const activeChats = conversations.filter(c => c.requirementId === item.id);
    const targetPrice = item.targetPrice ? `₹${Number(item.targetPrice).toLocaleString('en-IN')}` : 'Open Target';
    const hasChats = activeChats.length > 0;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, item.status === 'QUOTED' ? styles.statusQuoted : styles.statusPending]}>
                <Text style={[styles.statusText, item.status === 'QUOTED' ? styles.statusQuotedText : styles.statusPendingText]}>
                  {item.status || 'PENDING QUOTES'}
                </Text>
              </View>
              <Text style={styles.dateText}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}
              </Text>
            </View>
            <Text style={styles.productName} numberOfLines={2}>
              {item.productName}
            </Text>
          </View>
        </View>

        {/* 2x2 Structured Matrix */}
        <View style={styles.matrixContainer}>
          <View style={styles.matrixRow}>
            <View style={[styles.matrixCell, styles.matrixBorderRight]}>
              <Text style={styles.matrixLabel}>TARGET BUDGET</Text>
              <Text style={styles.matrixPrice}>
                {targetPrice}
                <Text style={styles.matrixUnit}> / {item.unit || 'unit'}</Text>
              </Text>
            </View>
            <View style={styles.matrixCell}>
              <Text style={styles.matrixLabel}>ESTIMATED QUANTITY</Text>
              <Text style={styles.matrixValue}>
                {Number(item.quantity).toLocaleString('en-IN')} {item.unit}
              </Text>
            </View>
          </View>

          <View style={[styles.matrixRow, styles.matrixBorderTop]}>
            <View style={[styles.matrixCell, styles.matrixBorderRight]}>
              <Text style={styles.matrixLabel}>DESTINATION PINCODE</Text>
              <Text style={styles.matrixMeta} numberOfLines={1}>
                📍 {item.deliveryPincode || 'All India'}
              </Text>
            </View>
            <View style={styles.matrixCell}>
              <Text style={styles.matrixLabel}>TIMELINE</Text>
              <Text style={styles.matrixMeta} numberOfLines={1}>
                ⏳ {item.timeline || 'Standard Procurement'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button for Active Supplier Chats */}
        {hasChats ? (
          <TouchableOpacity 
            style={styles.openChatButton}
            onPress={() => {
              if (activeChats.length === 1) {
                navigation.navigate('NegotiationRoom', {
                  requirementId: item.id,
                  conversationId: activeChats[0].id
                });
              } else {
                navigation.navigate('NegotiationsList');
              }
            }}
            activeOpacity={0.85}
          >
            <IconButton icon="message-text" size={18} iconColor="#FFFFFF" style={{ margin: 0, padding: 0 }} />
            <Text style={styles.openChatText}>
              {activeChats.length === 1 ? 'Open Supplier Negotiation Desk' : `View Supplier Quotations (${activeChats.length})`}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>
              📡 Broadcasted to verified suppliers. You will be notified when quotes arrive.
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} iconColor="#0F172A" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Sourcing Inquiries</Text>
          <Text style={styles.headerSubtitle}>
            {requirements.length} customized chemical requests submitted
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#004AAD" />
        </View>
      ) : (
        <FlatList
          data={requirements}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconButton icon="clipboard-text-outline" size={54} iconColor="#94A3B8" />
              <Text style={styles.emptyTitle}>No Custom Requests Yet</Text>
              <Text style={styles.emptySub}>
                Post custom volume, packaging, or target price specifications to receive verified direct quotations.
              </Text>
            </View>
          }
        />
      )}

      <FAB 
        icon="plus" 
        label="Post New Requirement" 
        style={styles.fab} 
        color="#FFFFFF" 
        onPress={() => navigation.navigate('PostRequirement')} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  listContent: { 
    padding: 16, 
    paddingBottom: 110 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  /* Card */
  card: { 
    backgroundColor: '#FFFFFF', 
    marginBottom: 16, 
    borderRadius: 12, 
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardHeader: { 
    padding: 16,
    paddingBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusQuoted: {
    backgroundColor: '#DCFCE7',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  statusQuotedText: {
    color: '#166534',
  },
  statusPendingText: {
    color: '#B45309',
  },
  dateText: { 
    fontSize: 11, 
    color: '#94A3B8', 
    fontWeight: '500' 
  },
  productName: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#0F172A', 
    letterSpacing: -0.2,
    lineHeight: 22,
  },

  /* 2x2 Matrix */
  matrixContainer: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  matrixRow: {
    flexDirection: 'row',
  },
  matrixCell: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  matrixBorderRight: {
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  matrixBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  matrixLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  matrixPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    fontVariant: ['tabular-nums'],
  },
  matrixUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  matrixValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  matrixMeta: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },

  /* Action CTA */
  openChatButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 8,
    backgroundColor: '#004AAD',
    paddingHorizontal: 12,
  },
  openChatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  waitingContainer: {
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
  },
  waitingText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },

  /* Empty State */
  emptyState: { 
    alignItems: 'center', 
    marginTop: 60, 
    paddingHorizontal: 30 
  },
  emptyTitle: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: '#0F172A', 
    marginTop: 12, 
    marginBottom: 6 
  },
  emptySub: { 
    fontSize: 13, 
    color: '#64748B', 
    textAlign: 'center', 
    lineHeight: 20 
  },
  
  fab: { 
    position: 'absolute', 
    margin: 16, 
    right: 0, 
    bottom: 24, 
    backgroundColor: '#004AAD',
    borderRadius: 24,
  }
});
