// src/screens/SellerManageChemicals.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, FlatList, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton, FAB, Switch, ActivityIndicator, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { getSellerProducts, deleteProduct, toggleProductStatus, updateProduct } from '../services/productService';
import { Product } from '../types';

export default function SellerManageChemicals() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { user } = useAppStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const isPremium = user?.subscriptionTier === 'GROWTH_PACKAGE';

  useEffect(() => {
    if (isFocused && user) {
      loadData();
    }
  }, [isFocused, user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const data = await getSellerProducts(user.uid);
    setProducts(data);
    setLoading(false);
  };

  const handleEdit = (product: Product) => {
    navigation.navigate('AddChemical', { product });
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    if (!id) return;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
    try {
      await toggleProductStatus(id, currentStatus);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
      loadData(); 
    }
  };

  const handleToggleDispatch = async (product: any) => {
    if (!isPremium) {
      Alert.alert(
        '👑 Priority Spot Feature', 
        'Boost buyer inquiries by flagging inventory as "Ready to Dispatch". Upgrade to Growth Package to unlock spot listings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Learn More', onPress: () => navigation.navigate('BusinessGrowth') }
        ]
      );
      return;
    }

    const newStatus = !product.readyToDispatch;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, readyToDispatch: newStatus } : p));
    
    try {
      await updateProduct(product.id, { readyToDispatch: newStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update dispatch status');
      loadData();
    }
  };

  const handleDelete = (id: string) => {
    if (!id) return;
    Alert.alert('Archive Product', 'Remove this chemical from the active exchange catalog?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          await deleteProduct(id);
          loadData();
        }
      }
    ]);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase().trim();
    return products.filter(p => 
      p.name?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query) ||
      p.casNumber?.toLowerCase().includes(query) ||
      p.pricePerUnit?.toString().includes(query)
    );
  }, [products, searchQuery]);

  const activeCount = products.filter(p => p.active !== false).length;

  const renderItem = ({ item }: { item: any }) => {
    const isActive = item.active !== false; 
    const isReady = item.readyToDispatch === true;
    const itemPrice = item.pricePerUnit || item.price || 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
                <Text style={[styles.statusBadgeText, isActive ? styles.statusActiveText : styles.statusInactiveText]}>
                  {isActive ? '● LIVE ON EXCHANGE' : '○ PAUSED'}
                </Text>
              </View>
              <Text style={styles.categoryText}>{item.category || 'Commodity'}</Text>
            </View>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          </View>
          <Switch 
            value={isActive} 
            onValueChange={() => handleToggleActive(item.id!, isActive)} 
            color="#059669"
          />
        </View>

        {/* 2x2 Metric Grid */}
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
              <Text style={styles.matrixLabel}>PURITY / GRADE</Text>
              <Text style={styles.matrixMeta} numberOfLines={1}>
                {item.purity ? `${item.purity}% Purity` : 'Industrial Grade'}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Footer Controls */}
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={[styles.spotToggleBtn, isReady && styles.spotToggleBtnActive]}
            onPress={() => handleToggleDispatch(item)}
            activeOpacity={0.8}
          >
            <Text style={[styles.spotToggleText, isReady && styles.spotToggleTextActive]}>
              {isReady ? '⚡ Spot Ready' : 'Mark Spot Ready'}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => handleEdit(item)}
              activeOpacity={0.8}
            >
              <IconButton icon="pencil-outline" size={16} iconColor="#0F172A" style={{ margin: 0 }} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.deleteBtn} 
              onPress={() => handleDelete(item.id!)}
              activeOpacity={0.8}
            >
              <IconButton icon="delete-outline" size={16} iconColor="#EF4444" style={{ margin: 0 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} iconColor="#0F172A" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Chemical Catalog Management</Text>
          <Text style={styles.headerSubtitle}>
            {activeCount} of {products.length} products actively receiving buyer bids
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Filter stock by chemical name, CAS No..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor="#059669"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0F172A" />
          <Text style={styles.loadingText}>Fetching plant catalog...</Text>
        </View>
      ) : (
        <FlatList 
          data={filteredProducts} 
          renderItem={renderItem} 
          keyExtractor={(item) => item.id || Math.random().toString()} 
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconButton icon="flask-empty-outline" size={48} iconColor="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? "No matching chemical stock found" : "No chemicals listed in your catalog"}
              </Text>
              <Text style={styles.emptySubtitle}>
                Add your chemical formulations, CAS numbers, and packaging to start receiving orders.
              </Text>
              <TouchableOpacity 
                style={styles.addBtnEmpty}
                onPress={() => navigation.navigate('AddChemical')}
              >
                <Text style={styles.addBtnEmptyText}>+ List New Chemical</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        label="List Chemical"
        style={styles.fab}
        color="#FFFFFF"
        onPress={() => navigation.navigate('AddChemical')}
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
    paddingHorizontal: 8, 
    paddingVertical: 8, 
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
  listContent: {
    padding: 16,
    paddingBottom: 90,
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
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusActiveText: {
    color: '#059669',
  },
  statusInactiveText: {
    color: '#64748B',
  },
  categoryText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
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
  matrixMeta: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },

  /* Footer Controls */
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
  spotToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  spotToggleBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  spotToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  spotToggleTextActive: {
    color: '#B45309',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  deleteBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },

  /* Empty */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  addBtnEmpty: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnEmptyText: {
    fontSize: 13,
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
  },
});
