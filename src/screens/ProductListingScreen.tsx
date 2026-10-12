// src/screens/ProductListingScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Searchbar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { Product } from '../types';

export default function ProductListingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { category } = route.params || { category: 'All' };
  
  const products = useAppStore(state => state.products);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter(p => 
    (category === 'All' || p.category === category) &&
    (
      !searchQuery.trim() || 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      p.casNumber?.toLowerCase().includes(searchQuery.toLowerCase().trim())
    )
  );

  const renderProduct = ({ item }: { item: Product }) => {
    const itemPrice = item.pricePerUnit || item.price || 0;

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.88}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id || '', product: item })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓ VERIFIED</Text>
            </View>
            <Text style={styles.categoryLabel}>{item.category || category}</Text>
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

        {/* 2x2 Matrix */}
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
                {item.casNumber || 'N/A'}
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
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} iconColor="#0F172A" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{category}</Text>
          <Text style={styles.headerSubtitle}>
            {filteredProducts.length} verified listings in this category
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Searchbar
          placeholder={`Search in ${category}...`}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor="#059669"
        />
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
            <Text style={styles.emptyTitle}>No matching chemicals</Text>
            <Text style={styles.emptySubtitle}>
              No listings found in this category. You can post a custom sourcing request to invite bids.
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8, 
    paddingVertical: 6,
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Card */
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
});
