import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Linking, Modal, KeyboardAvoidingView, Keyboard } from 'react-native';
import { Text, Button, IconButton, useTheme, Divider, Chip, Avatar, TextInput, Snackbar } from 'react-native-paper';
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

      // ✅ NEW: Auto-Broadcast Standard RFQ to the Live Market
      try {
        await addDoc(collection(db, 'broadcastLeads'), {
          originalOrderId: newRfqId,
          sourceType: 'RFQ', // Helps the Admin know where this came from
          productId: product.id,
          productName: product.name,
          quantityRequired: parseInt(rfqForm.targetQty),
          unit: unit,
          deliveryRegion: rfqForm.pincode,
          targetPrice: parseFloat(rfqForm.targetPrice),
          status: 'OPEN',
          createdAt: new Date().toISOString()
        });
        console.log("Successfully broadcasted RFQ to Live Market.");
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

  if (!product.name) return null;

  const isAlreadyInCompare = compareList.some(p => p.id === product.id);

  return (
    <View style={styles.container}>
      
      {/* IN-APP RFQ MODAL */}
      <Modal transparent visible={showRfqModal} animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          {/* ✅ FIXED: Set maxHeight to ensure scrolling occurs when keyboard opens */}
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
              <Text variant="titleLarge" style={{fontWeight:'bold'}}>Request Custom Quote</Text>
              <IconButton icon="close" onPress={() => { Keyboard.dismiss(); setShowRfqModal(false); }} />
            </View>
            
            {/* ✅ FIXED: Wrapped inputs in ScrollView to allow scrolling when keyboard is active */}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow: 1, paddingBottom: 20}}>
              <Text style={{color: '#666', marginBottom: 15, fontSize: 13}}>
                Propose your desired quantity and target price directly to the supplier.
              </Text>

              <TextInput label={`Target Quantity (${unit}) *`} keyboardType="numeric" value={rfqForm.targetQty} onChangeText={t => setRfqForm({...rfqForm, targetQty: t})} mode="outlined" style={styles.rfqInput} />
              <TextInput label="Target Price per Unit (₹) *" keyboardType="numeric" value={rfqForm.targetPrice} onChangeText={t => setRfqForm({...rfqForm, targetPrice: t})} mode="outlined" style={styles.rfqInput} left={<TextInput.Affix text="₹ " />} />
              <TextInput label="Delivery Pincode *" keyboardType="numeric" value={rfqForm.pincode} onChangeText={t => setRfqForm({...rfqForm, pincode: t})} mode="outlined" style={styles.rfqInput} maxLength={6} />
              <TextInput label="Additional Notes (Optional)" multiline numberOfLines={3} value={rfqForm.notes} onChangeText={t => setRfqForm({...rfqForm, notes: t})} mode="outlined" style={styles.rfqInput} placeholder="e.g. Need immediate dispatch" />

              <Button mode="contained" onPress={submitRFQ} loading={rfqLoading} style={{marginTop: 10, backgroundColor: '#004AAD'}} contentStyle={{height: 50}}>
                Submit RFQ to Seller
              </Button>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EDUCATIONAL SUCCESS MODAL */}
      <Modal transparent visible={rfqSuccess.visible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {alignItems: 'center'}]}>
            <Avatar.Icon size={64} icon="check-decagram" style={{backgroundColor: '#DCFCE7', marginBottom: 15}} color="#166534" />
            <Text variant="headlineSmall" style={{fontWeight:'bold', color: '#166534', marginBottom: 10}}>Quote Sent!</Text>

            <Text style={{textAlign: 'center', color: '#475569', marginBottom: 20, lineHeight: 22}}>
              Your request has been securely sent to the supplier. They will review it and reply shortly.
            </Text>

            <View style={{backgroundColor: '#F8FAFC', padding: 15, borderRadius: 12, width: '100%', marginBottom: 25, borderWidth: 1, borderColor: '#E2E8F0'}}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                 <Avatar.Icon size={24} icon="information-outline" style={{backgroundColor: 'transparent', margin: 0, padding: 0}} color="#004AAD" />
                 <Text style={{fontWeight: 'bold', color: '#004AAD', marginLeft: 4}}>Where to find this later?</Text>
              </View>
              <Text style={{color: '#64748B', fontSize: 13}}>
                You can track responses and continue negotiations by going to:
              </Text>
              <Text style={{fontWeight: 'bold', color: '#1E293B', marginTop: 8, fontSize: 14}}>
                Account Tab  →  My Quotes & Negotiations
              </Text>
            </View>

            <Button
              mode="contained"
              style={{width: '100%', marginBottom: 12, backgroundColor: '#004AAD'}}
              contentStyle={{height: 48}}
              onPress={() => {
                setRfqSuccess({ visible: false, rfqId: '' });
                navigation.navigate('NegotiationRoom', { rfqId: rfqSuccess.rfqId });
              }}
            >
              Go to Chat Room Now
            </Button>

            <Button
              mode="outlined"
              style={{width: '100%', borderColor: '#CBD5E1'}}
              textColor="#64748B"
              contentStyle={{height: 48}}
              onPress={() => setRfqSuccess({ visible: false, rfqId: '' })}
            >
              Got it, continue browsing
            </Button>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{paddingBottom: 120}}>
        <View style={styles.imageHeader}>
          <View style={[styles.safeHeader, { paddingTop: Math.max(insets.top, 20) }]}>
            <IconButton icon="arrow-left" iconColor="black" containerColor="white" onPress={() => navigation.goBack()} />
            <View style={{flexDirection: 'row'}}>
              <IconButton 
                icon="compare-horizontal" 
                iconColor={isAlreadyInCompare ? theme.colors.primary : "black"} 
                containerColor="white" 
                onPress={handleCompare} 
              />
              <IconButton 
                icon={isFavorite ? "cards-heart" : "heart-outline"} 
                iconColor={isFavorite ? "red" : "black"} 
                containerColor="white" 
                onPress={toggleFavorite} 
              />
            </View>
          </View>
          <View style={styles.imagePlaceholder}>
             {product.imageUrl ? (
                <Avatar.Image size={180} source={{ uri: product.imageUrl }} style={{backgroundColor: 'transparent'}} />
             ) : (
                <Text style={{fontSize: 80}}>🧪</Text>
             )}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={{flex: 1}}>
              <Text variant="headlineSmall" style={styles.title}>{product.name}</Text>
              <View style={{flexDirection:'row', alignItems:'center', marginTop: 4, flexWrap: 'wrap'}}>
                <Text style={{color: '#666', fontWeight:'bold', marginRight: 8}}>{product.category}</Text>
                {product.verified && (
                  <Chip icon="check-decagram" textStyle={{fontSize:10, marginVertical:0}} style={{height:24, backgroundColor:'#DCFCE7', marginRight: 8}}>Verified</Chip>
                )}
                {product.hazardClass && product.hazardClass !== 'Non-Hazardous' && (
                  <Chip icon="alert" textStyle={{fontSize:10, marginVertical:0, color:'#D32F2F'}} style={{height:24, backgroundColor:'#FFEBEE'}}>
                    {product.hazardClass}
                  </Chip>
                )}
              </View>
            </View>
            <View style={{alignItems:'flex-end'}}>
              <Text variant="headlineSmall" style={{color: theme.colors.primary, fontWeight:'bold'}}>
                ₹{price}
              </Text>
              <Text variant="labelSmall">per {unit} <Text style={{fontSize: 8, color: '#999'}}>(Reference Only)</Text></Text>
            </View>
          </View>

          <Button 
            mode={isAlreadyInCompare ? "contained-tonal" : "outlined"} 
            icon="scale-balance" 
            onPress={handleCompare}
            style={{marginBottom: 15, borderRadius: 8, borderColor: theme.colors.primary}}
            labelStyle={{fontWeight: 'bold'}}
          >
            {isAlreadyInCompare ? 'Added to Compare' : 'Add to Compare'}
          </Button>

          {/* TIERED PRICING DISPLAY */}
          {product.tieredPricing && product.tieredPricing.length > 0 && (
            <View style={{backgroundColor: '#F0FDF4', padding: 12, borderRadius: 12, marginVertical: 15, borderWidth: 1, borderColor: '#BBF7D0'}}>
              <Text variant="titleMedium" style={{fontWeight:'bold', color: '#166534', marginBottom: 8}}>Volume Discounts</Text>
              {product.tieredPricing.map((tier: any, idx: number) => (
                <View key={idx} style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: idx !== product.tieredPricing!.length - 1 ? 1 : 0, borderBottomColor: '#DCFCE7'}}>
                  <Text style={{color: '#15803D'}}>Order ≥ {tier.minQty} {unit}</Text>
                  <Text style={{fontWeight: 'bold', color: '#166534'}}>₹{tier.pricePerUnit} / {unit}</Text>
                </View>
              ))}
            </View>
          )}

          <Divider style={styles.divider} />

          {/* ✅ UPDATED: Premium Supplier Badge */}
          <Text variant="titleMedium" style={styles.sectionTitle}>Supplier Info</Text>
          
          {(() => {
            const isPremiumSupplier = (product as any).sellerTier === 'GROWTH_PACKAGE';
            return (
              <View style={[styles.sellerCard, isPremiumSupplier && { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1 }]}>
                <View style={styles.sellerRow}>
                  <View style={[styles.sellerIcon, isPremiumSupplier && { backgroundColor: '#FEF3C7' }]}>
                    <Text>{isPremiumSupplier ? '👑' : '🛡️'}</Text>
                  </View>
                  <View>
                    <Text variant="titleMedium" style={{fontWeight:'bold', color: isPremiumSupplier ? '#92400E' : '#000'}}>
                      {isPremiumSupplier ? 'Verified Premium Supplier' : 'Prochem Verified Supplier'}
                    </Text>
                    <Text variant="bodySmall" style={{color:'#666'}}>
                      Origin: {product.origin || 'India'}
                    </Text>
                    <Text variant="bodySmall" style={{color: isPremiumSupplier ? '#D97706' : '#2E7D32', fontSize: 10, fontWeight:'bold', marginTop: 2}}>
                      ✓ {isPremiumSupplier ? '100% Upfront Payment Assured' : 'Quality Checked'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}

          <Text variant="titleMedium" style={styles.sectionTitle}>Chemical Specifications</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Grade</Text>
              <Text style={styles.value}>{product.grade || 'Technical'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Purity</Text>
              <Text style={styles.value}>{product.purity || 'N/A'}%</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>CAS No.</Text>
              <Text style={styles.value}>{product.casNumber || 'N/A'}</Text>
            </View>
          </View>

          <Text variant="titleMedium" style={styles.sectionTitle}>Logistics & Handling</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Packaging</Text>
              <Text style={styles.value}>{product.packagingType || 'Standard'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>UN Number</Text>
              <Text style={styles.value}>{product.unNumber || 'N/A'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Storage</Text>
              <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{product.storageConditions || 'Room Temp'}</Text>
            </View>
          </View>

          <Text variant="titleMedium" style={styles.sectionTitle}>Technical Documents</Text>
          <View style={styles.docRow}>
            <Button mode="contained-tonal" icon="file-document-outline" onPress={() => openDocument(product.tdsUrl, 'TDS')} style={styles.docBtn} labelStyle={{fontSize: 12}} disabled={!product.tdsUrl}>
              View TDS
            </Button>
            <Button mode="contained-tonal" icon="shield-alert-outline" onPress={() => openDocument(product.msdsUrl, 'MSDS')} style={styles.docBtn} labelStyle={{fontSize: 12}} disabled={!product.msdsUrl}>
              View MSDS
            </Button>
            <Button mode="contained-tonal" icon="certificate-outline" onPress={() => openDocument(product.coaUrl, 'Certificate of Analysis')} style={styles.docBtn} labelStyle={{fontSize: 12}} disabled={!product.coaUrl}>
              Sample CoA
            </Button>
          </View>

          <Divider style={styles.divider} />

          {/* 🚀 UPGRADED 'HOW TO ORDER' SECTION */}
          <Text variant="titleMedium" style={styles.sectionTitle}>How to Order (B2B Flow)</Text>
          <View style={styles.qtyContainer}>
             <Text style={{fontSize: 13, color: '#1F2937', textAlign: 'center', marginBottom: 15, fontWeight: '500'}}>
                Chemical prices fluctuate based on market conditions. Secure the best rate in 3 simple steps:
             </Text>

             <View style={styles.stepRow}>
               <Avatar.Icon size={28} icon="numeric-1-circle" style={styles.stepIcon} color={theme.colors.primary} />
               <Text style={styles.stepText}>
                 <Text style={{fontWeight: 'bold', color: '#111827'}}>Request Quote:</Text> Submit your target price and desired quantity below.
               </Text>
             </View>
             
             <View style={styles.stepRow}>
               <Avatar.Icon size={28} icon="numeric-2-circle" style={styles.stepIcon} color={theme.colors.primary} />
               <Text style={styles.stepText}>
                 <Text style={{fontWeight: 'bold', color: '#111827'}}>Negotiate Deal:</Text> Chat directly with the supplier. Once agreed, the supplier will generate a formal <Text style={{fontWeight: 'bold', color: theme.colors.primary}}>Custom Offer</Text>.
               </Text>
             </View>

             <View style={styles.stepRow}>
               <Avatar.Icon size={28} icon="numeric-3-circle" style={styles.stepIcon} color={theme.colors.primary} />
               <Text style={styles.stepText}>
                 <Text style={{fontWeight: 'bold', color: '#111827'}}>Accept & Checkout:</Text> Accept the Custom Offer in your chat room to proceed to the final payment and complete your order.
               </Text>
             </View>

             <Divider style={{marginVertical: 12, backgroundColor: '#E5E7EB'}} />

             <Text style={styles.moqText}>
                Minimum Order Quantity: {minQty} {unit}
             </Text>
          </View>

          <Divider style={styles.divider} />

          <Text variant="titleMedium" style={styles.sectionTitle}>Description</Text>
          <Text variant="bodyMedium" style={styles.desc}>{product.description || 'No description provided.'}</Text>
        </View>
      </ScrollView>

      {/* ✅ FOMO GATE: Bottom Bar Logic */}
      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === 'ios' ? 30 : 20 }]}>
        {product.readyToDispatch && user?.subscriptionTier !== 'GROWTH_PACKAGE' ? (
          <Button 
            mode="contained" 
            buttonColor="#F59E0B" // Gold Color
            onPress={() => navigation.navigate('BusinessGrowth')}
            style={[styles.actionBtn, {marginHorizontal: 10}]}
            contentStyle={{height: 50}}
          >
            👑 Upgrade to Negotiate (Ready Stock)
          </Button>
        ) : (
          <Button 
            mode="contained" 
            onPress={() => setShowRfqModal(true)}
            style={[styles.actionBtn, {backgroundColor: theme.colors.primary, marginHorizontal: 10}]}
            contentStyle={{height: 50}}
          >
            Negotiate & Get Latest Price
          </Button>
        )}
      </View>

      <Snackbar
        visible={compareVisible}
        onDismiss={() => setCompareVisible(false)}
        duration={5000} 
        style={{marginBottom: Platform.OS === 'ios' ? 90 : 80}}
        action={{ label: 'View List', onPress: () => navigation.navigate('Compare') }}
      >
        Added to comparison.
      </Snackbar>

      <Snackbar
        visible={favoriteVisible}
        onDismiss={() => setFavoriteVisible(false)}
        duration={3000} 
        style={{marginBottom: Platform.OS === 'ios' ? 140 : 130}}
        action={{ label: 'View', onPress: () => navigation.navigate('BuyerTabs', { screen: 'Cart' }) }}
      >
        {favoriteMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  imageHeader: { height: 280, backgroundColor: '#F3F4F6', position: 'relative' },
  safeHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, zIndex: 10 },
  imagePlaceholder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  title: { fontWeight: 'bold', maxWidth: '70%' },
  grid: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  gridItem: { flex: 1, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 12, alignItems:'center', justifyContent: 'center' },
  label: { color: '#6B7280', fontSize: 10, textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' },
  value: { fontWeight: 'bold', fontSize: 13, color: '#111827', textAlign: 'center' },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  docBtn: { flex: 1, borderRadius: 8 },
  divider: { marginVertical: 20 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 12 },
  sellerCard: { backgroundColor: '#F0F9FF', padding: 16, borderRadius: 16, marginBottom: 20 },
  sellerRow: { flexDirection: 'row', alignItems: 'center' },
  sellerIcon: { width: 40, height: 40, backgroundColor: 'white', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  desc: { color: '#4B5563', lineHeight: 24 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', elevation: 20 },
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 4 },
  qtyContainer: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stepIcon: { backgroundColor: 'transparent', margin: 0, padding: 0 },
  stepText: { flex: 1, fontSize: 13, color: '#4B5563', marginLeft: 6, lineHeight: 18 },
  moqText: { fontSize: 12, color: '#DC2626', marginTop: 5, textAlign: 'center', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, elevation: 10 },
  rfqInput: { marginBottom: 12, backgroundColor: 'white' }
});