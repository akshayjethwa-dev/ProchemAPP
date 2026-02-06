import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl, Alert } from 'react-native';
import { Text, Searchbar, IconButton, Card, Button, useTheme, ActivityIndicator, Badge } from 'react-native-paper'; // ✅ Added Badge
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; // ✅ Added Firestore imports
import { db } from '../config/firebase'; // ✅ Added db import
import { useAppStore } from '../store/appStore';
import { getProducts } from '../services/productService';

const { width } = Dimensions.get('window');

export default function BuyerHome() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  
  // Store & State
  const { user, products, setProducts } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); // ✅ State for Notification Count

  useEffect(() => {
    loadData();
  }, []);

  // ✅ New Effect: Listen for Unread Notifications
  useEffect(() => {
    if (!user) return;

    // We query all notifications for this user (or broadcast 'ALL')
    const q = query(
      collection(db, 'notifications'), 
      where('userId', 'in', [user.uid, 'ALL'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter client-side for unread ones to avoid complex index requirements
      const unread = snapshot.docs.filter(doc => !doc.data().read).length;
      setUnreadCount(unread);
    });

    return unsubscribe;
  }, [user]);

  const loadData = async () => {
    try {
      if (products.length === 0) setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching home products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const displayProducts = products
    .filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()) && p.sellerId !== user?.uid)
    .slice(0, 6);

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.locationRow}>
          
          <View>
            <Text style={{color:'rgba(255,255,255,0.8)', fontSize:12}}>Hi,</Text>
            <Text style={{color:'white', fontWeight:'bold', fontSize:18}}>
              {user?.companyName || 'Business User'}
            </Text>
          </View>
          
          <View style={{flex:1}} />
          
          {/* ✅ FIXED: Bell Icon with Badge */}
          <View>
            <IconButton 
              icon="bell" 
              iconColor="white" 
              onPress={() => navigation.navigate('Notifications')} 
            />
            {unreadCount > 0 && (
              <Badge 
                style={{ position: 'absolute', top: 5, right: 5, backgroundColor: theme.colors.error }}
                size={16}
              >
                {unreadCount}
              </Badge>
            )}
          </View>
        </View>
        
        <Searchbar
          placeholder="Search for chemicals..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{minHeight: 0}}
        />
      </View>

      <ScrollView 
        contentContainerStyle={{paddingBottom: 20}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={{fontWeight:'bold'}}>Trending Stock</Text>
          <Button mode="text" compact onPress={() => navigation.navigate('Categories')}>View All</Button>
        </View>

        {loading ? (
          <ActivityIndicator style={{marginTop: 20}} color="#004AAD" />
        ) : displayProducts.length === 0 ? (
          <View style={{padding: 20, alignItems:'center'}}>
            <Text style={{color:'#999'}}>No products found.</Text>
            <Text style={{fontSize: 10, color:'#ccc'}}>Try adding a product as a Seller.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {displayProducts.map((p) => (
              <Card 
                key={p.id} 
                style={styles.card} 
                onPress={() => navigation.navigate('ProductDetail', { product: p })}
              >
                <View style={styles.cardContent}>
                  <View style={styles.imagePlaceholder}><Text style={{fontSize:30}}>🧪</Text></View>
                  <Text numberOfLines={1} style={{fontWeight:'bold', marginTop:8}}>{p.name}</Text>
                  <Text style={{fontSize:10, color:'#666'}}>{p.origin || 'India'}</Text>
                  <Text style={{color: theme.colors.primary, fontWeight:'bold', marginTop:4}}>
                    ₹{p.pricePerUnit || p.price}/{p.unit || 'kg'}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#004AAD', padding: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  searchBar: { height: 45, backgroundColor: 'white', borderRadius: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'space-between' },
  card: { width: '48%', marginBottom: 16, backgroundColor: 'white' },
  cardContent: { padding: 12, alignItems: 'center' },
  imagePlaceholder: { width: 60, height: 60, backgroundColor: '#F1F5F9', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }
});