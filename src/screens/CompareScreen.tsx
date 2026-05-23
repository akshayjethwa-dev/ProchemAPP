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
const CARD_WIDTH = width * 0.45; // 🚀 Allows 2 full cards on screen

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

  const handleNegotiate = async (product: Product) => {
    if (!user) {
      Alert.alert("Error", "Please login to start negotiating.");
      return;
    }

    setProcessingId(product.id);

    try {
      const rfqData = {
        productId: product.id,
        productName: product.name,
        buyerId: user.uid,
        buyerName: user.companyName || user.businessName || 'Buyer',
        sellerId: product.sellerId || 'unknown',
        sellerName: product.sellerName || 'Supplier',
        targetQuantity: product.moq || 1,
        targetPrice: product.pricePerUnit || product.price || 0,
        unit: product.unit || 'kg',
        deliveryPincode: user.pincode || '',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'rfqs'), rfqData);
      addRfq({ id: docRef.id, ...rfqData } as any);
      setProcessingId(null);
      navigation.navigate('NegotiationRoom', { rfqId: docRef.id });
    } catch (error) {
      console.error("Error creating negotiation room: ", error);
      Alert.alert("Error", "Could not start negotiation.");
      setProcessingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
         <Text variant="titleMedium" style={{fontWeight: 'bold'}}>Comparing {compareList.length} of {maxCompare}</Text>
         <Button mode="text" textColor={theme.colors.error} onPress={clearCompare} compact>Clear All</Button>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {compareList.map((product) => (
          <Card key={product.id} style={styles.productCard}>
            <IconButton 
               icon="close-circle" 
               size={20} 
               iconColor="#94A3B8"
               style={styles.removeIcon} 
               onPress={() => removeFromCompare(product.id!)} 
            />
            
            <View style={styles.cardTop}>
              <View style={styles.imageBox}><Text style={{fontSize: 30}}>🧪</Text></View>
              <Text style={styles.productTitle} numberOfLines={2}>{product.name}</Text>
              <Text style={[styles.productPrice, {color: theme.colors.primary}]}>
                ₹{product.pricePerUnit || product.price} <Text style={{fontSize:10, color:'#64748B'}}>/{product.unit}</Text>
              </Text>
              
              <Button 
                mode="contained" 
                loading={processingId === product.id}
                disabled={processingId !== null}
                style={{marginTop: 12, width: '100%', backgroundColor: '#10B981', borderRadius: 6}} 
                labelStyle={{fontSize: 11, marginHorizontal: 0}}
                compact
                onPress={() => handleNegotiate(product)}
              >
                Negotiate
              </Button>
            </View>

            <Divider style={{marginVertical: 8}} />

            <View style={styles.specsContainer}>
              <View style={styles.specBox}>
                <Text style={styles.specLabel}>Category</Text>
                <Text style={styles.specValue} numberOfLines={1}>{product.category}</Text>
              </View>
              <View style={styles.specBox}>
                <Text style={styles.specLabel}>Min. Order</Text>
                <Text style={styles.specValue}>{product.moq || 'N/A'} {product.unit}</Text>
              </View>
              <View style={styles.specBox}>
                <Text style={styles.specLabel}>Origin</Text>
                <Text style={styles.specValue}>{product.origin || 'India'}</Text>
              </View>
              <View style={[styles.specBox, {borderBottomWidth: 0}]}>
                <Text style={styles.specLabel}>Supplier Trust</Text>
                <Text style={[styles.specValue, {color: (product as any).sellerTier === 'GROWTH_PACKAGE' ? '#D97706' : '#16A34A'}]}>
                  {(product as any).sellerTier === 'GROWTH_PACKAGE' ? '👑 Premium' : '✓ Verified'}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {compareList.length < maxCompare && (
           <Card style={styles.addCard} onPress={() => navigation.navigate('BuyerTabs', { screen: 'Categories' })}>
              <IconButton icon="plus-circle-outline" size={30} iconColor={theme.colors.primary} />
              <Text style={{fontWeight: 'bold', color: theme.colors.primary, fontSize: 12}}>Add Product</Text>
           </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: 'white', elevation: 2 },
  
  scrollContent: { padding: 12, alignItems: 'flex-start' },
  
  // 🚀 NARROWER CARD FOR SIDE-BY-SIDE
  productCard: { width: CARD_WIDTH, backgroundColor: 'white', marginRight: 12, borderRadius: 8, elevation: 1 },
  removeIcon: { position: 'absolute', top: -4, right: -4, zIndex: 10 },
  
  cardTop: { padding: 12, alignItems: 'center' },
  imageBox: { width: 60, height: 60, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  productTitle: { fontWeight: 'bold', textAlign: 'center', fontSize: 13, marginBottom: 4, height: 36 },
  productPrice: { fontWeight: 'bold', fontSize: 14 },
  
  specsContainer: { paddingHorizontal: 12, paddingBottom: 12 },
  specBox: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  specLabel: { color: '#64748B', fontSize: 10, marginBottom: 2 },
  specValue: { fontWeight: 'bold', color: '#334155', fontSize: 11 },

  addCard: { width: CARD_WIDTH * 0.7, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center', height: 200 }
});