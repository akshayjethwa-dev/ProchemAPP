// src/screens/BuyerHome.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Dimensions, 
  RefreshControl, 
  Share, 
  Alert, 
  TouchableOpacity 
} from 'react-native';
import { 
  Text, 
  Searchbar, 
  IconButton, 
  ActivityIndicator, 
  Badge 
} from 'react-native-paper'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore'; 
import { db } from '../config/firebase'; 
import { useAppStore } from '../store/appStore';
import { getProducts } from '../services/productService';
import { ProfileCompletionBanner } from '../components/ProfileCompletionBanner';
import { Product } from '../types';

const { width } = Dimensions.get('window');

const FILTER_TAGS = [
  { id: 'all', label: 'All Chemicals' },
  { id: 'spot', label: '⚡ Ready Stock' },
  { id: 'pharma', label: '💊 Pharma & API' },
  { id: 'industrial', label: '🏭 Industrial' },
  { id: 'agriculture', label: '🌾 Agro & Fertilizers' },
  { id: 'lab', label: '🧪 Lab & Research' },
];

export default function BuyerHome() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const { user, products, setProducts, updateUser } = useAppStore();
  const cartCount = useAppStore(state => state.cart?.length || 0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
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
        message: `Join Prochem - The premier B2B chemical exchange! Source verified raw materials at competitive factory prices: https://prochem.app/invite/${user?.uid}`,
      });
      
      if (result.action === Share.sharedAction) {
        if (user?.uid && !isPremium) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { premiumNegotiationCredits: increment(1) });
            updateUser({ premiumNegotiationCredits: (user.premiumNegotiationCredits || 0) + 1 });
            Alert.alert("Reward Unlocked! 🎉", "Thanks for sharing! You've received 1 FREE Negotiation Credit.");
        } else if (user?.uid) {
            Alert.alert("Thank You! 🙏", "Thanks for inviting verified industrial buyers to Prochem.");
        }
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  // Filter products by search and category tags
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    
    return products.filter(p => {
      if (p.sellerId === user?.uid) return false;

      // Search match
      const matchesSearch = !q || 
        p.name?.toLowerCase().includes(q) || 
        p.casNumber?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Category / Tag filter
      if (selectedTag === 'spot') {
        return p.readyToDispatch === true || p.inStock === true;
      }
      if (selectedTag === 'pharma') {
        return p.category?.toLowerCase().includes('pharma');
      }
      if (selectedTag === 'industrial') {
        return p.category?.toLowerCase().includes('industrial');
      }
      if (selectedTag === 'agriculture') {
        return p.category?.toLowerCase().includes('agri') || p.category?.toLowerCase().includes('fertilizer');
      }
      if (selectedTag === 'lab') {
        return p.category?.toLowerCase().includes('lab') || p.category?.toLowerCase().includes('research');
      }

      return true;
    }).sort((a, b) => {
      const aIsPremium = (a as any).sellerTier === 'GROWTH_PACKAGE' ? 1 : 0;
      const bIsPremium = (b as any).sellerTier === 'GROWTH_PACKAGE' ? 1 : 0;
      return bIsPremium - aIsPremium;
    });
  }, [products, searchQuery, selectedTag, user?.uid]);

  // Ready spot inventory
  const spotProducts = useMemo(() => {
    return filteredProducts.filter(p => p.readyToDispatch === true || p.inStock === true);
  }, [filteredProducts]);

  // Trending catalog
  const trendingProducts = useMemo(() => {
    return filteredProducts.filter(p => !spotProducts.includes(p)).slice(0, 10);
  }, [filteredProducts, spotProducts]);

  return (
    <View style={styles.container}>
      {/* 1. Modern Enterprise Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.headerTop}>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brandText}>PROCHEM</Text>
              <View style={styles.exchangeBadge}>
                <Text style={styles.exchangeBadgeText}>EXCHANGE</Text>
              </View>
            </View>
            <Text style={styles.greetingText} numberOfLines={1}>
              {user?.companyName ? user.companyName : (user?.name ? user.name : 'Industrial Chemical Buyer')}
            </Text>
          </View>
          
          <View style={styles.actionIcons}>
            <View style={styles.iconWrapper}>
              <IconButton 
                icon="cart-outline" 
                iconColor="#FFFFFF" 
                size={22} 
                onPress={() => navigation.navigate('Cart')} 
                style={styles.iconBtn}
              />
              {cartCount > 0 && <Badge style={styles.cartBadge}>{cartCount}</Badge>}
            </View>
            <View style={styles.iconWrapper}>
              <IconButton 
                icon="bell-outline" 
                iconColor="#FFFFFF" 
                size={22} 
                onPress={() => navigation.navigate('Notifications')} 
                style={styles.iconBtn}
              />
              {unreadCount > 0 && <Badge style={styles.cartBadge}>{unreadCount}</Badge>}
            </View>
          </View>
        </View>

        {/* Integrated High-Contrast Search Bar */}
        <View style={styles.searchWrapper}>
          <Searchbar
            placeholder="Search chemicals, CAS No. (e.g. 67-64-1, Acetone)..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor="#059669"
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      {/* 2. Horizontal Industry Filter Rail */}
      <View style={styles.filterRailContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_TAGS.map(tag => {
            const isActive = selectedTag === tag.id;
            return (
              <TouchableOpacity
                key={tag.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedTag(tag.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tag.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); loadData(); }} 
            colors={['#0F172A']}
          />
        }
      >
        {/* Profile Completion Prompt */}
        {user && (
          <ProfileCompletionBanner 
            user={user} 
            onComplete={() => navigation.navigate('EditProfile')} 
          />
        )}

        {/* 3. High-Density Industrial Guarantee Bar */}
        <View style={styles.trustBar}>
          <View style={styles.trustColumn}>
            <Text style={styles.trustHeadline}>🔒 ESCROW SETTLED</Text>
            <Text style={styles.trustCaption}>Funds held in safe custody</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustColumn}>
            <Text style={styles.trustHeadline}>✓ COA VERIFIED</Text>
            <Text style={styles.trustCaption}>Purity test reports required</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustColumn}>
            <Text style={styles.trustHeadline}>🚚 DIRECT LOGISTICS</Text>
            <Text style={styles.trustCaption}>ISO tankers & sealed drums</Text>
          </View>
        </View>

        {/* 4. Core B2B Procurement Action Grid */}
        <View style={styles.procurementGrid}>
          <TouchableOpacity 
            style={styles.procureCard} 
            onPress={() => navigation.navigate('Categories')}
            activeOpacity={0.85}
          >
            <View style={[styles.procureIconBox, { backgroundColor: '#EFF6FF' }]}>
              <IconButton icon="molecule" size={20} iconColor="#1D4ED8" style={{ margin: 0 }} />
            </View>
            <Text style={styles.procureTitle}>Chemical Catalog</Text>
            <Text style={styles.procureSub}>Browse by chemical family</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.procureCard} 
            onPress={() => navigation.navigate('PostRequirement')}
            activeOpacity={0.85}
          >
            <View style={[styles.procureIconBox, { backgroundColor: '#F0FDF4' }]}>
              <IconButton icon="file-document-edit-outline" size={20} iconColor="#059669" style={{ margin: 0 }} />
            </View>
            <Text style={styles.procureTitle}>Post Custom RFQ</Text>
            <Text style={styles.procureSub}>Get bids from 500+ plants</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.procureCard} 
            onPress={() => navigation.navigate('CommerceHub')}
            activeOpacity={0.85}
          >
            <View style={[styles.procureIconBox, { backgroundColor: '#FEF3C7' }]}>
              <IconButton icon="handshake-outline" size={20} iconColor="#B45309" style={{ margin: 0 }} />
            </View>
            <Text style={styles.procureTitle}>Trading Desk</Text>
            <Text style={styles.procureSub}>Active chats & orders</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Trending Intermediates Carousel */}
        {trendingProducts.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionMainTitle}>High-Demand Intermediates</Text>
                <Text style={styles.sectionSubTitle}>Trending raw materials this week</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Categories')}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.horizontalScrollPadding}
            >
              {trendingProducts.map((p) => {
                const itemPrice = p.pricePerUnit || p.price || 0;
                return (
                  <TouchableOpacity 
                    key={p.id} 
                    style={styles.trendingCard} 
                    onPress={() => navigation.navigate('ProductDetail', { product: p })}
                    activeOpacity={0.85}
                  >
                    <View style={styles.trendingCardHeader}>
                      <View style={styles.casPill}>
                        <Text style={styles.casPillText}>CAS: {p.casNumber || 'Spec Sheet'}</Text>
                      </View>
                      <View style={styles.originPill}>
                        <Text style={styles.originPillText}>{p.origin || 'India'}</Text>
                      </View>
                    </View>

                    <Text style={styles.trendingProductName} numberOfLines={2}>
                      {p.name}
                    </Text>

                    <View style={styles.trendingSpecsRow}>
                      <Text style={styles.trendingSpecText}>
                        MOQ: {p.moq || 100} {p.unit || 'kg'}
                      </Text>
                      <Text style={styles.trendingSpecText}>
                        {p.category || 'Specialty'}
                      </Text>
                    </View>

                    <View style={styles.trendingCardFooter}>
                      <View>
                        <Text style={styles.rateLabel}>INDICATIVE RATE</Text>
                        <Text style={styles.rateValue}>
                          ₹{Number(itemPrice).toLocaleString('en-IN')}
                          <Text style={styles.rateUnit}> / {p.unit || 'kg'}</Text>
                        </Text>
                      </View>
                      <View style={styles.quoteSmallBtn}>
                        <Text style={styles.quoteSmallBtnText}>Quote</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 6. Ready-to-Dispatch Spot Inventory (Vertical Grid) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionMainTitle}>Ready Stock Inventory</Text>
              <Text style={styles.sectionSubTitle}>Verified physical inventory available for immediate dispatch</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingArea}>
              <ActivityIndicator size="small" color="#0F172A" />
              <Text style={styles.loadingAreaText}>Loading inventory records...</Text>
            </View>
          ) : spotProducts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardTitle}>No chemicals found matching "{searchQuery}"</Text>
              <Text style={styles.emptyCardSub}>Try searching by CAS number, common trade name, or clear filters.</Text>
            </View>
          ) : (
            spotProducts.map((p) => {
              const itemPrice = p.pricePerUnit || p.price || 0;
              return (
                <TouchableOpacity 
                  key={p.id} 
                  style={styles.spotCard} 
                  onPress={() => navigation.navigate('ProductDetail', { product: p })}
                  activeOpacity={0.88}
                >
                  <View style={styles.spotCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.spotBadgeRow}>
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedBadgeText}>✓ VERIFIED SUPPLIER</Text>
                        </View>
                        <Text style={styles.spotCategoryText}>{p.category || 'Chemical'}</Text>
                      </View>
                      <Text style={styles.spotProductName} numberOfLines={2}>
                        {p.name}
                      </Text>
                    </View>
                  </View>

                  {/* 2x2 Matrix Summary */}
                  <View style={styles.spotMatrix}>
                    <View style={styles.spotMatrixRow}>
                      <View style={[styles.spotMatrixCell, styles.spotBorderRight]}>
                        <Text style={styles.spotMatrixLabel}>PRICE PER UNIT</Text>
                        <Text style={styles.spotMatrixPrice}>
                          ₹{Number(itemPrice).toLocaleString('en-IN')}
                          <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}> / {p.unit || 'kg'}</Text>
                        </Text>
                      </View>
                      <View style={styles.spotMatrixCell}>
                        <Text style={styles.spotMatrixLabel}>MIN. ORDER QUANTITY</Text>
                        <Text style={styles.spotMatrixValue}>
                          {Number(p.moq || 100).toLocaleString('en-IN')} {p.unit || 'kg'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.spotMatrixRow, styles.spotBorderTop]}>
                      <View style={[styles.spotMatrixCell, styles.spotBorderRight]}>
                        <Text style={styles.spotMatrixLabel}>CAS REGISTRY NO.</Text>
                        <Text style={styles.spotCasCode}>
                          {p.casNumber || 'Available on request'}
                        </Text>
                      </View>
                      <View style={styles.spotMatrixCell}>
                        <Text style={styles.spotMatrixLabel}>PORT / ORIGIN</Text>
                        <Text style={styles.spotOriginText}>
                          📍 {p.origin || 'Dahej, India'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.spotCardFooter}>
                    <View style={styles.sampleBadge}>
                      <Text style={styles.sampleBadgeText}>🧪 Sample Testing Available</Text>
                    </View>
                    <View style={styles.viewDetailBtn}>
                      <Text style={styles.viewDetailText}>Inspect Specs & RFQ →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* 7. Modern Sourcing Banner */}
        <View style={styles.customSourcingBanner}>
          <View style={{ flex: 1 }}>
            <View style={styles.sourcingBadge}>
              <Text style={styles.sourcingBadgeText}>BESPOKE SOURCING</Text>
            </View>
            <Text style={styles.sourcingTitle}>Can't find your chemical?</Text>
            <Text style={styles.sourcingSubtitle}>
              Broadcast custom grade, volume, or purity requirements. Verified manufacturers will quote directly.
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.sourcingCTAButton}
            onPress={() => navigation.navigate('PostRequirement')}
            activeOpacity={0.85}
          >
            <Text style={styles.sourcingCTAText}>Post RFQ</Text>
          </TouchableOpacity>
        </View>

        {/* 8. Network Share Card */}
        <View style={styles.referralCard}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.referralTitle}>
              {isPremium ? "Expand the Chemical Trading Network" : "Invite Industrial Colleagues"}
            </Text>
            <Text style={styles.referralSubtitle}>
              {isPremium 
                ? "Connect verified procurement officers and suppliers to the exchange." 
                : "Invite a procurement team and unlock 1 Free Negotiation Credit."}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.referralButton} 
            onPress={handleInviteBuyer}
            activeOpacity={0.85}
          >
            <Text style={styles.referralButtonText}>Invite</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  
  /* Header */
  header: { 
    backgroundColor: '#0F172A', 
    paddingHorizontal: 16, 
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
  },
  brandRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
  },
  brandText: { 
    color: '#FFFFFF', 
    fontSize: 20, 
    fontWeight: '800', 
    letterSpacing: 0.8,
  },
  exchangeBadge: { 
    backgroundColor: '#059669', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4,
  },
  exchangeBadgeText: { 
    color: '#FFFFFF', 
    fontSize: 9, 
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  greetingText: { 
    color: '#94A3B8', 
    fontSize: 12, 
    fontWeight: '500',
    marginTop: 2,
    maxWidth: 220,
  },
  actionIcons: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 4,
  },
  iconWrapper: {
    position: 'relative',
  },
  iconBtn: {
    margin: 0,
    backgroundColor: '#1E293B',
    borderRadius: 20,
  },
  cartBadge: { 
    position: 'absolute', 
    top: 2, 
    right: 2, 
    backgroundColor: '#EF4444',
    fontSize: 10,
  },

  /* Search */
  searchWrapper: { 
    marginTop: 4,
  },
  searchBar: { 
    backgroundColor: '#1E293B', 
    borderRadius: 10, 
    height: 44,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: { 
    fontSize: 13, 
    color: '#F8FAFC',
    minHeight: 0,
  },

  /* Filter Rail */
  filterRailContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  /* Content */
  scrollContent: { 
    paddingBottom: 60, 
    paddingTop: 12,
  },

  /* Trust Bar */
  trustBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trustColumn: {
    flex: 1,
    alignItems: 'center',
  },
  trustHeadline: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  trustCaption: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  trustDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },

  /* Procurement Grid */
  procurementGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  procureCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  procureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  procureTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  procureSub: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 13,
  },

  /* Sections */
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionMainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionSubTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  horizontalScrollPadding: {
    paddingHorizontal: 16,
    gap: 12,
  },

  /* Trending Card */
  trendingCard: {
    backgroundColor: '#FFFFFF',
    width: 200,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  casPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  casPillText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#475569',
    fontWeight: '600',
  },
  originPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  originPillText: {
    fontSize: 9,
    color: '#64748B',
  },
  trendingProductName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 6,
  },
  trendingSpecsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trendingSpecText: {
    fontSize: 10,
    color: '#64748B',
  },
  trendingCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  rateLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    fontVariant: ['tabular-nums'],
  },
  rateUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
  },
  quoteSmallBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quoteSmallBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Spot Offer Card */
  spotCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  spotCardHeader: {
    padding: 14,
    paddingBottom: 10,
  },
  spotBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  spotCategoryText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  spotProductName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  spotMatrix: {
    marginHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  spotMatrixRow: {
    flexDirection: 'row',
  },
  spotMatrixCell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  spotBorderRight: {
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  spotBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  spotMatrixLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  spotMatrixPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    fontVariant: ['tabular-nums'],
  },
  spotMatrixValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  spotCasCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#334155',
  },
  spotOriginText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  spotCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  sampleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sampleBadgeText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  viewDetailBtn: {
    paddingVertical: 4,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },

  loadingArea: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingAreaText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptyCardSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },

  /* Custom Sourcing Banner */
  customSourcingBanner: {
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourcingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  sourcingBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sourcingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  sourcingSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  sourcingCTAButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sourcingCTAText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Referral Card */
  referralCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  referralTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  referralSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  referralButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  referralButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
});
