import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, IconButton, RadioButton, useTheme } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, updateDoc, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { Address } from '../types';

export default function AddressListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  const { user, setUser } = useAppStore();
  
  // Params: isSelectionMode = true if coming from Checkout
  const isSelectionMode = route.params?.selectable || false;
  const [addresses, setAddresses] = useState<Address[]>(user?.addresses || []);
  const [selectedId, setSelectedId] = useState<string | null>(route.params?.currentAddressId || null);

  useEffect(() => {
    refreshAddresses();
  }, []);

  // Reload user data to get fresh addresses
  const refreshAddresses = async () => {
    if(!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      setAddresses(userData.addresses || []);
      // Update global store
      setUser({ ...user, addresses: userData.addresses || [] });
    }
  };

  const handleSelect = (address: Address) => {
    if (isSelectionMode) {
      // Pass selected address back to Checkout
      navigation.navigate('Checkout', { selectedAddress: address });
    }
  };

  const handleDelete = async (address: Address) => {
    Alert.alert('Delete Address', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const userRef = doc(db, 'users', user!.uid);
            await updateDoc(userRef, {
              addresses: arrayRemove(address)
            });
            refreshAddresses();
          } catch (error) {
            console.error(error);
          }
      }}
    ]);
  };

  const renderItem = ({ item }: { item: Address }) => {
    const isSelected = selectedId === item.id;

    return (
      <Card 
        style={[styles.card, isSelected && {borderColor: theme.colors.primary, borderWidth: 2}]} 
        onPress={() => handleSelect(item)}
      >
        <Card.Content style={{flexDirection:'row', alignItems:'center'}}>
          {isSelectionMode && (
             <RadioButton 
               value={item.id} 
               status={isSelected ? 'checked' : 'unchecked'} 
               onPress={() => handleSelect(item)} 
             />
          )}
          
          <View style={{flex:1, marginLeft: 10}}>
            <Text variant="titleMedium" style={{fontWeight:'bold'}}>{item.label}</Text>
            <Text variant="bodyMedium" style={{color:'#555', marginTop: 4}}>
              {item.street}, {item.city}
            </Text>
            <Text variant="bodySmall" style={{color:'#777'}}>
              {item.state} - {item.zipCode}
            </Text>
          </View>

          {!isSelectionMode && (
            <IconButton icon="delete" iconColor="red" onPress={() => handleDelete(item)} />
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{padding: 16}}
        ListEmptyComponent={
          <Text style={{textAlign:'center', marginTop: 50, color:'#999'}}>No addresses saved.</Text>
        }
      />
      
      <View style={{padding: 16}}>
        <Button 
          mode="contained" 
          icon="plus" 
          onPress={() => navigation.navigate('AddAddress', { onGoBack: refreshAddresses })}
          style={{borderRadius: 8}}
        >
          Add New Address
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  card: { marginBottom: 12, backgroundColor: 'white' }
});