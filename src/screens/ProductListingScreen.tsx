import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Searchbar, useTheme, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../store/appStore';
import { RootStackParamList } from '../navigation/types';
import { Product } from '../types';

export default function ProductListingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { category } = route.params || { category: 'All' };
  
  const products = useAppStore(state => state.products);
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter(p => 
    (category === 'All' || p.category === category) &&
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 🔥 HIGH-DENSITY HORIZONTAL LIST ITEM
  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.7}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id || '' })}
    >
      <View style={styles.imageContainer}>
        <Text style={{fontSize: 32}}>🧪</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <View>
          <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
          <Text numberOfLines={1} style={styles.sellerText}>Sold by: {item.sellerName || 'Verified Seller'}</Text>
        </View>
        
        <View style={styles.bottomRow}>
          <View>
            <Text style={[styles.priceText, { color: theme.colors.primary }]}>
              ₹{item.pricePerUnit || item.price || 0} <Text style={styles.unitText}>/{item.unit || 'unit'}</Text>
            </Text>
            <Text style={styles.moqText}>MOQ: {item.moq || 1}</Text>
          </View>
          
          <IconButton 
            icon="chevron-right" 
            size={20} 
            iconColor="#9CA3AF" 
            style={{ margin: 0, padding: 0 }} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{fontWeight:'bold'}}>{category} Marketplace</Text>
      </View>

      <Searchbar
        placeholder="Search chemicals..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={{minHeight: 40, padding: 0}}
      />

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={{padding: 40, alignItems:'center'}}>
            <Text style={{color: '#9CA3AF'}}>No products found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 4 },
  searchBar: { marginHorizontal: 12, marginBottom: 12, backgroundColor: '#FFFFFF', borderRadius: 8, height: 44, borderWidth: 1, borderColor: '#E5E7EB', elevation: 0 },
  listContent: { paddingHorizontal: 12, paddingBottom: 20 },
  
  // 🔥 HIGH-DENSITY CARD STYLES
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 8, 
    padding: 8, 
    marginBottom: 8 
  },
  imageContainer: { 
    width: 80, 
    height: 80, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 6, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  infoContainer: { 
    flex: 1, 
    marginLeft: 12, 
    justifyContent: 'space-between' 
  },
  productName: { fontWeight: 'bold', fontSize: 14, color: '#1F2937' },
  sellerText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  priceText: { fontWeight: 'bold', fontSize: 14 },
  unitText: { fontSize: 11, color: '#64748B', fontWeight: 'normal' },
  moqText: { fontSize: 10, color: '#64748B', marginTop: 2 },
});