// src/screens/CompareScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import { Text, Button, IconButton, useTheme, Card, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { Product } from '../types';

const { width } = Dimensions.get('window');

export default function CompareScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  
  const { compareList, removeFromCompare, clearCompare, user, addRfq } = useAppStore();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isPremium = user?.subscriptionTier === 'GROWTH_PACKAGE';
  const maxCompare = isPremium ? 5 : 3;

  if (compareList.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ fontSize: 60 }}>⚖️</Text>
        <Text variant="titleMedium" style={{ marginTop: 16, color: '#64748B' }}>
          No products selected for comparison.
        </Text>
        <Button mode="contained" onPress={() => navigation.navigate('BuyerTabs', { screen: 'Categories' })} style={{ marginTop: 24 }}>
          Browse Products
        </Button>
      </View>
    );
  }

  // 🚀 NEW: Instantly start a chat room for negotiation
  const handleNegotiate = async (product: Product) => {
    if (!user) {
      Alert.alert("Error", "Please login to start negotiating.");
      return;
    }

    setProcessingId(product.id);

    try {
      // 1. Create a Pending RFQ document to bind the chat room
      const rfqData = {
        productId: product.id,
        productName: product.name,
        buyerId: user.uid,
        buyerName: user.companyName || user.businessName || 'Buyer',
        sellerId: product.sellerId || 'unknown',
        sellerName: product.sellerName || 'Supplier',
        targetQuantity: product.moq || 1, // Default to MOQ or 1
        targetPrice: product.pricePerUnit || product.price || 0, // Default to listed price
        unit: product.unit || 'kg',
        deliveryPincode: user.pincode || '',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 2. Add to Firestore
      const docRef = await addDoc(collection(db, 'rfqs'), rfqData);
      
      // 3. Update local state
      addRfq({ id: docRef.id, ...rfqData } as any);

      setProcessingId(null);
      
      // 4. Navigate directly to the newly created chat room
      navigation.navigate('NegotiationRoom', { rfqId: docRef.id });

    } catch (error) {
      console.error("Error creating negotiation room: ", error);
      Alert.alert("Error", "Could not start negotiation. Please check your connection and try again.");
      setProcessingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
         <Text variant="titleMedium" style={{fontWeight: 'bold'}}>Comparing {compareList.length} of {maxCompare} Items</Text>
         <Button mode="text" textColor={theme.colors.error} onPress={clearCompare}>Clear All</Button>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {compareList.map((product) => (
          <Card key={product.id} style={styles.productCard}>
            <IconButton 
               icon="close-circle" 
               size={24} 
               iconColor="#94A3B8"
               style={styles.removeIcon} 
               onPress={() => removeFromCompare(product.id!)} 
            />
            
            <View style={styles.cardTop}>
              <View style={styles.imageBox}><Text style={{fontSize: 40}}>🧪</Text></View>
              <Text style={styles.productTitle} numberOfLines={2}>{product.name}</Text>
              <Text style={[styles.productPrice, {color: theme.colors.primary}]}>
                ₹{product.pricePerUnit || product.price} <Text style={{fontSize:12, color:'#64748B'}}>/{product.unit}</Text>
              </Text>
              
              {/* 🚀 CHANGED TO NEGOTIATE BUTTON */}
              <Button 
                mode="contained" 
                icon="handshake"
                loading={processingId === product.id}
                disabled={processingId !== null}
                style={{marginTop: 12, width: '100%', backgroundColor: '#10B981'}} 
                labelStyle={{fontSize: 13}}
                onPress={() => handleNegotiate(product)}
              >
                Negotiate Live Price
              </Button>
            </View>

            <Divider style={{marginVertical: 12}} />

            <View style={styles.specsContainer}>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Category</Text>
                <Text style={styles.specValue} numberOfLines={1}>{product.category}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Purity / Grade</Text>
                <Text style={styles.specValue}>{product.purity || 'N/A'}% / {product.grade || 'Tech'}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Min. Order (MOQ)</Text>
                <Text style={styles.specValue}>{product.moq || 'N/A'} {product.unit}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Origin</Text>
                <Text style={styles.specValue}>{product.origin || 'India'}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Supplier</Text>
                <Text style={[styles.specValue, {color: (product as any).sellerTier === 'GROWTH_PACKAGE' ? '#D97706' : '#16A34A', fontWeight: 'bold'}]}>
                  {(product as any).sellerTier === 'GROWTH_PACKAGE' ? '👑 Premium Seller' : '✓ Verified'}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {compareList.length < maxCompare && (
           <Card style={styles.addCard} onPress={() => navigation.navigate('BuyerTabs', { screen: 'Categories' })}>
              <IconButton icon="plus-circle-outline" size={40} iconColor={theme.colors.primary} />
              <Text style={{fontWeight: 'bold', color: theme.colors.primary, marginTop: 8}}>Add Product</Text>
              <Text style={{color: '#64748B', fontSize: 12, marginTop: 4}}>Max {maxCompare} items</Text>
           </Card>
        )}

        {!isPremium && compareList.length === 3 && (
           <Card style={styles.upsellCard} onPress={() => navigation.navigate('BusinessGrowth')}>
              <IconButton icon="crown" size={40} iconColor="#D97706" />
              <Text style={{fontWeight: 'bold', color: '#D97706', marginTop: 8, textAlign: 'center'}}>Upgrade to Compare 5+</Text>
           </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', elevation: 2 },
  
  scrollContent: { padding: 16, alignItems: 'center' },
  
  productCard: { width: width * 0.75, maxWidth: 300, backgroundColor: 'white', marginRight: 16, borderRadius: 16, elevation: 3 },
  removeIcon: { position: 'absolute', top: 0, right: 0, zIndex: 10 },
  
  cardTop: { padding: 16, alignItems: 'center' },
  imageBox: { width: 100, height: 100, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  productTitle: { fontWeight: 'bold', textAlign: 'center', fontSize: 16, marginBottom: 8, height: 40 },
  productPrice: { fontWeight: 'bold', fontSize: 18 },
  
  specsContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  specLabel: { color: '#64748B', fontSize: 13, flex: 1 },
  specValue: { fontWeight: 'bold', color: '#334155', fontSize: 13, flex: 1, textAlign: 'right' },

  addCard: { width: 140, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', borderRadius: 16, justifyContent: 'center', alignItems: 'center', height: 200, alignSelf: 'center' },
  upsellCard: { width: 140, backgroundColor: '#FFFBEB', borderWidth: 2, borderColor: '#FCD34D', borderStyle: 'dashed', borderRadius: 16, justifyContent: 'center', alignItems: 'center', height: 200, alignSelf: 'center', marginLeft: 16 }
});