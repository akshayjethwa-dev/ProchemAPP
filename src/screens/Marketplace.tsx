import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Text, Searchbar, ActivityIndicator, IconButton, Card, Chip, useTheme, Button } from 'react-native-paper';
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

  const categories = [
    'All Products',
    'Industrial Acids',
    'Alkalis', 
    'Oxidizers',
    'Salts'
  ];

  // Initial Load & Category Change
  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // ✅ FIX: Call getProducts() with NO arguments (matches your service definition)
      let data = await getProducts(); 
      
      // ✅ FIX: Filter by Category Client-Side
      const catParam = selectedCategory === 'All Products' ? undefined : selectedCategory;
      if (catParam) {
        data = data.filter(p => p.category === catParam);
      }
      
      setProducts(data);
      setFilteredProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
      console.error('Marketplace error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Client-side Search Filter
  useEffect(() => {
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(lowerTerm) ||
        p.category.toLowerCase().includes(lowerTerm)
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  const renderProduct = ({ item }: { item: Product }) => (
    <Card 
      style={styles.card} 
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id || '' })}
    >
      <View style={styles.cardContent}>
        <View style={styles.imageContainer}>
          <Text style={{fontSize: 32}}>🧪</Text>
        </View>
        
        <View style={styles.infoContainer}>
          <Text variant="titleMedium" numberOfLines={2} style={styles.productName}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={styles.categoryText}>
            {item.category}
          </Text>
          
          <View style={styles.priceRow}>
            <Text variant="titleLarge" style={{color: theme.colors.primary, fontWeight:'bold'}}>
              ₹{item.pricePerUnit || item.price || 0}
            </Text>
            <Text variant="bodySmall" style={{color: '#666'}}>
              /{item.unit || 'unit'}
            </Text>
          </View>

          <View style={styles.sellerRow}>
             <Text style={styles.sellerText}>By: {item.sellerName || 'Verified Seller'}</Text>
             {item.verified && (
               <Text style={styles.verifiedBadge}> ✓ Verified</Text>
             )}
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineSmall" style={{fontWeight:'bold'}}>Marketplace</Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search chemicals..."
          onChangeText={setSearchTerm}
          value={searchTerm}
          style={styles.searchbar}
          inputStyle={{minHeight: 0}}
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              selected={selectedCategory === cat || (cat === 'All Products' && !selectedCategory)}
              onPress={() => setSelectedCategory(cat === 'All Products' ? undefined : cat)}
              style={[styles.chip, selectedCategory === cat && { backgroundColor: '#E3F2FD' }]}
              showSelectedOverlay
            >
              {cat}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{marginTop: 10}}>Loading marketplace...</Text>
        </View>
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
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={{justifyContent:'space-between'}}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text variant="titleMedium" style={{color: '#999'}}>No products found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 10 },
  searchContainer: { paddingHorizontal: 16, marginBottom: 10 },
  searchbar: { backgroundColor: 'white', borderRadius: 10, elevation: 1 },
  catScroll: { paddingHorizontal: 16, paddingBottom: 10 },
  chip: { marginRight: 8, backgroundColor: 'white', elevation: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { width: '48%', marginBottom: 16, backgroundColor: 'white', elevation: 2 },
  cardContent: { padding: 12 },
  imageContainer: { height: 100, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  infoContainer: { flex: 1 },
  productName: { fontWeight: 'bold', fontSize: 14 },
  categoryText: { color: '#666', fontSize: 10, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  sellerText: { fontSize: 10, color: '#64748B' },
  verifiedBadge: { fontSize: 10, color: 'green', fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }
});