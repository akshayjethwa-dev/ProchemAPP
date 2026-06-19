// src/screens/CommerceHubScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, Card, Button, SegmentedButtons, useTheme, IconButton, TextInput, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { Product, BroadcastLead, RFQ } from '../types';

// Helper function to safely parse Firestore timestamps or ISO strings for sorting
const getTime = (dateVal: any) => {
  if (!dateVal) return 0;
  if (dateVal.seconds) return dateVal.seconds * 1000;
  if (typeof dateVal === 'string' || typeof dateVal === 'number') return new Date(dateVal).getTime();
  if (dateVal.toMillis) return dateVal.toMillis();
  return 0;
};

export default function CommerceHubScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAppStore();

  const [activeTab, setActiveTab] = useState('spot');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [spotOffers, setSpotOffers] = useState<Product[]>([]);
  const [liveRequirements, setLiveRequirements] = useState<BroadcastLead[]>([]);

  // Quote Modal State
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [selectedReq, setSelectedReq] = useState<BroadcastLead | null>(null);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteQty, setQuoteQty] = useState('');
  const [quoteDays, setQuoteDays] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      // 1. Fetch Spot Offers (Active Products that are Ready to Dispatch or In Stock)
      const qProducts = query(collection(db, 'products'), where('active', '==', true));
      const prodSnap = await getDocs(qProducts);
      const prods = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      
      // Filter strictly for spot offers and exclude user's own products
      const filteredSpot = prods.filter(p => (p.readyToDispatch || p.inStock) && p.sellerId !== user.uid);
      
      // 🚀 FIX: Sort Spot Offers client-side (Newest First)
      filteredSpot.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
      
      setSpotOffers(filteredSpot);

      // 2. Fetch Active RFQs to hide broadcast leads we are already negotiating (Matching Seller side logic)
      const qRfqs = query(collection(db, 'rfqs'), where('sellerId', '==', user.uid));
      const rfqSnap = await getDocs(qRfqs);
      const activeRfqs = rfqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RFQ)).filter(rfq => rfq.status === 'PENDING' || rfq.status === 'NEGOTIATING');

      // 3. Fetch Live Market Requirements (from broadcastLeads, exactly like SellerLiveLeadsScreen)
      const qLeads = query(collection(db, 'broadcastLeads'), where('status', '==', 'OPEN'));
      const leadSnap = await getDocs(qLeads);
      const leads = leadSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BroadcastLead));

      const filteredLeads = leads.filter(lead => {
        // Hide if user is explicitly excluded (i.e. they are the original buyer)
        if (lead.excludedSellerId === user.uid) return false;
        if (lead.excludedSellerIds && lead.excludedSellerIds.includes(user.uid)) return false;
        
        // Hide if user is already actively negotiating this lead
        const isNegotiating = activeRfqs.some(rfq => 
          (lead.rfqId && lead.rfqId === rfq.id) || 
          (lead.originalOrderId && lead.originalOrderId === rfq.id) || 
          (rfq.productName.toLowerCase() === lead.productName.toLowerCase() && String(rfq.targetQuantity) === String(lead.quantityRequired))
        );
        
        return !isNegotiating;
      });
      
      // 🚀 FIX: Sort Live Requirements client-side (Newest First)
      filteredLeads.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));

      setLiveRequirements(filteredLeads);

    } catch (error) {
      console.error("Error fetching commerce data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // 🚀 ACTION: Negotiate a Spot Offer directly
  const handleNegotiateSpotOffer = async (product: Product) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const rfqData = {
        productId: product.id,
        productName: product.name,
        buyerId: user.uid,
        buyerName: user.companyName || user.name || 'Buyer',
        sellerId: product.sellerId,
        sellerName: product.sellerName || 'Seller',
        targetQuantity: product.moq || 1,
        targetPrice: product.price,
        unit: product.unit || 'kg',
        deliveryPincode: user.pincode || '000000',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, 'rfqs'), rfqData);
      setIsSubmitting(false);
      navigation.navigate('NegotiationRoom', { rfqId: docRef.id });
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Could not start negotiation.');
    }
  };

  // 🚀 ACTION: Submit Quote for Live Requirement
  const handleSubmitQuote = async () => {
    if (!selectedReq || !user) return;
    if (!quotePrice || !quoteQty || !quoteDays) return Alert.alert('Error', 'Please fill all fields.');

    setIsSubmitting(true);
    try {
      const quoteData = {
        leadId: selectedReq.id,
        productName: selectedReq.productName,
        supplierId: user.uid,
        supplierName: user.companyName || user.name || 'Supplier',
        pricePerUnit: Number(quotePrice),
        availableQuantity: quoteQty,
        dispatchDays: quoteDays,
        status: 'PENDING',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'supplierQuotes'), quoteData);
      
      setIsSubmitting(false);
      setQuoteModalVisible(false);
      setQuotePrice(''); setQuoteQty(''); setQuoteDays('');
      Alert.alert('Success', 'Quote submitted successfully. Admin will review it shortly.');
      
      // Refresh the list to hide the quoted requirement
      fetchData();
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to submit quote.');
    }
  };

  const renderSpotOffer = ({ item }: { item: Product }) => (
    <Card style={styles.card} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={{flex: 1}}>
            <Text variant="titleMedium" style={styles.title}>{item.name}</Text>
          </View>
          <Chip mode="outlined" style={{backgroundColor: '#F1F5F9'}}>Spot</Chip>
        </View>
        <Divider style={{marginVertical: 10}} />
        <View style={styles.row}>
          <View>
             <Text style={styles.label}>Price</Text>
             <Text style={styles.value}>₹{item.price} / {item.unit || 'unit'}</Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
             <Text style={styles.label}>MOQ</Text>
             <Text style={styles.value}>{item.moq || 1} {item.unit || 'unit'}</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
           <Button mode="outlined" style={{flex: 1, marginRight: 8}} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}>
             View Details
           </Button>
           <Button mode="contained" buttonColor="#004AAD" style={{flex: 1}} onPress={() => handleNegotiateSpotOffer(item)} loading={isSubmitting} disabled={isSubmitting}>
             Negotiate
           </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderLiveRequirement = ({ item }: { item: BroadcastLead }) => {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={{flex: 1}}>
              <Text variant="titleMedium" style={styles.title}>{item.productName}</Text>
              <Text style={styles.subtitle}>📍 {item.deliveryRegion}</Text>
            </View>
            <Chip style={{backgroundColor: '#FEE2E2'}} textStyle={{color: '#DC2626', fontSize: 10, fontWeight: 'bold'}}>LIVE</Chip>
          </View>
          <Divider style={{marginVertical: 10}} />
          <View style={styles.row}>
            <View>
               <Text style={styles.label}>Required Qty</Text>
               <Text style={styles.value}>{item.quantityRequired} {item.unit}</Text>
            </View>
            <View style={{alignItems: 'flex-end'}}>
               <Text style={styles.label}>Target Price</Text>
               <Text style={styles.value}>{(item as any).targetPrice ? `₹${(item as any).targetPrice}` : 'Open'}</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
             <Button mode="contained" buttonColor="#F59E0B" style={{flex: 1}} onPress={() => { setSelectedReq(item); setQuoteModalVisible(true); }}>
               Submit Quote
             </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{fontWeight: 'bold'}}>Market Orders</Text>
      </View>

      <View style={{paddingHorizontal: 16, paddingTop: 10, paddingBottom: 5}}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'spot', label: 'Spot Offers', icon: 'tag-multiple' },
            { value: 'live', label: 'Live Requirements', icon: 'clipboard-pulse-outline' },
          ]}
          style={{backgroundColor: 'white'}}
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#004AAD" /></View>
      ) : activeTab === 'spot' ? (
        <FlatList<Product>
          data={spotOffers}
          keyExtractor={item => item.id!}
          renderItem={renderSpotOffer}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{fontSize: 40, marginBottom: 10}}>🛒</Text>
              <Text style={{color: '#64748B', fontSize: 16}}>No active spot offers available.</Text>
            </View>
          }
        />
      ) : (
        <FlatList<BroadcastLead>
          data={liveRequirements}
          keyExtractor={item => item.id!}
          renderItem={renderLiveRequirement}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{fontSize: 40, marginBottom: 10}}>📝</Text>
              <Text style={{color: '#64748B', fontSize: 16}}>No live requirements posted currently.</Text>
            </View>
          }
        />
      )}

      {/* Quote Submission Modal */}
      <Modal visible={quoteModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
              <Text variant="titleLarge" style={{fontWeight: 'bold'}}>Submit Quote</Text>
              <IconButton icon="close" onPress={() => setQuoteModalVisible(false)} />
            </View>
            
            <Text style={{color: '#64748B', marginBottom: 15}}>Quoting for: <Text style={{fontWeight: 'bold', color: 'black'}}>{selectedReq?.productName}</Text></Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
               <TextInput mode="outlined" keyboardType="numeric" label={`Price per ${selectedReq?.unit || 'unit'} (₹)`} value={quotePrice} onChangeText={setQuotePrice} style={styles.input} />
               <TextInput mode="outlined" label={`Available Qty (${selectedReq?.unit})`} value={quoteQty} onChangeText={setQuoteQty} style={styles.input} />
               <TextInput mode="outlined" keyboardType="numeric" label="Dispatch in (Days)" value={quoteDays} onChangeText={setQuoteDays} style={styles.input} />
               
               <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10}}>
                  <Button mode="text" onPress={() => setQuoteModalVisible(false)}>Cancel</Button>
                  <Button mode="contained" onPress={handleSubmitQuote} buttonColor="#F59E0B" loading={isSubmitting} disabled={isSubmitting}>
                    Submit Quote
                  </Button>
               </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 5, elevation: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'white', borderRadius: 12, marginBottom: 16, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  label: { fontSize: 11, color: '#64748B', textTransform: 'uppercase' },
  value: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  emptyState: { alignItems: 'center', marginTop: 80 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  input: { backgroundColor: 'white', marginBottom: 12 }
});