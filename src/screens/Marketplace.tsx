import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Searchbar, ActivityIndicator, IconButton, Chip, useTheme, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { getProducts } from '../services/productService'; 
import { Product } from '../types';

export default function Marketplace() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const categories = ['All Products', 'Industrial Acids', 'Alkalis', 'Oxidizers', 'Salts'];

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      let data = await getProducts(); 
      const catParam = selectedCategory === 'All Products' ? undefined : selectedCategory;
      if (catParam) {
        data = data.filter(p => p.category === catParam);
      }
      setProducts(data);
      setFilteredProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = products.filter(p => 
        p.name?.toLowerCase().includes(lowerTerm) ||
        p.category?.toLowerCase().includes(lowerTerm) ||
        p.sellerName?.toLowerCase().includes(lowerTerm)
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  // 🔥 ULTRA-DENSITY LIST ITEM
  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.7}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id || '' })}
    >
      <View style={styles.imageContainer}>
        <Text style={{fontSize: 24}}>🧪</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <View>
          <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
          <Text numberOfLines={1} style={styles.sellerText}>{item.sellerName || 'Verified Seller'} • MOQ: {item.moq || 1}</Text>
        </View>
        
        <View style={styles.bottomRow}>
          <Text style={[styles.priceText, { color: theme.colors.primary }]}>
            ₹{item.pricePerUnit || item.price || 0} <Text style={styles.unitText}>/{item.unit || 'unit'}</Text>
          </Text>
          
          {item.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={20} onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{fontWeight:'bold'}}>Marketplace</Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search chemicals..."
          onChangeText={setSearchTerm}
          value={searchTerm}
          style={styles.searchbar}
          inputStyle={{minHeight: 36, fontSize: 14}} // 🔥 Slimmer search bar
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              selected={selectedCategory === cat || (cat === 'All Products' && !selectedCategory)}
              onPress={() => setSelectedCategory(cat === 'All Products' ? undefined : cat)}
              style={[styles.chip, selectedCategory === cat && { backgroundColor: '#E3F2FD', borderColor: theme.colors.primary }]}
              textStyle={{ fontSize: 11, marginVertical: 0 }}
              showSelectedOverlay
            >
              {cat}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{color:'red', marginBottom: 10}}>{error}</Text>
          <Button mode="contained" onPress={loadProducts}>Retry</Button>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item, index) => item.id || index.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={styles.center}><Text style={{color: '#999'}}>No products found</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0, paddingBottom: 0 },
  searchContainer: { paddingHorizontal: 12, marginBottom: 8 },
  // 🔥 REDUCED search bar height
  searchbar: { backgroundColor: '#FFFFFF', borderRadius: 8, height: 40, borderWidth: 1, borderColor: '#E5E7EB', elevation: 0 },
  catScroll: { paddingHorizontal: 12, paddingBottom: 8 },
  // 🔥 SLIMMER chips
  chip: { marginRight: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', height: 28, elevation: 0, alignItems: 'center' },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 8, 
    padding: 8, 
    marginBottom: 6 // 🔥 Tighter gaps between products
  },
  // 🔥 REDUCED Image from 80px to 56px
  imageContainer: { 
    width: 56, 
    height: 56, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 6, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  infoContainer: { 
    flex: 1, 
    marginLeft: 10, 
    justifyContent: 'space-between' 
  },
  productName: { fontWeight: 'bold', fontSize: 13, color: '#1F2937' },
  // 🔥 Consolidated Seller text and MOQ into one line to save vertical space
  sellerText: { fontSize: 10, color: '#64748B', marginTop: 1 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { fontWeight: 'bold', fontSize: 13 },
  unitText: { fontSize: 10, color: '#64748B', fontWeight: 'normal' },
  verifiedBadge: { backgroundColor: '#DEF7EC', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8 },
  verifiedBadgeText: { fontSize: 9, color: '#03543F', fontWeight: 'bold' },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }
});