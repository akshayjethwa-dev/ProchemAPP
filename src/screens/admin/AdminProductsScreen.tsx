import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert } from 'react-native';
import { Text, List, Button, Chip, ActivityIndicator, IconButton } from 'react-native-paper';
import { getPendingProducts, approveProductListing } from '../../services/adminService';
import { Product } from '../../types';

export default function AdminProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getPendingProducts();
    setProducts(data);
    setLoading(false);
  };

  const handleApprove = (id: string) => {
    Alert.alert('Approve Product', 'Make this product live?', [
      { text: 'Cancel' },
      { text: 'Publish', onPress: async () => {
          await approveProductListing(id);
          loadData();
      }}
    ]);
  };

  return (
    <View style={{flex:1, backgroundColor:'#F1F5F9'}}>
      <View style={{padding:16, backgroundColor:'white', flexDirection:'row', justifyContent:'space-between'}}>
        <Text variant="titleLarge" style={{fontWeight:'bold'}}>Pending Approvals</Text>
        <IconButton icon="refresh" onPress={loadData} />
      </View>
      
      {loading ? <ActivityIndicator style={{marginTop:20}} /> : (
        <FlatList 
          data={products}
          keyExtractor={i => i.id}
          ListEmptyComponent={<Text style={{padding:20, textAlign:'center', color:'#888'}}>No pending products.</Text>}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={`${item.category} • ₹${item.pricePerUnit}`}
              left={props => <List.Icon {...props} icon="flask-outline" />}
              right={() => (
                <Button mode="contained" buttonColor="#004AAD" compact onPress={() => handleApprove(item.id)}>
                  Approve
                </Button>
              )}
              style={{backgroundColor:'white', marginBottom: 2}}
            />
          )}
        />
      )}
    </View>
  );
}