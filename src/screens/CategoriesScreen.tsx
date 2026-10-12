// src/screens/CategoriesScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Text, Searchbar, IconButton, FAB, Snackbar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { Product } from '../types';

const CATEGORIES = [
  'All Products',
  'Industrial Chemicals',
  'Pharma Chemicals',
  'Agriculture',
  'Food & Beverage',
  'Lab Research',
  'Specialty Solvents',
];

export default function CategoriesScreen() {
  const navigation = useNavigation<any>();
  
  const { products, addToCart, user, compareList, addToCompare, removeFromCompare } = useAppStore();
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const isPremium = user?.subscriptionTier === 'GROWTH_PACKAGE';

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter(p => {
      if (p.active === false) return false;
      if (user && p.sellerId === user.uid) return false;
      
      const matchesSearch = !q || 
        p.name?.toLowerCase().includes(q) || 
        p.casNumber?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (selectedCat === 'All Products') return true;
      return p.category?.toLowerCase() === selectedCat.toLowerCase();
    }).sort((a, b) => {
      const aIsPremium = (a as any).sellerTier === 'GROWTH_PACKAGE' ? 1 : 0;
      const bIsPremium = (b as any).sellerTier === 'GROWTH_PACKAGE' ? 1 : 0;
      return bIsPremium - aIsPremium;
    });
  }, [products, searchQuery, selectedCat, user?.uid]);

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
      Alert.alert('👑 Ready-to-Dispatch Inventory', 'Upgrade to Growth Package for priority spot dispatch.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade Now', onPress: () => navigation.navigate('BusinessGrowth') }
      ]);
      return;
    }
    addToCart({ 
      ...item, 
      id: item.id || '', 
      quantity: item.moq || 100, 
      pricePerUnit: item.pricePerUnit || item.price || 0, 
      unit: item.unit || 'kg', 
      sellerId: item.sellerId || 'unknown' 
    });
    Alert.alert('Added to Cart', `${item.name} (${item.moq || 100} ${item.unit || 'kg'}) added.`);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isCompared = compareList.some(p => p.id === item.id);
    const itemPrice = item.pricePerUnit || item.price || 0;

    return (
      <TouchableOpacity 
        style={styles.productCard} 
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
        activeOpacity={0.88}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ VERIFIED</Text>
            </View>
            <Text style={styles.categoryText}>{item.category || 'Industrial Chemical'}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.compareChip, isCompared && styles.compareChipActive]}
            onPress={() => handleToggleCompare(item)}
          >
            <IconButton 
              icon={isCompared ? "check" : "scale-balance"} 
              size={14} 
              iconColor={isCompared ? "#FFFFFF" : "#64748B"} 
              style={{ margin: 0, padding: 0 }}
            />
            <Text style={[styles.compareChipText, isCompared && { color: '#FFFFFF' }]}>
              {isCompared ? 'Compared' : 'Compare'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Product Title */}
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.name}
        </Text>

        {/* 2x2 Matrix */}
        <View style={styles.specMatrix}>
          <View style={styles.matrixRow}>
            <View style={[styles.matrixCell, styles.matrixBorderRight]}>
              <Text style={styles.matrixLabel}>INDICATIVE RATE</Text>
              <Text style={styles.matrixPrice}>
                ₹{Number(itemPrice).toLocaleString('en-IN')}
                <Text style={styles.matrixUnit}> / {item.unit || 'kg'}</Text>
              </Text>
            </View>
            <View style={styles.matrixCell}>
              <Text style={styles.matrixLabel}>MIN. ORDER (MOQ)</Text>
              <Text style={styles.matrixValue}>
                {Number(item.moq || 100).toLocaleString('en-IN')} {item.unit || 'kg'}
              </Text>
            </View>
          </View>

          <View style={[styles.matrixRow, styles.matrixBorderTop]}>
            <View style={[styles.matrixCell, styles.matrixBorderRight]}>
              <Text style={styles.matrixLabel}>CAS REGISTRY NO.</Text>
              <Text style={styles.matrixMeta} numberOfLines={1}>
                {item.casNumber || 'N/A'}
              </Text>
            </View>
            <View style={styles.matrixCell}>
              <Text style={styles.matrixLabel}>SUPPLIER LOCATION</Text>
              <Text style={styles.matrixMeta} numberOfLines={1}>
                📍 {(item as any).location || item.origin || 'India'}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.detailBtn}
            onPress={() => navigation.navigate('ProductDetail', { product: item })}
          >
            <Text style={styles.detailBtnText}>View Specs & Certificate</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quoteBtn}
            onPress={() => navigation.navigate('ProductDetail', { product: item })}
          >
            <Text style={styles.quoteBtnText}>Request Quote →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <IconButton icon="arrow-left" size={24} iconColor="#0F172A" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Chemical Catalog</Text>
          <Text style={styles.screenSubtitle}>
            {filteredProducts.length} verified products available for quotation
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <Searchbar 
          placeholder="Filter by chemical name, formula or CAS No..." 
          onChangeText={setSearchQuery} 
          value={searchQuery} 
          style={styles.searchBar} 
          inputStyle={styles.searchInput}
          iconColor="#059669"
        />
      </View>

      {/* Horizontal Category Rail */}
      <View style={styles.catRailWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {CATEGORIES.map(cat => {
            const isSelected = selectedCat === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCat(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item, index) => item.id || index.toString()} 
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconButton icon="flask-empty-outline" size={48} iconColor="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching chemicals found</Text>
            <Text style={styles.emptySubtitle}>
              Can't find what you need? Broadcast a custom RFQ to verified suppliers across India.
            </Text>
            <TouchableOpacity 
              style={styles.postRfqBtn}
              onPress={() => navigation.navigate('PostRequirement')}
            >
              <Text style={styles.postRfqBtnText}>Post Sourcing Requirement</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {compareList.length > 0 && (
        <FAB 
          icon="scale-balance" 
          label={`Compare (${compareList.length})`} 
          style={styles.fab} 
          color="#FFFFFF" 
          onPress={() => navigation.navigate('Compare')} 
        />
      )}
      <Snackbar 
        visible={snackbarVisible} 
        onDismiss={() => setSnackbarVisible(false)} 
        duration={2500} 
        action={{ label: 'View', onPress: () => navigation.navigate('Compare') }}
      >
        Added to chemical comparison sheet.
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  screenHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  searchWrapper: { 
    paddingHorizontal: 16, 
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: { 
    backgroundColor: '#F1F5F9', 
    borderRadius: 8, 
    height: 42, 
    elevation: 0,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    fontSize: 13,
    minHeight: 0,
  },
  catRailWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  catScroll: { 
    paddingHorizontal: 16, 
    gap: 8,
  },
  categoryChip: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    backgroundColor: '#F8FAFC',
    borderWidth: 1, 
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryChipText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    padding: 16,
    paddingBottom: 90,
  },

  /* Product Deal Matrix Card */
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  categoryText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  compareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  compareChipActive: {
    backgroundColor: '#0F172A',
  },
  compareChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 2,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    paddingHorizontal: 14,
    marginBottom: 10,
    lineHeight: 21,
  },

  /* 2x2 Matrix */
  specMatrix: {
    marginHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  matrixRow: {
    flexDirection: 'row',
  },
  matrixCell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  matrixBorderRight: {
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  matrixBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  matrixLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  matrixPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    fontVariant: ['tabular-nums'],
  },
  matrixUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  matrixValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  matrixMeta: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#334155',
  },

  /* Actions */
  cardActions: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  detailBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  quoteBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  postRfqBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  postRfqBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  fab: { 
    position: 'absolute', 
    margin: 16, 
    right: 0, 
    bottom: 24, 
    backgroundColor: '#0F172A',
    borderRadius: 24,
  }
});
