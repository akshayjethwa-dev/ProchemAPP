import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { Product } from '../types';

const CATEGORIES = [
  'Industrial Acids', 'Pharma Chemicals', 'Agriculture', 'Food & Beverage', 'Lab Research'
];

export default function CategoriesScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { products, addToCart } = useAppStore();
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);

  // Filter products by selected sidebar category
  const filteredProducts = products.filter(p => p.category === selectedCat || !p.category);

  const renderProduct = ({ item }: { item: Product }) => (
    <Card style={styles.prodCard} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}>
      <View style={{flexDirection:'row'}}>
        <View style={styles.prodImage}><Text style={{fontSize:20}}>🧪</Text></View>
        <View style={{flex:1, padding:10}}>
          <Text style={{fontWeight:'bold', fontSize:14}} numberOfLines={1}>{item.name}</Text>
          <Text style={{fontSize:10, color:'#64748B'}}>MOQ: {item.moq || 10} {item.unit}</Text>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:8}}>
            <Text style={{fontWeight:'bold', color: theme.colors.primary}}>₹{item.pricePerUnit || item.price}</Text>
            <Button 
              mode="contained-tonal" 
              compact 
              labelStyle={{fontSize:10, marginVertical: 2}}
              // ✅ FIXED: Explicitly mapping all required CartItem fields with fallbacks
              onPress={() => addToCart({
                ...item, 
                id: item.id || '', 
                quantity: item.moq || 1,
                // Fix: Ensure pricePerUnit is a number
                pricePerUnit: item.pricePerUnit || item.price || 0,
                // Fix: Ensure required strings are not undefined
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
      <View style={{flex: 1, flexDirection: 'row'}}>
        {/* L1 Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView>
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.sidebarItem, selectedCat === cat && styles.sidebarActive]}
                onPress={() => setSelectedCat(cat)}
              >
                <Text style={[styles.sidebarText, selectedCat === cat && {color:'white', fontWeight:'bold'}]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* L2 Product List */}
        <View style={styles.main}>
          <View style={styles.header}>
            <Text style={{fontWeight:'bold'}}>{selectedCat}</Text>
            <Text style={{fontSize:10, color:'gray'}}>{filteredProducts.length} items</Text>
          </View>
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            // Fallback for ID to ensure unique keys
            keyExtractor={(item, index) => item.id || index.toString()} 
            contentContainerStyle={{padding: 10}}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  sidebar: { width: 100, backgroundColor: '#F8FAFC', borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  sidebarItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  sidebarActive: { backgroundColor: '#004AAD' },
  sidebarText: { fontSize: 11, color: '#475569' },
  main: { flex: 1, backgroundColor: 'white' },
  header: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  prodCard: { marginBottom: 10, backgroundColor: 'white', elevation: 1, borderRadius: 8 },
  prodImage: { width: 80, backgroundColor: '#F1F5F9', borderTopLeftRadius: 8, borderBottomLeftRadius: 8, alignItems: 'center', justifyContent: 'center' }
});