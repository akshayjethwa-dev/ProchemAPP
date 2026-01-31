import React from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, Card, RadioButton, IconButton, useTheme, FAB } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { Address } from '../types';

export default function AddressListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  
  // Get user data from store
  const { user } = useAppStore();
  const addresses = user?.addresses || []; // ✅ Fix: Ensure we get the array

  // Check if we are in "Selection Mode" (e.g. from Checkout)
  const isSelectable = route.params?.selectable || false;

  const handleSelectAddress = (address: Address) => {
    if (isSelectable) {
      // Pass selected address back to previous screen (Checkout)
      navigation.navigate({
        name: 'Checkout',
        params: { selectedAddress: address },
        merge: true,
      });
    }
  };

  const handleAddAddress = () => {
    navigation.navigate('AddAddress');
  };

  const renderItem = ({ item }: { item: Address }) => (
    <Card 
      style={[styles.card, isSelectable && styles.selectableCard]} 
      onPress={() => handleSelectAddress(item)}
    >
      <Card.Content style={{flexDirection: 'row', alignItems: 'center'}}>
        {isSelectable && (
          <RadioButton 
            value={item.id} 
            status="unchecked" // Visual only, logic handled by press
            onPress={() => handleSelectAddress(item)} 
          />
        )}
        <View style={{flex: 1, marginLeft: isSelectable ? 8 : 0}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text variant="titleMedium" style={{fontWeight: 'bold'}}>{item.label}</Text>
            {item.isDefault && <Text style={{color: theme.colors.primary, fontSize: 10}}>DEFAULT</Text>}
          </View>
          <Text variant="bodyMedium" style={{marginTop: 4}}>{item.street}</Text>
          <Text variant="bodySmall" style={{color: '#666'}}>
            {item.city}, {item.state} - {item.zipCode}
          </Text>
        </View>
        {!isSelectable && (
          <IconButton icon="pencil" size={20} onPress={() => Alert.alert('Edit', 'Edit feature coming soon')} />
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {addresses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={{color: '#999', marginBottom: 10}}>No Addresses Found</Text>
          <Text style={{color: '#666', textAlign: 'center', marginBottom: 20}}>
            You haven't added any delivery locations yet.
          </Text>
          <Button mode="contained" onPress={handleAddAddress}>
            Add New Address
          </Button>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{padding: 16}}
        />
      )}

      {/* Floating Add Button */}
      {addresses.length > 0 && (
        <FAB
          icon="plus"
          label="Add New"
          style={[styles.fab, {backgroundColor: theme.colors.primary}]}
          color="white"
          onPress={handleAddAddress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  card: { marginBottom: 12, backgroundColor: 'white' },
  selectableCard: { borderColor: '#004AAD', borderWidth: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});