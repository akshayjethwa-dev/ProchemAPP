// src/screens/BuyerHome.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl, Share, Alert, TouchableOpacity } from 'react-native';
import { Text, Searchbar, IconButton, Card, Button, useTheme, ActivityIndicator, Badge } from 'react-native-paper'; 
// 🚀 FIX: Swapped SafeAreaView for useSafeAreaInsets
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore'; 
import { db } from '../config/firebase'; 
import { useAppStore } from '../store/appStore';
import { getProducts } from '../services/productService';

const { width } = Dimensions.get('window');

export default function BuyerHome() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const insets = useSafeAreaInsets(); // 🚀 FIX: Get device safe area
  
  const { user, products, setProducts, updateUserCredits } = useAppStore();
  const cartCount = useAppStore(state => state.cart?.length || 0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); 

  const isPremium = user?.subscriptionTier === 'GROWTH_PACKAGE';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('userId', 'in', [user.uid, 'ALL']));
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
        if (user?.uid && !isPremium) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { premiumNegotiationCredits: increment(1) });
            updateUserCredits({ premiumNegotiationCredits: (user.premiumNegotiationCredits || 0) + 1 });
            Alert.alert("Reward Unlocked! 🎉", "Thanks for sharing! You've earned 1 FREE Premium Negotiation credit.");
        } else if (user?.uid) {
            Alert.alert("Thank You! 🙏", "Thanks for helping grow the Prochem network!");
        }
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  // 1. Unified Search Filter (Fixes Name & CAS Number search)
  const lowerQuery = searchQuery.toLowerCase();
  
  const displayProducts = [...products]
    .filter(p => {
      // Safely check if name or casNumber exists and includes the query
      const matchesName = p.name?.toLowerCase().includes(lowerQuery);
      const matchesCas = p.casNumber?.toLowerCase().includes(lowerQuery);
      const isNotOwnProduct = p.sellerId !== user?.uid;
      
      return (matchesName || matchesCas) && isNotOwnProduct;
    })
    .sort((a, b) => {
      // Prioritize Growth Package / Premium Sellers
      const aIsPremium = (a as any).sellerTier === 'GROWTH_PACKAGE' ? 1 : 0;
      const bIsPremium = (b as any).sellerTier === 'GROWTH_PACKAGE' ? 1 : 0;
      return bIsPremium - aIsPremium;
    });

  // 2. Spot Offers: Immediate, ready-to-dispatch inventory
  const spotProducts = displayProducts
    .filter(p => p.readyToDispatch === true || p.inStock === true)
    .slice(0, 10);

  // 3. Trending Chemicals: High demand / Top tier sellers 
  // (We filter out the items already in 'spotProducts' so they don't show up twice on the dashboard)
  const trendingProducts = displayProducts
    .filter(p => !spotProducts.includes(p))
    .slice(0, 10);

  return (
    <View style={styles.container}>
      {/* 🚀 FIX: Applied dynamic padding to the top of the header based on device notch */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 10 }]}>
        <View style={styles.headerTop}>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brandText}>PROCHEM</Text>
              <View style={styles.b2bBadge}><Text style={styles.b2bText}>Find.Source.Grow</Text></View>
            </View>
            <View style={styles.greetingRow}>
              <Text style={styles.greetingText}>Hello, {user?.companyName || 'Business User'}</Text>
            </View>
          </View>
          
          <View style={styles.actionIcons}>
            <View>
              <IconButton icon="cart-outline" iconColor="white" size={24} onPress={() => navigation.navigate('Cart')} />
              {cartCount > 0 && <Badge style={styles.badge}>{cartCount}</Badge>}
            </View>
            <View>
              <IconButton icon="bell-outline" iconColor="white" size={24} onPress={() => navigation.navigate('Notifications')} />
              {unreadCount > 0 && <Badge style={styles.badge}>{unreadCount}</Badge>}
            </View>
          </View>
        </View>
      </View>

      {/* 2. Overlapping Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search chemicals, CAS No..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor="#004AAD"
        />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* 3. Quick Actions Grid */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]} onPress={() => navigation.navigate('Categories')}>
            <Text style={styles.actionIcon}>🧪</Text>
            <Text style={styles.actionTitle}>Categories</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]} onPress={() => navigation.navigate('PostRequirement')}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionTitle}>Post RFQ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]} onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionTitle}>Orders</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Trust Badges */}
        <View style={styles.trustBadges}>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>✅</Text>
            <Text style={styles.trustText}>GST Verified</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🛡️</Text>
            <Text style={styles.trustText}>Secure Escrow</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🚚</Text>
            <Text style={styles.trustText}>Pan-India</Text>
          </View>
        </View>

        {/* 5. Trending Section (Horizontal) */}
        {trendingProducts.length > 0 && (
          <View style={styles.trendingSection}>
            <View style={styles.sectionHeaderRow}>
              {/* Note: Overriding padding/margin here so it doesn't double-up with sectionHeaderRow */}
              <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0 }]}>Trending Intermediates</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Categories')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingScroll}>
              {trendingProducts.map((p) => (
                <TouchableOpacity key={p.id} style={styles.trendingCard} onPress={() => navigation.navigate('ProductDetail', { product: p })}>
                  <Text style={styles.trendingName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.trendingCas}>CAS: {p.casNumber || 'N/A'}</Text>
                  <View style={styles.trendingFooter}>
                    <View>
                      <Text style={styles.priceLabel}>Price / {p.unit || 'kg'}</Text>
                      <Text style={styles.trendingPrice}>₹{p.pricePerUnit || p.price}</Text>
                    </View>
                    <View style={styles.purityBadge}><Text style={styles.purityText}>99% Pure</Text></View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 6. Spot Offers (Vertical) */}
        <View style={styles.spotSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Spot Offers</Text>
          </View>

          {loading ? (
            <ActivityIndicator style={{marginTop: 20}} color="#004AAD" />
          ) : spotProducts.length === 0 ? (
            <Text style={{textAlign: 'center', color: '#64748B', marginTop: 20}}>No spot offers found.</Text>
          ) : (
            spotProducts.map((p) => (
              <TouchableOpacity key={p.id} style={styles.spotCard} onPress={() => navigation.navigate('ProductDetail', { product: p })}>
                <View style={styles.spotTopRow}>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ VERIFIED SUPPLIER</Text>
                  </View>
                  <Text style={styles.categoryText}>{p.category || 'Chemical'}</Text>
                </View>
                
                <Text style={styles.spotName} numberOfLines={1}>{p.name}</Text>
                <View style={styles.spotDetailsRow}>
                  <Text style={styles.spotCas}>CAS: {p.casNumber || 'N/A'}</Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text style={styles.spotCas}>MOQ: {p.moq || 1} {p.unit || 'kg'}</Text>
                </View>

                <View style={styles.spotPriceArea}>
                  <View>
                    <Text style={styles.priceLabel}>PRICE (CIF)</Text>
                    <Text style={styles.spotPrice}>₹{p.pricePerUnit || p.price} <Text style={styles.spotUnit}>/ {p.unit || 'kg'}</Text></Text>
                  </View>
                  <View style={{alignItems: 'flex-end'}}>
                    <Text style={styles.priceLabel}>ORIGIN</Text>
                    <Text style={styles.spotOrigin}>{p.origin || 'India'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Banners */}
        <Card style={styles.requirementCard} mode="contained" onPress={() => navigation.navigate('PostRequirement')}>
          <Card.Content style={styles.requirementContent}>
             <View style={{flex: 1}}>
                <Text style={styles.reqTitle}>Can't find a product?</Text>
                <Text style={styles.reqSub}>Post your requirement and suppliers will bid.</Text>
             </View>
             <Button mode="contained" style={styles.reqButton} onPress={() => navigation.navigate('PostRequirement')}>
               Request
             </Button>
          </Card.Content>
        </Card>

        <View style={styles.inviteBanner}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.inviteTitle}>{isPremium ? "Grow the Network" : "Invite & Earn"}</Text>
            <Text style={styles.inviteText}>
              {isPremium ? "Invite other buyers to join the Prochem marketplace." : "Invite a buyer and get 1 FREE negotiation credit."}
            </Text>
          </View>
          <TouchableOpacity style={styles.inviteBtn} onPress={handleInviteBuyer}>
            <Text style={styles.inviteBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  // 🚀 FIX: Removed fixed paddingTop here so it doesn't double up
  header: { backgroundColor: '#004AAD', paddingHorizontal: 20, paddingBottom: 40 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  brandText: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  b2bBadge: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  b2bText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  greetingText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500' },
  actionIcons: { flexDirection: 'row', alignItems: 'center' },
  badge: { position: 'absolute', top: 5, right: 5, backgroundColor: '#EF4444' },
  
  searchContainer: { paddingHorizontal: 20, marginTop: -24, zIndex: 10 },
  searchBar: { backgroundColor: 'white', borderRadius: 12, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: {width: 0, height: 4} },
  searchInput: { fontSize: 14, color: '#1E293B' },

  scrollContent: { paddingBottom: 40, paddingTop: 10 },

  quickActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 16 },
  actionCard: { flex: 1, marginHorizontal: 4, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  actionIcon: { fontSize: 20, marginBottom: 4 },
  actionTitle: { fontSize: 11, fontWeight: '700', color: '#1E293B' },

  trustBadges: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', marginHorizontal: 20, marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  trustItem: { flexDirection: 'row', alignItems: 'center' },
  trustIcon: { fontSize: 12, marginRight: 4 },
  trustText: { fontSize: 11, fontWeight: '700', color: '#1E293B' },
  divider: { width: 1, backgroundColor: '#E2E8F0', height: '100%' },

  trendingSection: { marginTop: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', paddingHorizontal: 20, marginBottom: 12 },
  viewAllText: { fontSize: 13, color: '#004AAD', fontWeight: '600' },
  trendingScroll: { paddingHorizontal: 16 },
  trendingCard: { backgroundColor: 'white', width: 180, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginHorizontal: 4 },
  trendingHeader: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 }, // Adjusted justification
  moleculeBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  moleculeText: { color: '#004AAD', fontSize: 10, fontWeight: 'bold' },
  trendingName: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 2 },
  trendingCas: { fontSize: 11, color: '#64748B', fontFamily: 'monospace', marginBottom: 12 },
  trendingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  priceLabel: { fontSize: 9, color: '#64748B', fontWeight: '700', marginBottom: 2 },
  trendingPrice: { fontSize: 15, fontWeight: '900', color: '#004AAD' },
  purityBadge: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  purityText: { color: 'white', fontSize: 9, fontWeight: 'bold' },

  spotSection: { marginTop: 24 },
  spotCard: { backgroundColor: 'white', marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  spotTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  verifiedBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  verifiedText: { color: '#10B981', fontSize: 9, fontWeight: '800' },
  categoryText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  spotName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  spotDetailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  spotCas: { fontSize: 12, color: '#64748B', fontFamily: 'monospace' },
  dotSeparator: { marginHorizontal: 8, color: '#CBD5E1' },
  spotPriceArea: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10 },
  spotPrice: { fontSize: 18, fontWeight: '900', color: '#004AAD' },
  spotUnit: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  spotOrigin: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },

  requirementCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#E0F2FE', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', elevation: 0 },
  requirementContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reqTitle: { fontWeight: 'bold', color: '#004AAD', fontSize: 15 },
  reqSub: { color: '#0369A1', fontSize: 11, marginTop: 2 },
  reqButton: { marginLeft: 10, borderRadius: 8, backgroundColor: '#0284C7' },

  inviteBanner: { flexDirection: 'row', backgroundColor: '#ECFDF5', padding: 16, borderRadius: 12, marginHorizontal: 20, marginTop: 16, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' },
  inviteTitle: { color: '#047857', fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  inviteText: { color: '#065F46', fontSize: 11 },
  inviteBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  inviteBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 }
});