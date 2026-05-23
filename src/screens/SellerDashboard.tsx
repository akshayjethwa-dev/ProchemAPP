// src/screens/SellerDashboard.tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Share, Alert, Linking } from 'react-native';
import { Text, Card, ActivityIndicator, Button, useTheme, Avatar, IconButton, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, onSnapshot, limit, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { logoutUser } from '../services/authService';
import { BroadcastLead } from '../types';

export default function SellerDashboard() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user, updateUserCredits } = useAppStore();
  
  const [stats, setStats] = useState({ activeOrders: 0, totalProducts: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [recentLeads, setRecentLeads] = useState<BroadcastLead[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  const isPremium = user?.subscriptionTier === 'GROWTH_PACKAGE';

  useEffect(() => {
    if (!user) return;
    loadSellerStats();
    
    const leadsQuery = query(collection(db, 'broadcastLeads'), where('status', '==', 'OPEN'), orderBy('createdAt', 'desc'), limit(3));
    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
      setRecentLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BroadcastLead)));
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
      const result = await Share.share({ message: `Grow your chemical business on Prochem! Access live market requirements. Register: https://play.google.com/store/apps/details?id=com.prochem.app` });
      if (result.action === Share.sharedAction && user?.uid) {
        if (!isPremium) {
          await updateDoc(doc(db, 'users', user.uid), { liveQuoteCredits: increment(1) });
          updateUserCredits({ liveQuoteCredits: (user.liveQuoteCredits || 3) + 1 });
          Alert.alert("Reward Unlocked! 🚀", "You've earned 1 extra FREE Live Market Quote.");
        } else {
          Alert.alert("Thank You! 🙏", "Thanks for helping grow the Prochem network!");
        }
      }
    } catch (error: any) { console.error(error.message); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{flex: 1}}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.companyName} numberOfLines={1}>{user?.companyName || 'Seller'}</Text>
        </View>
        <View style={{flexDirection:'row', alignItems:'center'}}>
            <IconButton icon="bell" iconColor="#64748B" size={24} onPress={() => navigation.navigate('Notifications')} />
            <Avatar.Text size={40} label={user?.companyName?.[0] || "S"} style={{backgroundColor: theme.colors.primary}} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* COMPACT KPI PILLS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScroll}>
          <Card style={styles.kpiPill} onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.kpiLabel}>New Orders</Text>
            <Text style={[styles.kpiValue, {color: pendingOrdersCount > 0 ? '#D97706' : '#1E293B'}]}>{pendingOrdersCount}</Text>
          </Card>
          <Card style={styles.kpiPill} onPress={() => navigation.navigate('SellerLiveLeads')}>
            <Text style={styles.kpiLabel}>Live Reqs</Text>
            <Text style={[styles.kpiValue, {color: '#0284C7'}]}>{recentLeads.length}</Text>
          </Card>
          <Card style={styles.kpiPill} onPress={() => navigation.navigate('MyListings')}>
            <Text style={styles.kpiLabel}>Active Listings</Text>
            <Text style={[styles.kpiValue, {color: '#16A34A'}]}>{stats.totalProducts}</Text>
          </Card>
        </ScrollView>

        {/* LIVE REQUIREMENTS ACTION LIST */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>LIVE MARKET REQUIREMENTS</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SellerLiveLeads')} style={{paddingVertical: 4}}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.groupBlock}>
          {recentLeads.length === 0 ? (
            <View style={{padding: 20, alignItems: 'center'}}><Text style={{color: '#64748B'}}>No live requirements right now.</Text></View>
          ) : (
            recentLeads.map((lead, index) => (
              <View key={lead.id}>
                <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('SellerLiveLeads')}>
                  <View style={[styles.iconBox, {backgroundColor: '#E0F2FE'}]}><Text>🎯</Text></View>
                  <View style={{flex: 1, marginLeft: 12}}>
                    <Text style={styles.actionTitle} numberOfLines={1}>{lead.productName}</Text>
                    <Text style={styles.actionSub}>Req: {lead.quantityRequired} {lead.unit} | To: {lead.deliveryRegion}</Text>
                  </View>
                  <IconButton icon="chevron-right" size={20} iconColor="#CBD5E1" style={{margin: 0}} />
                </TouchableOpacity>
                {index < recentLeads.length - 1 && <Divider style={{marginLeft: 56}} />}
              </View>
            ))
          )}
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        <View style={styles.groupBlock}>
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Orders')}>
            <View style={[styles.iconBox, {backgroundColor: '#FEF3C7'}]}><Text>📦</Text></View>
            <View style={{flex: 1, marginLeft: 12}}><Text style={styles.actionTitle}>Pending Orders</Text><Text style={styles.actionSub}>Review & accept new requests</Text></View>
            <IconButton icon="chevron-right" size={20} iconColor="#CBD5E1" style={{margin: 0}} />
          </TouchableOpacity>
          <Divider style={{marginLeft: 56}} />
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('AddChemical')}>
            <View style={[styles.iconBox, {backgroundColor: '#DCFCE7'}]}><Text>➕</Text></View>
            <View style={{flex: 1, marginLeft: 12}}><Text style={styles.actionTitle}>Add Chemical</Text><Text style={styles.actionSub}>Post new stock to catalog</Text></View>
            <IconButton icon="chevron-right" size={20} iconColor="#CBD5E1" style={{margin: 0}} />
          </TouchableOpacity>
        </View>

        {/* PERFORMANCE ROW */}
        <Text style={styles.sectionTitle}>PERFORMANCE</Text>
        <Card style={[styles.groupBlock, {padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}]}>
           <View>
             <Text style={{color: '#64748B', fontSize: 11, fontWeight: 'bold'}}>TOTAL REVENUE</Text>
             <Text style={{fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginTop: 4}}>₹{stats.totalRevenue.toLocaleString()}</Text>
           </View>
           <View style={{backgroundColor: '#F1F5F9', padding: 8, borderRadius: 8}}>
             <Text style={{fontSize: 12, color: '#475569'}}>{stats.activeOrders} Active Orders</Text>
           </View>
        </Card>

        {/* WHATSAPP LINK BANNER */}
        <TouchableOpacity style={styles.waBanner} activeOpacity={0.9} onPress={() => Linking.openURL('https://wa.me/917984856652text=Hi%20Prochem!%20Please%20link%20my%20supplier%20account.')}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{fontSize: 24, marginRight: 15}}>💬</Text>
            <View style={{flex: 1}}>
              <Text style={styles.waBannerTitle}>Link WhatsApp</Text>
              <Text style={styles.waBannerText}>Get buyer leads directly to your phone.</Text>
            </View>
            <Text style={{color: '#15803D', fontSize: 24}}>›</Text>
          </View>
        </TouchableOpacity>

        {/* INVITE BANNER */}
        <View style={styles.inviteBanner}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.inviteTitle}>Grow the Network</Text>
            <Text style={styles.inviteText}>{isPremium ? 'Invite other suppliers to join the marketplace.' : 'Invite a supplier and get 1 extra FREE Live quote!'}</Text>
            {!isPremium && <Text style={styles.creditsText}>Live Quotes Available: <Text style={{fontWeight: 'bold'}}>{user?.liveQuoteCredits || 3}</Text></Text>}
          </View>
          <TouchableOpacity style={styles.inviteBtn} onPress={handleInviteSupplier}>
            <Text style={styles.inviteBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white' },
  greeting: { fontSize: 13, color: '#64748B' },
  companyName: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  content: { paddingBottom: 40 },
  
  kpiScroll: { padding: 16, paddingRight: 0 },
  kpiPill: { backgroundColor: 'white', padding: 12, borderRadius: 12, marginRight: 12, minWidth: 110, elevation: 1 },
  kpiLabel: { fontSize: 11, color: '#64748B', fontWeight: 'bold', marginBottom: 4 },
  kpiValue: { fontSize: 20, fontWeight: 'bold' },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  sectionHeaderTitle: { fontSize: 11, fontWeight: 'bold', color: '#64748B', letterSpacing: 1 },
  viewAllText: { fontSize: 12, fontWeight: 'bold', color: '#004AAD' },

  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#64748B', marginLeft: 16, marginBottom: 8, marginTop: 16, letterSpacing: 1 },
  groupBlock: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', marginHorizontal: 16, elevation: 1 },
  
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  actionSub: { fontSize: 11, color: '#64748B', marginTop: 2 },

  waBanner: { backgroundColor: '#DCFCE7', borderRadius: 12, padding: 16, marginHorizontal: 16, marginTop: 24, borderWidth: 1, borderColor: '#86EFAC' },
  waBannerTitle: { color: '#166534', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
  waBannerText: { color: '#15803D', fontSize: 12 },

  inviteBanner: { flexDirection: 'row', backgroundColor: '#F3E8FF', padding: 16, borderRadius: 12, marginHorizontal: 16, marginTop: 16, alignItems: 'center', borderWidth: 1, borderColor: '#D8B4FE' },
  inviteTitle: { color: '#7E22CE', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
  inviteText: { color: '#6B21A8', fontSize: 12 },
  creditsText: { color: '#9333EA', fontSize: 11, marginTop: 4 },
  inviteBtn: { backgroundColor: '#9333EA', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  inviteBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 }
});