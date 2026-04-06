// src/screens/BuyerHome.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl, Share, Alert, TouchableOpacity } from 'react-native';
import { Text, Searchbar, IconButton, Card, Button, useTheme, ActivityIndicator, Badge, Chip } from 'react-native-paper'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore'; 
import { db } from '../config/firebase'; 
import { useAppStore } from '../store/appStore';
import { getProducts } from '../services/productService';

const { width } = Dimensions.get('window');

export default function BuyerHome() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  
  const { user, products, setProducts, updateUserCredits } = useAppStore();
  const cartCount = useAppStore(state => state.cart?.length || 0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); 

  // Check if the user is a Premium client
  const isPremium = user?.subscriptionTier === 'GROWTH_PACKAGE';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'), 
      where('userId', 'in', [user.uid, 'ALL'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
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

  const handleInviteBuyer = async () => {
    try {
      const result = await Share.share({
        message: `Join Prochem - The ultimate B2B chemical marketplace! Get better prices and genuine suppliers. Sign up here: https://prochem.app/invite/${user?.uid}`,
      });
      
      if (result.action === Share.sharedAction) {
        if (user?.uid) {
          // Only reward credits if the user is NOT premium
          if (!isPremium) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              premiumNegotiationCredits: increment(1)
            });
            
            updateUserCredits({ 
              premiumNegotiationCredits: (user.premiumNegotiationCredits || 0) + 1 
            });
            
            Alert.alert(
              "Reward Unlocked! 🎉", 
              "Thanks for sharing! You've earned 1 FREE Premium Negotiation credit."
            );
          } else {
            // Generic thank you for premium users
            Alert.alert(
              "Thank You! 🙏", 
              "Thanks for helping grow the Prochem network!"
            );
          }
        }
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  const displayProducts = [...products]
    .filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()) && p.sellerId !== user?.uid)
    .sort((a, b) => {
      const aIsPremium = (a as any).sellerTier === 'GROWTH_PACKAGE' ? 1 : 0;
      const bIsPremium = (b as any).sellerTier === 'GROWTH_PACKAGE' ? 1 : 0;
      return bIsPremium - aIsPremium;
    })
    .slice(0, 6);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.locationRow}>
          <View>
            <Text style={{color:'rgba(255,255,255,0.8)', fontSize:12}}>Hi,</Text>
            <Text style={{color:'white', fontWeight:'bold', fontSize:18}}>
              {user?.companyName || 'Business User'}
            </Text>
          </View>
          <View style={{flex:1}} />
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View>
              <IconButton 
                icon="heart-outline" 
                iconColor="white" 
                onPress={() => navigation.navigate('Cart')} 
              />
              {cartCount > 0 && (
                <Badge style={{ position: 'absolute', top: 5, right: 5, backgroundColor: theme.colors.error }} size={16}>
                  {cartCount}
                </Badge>
              )}
            </View>

            <View>
              <IconButton 
                icon="bell" 
                iconColor="white" 
                onPress={() => navigation.navigate('Notifications')} 
              />
              {unreadCount > 0 && (
                <Badge style={{ position: 'absolute', top: 5, right: 5, backgroundColor: theme.colors.error }} size={16}>
                  {unreadCount}
                </Badge>
              )}
            </View>
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
            <Text style={{color:'#999', marginBottom: 10}}>No products found matching "{searchQuery}".</Text>
            <Button mode="contained" onPress={() => navigation.navigate('PostRequirement')} style={{marginTop: 10}}>
              Post Custom Requirement
            </Button>
          </View>
        ) : (
          <View style={styles.grid}>
            {displayProducts.map((p) => (
              <Card 
                key={p.id} 
                style={[styles.card, p.readyToDispatch && { borderColor: '#FDE68A', borderWidth: 1 }]} 
                onPress={() => navigation.navigate('ProductDetail', { product: p })}
              >
                <View style={styles.cardContent}>
                  <View style={styles.imagePlaceholder}><Text style={{fontSize:30}}>🧪</Text></View>
                  <Text numberOfLines={1} style={{fontWeight:'bold', marginTop:8}}>{p.name}</Text>
                  <Text style={{fontSize:10, color:'#666'}}>{p.origin || 'India'}</Text>
                  <Text style={{color: theme.colors.primary, fontWeight:'bold', marginTop:4}}>
                    ₹{p.pricePerUnit || p.price}/{p.unit || 'kg'}
                  </Text>
                  
                  {p.readyToDispatch && (
                    <Chip 
                      compact 
                      icon="flash" 
                      style={{backgroundColor: '#FEF3C7', marginTop: 6, height: 20}} 
                      textStyle={{fontSize: 8, color: '#D97706', fontWeight: 'bold', marginVertical: 0}}
                    >
                      Premium Stock
                    </Chip>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        <Card style={styles.requirementCard} mode="contained" onPress={() => navigation.navigate('PostRequirement')}>
          <Card.Content style={styles.requirementContent}>
             <View style={{flex: 1}}>
                <Text variant="titleMedium" style={{fontWeight: 'bold', color: '#004AAD'}}>Can't find a product?</Text>
                <Text variant="bodySmall" style={{color: '#64748B', marginTop: 4}}>
                  Message us your requirements and we will source the perfect product for you!
                </Text>
             </View>
             <Button mode="contained" style={styles.reqButton} onPress={() => navigation.navigate('PostRequirement')}>
               Request
             </Button>
          </Card.Content>
        </Card>

        {/* 🚀 Banner moved below the Requirement Card */}
        <View style={styles.inviteBanner}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            {isPremium ? (
              <>
                 <Text style={styles.inviteTitle}>Grow the Network</Text>
                 <Text style={styles.inviteText}>Invite other buyers to join the Prochem marketplace.</Text>
              </>
            ) : (
              <>
                 <Text style={styles.inviteTitle}>Invite & Earn</Text>
                 <Text style={styles.inviteText}>Invite a buyer and get 1 FREE negotiation on Premium Products.</Text>
                 <Text style={styles.creditsText}>Available Credits: <Text style={{fontWeight: 'bold'}}>{user?.premiumNegotiationCredits || 0}</Text></Text>
              </>
            )}
          </View>
          <TouchableOpacity style={styles.inviteBtn} onPress={handleInviteBuyer}>
            <Text style={styles.inviteBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#004AAD', padding: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  searchBar: { height: 45, backgroundColor: 'white', borderRadius: 10 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'space-between' },
  card: { width: '48%', marginBottom: 16, backgroundColor: 'white' },
  cardContent: { padding: 12, alignItems: 'center' },
  imagePlaceholder: { width: 60, height: 60, backgroundColor: '#F1F5F9', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  requirementCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#E0F2FE', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  requirementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  reqButton: {
    marginLeft: 10,
    borderRadius: 8
  },

  // Banner styles
  inviteBanner: { flexDirection: 'row', backgroundColor: '#ECFDF5', padding: 16, borderRadius: 16, marginHorizontal: 16, marginTop: 20, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' },
  inviteTitle: { color: '#047857', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  inviteText: { color: '#065F46', fontSize: 12, marginBottom: 6 },
  creditsText: { color: '#059669', fontSize: 12, marginTop: 4 },
  inviteBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  inviteBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});