// src/screens/CategoriesScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, Chip, Searchbar, IconButton, FAB, Snackbar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { Product } from '../types';

const STANDARD_CATEGORIES = ['Industrial Chemicals', 'Pharma Chemicals', 'Agriculture', 'Food & Beverage', 'Lab Research'];
const CATEGORIES = ['All Products', ...STANDARD_CATEGORIES, 'Other'];

export default function CategoriesScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  
  const { products, addToCart, user, compareList, addToCompare, removeFromCompare } = useAppStore();
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const isPremium = user?.subscriptionTier === 'GROWTH_PACKAGE';

  const filteredProducts = products.filter(p => {
    if (p.active === false) return false;
    if (user && p.sellerId === user.uid) return false;
    if (searchQuery.trim() && !p.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCat === 'All Products') return true;
    if (selectedCat === 'Other') return !STANDARD_CATEGORIES.includes(p.category || '');
    return p.category === selectedCat;
  });

  const handleToggleCompare = (item: Product) => {
    if (compareList.some(p => p.id === item.id)) {
      removeFromCompare(item.id!);
    } else {
      addToCompare(item);
      setSnackbarVisible(true);
    }
  };

  const handleActionClick = (item: Product) => {
    if (item.readyToDispatch && !isPremium) {
      Alert.alert('👑 Premium Inventory', 'Upgrade to Business Growth Package to access.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade Now', onPress: () => navigation.navigate('BusinessGrowth') }
      ]);
      return;
    }
    addToCart({ ...item, id: item.id || '', quantity: item.moq || 1, pricePerUnit: item.pricePerUnit || item.price || 0, unit: item.unit || 'kg', sellerId: item.sellerId || 'unknown' });
  };

  // 🚀 COMPACT LIST ITEM
  const renderProduct = ({ item }: { item: Product }) => {
    const isCompared = compareList.some(p => p.id === item.id);
    const isRestricted = item.readyToDispatch && !isPremium;

    return (
      <TouchableOpacity style={[styles.compactRow, item.readyToDispatch && { backgroundColor: '#FFFAED' }]} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
        <View style={styles.thumbnail}><Text style={{fontSize: 20}}>🧪</Text></View>
        
        <View style={styles.middleCol}>
          <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
          <Text numberOfLines={1} style={styles.metaText}>{item.category} • MOQ: {item.moq || 10} {item.unit}</Text>
          {item.readyToDispatch && (
            <Text style={styles.premiumBadge}>👑 Ready to Dispatch</Text>
          )}
        </View>

        <View style={styles.rightCol}>
          <Text style={[styles.priceText, { color: theme.colors.primary }]}>₹{item.pricePerUnit || item.price}</Text>
          <View style={styles.actionRow}>
            <IconButton icon={isCompared ? "checkbox-marked-circle" : "scale-balance"} iconColor={isCompared ? theme.colors.primary : '#94A3B8'} size={20} style={{ margin: 0, padding: 0 }} onPress={() => handleToggleCompare(item)} />
            <IconButton icon={isRestricted ? "lock" : "cart-plus"} iconColor={isRestricted ? '#D97706' : theme.colors.primary} size={20} style={{ margin: 0, padding: 0, marginLeft: 8 }} onPress={() => handleActionClick(item)} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{fontWeight:'bold', color: theme.colors.primary}}>Browse Categories</Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar placeholder="Search within categories..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchbar} inputStyle={{minHeight: 0}} />
      </View>

      <View style={{height: 50}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {CATEGORIES.map(cat => (
            <Chip key={cat} selected={selectedCat === cat} onPress={() => setSelectedCat(cat)} style={[styles.chip, selectedCat === cat && { backgroundColor: '#E3F2FD', borderColor: '#004AAD' }]} textStyle={{ color: selectedCat === cat ? '#004AAD' : '#475569', fontSize: 12, marginVertical: 0 }} mode="outlined" compact>
              {cat}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item, index) => item.id || index.toString()} 
        contentContainerStyle={{paddingBottom: 80}}
        ItemSeparatorComponent={() => <Divider style={{backgroundColor: '#F1F5F9'}}/>}
        ListHeaderComponent={<Text style={styles.subHeader}>Showing {filteredProducts.length} results</Text>}
        ListEmptyComponent={<View style={{alignItems:'center', marginTop: 50}}><Text style={{fontSize: 30}}>🔍</Text><Text style={{color:'#999', marginTop: 10}}>No products found.</Text></View>}
      />

      {compareList.length > 0 && <FAB icon="scale-balance" label={`Compare (${compareList.length})`} style={styles.fab} color="white" onPress={() => navigation.navigate('Compare')} />}
      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000} action={{ label: 'Compare', onPress: () => navigation.navigate('Compare') }}>Added to comparison.</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 16, paddingVertical: 10 },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 10 },
  searchbar: { backgroundColor: '#F8FAFC', borderRadius: 8, height: 40, elevation: 0 },
  catScroll: { paddingHorizontal: 16, alignItems:'center' },
  chip: { marginRight: 8, height: 28, backgroundColor: 'white', borderColor: '#E2E8F0' },
  subHeader: { paddingHorizontal: 16, paddingVertical: 8, color: '#64748B', fontSize: 12, backgroundColor: '#F8FAFC' },
  
  compactRow: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  thumbnail: { width: 40, height: 40, backgroundColor: '#F1F5F9', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  middleCol: { flex: 1, marginLeft: 12 },
  productName: { fontWeight: 'bold', fontSize: 14, color: '#1E293B' },
  metaText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  premiumBadge: { fontSize: 10, color: '#D97706', fontWeight: 'bold', marginTop: 2 },
  
  rightCol: { alignItems: 'flex-end', justifyContent: 'center' },
  priceText: { fontWeight: 'bold', fontSize: 14 },
  actionRow: { flexDirection: 'row', marginTop: 4 },
  
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 20, backgroundColor: '#004AAD' }
});