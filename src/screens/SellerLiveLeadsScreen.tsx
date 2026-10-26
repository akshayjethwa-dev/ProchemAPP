// src/screens/SellerLiveLeadsScreen.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, Button, Portal, Modal, TextInput, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BroadcastLead, RFQ } from '../types';
import { createConversation } from '../services/conversationService';

export default function SellerLiveLeadsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAppStore();
  
  const [rawLeads, setRawLeads] = useState<BroadcastLead[]>([]);
  const [activeRfqs, setActiveRfqs] = useState<RFQ[]>([]);
  const [leads, setLeads] = useState<BroadcastLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedLead, setSelectedLead] = useState<BroadcastLead | null>(null);
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);

  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [dispatchDays, setDispatchDays] = useState('2');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);

    const unsubLeads = onSnapshot(query(collection(db, 'broadcastLeads'), where('status', '==', 'OPEN')), snap => {
      setRawLeads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BroadcastLead)));
      setLoading(false);
    });

    const unsubRfqs = onSnapshot(query(collection(db, 'rfqs'), where('sellerId', '==', user.uid)), snap => {
      setActiveRfqs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RFQ)).filter(rfq => rfq.status === 'PENDING' || rfq.status === 'NEGOTIATING'));
    });

    return () => { unsubLeads(); unsubRfqs(); };
  }, [user?.uid]);

  useEffect(() => {
    const filtered = rawLeads.filter(lead => {
      if (lead.buyerId === user?.uid) return false;
      if (lead.excludedSellerId === user?.uid) return false;
      if (user?.uid && lead.excludedSellerIds && lead.excludedSellerIds.includes(user.uid)) return false;
      
      const isNegotiating = activeRfqs.some(rfq => 
        (lead.rfqId && lead.rfqId === rfq.id) || 
        (lead.originalOrderId && lead.originalOrderId === rfq.id) || 
        (rfq.productName?.toLowerCase().trim() === lead.productName?.toLowerCase().trim())
      );
      return !isNegotiating;
    });
    setLeads(filtered);
  }, [rawLeads, activeRfqs, user?.uid]);

  const displayedLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase().trim();
    return leads.filter(l => 
      l.productName?.toLowerCase().includes(q) || 
      l.deliveryRegion?.toLowerCase().includes(q) ||
      l.unit?.toLowerCase().includes(q)
    );
  }, [leads, searchQuery]);

  const handleQuotePress = (lead: BroadcastLead) => {
    setSelectedLead(lead);
    setPrice(String((lead as any).targetPrice || ''));
    setQuantity(String(lead.quantityRequired || ''));
    setDispatchDays('2');
  };

  const handleStartChat = async (lead: BroadcastLead) => {
    if (!user?.uid) return Alert.alert('Login Required', 'Please log in to chat with the buyer.');
    if (lead.buyerId === user.uid) {
      return Alert.alert('Notice', 'You cannot start a discussion on your own requirement.');
    }

    setChatLoadingId(lead.id || 'loading');
    try {
      const isRfqSource = lead.sourceType === 'RFQ' || Boolean(lead.rfqId);
      const originalId = lead.originalOrderId || lead.rfqId || '';
      const reqId = !isRfqSource ? (originalId || lead.id || '') : '';
      const rfqId = isRfqSource ? (originalId || lead.rfqId || lead.id || '') : '';

      let buyerId = lead.buyerId || (lead as any).userId || '';

      if (!buyerId && originalId) {
        try {
          const reqSnap = await getDoc(doc(db, 'customRequirements', originalId));
          if (reqSnap.exists()) {
            const rData = reqSnap.data();
            if (rData.buyerId || rData.userId) buyerId = rData.buyerId || rData.userId;
          }
        } catch (e) {}
      }

      if (!buyerId && originalId) {
        try {
          const rfqSnap = await getDoc(doc(db, 'rfqs', originalId));
          if (rfqSnap.exists()) {
            const rfqData = rfqSnap.data();
            if (rfqData.buyerId) buyerId = rfqData.buyerId;
          }
        } catch (e) {}
      }

      if (!buyerId && lead.id) {
        try {
          const bSnap = await getDoc(doc(db, 'broadcastLeads', lead.id));
          if (bSnap.exists()) {
            const bData = bSnap.data();
            if (bData.buyerId) buyerId = bData.buyerId;
          }
        } catch (e) {}
      }

      if (!buyerId) {
        buyerId = 'buyer';
      }

      let convId = '';
      try {
        const qExisting = query(
          collection(db, 'conversations'),
          where('sellerUserId', '==', user.uid)
        );
        const existingSnap = await getDocs(qExisting);
        const match = existingSnap.docs.find(d => {
          const cData = d.data();
          return (
            (lead.id && cData.leadId === lead.id) ||
            (reqId && cData.requirementId === reqId) ||
            (rfqId && cData.rfqId === rfqId) ||
            (originalId && (cData.requirementId === originalId || cData.rfqId === originalId))
          );
        });
        if (match) {
          convId = match.id;
        }
      } catch (qErr) {
        console.warn('Could not query conversations list:', qErr);
      }

      if (!convId) {
        const initialMsg = `Discussion started for Live Requirement: ${lead.productName}
Quantity: ${lead.quantityRequired} ${lead.unit}
Target Price: ₹${lead.targetPrice || 'Open'} / ${lead.unit}
Delivery Region: ${lead.deliveryRegion || 'All India'}
Supplier connected to discuss chemical specifications and quote.`;

        convId = await createConversation({
          requirementId: reqId || undefined,
          rfqId: rfqId || undefined,
          leadId: lead.id,
          buyerUserId: buyerId,
          sellerUserId: user.uid,
          productName: lead.productName,
          quantity: lead.quantityRequired,
          targetPrice: lead.targetPrice,
          unit: lead.unit,
          initialMessage: initialMsg,
        });

        if (reqId) {
          try {
            await updateDoc(doc(db, 'customRequirements', reqId), {
              status: 'NEGOTIATING',
              updatedAt: new Date().toISOString()
            });
          } catch (e) {}
        }
      }

      setChatLoadingId(null);
      navigation.navigate('NegotiationRoom', {
        requirementId: reqId || undefined,
        rfqId: rfqId || undefined,
        leadId: lead.id,
        conversationId: convId,
        leadInfo: {
          leadId: lead.id,
          productName: lead.productName,
          quantity: lead.quantityRequired,
          targetPrice: lead.targetPrice,
          unit: lead.unit,
          buyerId: buyerId,
          sellerId: user.uid,
          sellerName: user.companyName || user.name || 'Verified Supplier',
          sourceType: lead.sourceType || (isRfqSource ? 'RFQ' : 'CUSTOM'),
          deliveryRegion: lead.deliveryRegion || 'All India'
        }
      });

    } catch (error: any) {
      setChatLoadingId(null);
      console.error('Error starting requirement chat:', error);
      Alert.alert('Error', error.message || 'Failed to start chat with buyer.');
    }
  };

  const submitQuote = async () => {
    if (!user?.uid || !selectedLead?.id) return Alert.alert('Error', 'Missing information.');
    if (!price || !quantity || !dispatchDays) return Alert.alert('Error', 'Fill all fields.');

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'supplierQuotes'), {
        leadId: selectedLead.id,
        productName: selectedLead.productName,
        supplierId: user.uid,
        supplierName: user.companyName || 'Verified Supplier',
        pricePerUnit: Number(price),
        availableQuantity: quantity,
        dispatchDays: dispatchDays,
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Success', 'Your Bid has been submitted successfully.');
      setSelectedLead(null);
      setPrice('');
      setQuantity('');
      setDispatchDays('2');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit bid.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live Deal Calculation for Modal
  const numPrice = parseFloat(price) || 0;
  const numQty = parseFloat(quantity) || 0;
  const baseValue = numPrice * numQty;
  const gstValue = baseValue * 0.18;
  const totalValue = baseValue + gstValue;

  const renderLead = ({ item }: { item: BroadcastLead }) => {
    const isChatting = chatLoadingId === item.id;
    const targetPriceDisplay = item.targetPrice ? `₹${item.targetPrice.toLocaleString('en-IN')}` : 'Open Offer';

    return (
      <View style={styles.dealCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE REQUIREMENT</Text>
              </View>
              {item.sourceType && (
                <Text style={styles.sourceText}>• {item.sourceType}</Text>
              )}
            </View>
            <Text style={styles.productTitle} numberOfLines={2}>
              {item.productName}
            </Text>
          </View>
        </View>

        {/* 2x2 Structured Deal Matrix */}
        <View style={styles.matrixContainer}>
          <View style={styles.matrixRow}>
            <View style={[styles.matrixCell, styles.matrixBorderRight]}>
              <Text style={styles.matrixLabel}>TARGET PRICE</Text>
              <Text style={styles.matrixPrice}>
                {targetPriceDisplay}
                <Text style={styles.matrixUnit}> / {item.unit || 'unit'}</Text>
              </Text>
            </View>
            <View style={styles.matrixCell}>
              <Text style={styles.matrixLabel}>REQUIRED VOLUME</Text>
              <Text style={styles.matrixValue}>
                {Number(item.quantityRequired).toLocaleString('en-IN')} {item.unit}
              </Text>
            </View>
          </View>

          <View style={[styles.matrixRow, styles.matrixBorderTop]}>
            <View style={[styles.matrixCell, styles.matrixBorderRight]}>
              <Text style={styles.matrixLabel}>DELIVERY DESTINATION</Text>
              <Text style={styles.matrixMeta} numberOfLines={1}>
                📍 {item.deliveryRegion || 'All India Delivery'}
              </Text>
            </View>
            <View style={styles.matrixCell}>
              <Text style={styles.matrixLabel}>DISPATCH TIMELINE</Text>
              <Text style={styles.matrixMeta} numberOfLines={1}>
                ⚡ {(item as any).timeline || 'Immediate Dispatch'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Bar */}
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.chatActionButton}
            onPress={() => handleStartChat(item)}
            disabled={isChatting}
            activeOpacity={0.8}
          >
            {isChatting ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <>
                <IconButton icon="message-text-outline" size={18} iconColor="#0F172A" style={{ margin: 0, padding: 0 }} />
                <Text style={styles.chatActionText}>Discuss Specs</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.bidActionButton}
            onPress={() => handleQuotePress(item)}
            activeOpacity={0.85}
          >
            <IconButton icon="gavel" size={18} iconColor="#FFFFFF" style={{ margin: 0, padding: 0 }} />
            <Text style={styles.bidActionText}>Submit Formal Bid</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.screenHeader}>
        <IconButton icon="arrow-left" size={24} iconColor="#0F172A" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Live Chemical Market</Text>
          <Text style={styles.headerSubtitle}>
            {leads.length} active inquiries available for quotation
          </Text>
        </View>
      </View>

      {/* Search / Filter Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          placeholder="Filter by chemical name or port (e.g., Dahej, Toluene)..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          left={<TextInput.Icon icon="magnify" color="#64748B" />}
          right={searchQuery ? <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} /> : undefined}
          style={styles.searchInput}
          outlineStyle={styles.searchOutline}
          dense
        />
      </View>

      {loading ? (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonBar} />
              <View style={[styles.skeletonBar, { width: '60%', marginVertical: 8 }]} />
              <View style={[styles.skeletonBar, { width: '80%', height: 48, borderRadius: 8 }]} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={displayedLeads}
          keyExtractor={(item) => item.id!}
          renderItem={renderLead}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconButton icon="package-variant-closed" size={48} iconColor="#94A3B8" />
              <Text style={styles.emptyTitle}>No Matching Inquiries</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search keywords.' : 'New market inquiries appear here in real time.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Modern B2B Bid Modal */}
      <Portal>
        <Modal 
          visible={!!selectedLead} 
          onDismiss={() => setSelectedLead(null)} 
          contentContainerStyle={styles.modalContent}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalPretitle}>FORMAL BID QUOTATION</Text>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedLead?.productName}
                </Text>
              </View>
              <IconButton icon="close" size={20} iconColor="#64748B" onPress={() => setSelectedLead(null)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Reference Lead Snapshot */}
              <View style={styles.modalLeadSnapshot}>
                <View style={styles.snapshotRow}>
                  <Text style={styles.snapshotLabel}>Buyer Target Price:</Text>
                  <Text style={styles.snapshotValue}>
                    ₹{selectedLead?.targetPrice ? selectedLead.targetPrice.toLocaleString('en-IN') : 'Open'} / {selectedLead?.unit}
                  </Text>
                </View>
                <View style={styles.snapshotRow}>
                  <Text style={styles.snapshotLabel}>Required Quantity:</Text>
                  <Text style={styles.snapshotValue}>
                    {Number(selectedLead?.quantityRequired).toLocaleString('en-IN')} {selectedLead?.unit}
                  </Text>
                </View>
              </View>

              {/* Input Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>YOUR QUOTED PRICE PER {selectedLead?.unit?.toUpperCase() || 'UNIT'} (₹)</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder={`e.g. ${selectedLead?.targetPrice || '120'}`}
                  keyboardType="numeric"
                  mode="outlined"
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#059669"
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>AVAILABLE SUPPLY QUANTITY ({selectedLead?.unit?.toUpperCase()})</Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder={`e.g. ${selectedLead?.quantityRequired || '5000'}`}
                  keyboardType="numeric"
                  mode="outlined"
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#059669"
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>ESTIMATED DISPATCH DAYS</Text>
                <TextInput
                  value={dispatchDays}
                  onChangeText={setDispatchDays}
                  placeholder="e.g. 2 Days"
                  mode="outlined"
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#059669"
                  style={styles.fieldInput}
                />
              </View>

              {/* Live Contract Value Breakdown */}
              {baseValue > 0 && (
                <View style={styles.dealCalculationCard}>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Base Contract Value:</Text>
                    <Text style={styles.calcValue}>₹{baseValue.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Estimated GST (18%):</Text>
                    <Text style={styles.calcValue}>+₹{gstValue.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={[styles.calcRow, styles.calcTotalRow]}>
                    <Text style={styles.calcTotalLabel}>Total Deal Estimate:</Text>
                    <Text style={styles.calcTotalValue}>₹{totalValue.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              )}

              {/* Submit CTA */}
              <TouchableOpacity
                style={[styles.modalSubmitButton, isSubmitting && { opacity: 0.7 }]}
                onPress={submitQuote}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Quotation to Buyer</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
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
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    fontSize: 13,
  },
  searchOutline: {
    borderRadius: 8,
    borderColor: '#E2E8F0',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Deal Matrix Card */
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5,
  },
  sourceText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  productTitle: {
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

  /* Action Bar */
  cardActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  chatActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
  },
  chatActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 2,
  },
  bidActionButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 8,
  },
  bidActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 2,
  },

  /* Skeletons */
  skeletonContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skeletonBar: {
    height: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    width: '40%',
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },

  /* Modal */
  modalContent: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  modalPretitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalLeadSnapshot: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  snapshotLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  snapshotValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  formGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  dealCalculationCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calcLabel: {
    fontSize: 12,
    color: '#166534',
  },
  calcValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    fontVariant: ['tabular-nums'],
  },
  calcTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
    paddingTop: 6,
    marginTop: 4,
    marginBottom: 0,
  },
  calcTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14532D',
  },
  calcTotalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14532D',
    fontVariant: ['tabular-nums'],
  },
  modalSubmitButton: {
    backgroundColor: '#059669',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
