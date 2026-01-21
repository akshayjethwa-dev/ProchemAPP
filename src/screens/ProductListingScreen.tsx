import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Searchbar, Chip, useTheme, IconButton, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../store/appStore';
import { RootStackParamList } from '../navigation/types';
import { Product } from '../types';

export default function ProductListingScreen() {
  // ✅ 1. Get Navigation Hook
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { category } = route.params || { category: 'All' };
  
  // ✅ 2. Get Data from Store
  const products = useAppStore(state => state.products);
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ 3. Filter Logic
  const filteredProducts = products.filter(p => 
    (category === 'All' || p.category === category) &&
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ 4. Render Item (The "Clickable" Card)
  const renderProduct = ({ item }: { item: Product }) => (
    <Card 
      style={styles.card} 
      // 🚀 THE CRITICAL LINK: This opens the detail screen
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id || '' })}
    >
      <View style={styles.cardContent}>
        <View style={styles.imageContainer}><Text style={{fontSize:32}}>🧪</Text></View>
        <View style={styles.infoContainer}>
          <Text variant="titleMedium" style={{fontWeight:'bold'}}>{item.name}</Text>
          <View style={{flexDirection:'row', alignItems:'center', marginTop: 2}}>
             <Text style={{fontSize:10, color:'#666'}}>Sold by: {item.sellerName || 'Verified Seller'}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text variant="titleLarge" style={{color: theme.colors.primary, fontWeight:'bold'}}>
              ₹{item.pricePerUnit}
            </Text>
            <IconButton icon="arrow-right" size={20} />
          </View>
        </View>
      </View>
    </Card>
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
      />

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={{padding: 40, alignItems:'center'}}>
            <Text>No products found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: 'white' },
  searchBar: { margin: 16, backgroundColor: 'white' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { marginBottom: 12, backgroundColor: 'white' },
  cardContent: { flexDirection: 'row', padding: 12 },
  imageContainer: { width: 80, height: 80, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  infoContainer: { flex: 1, justifyContent: 'space-between' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
});