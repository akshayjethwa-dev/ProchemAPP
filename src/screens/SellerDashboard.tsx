// src/screens/SellerDashboard.tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Share, Alert, Linking } from 'react-native';
import { Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { BroadcastLead } from '../types';
import { ProfileCompletionBanner } from '../components/ProfileCompletionBanner';

export default function SellerDashboard() {
  const navigation = useNavigation<any>();
  const { user } = useAppStore();
  
  const [stats, setStats] = useState({ activeOrders: 0, totalProducts: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [recentLeads, setRecentLeads] = useState<BroadcastLead[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  const isPremium = user?.subscriptionTier === 'GROWTH_PACKAGE';

  useEffect(() => {
    if (!user) return;
    loadSellerStats();
    
    const leadsQuery = query(collection(db, 'broadcastLeads'), where('status', '==', 'OPEN'), orderBy('createdAt', 'desc'));
    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
      const allLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BroadcastLead));
      
      const filteredLeads = allLeads.filter(lead => {
        if (lead.buyerId === user.uid) return false;
        if (lead.excludedSellerId === user.uid) return false;
        if (lead.excludedSellerIds && lead.excludedSellerIds.includes(user.uid)) return false;
        return true;
      });

      setRecentLeads(filteredLeads);
    });

    return () => unsubscribeLeads();
  }, [user]);

  const loadSellerStats = async () => {
    if (!user) return;
    try {
      const productsQ = query(collection(db, 'products'), where('sellerId', '==', user.uid));
      const productsSnap = await getDocs(productsQ);
      
      const ordersQ = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
      const ordersSnap = await getDocs(ordersQ);

      let revenue = 0, activeCount = 0, pendingCount = 0;
      ordersSnap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'delivered') revenue += data.totalAmount || 0;
        if (['PENDING_SELLER', 'PENDING_ADMIN', 'ACCEPTED', 'shipped'].includes(data.status)) activeCount++;
        if (data.status === 'PENDING_SELLER') pendingCount++;
      });

      setStats({ totalProducts: productsSnap.size, activeOrders: activeCount, totalRevenue: revenue });
      setPendingOrdersCount(pendingCount);
    } catch (error) {
      console.error("Failed to load seller stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSupplier = async () => {
    try {
      const result = await Share.share({ 
        message: `Join Prochem Supplier Exchange! Access live bulk chemical inquiries across India: https://prochem.app/supplier-invite/${user?.uid}` 
      });
      if (result.action === Share.sharedAction && user?.uid) {
        Alert.alert("Thank You! 🙏", "Thanks for expanding the Prochem chemical supply network!");
      }
    } catch (error: any) { 
      console.error(error.message); 
    }
  };

  const initialChar = user?.companyName?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'S';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#0F172A" />
        <Text style={styles.loadingText}>Initializing Supplier Command Desk...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Executive Supplier Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.deskTagRow}>
            <Text style={styles.deskTag}>SUPPLIER COMMAND DESK</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ VERIFIED PLANT</Text>
            </View>
          </View>
          <Text style={styles.companyName} numberOfLines={1}>
            {user?.companyName || 'Chemical Manufacturer'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.notifBtn} 
            onPress={() => navigation.navigate('Notifications')}
          >
            <IconButton icon="bell-outline" size={20} iconColor="#FFFFFF" style={{ margin: 0 }} />
          </TouchableOpacity>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarChar}>{initialChar}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {user && (
          <ProfileCompletionBanner 
            user={user} 
            onComplete={() => navigation.navigate('EditProfile')} 
          />
        )}
        
        {/* KPI METRIC CARDS (2x2 Grid) */}
        <View style={styles.kpiGrid}>
          <TouchableOpacity 
            style={[styles.kpiCard, pendingOrdersCount > 0 && styles.kpiCardHighlight]} 
            onPress={() => navigation.navigate('Orders')}
            activeOpacity={0.85}
          >
            <Text style={styles.kpiLabel}>PENDING ORDERS</Text>
            <Text style={[styles.kpiValue, { color: pendingOrdersCount > 0 ? '#D97706' : '#0F172A' }]}>
              {pendingOrdersCount}
            </Text>
            <Text style={styles.kpiSub}>Awaiting CoA & dispatch</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.kpiCard} 
            onPress={() => navigation.navigate('SellerLiveLeads')}
            activeOpacity={0.85}
          >
            <Text style={styles.kpiLabel}>LIVE BUYER RFQS</Text>
            <Text style={[styles.kpiValue, { color: '#059669' }]}>
              {recentLeads.length}
            </Text>
            <Text style={styles.kpiSub}>Ready for commercial bids</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.kpiCard} 
            onPress={() => navigation.navigate('ManageChemicals')}
            activeOpacity={0.85}
          >
            <Text style={styles.kpiLabel}>ACTIVE LISTINGS</Text>
            <Text style={[styles.kpiValue, { color: '#0F172A' }]}>
              {stats.totalProducts}
            </Text>
            <Text style={styles.kpiSub}>Products on exchange</Text>
          </TouchableOpacity>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL DISBURSED</Text>
            <Text style={[styles.kpiValue, { color: '#0F172A' }]}>
              ₹{Number(stats.totalRevenue).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.kpiSub}>Escrow settled settlements</Text>
          </View>
        </View>

        {/* CORE SUPPLIER ACTIONS */}
        <View style={styles.quickActionRow}>
          <TouchableOpacity 
            style={styles.primaryActionBtn} 
            onPress={() => navigation.navigate('AddChemical')}
            activeOpacity={0.88}
          >
            <IconButton icon="plus" size={20} iconColor="#FFFFFF" style={{ margin: 0 }} />
            <Text style={styles.primaryActionText}>List New Chemical</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryActionBtn} 
            onPress={() => navigation.navigate('ManageChemicals')}
            activeOpacity={0.88}
          >
            <IconButton icon="format-list-bulleted" size={18} iconColor="#0F172A" style={{ margin: 0 }} />
            <Text style={styles.secondaryActionText}>Manage Catalog</Text>
          </TouchableOpacity>
        </View>

        {/* LIVE INQUIRIES FEED */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionMainTitle}>Live Chemical Requirements</Text>
            <Text style={styles.sectionSubTitle}>Direct sourcing broadcasts from verified buyers</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('SellerLiveLeads')} style={{ paddingVertical: 4 }}>
            <Text style={styles.viewAllText}>View All ({recentLeads.length}) →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.leadsContainer}>
          {recentLeads.length === 0 ? (
            <View style={styles.emptyLeadsBox}>
              <IconButton icon="radar" size={32} iconColor="#94A3B8" />
              <Text style={styles.emptyLeadsTitle}>No open buyer requirements right now</Text>
              <Text style={styles.emptyLeadsSub}>
                New purchasing tenders from verified buyers will appear here in real-time.
              </Text>
            </View>
          ) : (
            recentLeads.slice(0, 3).map((lead) => (
              <TouchableOpacity 
                key={lead.id} 
                style={styles.leadCard} 
                onPress={() => navigation.navigate('SellerLiveLeads')}
                activeOpacity={0.88}
              >
                <View style={styles.leadCardTop}>
                  <View style={styles.leadPill}>
                    <Text style={styles.leadPillText}>OPEN INQUIRY</Text>
                  </View>
                  <Text style={styles.leadLocation}>📍 Destination: {lead.deliveryRegion || 'Pan-India'}</Text>
                </View>

                <Text style={styles.leadProductTitle} numberOfLines={1}>
                  {lead.productName}
                </Text>

                <View style={styles.leadMetaRow}>
                  <Text style={styles.leadMetaText}>
                    Required: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{lead.quantityRequired} {lead.unit}</Text>
                  </Text>
                  {lead.targetPrice && Number(lead.targetPrice) > 0 ? (
                    <Text style={styles.leadMetaText}>
                      Target: <Text style={{ fontWeight: '700', color: '#059669' }}>₹{lead.targetPrice}/{lead.unit}</Text>
                    </Text>
                  ) : null}
                </View>

                <View style={styles.leadCardFooter}>
                  <Text style={styles.leadTimestamp}>
                    Broadcast {new Date(lead.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.leadQuoteLink}>Bid Commercial Offer →</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* WHATSAPP LEAD RELAY BANNER */}
        <TouchableOpacity 
          style={styles.waRelayCard} 
          activeOpacity={0.9} 
          onPress={() => Linking.openURL('https://wa.me/918460852903?text=Hello,%20I%20want%20to%20receive%20Prochem%20seller%20leads%20on%20WhatsApp.')}
        >
          <View style={styles.waIconBox}>
            <IconButton icon="whatsapp" size={24} iconColor="#FFFFFF" style={{ margin: 0 }} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.waCardTitle}>Instant WhatsApp Tender Relay</Text>
            <Text style={styles.waCardSub}>Get buyer inquiries delivered directly to your commercial team's phone.</Text>
          </View>
          <IconButton icon="chevron-right" size={20} iconColor="#15803D" />
        </TouchableOpacity>

        {/* NETWORK SHARE */}
        <View style={styles.shareBanner}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.shareTitle}>Expand Supplier Network</Text>
            <Text style={styles.shareText}>Invite chemical plants and authorized distributors to join the trading desk.</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={handleInviteSupplier} activeOpacity={0.85}>
            <Text style={styles.shareBtnText}>Invite</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748B',
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  deskTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  deskTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.6,
  },
  verifiedBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#34D399',
  },
  companyName: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChar: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: { 
    paddingBottom: 60,
    paddingTop: 14,
  },
  
  /* KPI Grid */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  kpiCard: { 
    width: '48%',
    backgroundColor: '#FFFFFF', 
    padding: 14, 
    borderRadius: 12, 
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiCardHighlight: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  kpiLabel: { 
    fontSize: 9, 
    color: '#64748B', 
    fontWeight: '800', 
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  kpiValue: { 
    fontSize: 20, 
    fontWeight: '800',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: '#94A3B8',
  },

  /* Core Actions */
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  primaryActionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  secondaryActionText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Sections */
  sectionHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    marginHorizontal: 16, 
    marginBottom: 10,
  },
  sectionMainTitle: {
    fontSize: 16,
    fontWeight: '800',
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

  /* Lead Cards */
  leadsContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  leadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  leadCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  leadPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leadPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.4,
  },
  leadLocation: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  leadProductTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  leadMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  leadMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  leadCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  leadTimestamp: {
    fontSize: 10,
    color: '#94A3B8',
  },
  leadQuoteLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  emptyLeadsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },
  emptyLeadsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptyLeadsSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },

  /* WhatsApp Relay Card */
  waRelayCard: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4', 
    borderRadius: 12, 
    padding: 14, 
    marginHorizontal: 16, 
    marginBottom: 14, 
    borderWidth: 1, 
    borderColor: '#BBF7D0',
  },
  waIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waCardTitle: { 
    color: '#166534', 
    fontWeight: '700', 
    fontSize: 13, 
    marginBottom: 2,
  },
  waCardSub: { 
    color: '#15803D', 
    fontSize: 11,
    lineHeight: 15,
  },

  /* Share Banner */
  shareBanner: { 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF', 
    padding: 14, 
    borderRadius: 12, 
    marginHorizontal: 16, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
  },
  shareTitle: { 
    color: '#0F172A', 
    fontWeight: '700', 
    fontSize: 13, 
    marginBottom: 2,
  },
  shareText: { 
    color: '#64748B', 
    fontSize: 11,
  },
  shareBtn: { 
    backgroundColor: '#0F172A', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 6,
  },
  shareBtnText: { 
    color: 'white', 
    fontWeight: '700', 
    fontSize: 12,
  }
});
