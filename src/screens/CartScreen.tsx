import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Card, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';

export default function CartScreen() {
  const navigation = useNavigation<any>();
  
  const { cart, removeFromCart } = useAppStore();

  const handleBrowse = () => {
    navigation.navigate('BuyerTabs', { screen: 'HomeTab' });
  };

  const handleNegotiate = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  if (cart.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {/* 🚀 Changed to a broken heart to symbolize an empty favorites list */}
        <IconButton icon="heart-broken" size={60} iconColor="#CBD5E1" />
        <Text variant="titleLarge" style={{color:'#64748B', fontWeight: 'bold', marginBottom:5}}>No Favorites Yet</Text>
        <Text variant="bodyMedium" style={{color:'#94A3B8', marginBottom:20, textAlign: 'center', paddingHorizontal: 40}}>
          Tap the heart icon on any product to save it here for later.
        </Text>
        <Button mode="contained" onPress={handleBrowse} style={{backgroundColor: '#004AAD'}}>Browse Chemicals</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{padding: 16}}>
        <Text variant="headlineSmall" style={{fontWeight:'bold', marginBottom: 5}}>My Favorites</Text>
        <Text style={{color: '#666', marginBottom: 20, fontSize: 13}}>
          View your saved chemicals. Tap a product to negotiate the latest price with the supplier.
        </Text>

        {cart.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            activeOpacity={0.8} 
            onPress={() => handleNegotiate(item.id.replace('_favorite', ''))}
          >
            <Card style={styles.card}>
              <Card.Content style={{flexDirection:'row', alignItems:'center'}}>
                 {/* 🚀 Changed icon block to show a red heart inside the list */}
                 <View style={styles.iconBox}>
                    <IconButton icon="heart" iconColor="red" size={24} style={{margin: 0}}/>
                 </View>
                 <View style={{flex:1, paddingHorizontal: 12}}>
                   <Text variant="titleMedium" style={{fontWeight:'bold'}}>{item.name}</Text>
                   <Text variant="bodySmall" style={{color:'#666'}}>Ref Price: ₹{item.pricePerUnit} / {item.unit}</Text>
                   <Button 
                      mode="text" 
                      compact 
                      textColor="#004AAD"
                      labelStyle={{fontSize: 12, fontWeight: 'bold'}}
                      style={{alignSelf: 'flex-start', marginLeft: -8, marginTop: 4}}
                      onPress={() => handleNegotiate(item.id.replace('_favorite', ''))}
                   >
                     Negotiate Price
                   </Button>
                 </View>
                 <IconButton icon="close-circle-outline" iconColor="#94A3B8" onPress={() => removeFromCart(item.id)} />
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  emptyContainer: { flex:1, justifyContent:'center', alignItems:'center' },
  card: { marginBottom: 12, backgroundColor: 'white', elevation: 2, borderRadius: 12 },
  iconBox: { width: 50, height: 50, backgroundColor: '#FEE2E2', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }
});