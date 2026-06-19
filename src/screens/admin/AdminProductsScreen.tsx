import React, { useEffect, useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator, IconButton, Chip, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { getAllProductsForAdmin } from '../../services/adminService';

// Helper to safely parse Firebase Timestamps, strings, or numbers
const parseDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  // If it's a Firestore Timestamp with a toDate method
  if (typeof dateVal.toDate === 'function') {
    return dateVal.toDate();
  }
  // If it's a serialized Firestore Timestamp with seconds
  if (dateVal.seconds) {
    return new Date(dateVal.seconds * 1000);
  }
  // Fallback for strings or numbers (like ISO strings)
  const parsed = new Date(dateVal);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
};

export default function AdminProductsScreen() {
  const navigation = useNavigation<any>();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => { loadData(); }, []);

  // Debounce Search Input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchText]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllProductsForAdmin();
      
      // ✅ SORTING: Descending order (Newest first) using the robust parser
      data.sort((a, b) => {
        const parsedA = parseDate(a.createdAt);
        const parsedB = parseDate(b.createdAt);
        const dateA = parsedA ? parsedA.getTime() : 0;
        const dateB = parsedB ? parsedB.getTime() : 0;
        return dateB - dateA; // Highest number (newest) comes first
      });
      
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique categories from products for dynamic filtering
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['ALL', ...Array.from(cats)];
  }, [products]);

  // Apply Search and Filters
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Status Filter
      const isActive = p.active !== false; // Default true if undefined
      if (selectedStatus === 'ACTIVE' && !isActive) return false;
      if (selectedStatus === 'INACTIVE' && isActive) return false;

      // 2. Category Filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;

      // 3. Search Filter (Multi-field)
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesCas = (p.casNumber || '').toLowerCase().includes(q);
        const matchesSeller = (p.sellerName || '').toLowerCase().includes(q);
        const matchesCompany = (p.sellerCompanyName || '').toLowerCase().includes(q);
        const matchesId = (p.id || '').toLowerCase().includes(q);

        if (!matchesName && !matchesCas && !matchesSeller && !matchesCompany && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [products, debouncedSearch, selectedStatus, selectedCategory]);

  const formatDate = (dateVal: any) => {
    const date = parseDate(dateVal);
    if (!date) return 'N/A';
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Product Registry</Text>
        <IconButton icon="refresh" onPress={loadData} />
      </View>

      {/* Search and Filters Area */}
      <View style={styles.filterContainer}>
        <Searchbar
          placeholder="Search product, CAS, seller, or ID..."
          onChangeText={setSearchText}
          value={searchText}
          style={styles.searchBar}
          inputStyle={{ minHeight: 0 }}
          elevation={1}
        />
        
        <View style={{ height: 44 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {/* Status Filters */}
            <Chip 
              selected={selectedStatus === 'ALL'} 
              onPress={() => setSelectedStatus('ALL')} 
              style={styles.filterChip}
              showSelectedOverlay
            >All</Chip>
            <Chip 
              selected={selectedStatus === 'ACTIVE'} 
              onPress={() => setSelectedStatus('ACTIVE')} 
              style={styles.filterChip}
              showSelectedOverlay
            >Active</Chip>
            <Chip 
              selected={selectedStatus === 'INACTIVE'} 
              onPress={() => setSelectedStatus('INACTIVE')} 
              style={styles.filterChip}
              showSelectedOverlay
            >Inactive</Chip>

            <View style={styles.divider} />

            {/* Category Filters */}
            {categories.map((cat, idx) => (
              <Chip 
                key={idx}
                selected={selectedCategory === cat} 
                onPress={() => setSelectedCategory(cat)} 
                style={styles.filterChip}
                showSelectedOverlay
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </Chip>
            ))}
          </ScrollView>
        </View>
      </View>
      
      {/* Product List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} size="large" />
      ) : (
        <FlatList 
          data={filteredProducts}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={{ padding: 20, textAlign: 'center', color: '#888' }}>
              No products found matching your criteria.
            </Text>
          }
          renderItem={({ item }) => (
            <Card 
              style={styles.card} 
              onPress={() => navigation.navigate('ProductDetail', { product: item, isAdminView: true })}
            >
              <Card.Content>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.name}</Text>
                    <Text variant="bodySmall" style={{ color: '#64748B' }}>CAS: {item.casNumber || 'N/A'}</Text>
                  </View>
                  <Chip 
                    textStyle={{ fontSize: 10, fontWeight: 'bold' }} 
                    style={{ backgroundColor: item.active !== false ? '#E0F2F1' : '#FFEBEE', height: 28 }}
                  >
                    <Text style={{ color: item.active !== false ? '#00796B' : '#C62828' }}>
                      {item.active !== false ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </Chip>
                </View>

                <View style={styles.chipRow}>
                  <Chip icon="shape-outline" compact style={styles.chip}>{item.category || 'N/A'}</Chip>
                  <Chip icon="cash" compact style={styles.chip}>₹{item.pricePerUnit || item.price || 'N/A'}</Chip>
                  <Chip icon="package-variant-closed" compact style={styles.chip}>{item.packagingType || 'N/A'}</Chip>
                </View>

                <View style={styles.sellerBox}>
                  <Text variant="labelSmall" style={{ color: '#64748B', marginBottom: 4 }}>OWNER / SELLER DETAILS</Text>
                  <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{item.sellerCompanyName}</Text>
                  
                  <View style={styles.footerRow}>
                    <Text variant="bodySmall" style={{ color: '#64748B' }}>ID: {item.id?.substring(0,8)}...</Text>
                    {/* ✅ Uses the new safe formatter */}
                    <Text variant="bodySmall" style={{ color: '#64748B' }}>Added: {formatDate(item.createdAt)}</Text> 
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: '#F8FAFC'
  },
  header: {
    padding: 16, 
    backgroundColor: 'white', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  searchBar: {
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    height: 44,
  },
  filterScroll: {
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: '#F8FAFC',
    height: 32,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  card: {
    marginBottom: 12, 
    backgroundColor: 'white'
  },
  cardHeaderRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 8
  },
  chipRow: {
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8, 
    marginBottom: 12
  },
  chip: {
    backgroundColor: '#F1F5F9',
  },
  sellerBox: {
    backgroundColor: '#F1F5F9', 
    padding: 10, 
    borderRadius: 8
  },
  footerRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 6
  }
});