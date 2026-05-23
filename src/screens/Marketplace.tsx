// src/screens/Marketplace.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Searchbar, ActivityIndicator, IconButton, Chip, useTheme, Button, Portal, Modal, RadioButton, Divider } from 'react-native-paper';
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
  
  // Sort/Filter State
  const [sortVisible, setSortVisible] = useState(false);
  const [sortBy, setSortBy] = useState('price_asc');

  const categories = ['All Products', 'Industrial Acids', 'Alkalis', 'Oxidizers', 'Salts'];

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      let data = await getProducts(); 
      const catParam = selectedCategory === 'All Products' ? undefined : selectedCategory;
      if (catParam) {
        data = data.filter(p => p.category === catParam);
      }
      setProducts(data);
      applySortAndFilter(data, searchTerm, sortBy);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const applySortAndFilter = (data: Product[], term: string, sortOrder: string) => {
    let result = [...data];
    if (term.trim()) {
      const lowerTerm = term.toLowerCase();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(lowerTerm) ||
        p.category?.toLowerCase().includes(lowerTerm) ||
        p.sellerName?.toLowerCase().includes(lowerTerm)
      );
    }
    
    if (sortOrder === 'price_asc') {
      result.sort((a, b) => (a.pricePerUnit || a.price || 0) - (b.pricePerUnit || b.price || 0));
    } else if (sortOrder === 'price_desc') {
      result.sort((a, b) => (b.pricePerUnit || b.price || 0) - (a.pricePerUnit || a.price || 0));
    } else if (sortOrder === 'moq_asc') {
      result.sort((a, b) => (a.moq || 0) - (b.moq || 0));
    }

    setFilteredProducts(result);
  };

  useEffect(() => {
    applySortAndFilter(products, searchTerm, sortBy);
  }, [searchTerm, products, sortBy]);

  // 🚀 COMPACT RESULT CELL
  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.compactRow} 
      activeOpacity={0.7}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id || '' })}
    >
      <View style={styles.thumbnail}>
        <Text style={{fontSize: 20}}>🧪</Text>
      </View>
      
      <View style={styles.middleCol}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
          {item.readyToDispatch && <View style={styles.stockDot} />}
        </View>
        <Text numberOfLines={1} style={styles.metaText}>
          {item.sellerName || 'Verified Supplier'} • {(item as any).location || 'Gujarat, IN'}
        </Text>
        <View style={styles.badgeRow}>
          <Text style={styles.moqText}>MOQ: {item.moq || 1} {item.unit}</Text>
          {item.verified && <Text style={styles.trustBadge}>✓ Verified</Text>}
        </View>
      </View>
      
      <View style={styles.rightCol}>
        <Text style={[styles.priceText, { color: theme.colors.primary }]}>
          ₹{item.pricePerUnit || item.price || 0}
        </Text>
        <Text style={styles.unitText}>/{item.unit || 'unit'}</Text>
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
          inputStyle={{minHeight: 36, fontSize: 14}}
        />
      </View>

      {/* 🚀 STICKY FILTER & SORT BAR */}
      <View style={styles.stickyFilterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Button mode="text" icon="sort" compact textColor="#475569" onPress={() => setSortVisible(true)}>
            Sort
          </Button>
          <Divider style={{width: 1, height: '60%', alignSelf: 'center', marginHorizontal: 8}} />
          {categories.map((cat) => (
            <Chip
              key={cat}
              selected={selectedCategory === cat || (cat === 'All Products' && !selectedCategory)}
              onPress={() => setSelectedCategory(cat === 'All Products' ? undefined : cat)}
              style={[styles.chip, selectedCategory === cat && { backgroundColor: '#E3F2FD', borderColor: theme.colors.primary }]}
              textStyle={{ fontSize: 11, marginVertical: 0 }}
              compact
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
          ItemSeparatorComponent={() => <Divider style={{backgroundColor: '#F1F5F9'}}/>}
        />
      )}

      {/* SORT BOTTOM SHEET (MODAL) */}
      <Portal>
        <Modal visible={sortVisible} onDismiss={() => setSortVisible(false)} contentContainerStyle={styles.bottomSheet}>
          <Text variant="titleMedium" style={{fontWeight: 'bold', marginBottom: 12}}>Sort Products</Text>
          <RadioButton.Group onValueChange={value => { setSortBy(value); setSortVisible(false); }} value={sortBy}>
            <RadioButton.Item label="Price: Low to High" value="price_asc" labelStyle={{fontSize: 14}} />
            <RadioButton.Item label="Price: High to Low" value="price_desc" labelStyle={{fontSize: 14}} />
            <RadioButton.Item label="MOQ: Lowest First" value="moq_asc" labelStyle={{fontSize: 14}} />
          </RadioButton.Group>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0, paddingBottom: 0 },
  searchContainer: { paddingHorizontal: 12, marginBottom: 8 },
  searchbar: { backgroundColor: '#F8FAFC', borderRadius: 8, height: 40, elevation: 0 },
  
  stickyFilterBar: { paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  chip: { marginRight: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', height: 26, elevation: 0 },
  
  list: { paddingBottom: 20 },
  
  compactRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 12, alignItems: 'center' },
  thumbnail: { width: 44, height: 44, backgroundColor: '#F1F5F9', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  middleCol: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  productName: { fontWeight: 'bold', fontSize: 14, color: '#1E293B', paddingRight: 4 },
  stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginTop: 2 },
  metaText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  moqText: { fontSize: 10, color: '#475569', backgroundColor: '#F1F5F9', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  trustBadge: { fontSize: 10, color: '#059669', marginLeft: 8, fontWeight: 'bold' },
  
  rightCol: { alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 8 },
  priceText: { fontWeight: 'bold', fontSize: 15 },
  unitText: { fontSize: 10, color: '#94A3B8' },
  
  bottomSheet: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});