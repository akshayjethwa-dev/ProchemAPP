import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, IconButton, Card, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { getSellerProducts, deleteProduct } from '../services/productService';

export default function SellerManageChemicals() {
  const navigation = useNavigation();
  const theme = useTheme();
  const user = useAppStore(state => state.user);
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getSellerProducts(user.uid);
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [user]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Product', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(id);
          loadProducts(); // Refresh list
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.info}>
          <Text variant="titleMedium" style={{fontWeight:'bold'}}>{item.name}</Text>
          <Text variant="bodySmall" style={{color:'#666'}}>{item.grade} • {item.purity}%</Text>
          <Text variant="titleMedium" style={{color: theme.colors.primary, marginTop: 4}}>₹{item.pricePerUnit}/{item.unit}</Text>
        </View>
        <View style={styles.actions}>
          <IconButton icon="pencil" mode="contained-tonal" size={20} onPress={() => Alert.alert('Edit', 'Edit feature coming soon')} />
          <IconButton 
            icon="delete" 
            mode="contained-tonal" 
            containerColor="#FEE2E2" 
            iconColor="#EF4444" 
            size={20} 
            onPress={() => handleDelete(item.id)} 
          />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineSmall" style={{fontWeight:'bold'}}>My Listings</Text>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text>No products listed yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'white' },
  list: { padding: 16 },
  card: { marginBottom: 12, backgroundColor: 'white' },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }
});