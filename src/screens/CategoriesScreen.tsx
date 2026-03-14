import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, FlatList } from 'react-native';
import { Text, Button, Card, useTheme, Chip, Searchbar, IconButton, FAB, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { Product } from '../types';

// Standard Categories
const STANDARD_CATEGORIES = [
  'Industrial Chemicals', 
  'Pharma Chemicals', 
  'Agriculture', 
  'Food & Beverage', 
  'Lab Research'
];

// Display Categories
const CATEGORIES = [
  'All Products',
  ...STANDARD_CATEGORIES,
  'Other'
];

export default function CategoriesScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  
  // 🚀 Added compareList and functions from the store
  const { products, addToCart, user, compareList, addToCompare, removeFromCompare } = useAppStore();
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Advanced Filter Logic
  const filteredProducts = products.filter(p => {
    // 1. Filter out inactive products
    if (p.active === false) return false;

    // 2. Filter out products listed by the current user
    if (user && p.sellerId === user.uid) return false;

    // 3. Search Query Filter (Advanced: Name, Category, or Seller)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        p.name?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query) ||
        p.sellerName?.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }

    // 4. Category Filter
    if (selectedCat === 'All Products') return true;

    if (selectedCat === 'Other') {
      return !STANDARD_CATEGORIES.includes(p.category || '');
    }

    return p.category === selectedCat;
  });

  // 🚀 Logic to handle the compare toggle
  const handleToggleCompare = (item: Product) => {
    const isCompared = compareList.some(p => p.id === item.id);
    if (isCompared) {
      removeFromCompare(item.id!);
    } else {
      addToCompare(item);
      setSnackbarVisible(true);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isCompared = compareList.some(p => p.id === item.id);

    return (
      <Card 
        style={styles.prodCard} 
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
      >
        <View style={{flexDirection:'row'}}>
          <View style={styles.prodImage}>
              <Text style={{fontSize:28}}>🧪</Text>
          </View>
          
          <View style={{flex:1, padding:12}}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems: 'flex-start'}}>
               <View style={{flex: 1, marginRight: 8}}>
                 <Text style={styles.prodTitle} numberOfLines={1}>{item.name}</Text>
                 {item.verified && <Text style={{fontSize:10, color:'green', fontWeight:'bold', marginTop: 2}}>✓ Verified</Text>}
               </View>
               
               {/* 🚀 Compare Icon */}
               <IconButton 
                 icon={isCompared ? "checkbox-marked-circle" : "scale-balance"} 
                 iconColor={isCompared ? theme.colors.primary : '#94A3B8'}
                 size={20}
                 style={{ margin: 0, padding: 0 }}
                 onPress={() => handleToggleCompare(item)}
               />
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
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{fontWeight:'bold', color: theme.colors.primary}}>Browse Categories</Text>
      </View>

      {/* Search Bar inside Category */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search within categories..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={{minHeight: 0}}
        />
      </View>

      {/* Horizontal Category Chips */}
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
            Showing {filteredProducts.length} results
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
                <Text style={{color:'#999', marginTop: 10}}>No products found.</Text>
             </View>
          }
        />
      </View>

      {/* 🚀 Floating Action Button for Compare */}
      {compareList.length > 0 && (
        <FAB
          icon="scale-balance"
          label={`Compare (${compareList.length})`}
          style={styles.fab}
          color="white"
          onPress={() => navigation.navigate('Compare')}
        />
      )}

      {/* 🚀 Snackbar Feedback */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={5000}
        action={{ label: 'Compare', onPress: () => navigation.navigate('Compare') }}
      >
        Added to comparison.
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor:'white' },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 10, backgroundColor:'white' },
  searchbar: { backgroundColor: '#F1F5F9', borderRadius: 10, height: 45, elevation: 0 },
  
  catScroll: { paddingHorizontal: 16, paddingVertical: 10, alignItems:'center' },
  chip: { marginRight: 8, height: 36, backgroundColor: 'white', borderColor: '#E2E8F0' },
  
  main: { flex: 1 },
  subHeader: { paddingHorizontal: 16, paddingBottom: 8 },
  
  prodCard: { marginBottom: 12, backgroundColor: 'white', elevation: 2, borderRadius: 12, overflow: 'hidden' },
  prodImage: { width: 90, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  prodTitle: { fontWeight:'bold', fontSize:15 },
  actionRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:12 },
  
  // 🚀 FAB Style
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 20, backgroundColor: '#004AAD' }
});