import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, StyleSheet } from 'react-native';
import { Text, IconButton, FAB, Card, Switch, ActivityIndicator, Chip } from 'react-native-paper';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { getSellerProducts, deleteProduct, toggleProductStatus } from '../services/productService';
import { Product } from '../types';

export default function SellerManageChemicals() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { user } = useAppStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleToggle = async (id: string, currentStatus: boolean) => {
    if (!id) return;

    // Optimistic Update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
    
    try {
      await toggleProductStatus(id, currentStatus);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
      loadData(); // Revert on error
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

  const renderItem = ({ item }: { item: Product }) => {
    // ✅ KEY FIX: Treat undefined as TRUE. Only explicit 'false' is inactive.
    const isActive = item.active !== false; 

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
            
            <View style={{flexDirection:'row', marginTop: 4}}>
              <Chip 
                compact 
                textStyle={{fontSize: 10}}
                style={{
                  backgroundColor: isActive ? '#DCFCE7' : '#F1F5F9', 
                  height: 24
                }}
              >
                {isActive ? 'Active' : 'Inactive'}
              </Chip>
            </View>
          </View>

          <View style={{alignItems:'flex-end'}}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
               <Switch 
                 value={isActive} 
                 // ✅ FIX: Pass the safe ID and safe status
                 onValueChange={() => handleToggle(item.id!, isActive)} 
                 color="#2E7D32"
               />
            </View>
            
            <View style={{flexDirection:'row', marginTop: 0}}>
              <IconButton icon="pencil" size={20} onPress={() => handleEdit(item)} />
              <IconButton 
                icon="delete" 
                size={20} 
                iconColor="#EF4444" 
                onPress={() => handleDelete(item.id!)} 
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

      {loading ? (
        <ActivityIndicator style={{marginTop: 50}} size="large" />
      ) : (
        <FlatList 
          data={products} 
          renderItem={renderItem} 
          // ✅ FIX: Safe Key Extractor
          keyExtractor={(item) => item.id || Math.random().toString()} 
          contentContainerStyle={{padding: 16}}
          ListEmptyComponent={
            <Text style={{textAlign:'center', marginTop: 20, color:'#888'}}>
              No products listed yet.
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
  header: { flexDirection:'row', alignItems:'center', padding: 8, backgroundColor:'white', elevation: 2 },
  card: { marginBottom: 12, backgroundColor: 'white' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 50, height: 50, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#004AAD' },
});