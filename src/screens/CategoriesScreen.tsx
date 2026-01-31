import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, FlatList, Platform } from 'react-native';
import { Text, Button, Card, useTheme, Chip, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { Product } from '../types';

const CATEGORIES = [
  'All Products',
  'Industrial Acids', 
  'Pharma Chemicals', 
  'Agriculture', 
  'Food & Beverage', 
  'Lab Research'
];

export default function CategoriesScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  
  // ✅ UPDATE: Get 'user' from store to check ID
  const { products, addToCart, user } = useAppStore();
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);

  // ✅ UPDATE: Filter Logic to hide own products and inactive items
  const filteredProducts = products.filter(p => {
    // 1. Filter out inactive products
    if (p.active === false) return false;

    // 2. Filter out products listed by the current user (Self-Listed)
    if (user && p.sellerId === user.uid) return false;

    // 3. Category Filter
    if (selectedCat === 'All Products') return true;
    return p.category === selectedCat;
  });

  const renderProduct = ({ item }: { item: Product }) => (
    <Card style={styles.prodCard} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}>
      <View style={{flexDirection:'row'}}>
        {/* Product Image Placeholder */}
        <View style={styles.prodImage}>
            <Text style={{fontSize:28}}>🧪</Text>
        </View>
        
        {/* Product Details */}
        <View style={{flex:1, padding:12}}>
          <View style={{flexDirection:'row', justifyContent:'space-between'}}>
             <Text style={styles.prodTitle} numberOfLines={1}>{item.name}</Text>
             {item.verified && <Text style={{fontSize:10, color:'green', fontWeight:'bold'}}>✓ Verified</Text>}
          </View>
          
          <Text style={{fontSize:11, color:'#64748B', marginTop: 2}}>
             {item.category} • MOQ: {item.moq || 10} {item.unit}
          </Text>
          
          <View style={styles.actionRow}>
            <Text style={{fontWeight:'bold', fontSize: 16, color: theme.colors.primary}}>
              ₹{item.pricePerUnit || item.price}
              <Text style={{fontSize:10, color:'#999', fontWeight:'normal'}}>/{item.unit}</Text>
            </Text>
            
            <Button 
              mode="contained-tonal" 
              compact 
              labelStyle={{fontSize:12, marginVertical: 4}}
              style={{borderRadius: 8}}
              onPress={() => addToCart({
                ...item, 
                id: item.id || '', 
                quantity: item.moq || 1,
                pricePerUnit: item.pricePerUnit || item.price || 0,
                unit: item.unit || 'kg',
                sellerId: item.sellerId || 'unknown'
              })}
            >
              + Add
            </Button>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{fontWeight:'bold', color: theme.colors.primary}}>Browse Categories</Text>
        <IconButton icon="magnify" onPress={() => navigation.navigate('Marketplace')} />
      </View>

      {/* Mobile-Friendly Horizontal Categories */}
      <View style={{height: 60}}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.catScroll}
        >
          {CATEGORIES.map(cat => (
            <Chip
              key={cat}
              selected={selectedCat === cat}
              onPress={() => setSelectedCat(cat)}
              style={[styles.chip, selectedCat === cat && { backgroundColor: '#E3F2FD', borderColor: '#004AAD' }]}
              textStyle={{ color: selectedCat === cat ? '#004AAD' : '#475569', fontWeight: selectedCat === cat ? 'bold' : 'normal' }}
              showSelectedOverlay
              mode="outlined"
            >
              {cat}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* Main Content */}
      <View style={styles.main}>
        <View style={styles.subHeader}>
          <Text variant="labelLarge" style={{color:'#64748B'}}>
            Showing {filteredProducts.length} results for "{selectedCat}"
          </Text>
        </View>

        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item, index) => item.id || index.toString()} 
          contentContainerStyle={{padding: 16, paddingBottom: 80}}
          ListEmptyComponent={
             <View style={{alignItems:'center', marginTop: 50}}>
                <Text style={{fontSize: 30}}>🔍</Text>
                <Text style={{color:'#999', marginTop: 10}}>No products found in this category.</Text>
             </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingVertical: 10, flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'white' },
  
  // Horizontal Scroll Styles
  catScroll: { paddingHorizontal: 16, paddingVertical: 10, alignItems:'center' },
  chip: { marginRight: 8, height: 36, backgroundColor: 'white', borderColor: '#E2E8F0' },
  
  main: { flex: 1 },
  subHeader: { paddingHorizontal: 16, paddingBottom: 8 },
  
  // Card Styles
  prodCard: { marginBottom: 12, backgroundColor: 'white', elevation: 2, borderRadius: 12, overflow: 'hidden' },
  prodImage: { width: 90, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  prodTitle: { fontWeight:'bold', fontSize:15, flex: 1, marginRight: 5 },
  actionRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:12 }
});