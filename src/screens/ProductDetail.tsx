import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Button, IconButton, useTheme, Divider, Chip } from 'react-native-paper';
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

  const [qty, setQty] = useState(product.moq || 10);
  const price = product.pricePerUnit || product.price || 0;
  
  // NOTE: Seller fetching logic removed to maintain anonymity.

  const handleNegotiate = () => {
    navigation.navigate('Negotiation', { product });
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
      unit: product.unit || 'kg',
      sellerId: product.sellerId || 'unknown',
      name: product.name,
      category: product.category,
      price: price
    });
    navigation.navigate('BuyerApp', { screen: 'Cart' });
  };

  const handleDownloadMSDS = () => Alert.alert('Download', 'Downloading Material Safety Data Sheet (MSDS)...');
  const handleDownloadQuote = () => Alert.alert('Quote Generated', 'Pro-forma Invoice sent to your email.');

  if (!product.name) return null;

  return (
    <View style={styles.container}>
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
              <Text variant="labelSmall">per {product.unit}</Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* ✅ UPDATED: Anonymized Seller Details */}
          <Text variant="titleMedium" style={styles.sectionTitle}>Supplier Info</Text>
          <View style={styles.sellerCard}>
            <View style={styles.sellerRow}>
              <View style={styles.sellerIcon}><Text>🛡️</Text></View>
              <View>
                {/* Generic Name */}
                <Text variant="titleMedium" style={{fontWeight:'bold'}}>Prochem Verified Supplier</Text>
                
                {/* Only show generic City/State if available, NOT full address */}
                <Text variant="bodySmall" style={{color:'#666'}}>
                  Origin: {product.origin || 'India'}
                </Text>
                
                <Text variant="bodySmall" style={{color:'#2E7D32', fontSize: 10, fontWeight:'bold', marginTop: 2}}>
                  ✓ Quality Checked
                </Text>
              </View>
              <View style={{flex:1}}/>
              <View style={styles.ratingBadge}>
                {/* Keep rating as it reflects product quality, not identity */}
                <Text style={styles.ratingText}>⭐ {product.sellerRating || '4.5'}</Text>
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

          {/* Documents Actions */}
          <View style={{flexDirection: 'row', justifyContent:'space-between', marginBottom: 20}}>
            <Button mode="outlined" icon="file-document" onPress={handleDownloadMSDS} style={{flex:1, marginRight: 8}}>
              MSDS
            </Button>
            <Button mode="outlined" icon="file-download" onPress={handleDownloadQuote} style={{flex:1, marginLeft: 8}}>
              Get Quote
            </Button>
          </View>

          <Text variant="titleMedium" style={styles.sectionTitle}>Description</Text>
          <Text variant="bodyMedium" style={styles.desc}>{product.description || 'No description provided.'}</Text>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === 'ios' ? 30 : 20 }]}>
        <Button 
          mode="outlined" 
          onPress={handleNegotiate} 
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
  ratingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { color: '#D97706', fontWeight: 'bold' },
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
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 4 }
});