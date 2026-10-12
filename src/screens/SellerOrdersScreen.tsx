// src/screens/SellerOrdersScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, Modal, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text, Divider, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import * as DocumentPicker from 'expo-document-picker'; 
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { sellerAcceptOrder, sellerDeclineOrder } from '../services/orderService';
import { Order } from '../types';

export default function SellerOrdersScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAppStore();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'requests' | 'history'>('requests'); 

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docs, setDocs] = useState({ qualityFile: null as any, purity: '', grade: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const pendingOrders = orders.filter(o => o.status === 'PENDING_SELLER');
  const historyOrders = orders.filter(o => o.status !== 'PENDING_SELLER');

  const handleAcceptClick = (order: Order) => { 
    setSelectedOrder(order); 
    setShowDocModal(true); 
  };

  const handleDecline = (orderId: string) => {
    Alert.alert('Decline Order', 'Are you sure you want to decline this purchase order?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline Order', style: 'destructive', onPress: async () => await sellerDeclineOrder(orderId) }
    ]);
  };

  const handleRequestInvoice = async (order: Order) => {
    const phoneNumber = '+918460852903';
    const message = `Hello, I need the Tax Invoice for Order #${order.id.slice(0,6).toUpperCase()}.`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${phoneNumber}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('WhatsApp Not Installed', 'Please contact support at +91-84608 52903.');
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.assets && result.assets.length > 0) {
        setDocs({ ...docs, qualityFile: result.assets[0] });
      }
    } catch (err) { 
      console.error("Document picking error:", err); 
    }
  };

  const submitDocuments = async () => {
    if (!selectedOrder || !docs.qualityFile || !docs.purity || !docs.grade) {
      Alert.alert('Missing Documents', 'Please enter the chemical purity, grade, and attach the test report (CoA).'); 
      return;
    }
    setSubmitting(true);
    try {
      const fileUrl = await new Promise<string>((res) => setTimeout(() => res(`https://mock-url.com/${docs.qualityFile.name}`), 800));
      await sellerAcceptOrder(selectedOrder.id, { 
        qualityReport: fileUrl, 
        fileName: docs.qualityFile.name, 
        purityCertificate: docs.purity, 
        gradeSheet: docs.grade 
      });
      setShowDocModal(false);
      setDocs({ qualityFile: null, purity: '', grade: '' });
      Alert.alert('Order Accepted ✓', 'Certificate transmitted to buyer. Please prepare material for dispatch.');
    } catch (error) { 
      Alert.alert('Error', 'Failed to submit acceptance documents.'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_SELLER':
        return { label: 'PENDING ACCEPTANCE', bg: '#FEF3C7', color: '#B45309' };
      case 'ACCEPTED':
        return { label: 'ACCEPTED (PREPARING)', bg: '#EFF6FF', color: '#1D4ED8' };
      case 'shipped':
        return { label: 'IN TRANSIT (DISPATCHED)', bg: '#F3E8FF', color: '#7E22CE' };
      case 'delivered':
        return { label: 'ESCROW SETTLED', bg: '#ECFDF5', color: '#059669' };
      case 'REJECTED':
      case 'CANCELLED':
        return { label: 'CANCELLED', bg: '#FEE2E2', color: '#DC2626' };
      default:
        return { label: status.replace('_', ' '), bg: '#F1F5F9', color: '#64748B' };
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const isRequest = item.status === 'PENDING_SELLER';
    const badge = getStatusBadge(item.status);
    const prodName = item.items[0]?.name || 'Chemical Material';
    const volume = item.items[0]?.quantity || 0;
    const unit = (item.items[0] as any)?.unit || 'kg';

    return (
      <View style={styles.orderCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
              <Text style={styles.orderDate}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.orderId}>PO #{item.id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.escrowLabel}>ESCROW VALUE</Text>
            <Text style={styles.orderTotal}>₹{Number(item.totalAmount).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Chemical Line Item Summary */}
        <View style={styles.productBlock}>
          <Text style={styles.productName} numberOfLines={1}>{prodName}</Text>
          <Text style={styles.productSpecs}>
            Volume: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{volume} {unit}</Text> • Buyer: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{(item as any).buyerName || 'Verified Buyer'}</Text>
          </Text>
          {(item as any).deliveryPincode && (
            <Text style={styles.deliveryText}>📍 Dispatch to Pincode: {(item as any).deliveryPincode}</Text>
          )}
        </View>

        {/* Card Actions */}
        <View style={styles.cardActions}>
          {!isRequest ? (
            <TouchableOpacity onPress={() => handleRequestInvoice(item)} style={styles.invoiceBtn}>
              <Text style={styles.invoiceBtnText}>📄 Request Tax Invoice</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.requestActions}>
              <TouchableOpacity 
                style={styles.declineBtn} 
                onPress={() => handleDecline(item.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.acceptBtn} 
                onPress={() => handleAcceptClick(item)}
                activeOpacity={0.88}
              >
                <Text style={styles.acceptBtnText}>Attach CoA & Accept →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} iconColor="#0F172A" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Order Fulfillment Desk</Text>
          <Text style={styles.headerSubtitle}>
            Escrow-backed purchase orders and dispatch confirmations
          </Text>
        </View>
      </View>

      {/* Segmented Switch */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, tab === 'requests' && styles.tabBtnActive]}
          onPress={() => setTab('requests')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabBtnText, tab === 'requests' && styles.tabBtnTextActive]}>
            Pending Acceptance ({pendingOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
          onPress={() => setTab('history')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>
            Fulfillment History ({historyOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0F172A" />
          <Text style={styles.loadingText}>Fetching order ledger...</Text>
        </View>
      ) : (
        <FlatList 
          data={tab === 'requests' ? pendingOrders : historyOrders}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconButton icon="clipboard-check-outline" size={48} iconColor="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {tab === 'requests' ? 'No orders awaiting acceptance' : 'No order fulfillment records found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {tab === 'requests' 
                  ? 'When buyers checkout and fund escrow, their purchase orders will appear here for CoA verification.'
                  : 'Delivered and in-transit orders will be archived here.'}
              </Text>
            </View>
          }
        />
      )}

      {/* CoA & DOCUMENT MODAL */}
      <Modal visible={showDocModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Attach Certificate of Analysis (CoA)</Text>
                <Text style={styles.modalSub}>Mandatory quality test report before dispatch acceptance</Text>
              </View>
              <IconButton icon="close" size={20} iconColor="#64748B" onPress={() => setShowDocModal(false)} />
            </View>

            <View style={styles.modalBody}>
              {/* Document Picker */}
              <View style={styles.uploadArea}>
                {docs.qualityFile ? (
                  <View style={styles.filePreview}>
                    <Text numberOfLines={1} style={styles.fileName}>{docs.qualityFile.name}</Text>
                    <IconButton icon="close-circle" size={18} iconColor="#EF4444" onPress={() => setDocs({...docs, qualityFile: null})} />
                  </View>
                ) : (
                  <TouchableOpacity onPress={pickDocument} style={styles.uploadBox} activeOpacity={0.8}>
                    <IconButton icon="file-upload-outline" size={26} iconColor="#059669" style={{ margin: 0 }} />
                    <Text style={styles.uploadBoxText}>Attach Quality / Test Certificate (PDF)</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput 
                label="Certified Purity (%) *" 
                placeholder="e.g. 99.5" 
                value={docs.purity} 
                onChangeText={t => setDocs({...docs, purity: t})} 
                mode="outlined" 
                style={styles.modalInput} 
              />
              <TextInput 
                label="Manufacturing Grade *" 
                placeholder="e.g. Tech Grade / BP / IP" 
                value={docs.grade} 
                onChangeText={t => setDocs({...docs, grade: t})} 
                mode="outlined" 
                style={styles.modalInput} 
              />

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalCancelBtn} 
                  onPress={() => setShowDocModal(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalSubmitBtn, submitting && { opacity: 0.7 }]} 
                  onPress={submitDocuments}
                  disabled={submitting}
                >
                  <Text style={styles.modalSubmitBtnText}>
                    {submitting ? 'Confirming...' : 'Accept Order →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  /* Tabs */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: '#0F172A',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
  },

  /* Order Card */
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  orderDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  escrowLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
    fontVariant: ['tabular-nums'],
  },
  productBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  productSpecs: {
    fontSize: 12,
    color: '#64748B',
  },
  deliveryText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceBtn: {
    paddingVertical: 4,
  },
  invoiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  declineBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  acceptBtn: {
    flex: 2,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },

  /* Modal */
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    justifyContent: 'center', 
    padding: 20,
  },
  modalCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
  },
  modalBody: {
    padding: 16,
  },
  uploadArea: {
    marginBottom: 12,
  },
  uploadBox: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
  },
  uploadBoxText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 4,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  fileName: {
    fontSize: 12,
    color: '#0F172A',
    flex: 1,
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
