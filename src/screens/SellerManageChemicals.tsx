import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, StyleSheet } from 'react-native';
import { Text, IconButton, FAB, Card, Switch, ActivityIndicator, Chip, Searchbar } from 'react-native-paper';
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

  // Check if the seller has the Growth Package
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

  // ✅ FIXED: Touch handler for the Dispatch Toggle
  const handleToggleDispatch = async (product: any) => {
    if (!isPremium) {
      Alert.alert(
        '👑 Premium Feature', 
        'Boost your visibility by marking products as "Ready to Dispatch". Upgrade to the Business Growth Package to unlock this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Learn More', onPress: () => navigation.navigate('BusinessGrowth') } // Assuming BusinessGrowth is the screen name
        ]
      );
      return;
    }

    const newStatus = !product.readyToDispatch;
    
    // Optimistic UI Update
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, readyToDispatch: newStatus } : p));
    
    try {
      await updateProduct(product.id, { readyToDispatch: newStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update dispatch status');
      loadData(); // Revert on failure
    }
  };

  const handleDelete = (id: string) => {
    if (!id) return;
    Alert.alert('Delete Product', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteProduct(id);
          loadData();
      }}
    ]);
  };

  // Advanced Seller Search Filter
  const filteredProducts = products.filter(p => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query) ||
      p.pricePerUnit?.toString().includes(query)
    );
  });

  const renderItem = ({ item }: { item: any }) => {
    const isActive = item.active !== false; 
    const isReady = item.readyToDispatch === true;

    return (
      <Card style={styles.card}>
        <Card.Content style={styles.cardRow}>
          <View style={styles.iconBox}>
            <Text style={{fontSize: 24}}>⚗️</Text>
          </View>
          
          <View style={{flex: 1, paddingHorizontal: 12}}>
            <Text variant="titleMedium" style={{fontWeight:'bold'}}>{item.name}</Text>
            <Text variant="bodySmall" style={{color:'#666'}}>
              Stock: {item.quantity || 'Available'} • ₹{item.pricePerUnit}
            </Text>
            
            <View style={{flexDirection:'row', marginTop: 8, gap: 8, flexWrap: 'wrap'}}>
              {/* Status Indicator Chip */}
              <Chip 
                compact 
                textStyle={{fontSize: 10, fontWeight: 'bold'}}
                style={{
                  backgroundColor: isActive ? '#DCFCE7' : '#F1F5F9', 
                  height: 26
                }}
              >
                {isActive ? 'Active' : 'Inactive'}
              </Chip>

              {/* ✅ FIXED: Removed TouchableOpacity. Passed onPress directly to the Chip to fix the touch swallowing issue. */}
              <Chip 
                compact 
                icon={isReady ? "flash" : "flash-outline"}
                onPress={() => handleToggleDispatch(item)}
                textStyle={{fontSize: 10, fontWeight: 'bold', color: isReady ? '#D97706' : '#64748B'}}
                style={{
                  backgroundColor: isReady ? '#FEF3C7' : 'transparent', 
                  borderColor: isReady ? '#F59E0B' : '#CBD5E1',
                  borderWidth: 1,
                  height: 26
                }}
              >
                {isReady ? 'Ready to Dispatch' : 'Mark as Ready'}
              </Chip>
            </View>
          </View>

          {/* Right Actions Container */}
          <View style={{alignItems:'flex-end'}}>
            {/* The Main Toggle Switch (Only for Active/Inactive) */}
            <View style={{flexDirection:'row', alignItems:'center', marginBottom: 4}}>
               <Switch 
                 value={isActive} 
                 onValueChange={() => handleToggleActive(item.id!, isActive)} 
                 color="#2E7D32"
               />
            </View>
            
            <View style={{flexDirection:'row'}}>
              <IconButton icon="pencil" size={20} onPress={() => handleEdit(item)} style={{margin: 0}} />
              <IconButton 
                icon="delete" 
                size={20} 
                iconColor="#EF4444" 
                onPress={() => handleDelete(item.id!)} 
                style={{margin: 0}}
              />
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineSmall" style={{fontWeight:'bold'}}>My Listings</Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search your stock..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={{minHeight: 0}}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{marginTop: 50}} size="large" color="#004AAD" />
      ) : (
        <FlatList 
          data={filteredProducts} 
          renderItem={renderItem} 
          keyExtractor={(item) => item.id || Math.random().toString()} 
          contentContainerStyle={{padding: 16}}
          ListEmptyComponent={
            <Text style={{textAlign:'center', marginTop: 20, color:'#888'}}>
              {searchQuery ? "No matching stock found." : "No products listed yet."}
            </Text>
          }
        />
      )}

      <FAB
        icon="plus"
        label="Add Chemical"
        style={styles.fab}
        onPress={() => navigation.navigate('AddChemical')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection:'row', alignItems:'center', padding: 8, backgroundColor:'white' },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 10, backgroundColor: 'white', elevation: 2 },
  searchbar: { backgroundColor: '#F1F5F9', borderRadius: 10, height: 45, elevation: 0 },
  card: { marginBottom: 12, backgroundColor: 'white' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
  iconBox: { width: 50, height: 50, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#004AAD', color: 'white' },
});