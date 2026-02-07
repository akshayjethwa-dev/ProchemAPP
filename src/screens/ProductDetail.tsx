import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Linking, Modal } from 'react-native';
import { Text, Button, IconButton, useTheme, Divider, Chip, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { Product } from '../types';

export default function ProductDetail() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  
  const { productId, product: paramProduct } = route.params || {};
  const { products, addToCart, addToCompare } = useAppStore();
  
  // Get initial product data
  const product = products.find(p => p.id === productId) || paramProduct || ({} as Product);

  // Default Constants
  const minQty = product.moq || 10;
  const unit = product.unit || 'kg';
  const price = product.pricePerUnit || product.price || 0;

  // State
  const [qty, setQty] = useState(minQty);
  const [showEnquireModal, setShowEnquireModal] = useState(false);

  useEffect(() => {
    setQty(minQty);
  }, [product]);

  // --- Handlers ---
  const increaseQty = () => setQty((prev: number) => prev + 10);
  
  const decreaseQty = () => {
    if (qty > minQty) {
      setQty((prev: number) => prev - 10);
    } else {
      Alert.alert('Minimum Order Limit', `You cannot order less than ${minQty} ${unit}.`);
    }
  };

  // Open the Contact Popup
  const handleEnquire = () => {
    setShowEnquireModal(true);
  };

  // ✅ CALL SUPPORT
  const handleCallSupport = () => {
    Linking.openURL('tel:+918460852903');
  };

  // ✅ WHATSAPP SUPPORT (Includes Product ID)
  const handleWhatsAppSupport = async () => {
    // Added Product ID for Admin Identification
    const text = `Hello Team,\nI am interested in purchasing:\n\n*Product:* ${product.name}\n*Product ID:* ${product.id}\n*Quantity:* ${qty} ${unit}\n\nPlease provide me with a quotation and availability.`;
    
    const url = `whatsapp://send?phone=918460852903&text=${encodeURIComponent(text)}`;
    
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Error', 'WhatsApp not found on this device.');
    }
  };

  const handleCompare = () => {
    addToCompare(product);
    Alert.alert('Added to Compare', 'You can view this in the Comparison Table.');
  };

  const handleBuyNow = () => {
    if (!product || !product.id) {
      Alert.alert('Error', 'Product data is missing');
      return;
    }
    addToCart({
      ...product,
      id: product.id,
      quantity: qty,
      pricePerUnit: price,
      unit: unit,
      sellerId: product.sellerId || 'unknown',
      name: product.name,
      category: product.category,
      price: price
    });
    
    navigation.navigate('BuyerTabs', { screen: 'Cart' });
  };

  if (!product.name) return null;

  return (
    <View style={styles.container}>
      
      {/* ✅ ENQUIRY / QUOTE MODAL */}
      <Modal transparent visible={showEnquireModal} animationType="fade" onRequestClose={() => setShowEnquireModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
               <Avatar.Icon 
                  size={50} 
                  icon="headset" 
                  style={{backgroundColor: '#E3F2FD', marginBottom: 15}} 
                  color="#004AAD"
               />
               <Text variant="titleLarge" style={{fontWeight:'bold', textAlign:'center'}}>
                 Request Quotation
               </Text>
            </View>
            
            <Text style={[styles.modalBody, {marginBottom: 20}]}>
              Contact our sales team directly to get the official quotation for this product.
            </Text>

            <View style={{width: '100%'}}>
               <Button 
                 mode="outlined" 
                 icon="phone" 
                 onPress={handleCallSupport} 
                 style={{borderColor: '#004AAD', marginBottom: 10}}
                 textColor="#004AAD"
               >
                 Call +91-84608 52903
               </Button>
               
               <Button 
                 mode="outlined" 
                 icon="whatsapp" 
                 onPress={handleWhatsAppSupport} 
                 style={{borderColor: '#25D366', marginBottom: 15}} 
                 textColor="#25D366"
               >
                 Chat on WhatsApp
               </Button>
               
               <Button mode="contained" onPress={() => setShowEnquireModal(false)} style={{backgroundColor: '#64748B'}}>
                 Close
               </Button>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{paddingBottom: 120}}>
        {/* Image Header */}
        <View style={styles.imageHeader}>
          <SafeAreaView style={styles.safeHeader}>
            <IconButton icon="arrow-left" iconColor="black" containerColor="white" onPress={() => navigation.goBack()} />
            <View style={{flexDirection: 'row'}}>
              <IconButton icon="compare-horizontal" iconColor="black" containerColor="white" onPress={handleCompare} />
              <IconButton icon="share-variant" iconColor="black" containerColor="white" onPress={() => {}} />
            </View>
          </SafeAreaView>
          <View style={styles.imagePlaceholder}>
             <Text style={{fontSize: 80}}>🧪</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Main Info */}
          <View style={styles.titleRow}>
            <View style={{flex: 1}}>
              <Text variant="headlineSmall" style={styles.title}>{product.name}</Text>
              <View style={{flexDirection:'row', alignItems:'center', marginTop: 4}}>
                <Text style={{color: '#666', fontWeight:'bold', marginRight: 8}}>{product.category}</Text>
                {product.verified && (
                  <Chip icon="check-decagram" textStyle={{fontSize:10, marginVertical:0}} style={{height:24, backgroundColor:'#DCFCE7'}}>Verified</Chip>
                )}
              </View>
            </View>
            <View style={{alignItems:'flex-end'}}>
              <Text variant="headlineSmall" style={{color: theme.colors.primary, fontWeight:'bold'}}>
                ₹{price}
              </Text>
              <Text variant="labelSmall">per {unit}</Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Supplier Info */}
          <Text variant="titleMedium" style={styles.sectionTitle}>Supplier Info</Text>
          <View style={styles.sellerCard}>
            <View style={styles.sellerRow}>
              <View style={styles.sellerIcon}><Text>🛡️</Text></View>
              <View>
                <Text variant="titleMedium" style={{fontWeight:'bold'}}>Prochem Verified Supplier</Text>
                <Text variant="bodySmall" style={{color:'#666'}}>
                  Origin: {product.origin || 'India'}
                </Text>
                <Text variant="bodySmall" style={{color:'#2E7D32', fontSize: 10, fontWeight:'bold', marginTop: 2}}>
                  ✓ Quality Checked
                </Text>
              </View>
            </View>
          </View>

          {/* Specs */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Grade</Text>
              <Text style={styles.value}>{product.grade || 'Technical'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Purity</Text>
              <Text style={styles.value}>{product.purity || 95}%</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>CAS No.</Text>
              <Text style={styles.value}>{product.casNumber || 'N/A'}</Text>
            </View>
          </View>

          {/* ✅ UPDATED: "Request Quotation" button now opens the Enquiry Modal */}
          <View style={{marginBottom: 20}}>
            <Button 
              mode="outlined" 
              icon="file-document-outline" 
              onPress={handleEnquire} 
              style={{width: '100%', borderColor: '#004AAD'}}
              textColor="#004AAD"
              contentStyle={{height: 48}}
            >
              Request Quotation
            </Button>
          </View>

          <Divider style={styles.divider} />

          {/* Quantity Selector Section */}
          <Text variant="titleMedium" style={styles.sectionTitle}>Select Quantity</Text>
          <View style={styles.qtyContainer}>
             <View style={styles.counterRow}>
                <IconButton 
                  icon="minus" 
                  mode="contained-tonal" 
                  size={20}
                  onPress={decreaseQty} 
                />
                <View style={styles.qtyDisplay}>
                   <Text variant="titleLarge" style={{fontWeight:'bold'}}>{qty} {unit}</Text>
                </View>
                <IconButton 
                  icon="plus" 
                  mode="contained-tonal" 
                  size={20}
                  onPress={increaseQty} 
                />
             </View>
             
             <Text style={styles.moqText}>
                *Minimum Order Quantity: {minQty} {unit}
             </Text>

             <View style={styles.totalRow}>
                <Text variant="bodyLarge">Estimated Total:</Text>
                <Text variant="titleMedium" style={{color: theme.colors.primary, fontWeight:'bold'}}>
                   ₹{(price * qty).toLocaleString()}
                </Text>
             </View>
          </View>

          <Divider style={styles.divider} />

          <Text variant="titleMedium" style={styles.sectionTitle}>Description</Text>
          <Text variant="bodyMedium" style={styles.desc}>{product.description || 'No description provided.'}</Text>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === 'ios' ? 30 : 20 }]}>
        <Button 
          mode="outlined" 
          onPress={handleEnquire}
          style={[styles.actionBtn, {borderColor: theme.colors.primary, borderWidth: 2}]}
          textColor={theme.colors.primary}
        >
          Enquire
        </Button>
        <View style={{width: 12}} />
        <Button 
          mode="contained" 
          onPress={handleBuyNow} 
          style={[styles.actionBtn, {backgroundColor: theme.colors.primary}]}
        >
          Buy Now
        </Button>
      </View>
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
  grid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  gridItem: { flex: 1, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, alignItems:'center' },
  label: { color: '#6B7280', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 },
  value: { fontWeight: 'bold', fontSize: 14, color: '#111827' },
  divider: { marginVertical: 20 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 12 },
  sellerCard: { backgroundColor: '#F0F9FF', padding: 16, borderRadius: 16, marginBottom: 20 },
  sellerRow: { flexDirection: 'row', alignItems: 'center' },
  sellerIcon: { width: 40, height: 40, backgroundColor: 'white', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  desc: { color: '#4B5563', lineHeight: 24 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', elevation: 20 },
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 4 },
  qtyContainer: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 10 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyDisplay: { flex: 1, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginHorizontal: 20 },
  moqText: { fontSize: 12, color: '#DC2626', marginTop: 10, textAlign: 'center', fontStyle: 'italic' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 20, width: '100%', maxWidth: 360, elevation: 10 },
  modalHeader: { alignItems: 'center', marginBottom: 10 },
  modalBody: { textAlign: 'center', color: '#64748B', marginBottom: 25, lineHeight: 20 },
});