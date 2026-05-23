import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Linking, Modal, KeyboardAvoidingView, Keyboard, Image } from 'react-native';
import { Text, Button, IconButton, useTheme, Divider, Chip, Avatar, TextInput, Snackbar, List } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, addDoc, doc, setDoc, query, where, getDocs } from 'firebase/firestore'; 
import { db } from '../config/firebase'; 
import { useAppStore } from '../store/appStore';
import { Product, TieredPrice } from '../types'; 

export default function ProductDetail() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  
  const insets = useSafeAreaInsets();
  
  const { productId, product: paramProduct } = route.params || {};
  const { products, cart, addToCart, removeFromCart, addToCompare, compareList, user } = useAppStore();
  
  const product = products.find(p => p.id === productId) || paramProduct || ({} as Product);

  const minQty = product.moq || 10;
  const unit = product.unit || 'kg';
  const price = product.pricePerUnit || product.price || 0;

  const [qty, setQty] = useState(String(minQty));
  
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [rfqLoading, setRfqLoading] = useState(false);
  const [rfqForm, setRfqForm] = useState({ targetQty: '', targetPrice: '', pincode: '', notes: '' });

  const [rfqSuccess, setRfqSuccess] = useState({ visible: false, rfqId: '' });
  
  const [compareVisible, setCompareVisible] = useState(false);
  const [favoriteVisible, setFavoriteVisible] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState('');

  // Accordion state
  const [expandedSection, setExpandedSection] = useState<string | null>('specs'); // Keep specs open by default

  useEffect(() => {
    setQty(String(minQty));
  }, [product]);

  const isFavorite = cart.some(p => p.id === `${product.id}_favorite`);

  const toggleFavorite = () => {
    if (isFavorite) {
      removeFromCart(`${product.id}_favorite`);
      setFavoriteMessage('Removed from Favorites');
      setFavoriteVisible(true);
    } else {
      addToCart({
        ...product,
        id: `${product.id}_favorite`, 
        name: `${product.name} (Saved)`,
        quantity: 1,
        pricePerUnit: price,
        unit: unit,
        sellerId: product.sellerId || 'unknown',
        price: price
      });
      setFavoriteMessage('Added to Favorites ❤️');
      setFavoriteVisible(true);
    }
  };

  const submitRFQ = async () => {
    Keyboard.dismiss();

    if (!user) return Alert.alert('Error', 'Please log in to request a quote.');
    if (!rfqForm.targetQty || !rfqForm.targetPrice || !rfqForm.pincode) {
      return Alert.alert('Error', 'Please fill required RFQ fields.');
    }

    setRfqLoading(true);
    try {
      const q = query(
        collection(db, 'rfqs'), 
        where('productId', '==', product.id), 
        where('buyerId', '==', user.uid),
        where('status', 'in', ['PENDING', 'NEGOTIATING'])
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
         setRfqLoading(false);
         setShowRfqModal(false);
         const existingId = snapshot.docs[0].id;
         setTimeout(() => {
           Alert.alert('Duplicate Request', 'You already have an active negotiation for this product.', [
             { text: 'Go to Chat', onPress: () => navigation.navigate('NegotiationRoom', { rfqId: existingId }) },
             { text: 'Cancel', style: 'cancel' }
           ]);
         }, 400);
         return;
      }

      const newRfqRef = doc(collection(db, 'rfqs')); 
      const newRfqId = newRfqRef.id;

      await setDoc(newRfqRef, {
        id: newRfqId,
        productId: product.id,
        productName: product.name,
        buyerId: user.uid,
        buyerName: user.companyName || 'Buyer Company', 
        sellerId: product.sellerId || 'unknown', 
        sellerName: product.sellerName || 'Verified Supplier',
        targetQuantity: parseInt(rfqForm.targetQty),
        targetPrice: parseFloat(rfqForm.targetPrice),
        unit: unit,
        deliveryPincode: rfqForm.pincode,
        notes: rfqForm.notes || '',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await addDoc(collection(db, 'messages'), {
        rfqId: newRfqId,
        text: `System: Buyer requested ${rfqForm.targetQty}${unit} at ₹${rfqForm.targetPrice}/${unit}. Delivery to ${rfqForm.pincode}. Notes: ${rfqForm.notes || 'None'}`,
        senderId: user.uid,
        timestamp: Date.now(),
        isBuyer: true,
        isOffer: true,
        proposedPrice: parseFloat(rfqForm.targetPrice),
        proposedQty: parseInt(rfqForm.targetQty)
      });

      try {
        await addDoc(collection(db, 'broadcastLeads'), {
          originalOrderId: newRfqId,
          sourceType: 'RFQ', 
          productId: product.id,
          productName: product.name,
          quantityRequired: parseInt(rfqForm.targetQty),
          unit: unit,
          deliveryRegion: rfqForm.pincode,
          targetPrice: parseFloat(rfqForm.targetPrice),
          status: 'OPEN',
          excludedSellerId: product.sellerId, 
          createdAt: new Date().toISOString()
        });
      } catch (broadcastErr) {
        console.error("Failed to broadcast RFQ:", broadcastErr);
      }

      setRfqLoading(false);
      setShowRfqModal(false);

      setTimeout(() => {
        setRfqSuccess({ visible: true, rfqId: newRfqId });
      }, 500);
      
    } catch (e: any) {
      console.error("RFQ Error:", e);
      setRfqLoading(false);
      Alert.alert('Error', e.message || 'Failed to submit quote request.');
    }
  };

  const handleCompare = () => {
    addToCompare(product);
    setCompareVisible(true);
  };

  const openDocument = async (url: string | undefined, docName: string) => {
    if (!url) return Alert.alert('Not Available', `The seller has not uploaded the ${docName} for this product.`);
    try { await Linking.openURL(url); } catch (error) { Alert.alert('Error', `Could not open the ${docName} document.`); }
  };

  const handleAccordionPress = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!product.name) return null;

  const isAlreadyInCompare = compareList.some(p => p.id === product.id);
  const isPremiumSupplier = (product as any).sellerTier === 'GROWTH_PACKAGE';

  return (
    <View style={styles.container}>
      
      {/* RFQ MODAL */}
      <Modal transparent visible={showRfqModal} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
              <Text variant="titleLarge" style={{fontWeight:'bold'}}>Request Custom Quote</Text>
              <IconButton icon="close" onPress={() => { Keyboard.dismiss(); setShowRfqModal(false); }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow: 1, paddingBottom: 20}}>
              <Text style={{color: '#666', marginBottom: 15, fontSize: 13}}>Propose your desired quantity and target price directly to the supplier.</Text>
              <TextInput label={`Target Quantity (${unit}) *`} keyboardType="numeric" value={rfqForm.targetQty} onChangeText={t => setRfqForm({...rfqForm, targetQty: t})} mode="outlined" style={styles.rfqInput} />
              <TextInput label="Target Price per Unit (₹) *" keyboardType="numeric" value={rfqForm.targetPrice} onChangeText={t => setRfqForm({...rfqForm, targetPrice: t})} mode="outlined" style={styles.rfqInput} left={<TextInput.Affix text="₹ " />} />
              <TextInput label="Delivery Pincode *" keyboardType="numeric" value={rfqForm.pincode} onChangeText={t => setRfqForm({...rfqForm, pincode: t})} mode="outlined" style={styles.rfqInput} maxLength={6} />
              <TextInput label="Additional Notes (Optional)" multiline numberOfLines={3} value={rfqForm.notes} onChangeText={t => setRfqForm({...rfqForm, notes: t})} mode="outlined" style={styles.rfqInput} placeholder="e.g. Need immediate dispatch" />
              <Button mode="contained" onPress={submitRFQ} loading={rfqLoading} style={{marginTop: 10, backgroundColor: theme.colors.primary}} contentStyle={{height: 50}}>Submit RFQ to Seller</Button>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal transparent visible={rfqSuccess.visible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {alignItems: 'center'}]}>
            <Avatar.Icon size={64} icon="check-decagram" style={{backgroundColor: '#DCFCE7', marginBottom: 15}} color="#166534" />
            <Text variant="headlineSmall" style={{fontWeight:'bold', color: '#166534', marginBottom: 10}}>Quote Sent!</Text>
            <Text style={{textAlign: 'center', color: '#475569', marginBottom: 20, lineHeight: 22}}>Your request has been securely sent to the supplier. They will review it and reply shortly.</Text>
            <View style={{backgroundColor: '#F8FAFC', padding: 15, borderRadius: 12, width: '100%', marginBottom: 25, borderWidth: 1, borderColor: '#E2E8F0'}}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                 <Avatar.Icon size={24} icon="information-outline" style={{backgroundColor: 'transparent', margin: 0, padding: 0}} color={theme.colors.primary} />
                 <Text style={{fontWeight: 'bold', color: theme.colors.primary, marginLeft: 4}}>Where to find this later?</Text>
              </View>
              <Text style={{color: '#64748B', fontSize: 13}}>You can track responses and continue negotiations by going to:</Text>
              <Text style={{fontWeight: 'bold', color: '#1E293B', marginTop: 8, fontSize: 14}}>Account Tab  →  My Quotes & Negotiations</Text>
            </View>
            <Button mode="contained" style={{width: '100%', marginBottom: 12, backgroundColor: theme.colors.primary}} contentStyle={{height: 48}} onPress={() => { setRfqSuccess({ visible: false, rfqId: '' }); navigation.navigate('NegotiationRoom', { rfqId: rfqSuccess.rfqId }); }}>Go to Chat Room Now</Button>
            <Button mode="outlined" style={{width: '100%', borderColor: '#CBD5E1'}} textColor="#64748B" contentStyle={{height: 48}} onPress={() => setRfqSuccess({ visible: false, rfqId: '' })}>Got it, continue browsing</Button>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{paddingBottom: 100}} showsVerticalScrollIndicator={false}>
        {/* HERO SECTION */}
        <View style={styles.heroContainer}>
          <View style={[styles.safeHeader, { paddingTop: Math.max(insets.top, 10) }]}>
            <IconButton icon="arrow-left" iconColor="black" containerColor="rgba(255,255,255,0.8)" onPress={() => navigation.goBack()} />
            <View style={{flexDirection: 'row'}}>
              <IconButton icon="compare-horizontal" iconColor={isAlreadyInCompare ? theme.colors.primary : "black"} containerColor="rgba(255,255,255,0.8)" onPress={handleCompare} />
              <IconButton icon={isFavorite ? "cards-heart" : "heart-outline"} iconColor={isFavorite ? "red" : "black"} containerColor="rgba(255,255,255,0.8)" onPress={toggleFavorite} />
            </View>
          </View>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}><Text style={{fontSize: 80}}>🧪</Text></View>
          )}
        </View>

        <View style={styles.content}>
          {/* PRICE & MOQ BLOCK */}
          <View style={styles.titleRow}>
            <View style={{flex: 1, paddingRight: 15}}>
              <Text variant="headlineMedium" style={styles.title}>{product.name}</Text>
              <View style={styles.badgeContainer}>
                <Text style={styles.categoryText}>{product.category}</Text>
                {product.verified && <Chip icon="check-decagram" textStyle={{fontSize:10, marginVertical:0}} style={styles.verifiedChip}>Verified</Chip>}
                {product.hazardClass && product.hazardClass !== 'Non-Hazardous' && <Chip icon="alert" textStyle={{fontSize:10, marginVertical:0, color:'#D32F2F'}} style={styles.hazardChip}>{product.hazardClass}</Chip>}
              </View>
            </View>
          </View>
          
          <View style={styles.priceMoqContainer}>
            <View>
              <Text variant="headlineMedium" style={{color: theme.colors.primary, fontWeight:'bold'}}>₹{price}</Text>
              <Text variant="bodySmall" style={{color: '#6B7280'}}>per {unit} (Reference)</Text>
            </View>
            <View style={styles.moqBox}>
              <Text variant="labelSmall" style={{color: '#6B7280', textTransform: 'uppercase'}}>Min. Order</Text>
              <Text variant="titleMedium" style={{fontWeight: 'bold', color: '#111827'}}>{minQty} {unit}</Text>
            </View>
          </View>

          {/* TIERED PRICING */}
          {product.tieredPricing && product.tieredPricing.length > 0 && (
            <View style={styles.volumeDiscounts}>
              <Text variant="labelLarge" style={{fontWeight:'bold', color: '#166534', marginBottom: 8}}>Bulk Order Discounts Available</Text>
              {product.tieredPricing.map((tier: any, idx: number) => (
                <View key={idx} style={styles.tierRow}>
                  <Text style={{color: '#15803D'}}>≥ {tier.minQty} {unit}</Text>
                  <Text style={{fontWeight: 'bold', color: '#166534'}}>₹{tier.pricePerUnit} / {unit}</Text>
                </View>
              ))}
            </View>
          )}

          {/* SUPPLIER TRUST BLOCK */}
          <View style={[styles.supplierBlock, isPremiumSupplier && styles.premiumSupplierBlock]}>
            <Avatar.Icon size={40} icon={isPremiumSupplier ? "crown" : "shield-check"} style={{backgroundColor: isPremiumSupplier ? '#FEF3C7' : '#E0F2FE'}} color={isPremiumSupplier ? '#D97706' : '#0284C7'} />
            <View style={{marginLeft: 12, flex: 1}}>
              <Text variant="titleMedium" style={{fontWeight:'bold', color: isPremiumSupplier ? '#92400E' : '#0369A1'}}>
                {isPremiumSupplier ? 'Verified Premium Supplier' : 'Prochem Verified Supplier'}
              </Text>
              <Text variant="bodySmall" style={{color: '#475569'}}>Origin: {product.origin || 'India'}</Text>
              <Text variant="labelSmall" style={{color: isPremiumSupplier ? '#D97706' : '#16A34A', fontWeight:'bold', marginTop: 4}}>
                ✓ {isPremiumSupplier ? '100% Upfront Payment Assured' : 'Quality Checked'}
              </Text>
            </View>
          </View>

          {/* COLLAPSIBLE SECTIONS */}
          <List.Section style={{marginTop: 10}}>
            
            <List.Accordion
              title="Chemical Specifications"
              left={props => <List.Icon {...props} icon="flask" />}
              expanded={expandedSection === 'specs'}
              onPress={() => handleAccordionPress('specs')}
              style={styles.accordionHeader}
            >
              <View style={styles.grid}>
                <View style={styles.gridItem}><Text style={styles.label}>Grade</Text><Text style={styles.value}>{product.grade || 'Technical'}</Text></View>
                <View style={styles.gridItem}><Text style={styles.label}>Purity</Text><Text style={styles.value}>{product.purity || 'N/A'}%</Text></View>
                <View style={styles.gridItem}><Text style={styles.label}>CAS No.</Text><Text style={styles.value}>{product.casNumber || 'N/A'}</Text></View>
              </View>
            </List.Accordion>

            <List.Accordion
              title="Logistics & Handling"
              left={props => <List.Icon {...props} icon="truck-outline" />}
              expanded={expandedSection === 'logistics'}
              onPress={() => handleAccordionPress('logistics')}
              style={styles.accordionHeader}
            >
              <View style={styles.grid}>
                <View style={styles.gridItem}><Text style={styles.label}>Packaging</Text><Text style={styles.value}>{product.packagingType || 'Standard'}</Text></View>
                <View style={styles.gridItem}><Text style={styles.label}>UN Number</Text><Text style={styles.value}>{product.unNumber || 'N/A'}</Text></View>
                <View style={styles.gridItem}><Text style={styles.label}>Storage</Text><Text style={styles.value} numberOfLines={2} adjustsFontSizeToFit>{product.storageConditions || 'Room Temp'}</Text></View>
              </View>
            </List.Accordion>

            <List.Accordion
              title="Technical Documents"
              left={props => <List.Icon {...props} icon="file-document-multiple-outline" />}
              expanded={expandedSection === 'docs'}
              onPress={() => handleAccordionPress('docs')}
              style={styles.accordionHeader}
            >
              <View style={styles.docRow}>
                <Button mode="outlined" icon="file-download-outline" onPress={() => openDocument(product.tdsUrl, 'TDS')} style={styles.docBtn} disabled={!product.tdsUrl}>TDS</Button>
                <Button mode="outlined" icon="file-download-outline" onPress={() => openDocument(product.msdsUrl, 'MSDS')} style={styles.docBtn} disabled={!product.msdsUrl}>MSDS</Button>
                <Button mode="outlined" icon="file-download-outline" onPress={() => openDocument(product.coaUrl, 'CoA')} style={styles.docBtn} disabled={!product.coaUrl}>CoA</Button>
              </View>
            </List.Accordion>

            <List.Accordion
              title="Product Description"
              left={props => <List.Icon {...props} icon="text-box-outline" />}
              expanded={expandedSection === 'desc'}
              onPress={() => handleAccordionPress('desc')}
              style={styles.accordionHeader}
            >
              <Text variant="bodyMedium" style={styles.descText}>{product.description || 'No description provided.'}</Text>
            </List.Accordion>

            <List.Accordion
              title="How to Order (B2B Flow)"
              left={props => <List.Icon {...props} icon="help-circle-outline" />}
              expanded={expandedSection === 'flow'}
              onPress={() => handleAccordionPress('flow')}
              style={styles.accordionHeader}
            >
              <View style={styles.flowContainer}>
                <View style={styles.stepRow}><Avatar.Icon size={24} icon="numeric-1" style={styles.stepIcon} color="white" /><Text style={styles.stepText}><Text style={{fontWeight: 'bold'}}>Request Quote:</Text> Submit target price & qty.</Text></View>
                <View style={styles.stepRow}><Avatar.Icon size={24} icon="numeric-2" style={styles.stepIcon} color="white" /><Text style={styles.stepText}><Text style={{fontWeight: 'bold'}}>Negotiate:</Text> Chat directly with supplier.</Text></View>
                <View style={styles.stepRow}><Avatar.Icon size={24} icon="numeric-3" style={styles.stepIcon} color="white" /><Text style={styles.stepText}><Text style={{fontWeight: 'bold'}}>Accept:</Text> Accept custom offer & checkout.</Text></View>
              </View>
            </List.Accordion>
            
          </List.Section>
        </View>
      </ScrollView>

      {/* STICKY CTA BAR */}
      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === 'ios' ? 30 : 20 }]}>
        {product.readyToDispatch && user?.subscriptionTier !== 'GROWTH_PACKAGE' ? (
          <Button mode="contained" buttonColor="#F59E0B" onPress={() => navigation.navigate('BusinessGrowth')} style={styles.actionBtn} contentStyle={{height: 52}}>
            👑 Upgrade to Negotiate (Ready Stock)
          </Button>
        ) : (
          <Button mode="contained" onPress={() => setShowRfqModal(true)} style={[styles.actionBtn, {backgroundColor: theme.colors.primary}]} contentStyle={{height: 52}}>
            Negotiate Custom Price
          </Button>
        )}
      </View>

      <Snackbar visible={compareVisible} onDismiss={() => setCompareVisible(false)} duration={3000} style={{marginBottom: Platform.OS === 'ios' ? 90 : 80}} action={{ label: 'View List', onPress: () => navigation.navigate('Compare') }}>
        Added to comparison.
      </Snackbar>
      <Snackbar visible={favoriteVisible} onDismiss={() => setFavoriteVisible(false)} duration={3000} style={{marginBottom: Platform.OS === 'ios' ? 90 : 80}} action={{ label: 'View Cart', onPress: () => navigation.navigate('BuyerTabs', { screen: 'Cart' }) }}>
        {favoriteMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  heroContainer: { height: 320, backgroundColor: '#E5E7EB', position: 'relative' },
  safeHeader: { position: 'absolute', top: 0, width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 10 },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, padding: 24, paddingBottom: 0 },
  titleRow: { marginBottom: 16 },
  title: { fontWeight: '900', color: '#111827', marginBottom: 8 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  categoryText: { color: '#6B7280', fontWeight:'600' },
  verifiedChip: { height:26, backgroundColor:'#DCFCE7' },
  hazardChip: { height:26, backgroundColor:'#FFEBEE' },
  priceMoqContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20 },
  moqBox: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, alignItems: 'flex-end' },
  volumeDiscounts: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#BBF7D0' },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  supplierBlock: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E0F2FE', marginBottom: 10 },
  premiumSupplierBlock: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  accordionHeader: { backgroundColor: 'transparent', paddingHorizontal: 0 },
  grid: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  gridItem: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, alignItems:'center', borderWidth: 1, borderColor: '#F1F5F9' },
  label: { color: '#64748B', fontSize: 11, textTransform: 'uppercase', marginBottom: 6, fontWeight: '600' },
  value: { fontWeight: 'bold', fontSize: 13, color: '#0F172A', textAlign: 'center' },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 10 },
  docBtn: { flex: 1, borderRadius: 10 },
  descText: { color: '#475569', lineHeight: 24, paddingVertical: 10 },
  flowContainer: { paddingVertical: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepIcon: { backgroundColor: '#004AAD', marginRight: 12 },
  stepText: { flex: 1, fontSize: 14, color: '#334155' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 5 },
  actionBtn: { borderRadius: 12, width: '100%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, elevation: 10 },
  rfqInput: { marginBottom: 12, backgroundColor: 'white' }
});