// src/screens/Marketplace.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Searchbar, ActivityIndicator, IconButton, Portal, Modal, RadioButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { getProducts } from '../services/productService'; 
import { Product } from '../types';

const CATEGORIES = [
  'All Products',
  'Industrial Acids',
  'Alkalis & Bases',
  'Specialty Solvents',
  'Pharma & API',
  'Polymers & Resins',
  'Salts & Minerals'
];

export default function Marketplace() {
  const navigation = useNavigation<any>();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  
  // Sort/Filter State
  const [sortVisible, setSortVisible] = useState(false);
  const [sortBy, setSortBy] = useState('price_asc');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts(); 
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to load marketplace products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (selectedCategory !== 'All Products') {
      result = result.filter(p => p.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Search filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase().trim();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(lower) ||
        p.casNumber?.toLowerCase().includes(lower) ||
        p.category?.toLowerCase().includes(lower) ||
        p.sellerName?.toLowerCase().includes(lower)
      );
    }

    // Sort order
    if (sortBy === 'price_asc') {
      result.sort((a, b) => (a.pricePerUnit || a.price || 0) - (b.pricePerUnit || b.price || 0));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => (b.pricePerUnit || b.price || 0) - (a.pricePerUnit || a.price || 0));
    } else if (sortBy === 'moq_asc') {
      result.sort((a, b) => (a.moq || 0) - (b.moq || 0));
    }

    return result;
  }, [products, selectedCategory, searchTerm, sortBy]);

  const renderProduct = ({ item }: { item: Product }) => {
    const itemPrice = item.pricePerUnit || item.price || 0;

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.88}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id || '' })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓ VERIFIED PLANT</Text>
            </View>
            <Text style={styles.categoryLabel}>{item.category || 'Commodity'}</Text>
          </View>
          {item.readyToDispatch && (
            <View style={styles.spotBadge}>
              <Text style={styles.spotBadgeText}>⚡ Ready Stock</Text>
            </View>
          )}
        </View>

        <Text style={styles.productTitle} numberOfLines={2}>
          {item.name}
        </Text>

        {/* 2x2 Matrix Grid */}
        <View style={styles.matrixContainer}>
          <View style={styles.matrixRow}>
            <View style={[styles.matrixCell, styles.matrixBorderRight]}>
              <Text style={styles.matrixLabel}>BASE RATE</Text>
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
              <Text style={styles.matrixCode} numberOfLines={1}>
                {item.casNumber || 'Spec on file'}
              </Text>
            </View>
            <View style={styles.matrixCell}>
              <Text style={styles.matrixLabel}>PORT / DISPATCH</Text>
              <Text style={styles.matrixLocation} numberOfLines={1}>
                📍 {(item as any).location || item.origin || 'Dahej Port, Gujarat'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.sellerNameText} numberOfLines={1}>
            🏭 {item.sellerName || 'Verified Chemical Supplier'}
          </Text>
          <View style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Request RFQ →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Chemical Trading Floor</Text>
          <Text style={styles.headerSubtitle}>
            {filteredProducts.length} verified chemical products ready for transaction
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.sortButton} 
          onPress={() => setSortVisible(true)}
          activeOpacity={0.8}
        >
          <IconButton icon="sort-variant" size={18} iconColor="#0F172A" style={{ margin: 0, padding: 0 }} />
          <Text style={styles.sortButtonText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by chemical name, formula or port..."
          onChangeText={setSearchTerm}
          value={searchTerm}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor="#059669"
        />
      </View>

      {/* Category Rail */}
      <View style={styles.catRail}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {CATEGORIES.map(c => {
            const isSelected = selectedCategory === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(c)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0F172A" />
          <Text style={styles.loadingText}>Fetching live market inventory...</Text>
        </View>
      ) : (
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
                No supplier has listed inventory matching your filters. Post an RFQ to invite quotations.
              </Text>
              <TouchableOpacity 
                style={styles.postRfqBtn} 
                onPress={() => navigation.navigate('PostRequirement')}
              >
                <Text style={styles.postRfqBtnText}>Post Sourcing RFQ</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Sort Bottom Modal */}
      <Portal>
        <Modal 
          visible={sortVisible} 
          onDismiss={() => setSortVisible(false)} 
          contentContainerStyle={styles.modalSheet}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sort Trading Floor</Text>
            <IconButton icon="close" size={20} iconColor="#64748B" onPress={() => setSortVisible(false)} />
          </View>
          
          <RadioButton.Group onValueChange={value => { setSortBy(value); setSortVisible(false); }} value={sortBy}>
            <TouchableOpacity style={styles.radioItem} onPress={() => { setSortBy('price_asc'); setSortVisible(false); }}>
              <RadioButton.Android value="price_asc" color="#0F172A" />
              <Text style={styles.radioText}>Price: Low to High</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioItem} onPress={() => { setSortBy('price_desc'); setSortVisible(false); }}>
              <RadioButton.Android value="price_desc" color="#0F172A" />
              <Text style={styles.radioText}>Price: High to Low</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioItem} onPress={() => { setSortBy('moq_asc'); setSortVisible(false); }}>
              <RadioButton.Android value="moq_asc" color="#0F172A" />
              <Text style={styles.radioText}>Minimum Order Quantity (Low to High)</Text>
            </TouchableOpacity>
          </RadioButton.Group>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 2,
  },
  searchContainer: {
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
  catRail: {
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
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
  },

  /* Deal Matrix Card */
  card: {
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
    paddingBottom: 6,
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
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  categoryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  spotBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  spotBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
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
  matrixContainer: {
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
  matrixCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#334155',
  },
  matrixLocation: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },

  /* Footer */
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  sellerNameText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  actionBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 11,
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

  /* Modal */
  modalSheet: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  radioText: {
    fontSize: 14,
    color: '#1E293B',
    marginLeft: 8,
  },
});
