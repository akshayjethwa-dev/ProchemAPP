// src/screens/ProductListingScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Searchbar, useTheme, IconButton, Divider } from 'react-native-paper';
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
        <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
        <Text numberOfLines={1} style={styles.metaText}>
          {item.sellerName || 'Verified Seller'} • MOQ: {item.moq || 1} {item.unit}
        </Text>
      </View>
      
      <View style={styles.rightCol}>
        <Text style={[styles.priceText, { color: theme.colors.primary }]}>
          ₹{item.pricePerUnit || item.price || 0}
        </Text>
        <IconButton 
          icon="chevron-right" 
          size={16} 
          iconColor="#9CA3AF" 
          style={{ margin: 0, padding: 0, marginTop: 4 }} 
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{fontWeight:'bold'}}>{category}</Text>
      </View>

      <Searchbar
        placeholder="Search chemicals..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={{minHeight: 36, fontSize: 14}}
      />

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item, index) => item.id || index.toString()}
        ItemSeparatorComponent={() => <Divider style={{backgroundColor: '#F1F5F9'}}/>}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 4 },
  searchBar: { marginHorizontal: 12, marginBottom: 12, backgroundColor: '#F8FAFC', borderRadius: 8, height: 40, elevation: 0 },
  
  compactRow: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  thumbnail: { width: 44, height: 44, backgroundColor: '#F1F5F9', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  middleCol: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  productName: { fontWeight: 'bold', fontSize: 14, color: '#1E293B' },
  metaText: { fontSize: 11, color: '#64748B', marginTop: 4 },
  
  rightCol: { alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 8 },
  priceText: { fontWeight: 'bold', fontSize: 14 }
});