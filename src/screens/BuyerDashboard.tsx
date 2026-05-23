import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { getProducts } from '../services/productService';
import { getBuyerOrders } from '../services/orderService';
import { logoutUser } from '../services/authService';

export default function BuyerDashboard() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  
  const { user, products, setProducts } = useAppStore();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const prods = await getProducts();
      setProducts(prods);

      if (user) {
        const buyerId = user.uid; 
        const buyerOrders = await getBuyerOrders(buyerId);
        setOrders(buyerOrders || []);
      }
    } catch (err: any) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, setProducts]);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, loadData]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}><Text style={styles.logoText}>P</Text></View>
            <Text style={styles.headerTitle}>Prochem Buyer</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}><Text style={{fontSize: 18}}>🏢</Text></View>
          <View>
            <Text style={styles.companyName}>{user?.companyName || 'Guest User'}</Text>
            <Text style={styles.gstText}>GST: {user?.gstNumber || 'N/A'}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        <View style={styles.grid}>
          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('Categories')}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🧪</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{products.length} Items</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>Browse Chemicals</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('Orders')}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>📦</Text>
              <View style={[styles.badge, { backgroundColor: '#E3F2FD' }]}>
                <Text style={[styles.badgeText, { color: '#1976D2' }]}>{orders.length} Active</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>Active Orders</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools</Text>
          <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.listIcon}>📋</Text>
            <Text style={styles.listText}>Order History</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listIcon}>📄</Text>
            <Text style={styles.listText}>GST Invoices</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.waBanner} 
          activeOpacity={0.9}
          onPress={() => Linking.openURL('https://wa.me/918460852903?text=Hi%20Prochem!%20Please%20link%20my%20account.')}
        >
          <Text style={{fontSize: 20, marginRight: 10}}>💬</Text>
          <View style={{flex: 1}}>
            <Text style={styles.waBannerTitle}>WhatsApp Alerts</Text>
            <Text style={styles.waBannerText}>Tap to link your number.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Bulk Buy Rewards</Text>
          <Text style={styles.bannerText}>Order {'>'} 10 MT to get 5% additional discount.</Text>
        </View>

        {loading && <ActivityIndicator style={{marginTop: 20}} color="#004AAD" />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  // 🔥 REDUCED padding and border radius
  header: { backgroundColor: '#004AAD', padding: 16, paddingBottom: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  // 🔥 REDUCED logo size
  logoBox: { width: 24, height: 24, backgroundColor: 'white', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  logoText: { color: '#004AAD', fontWeight: 'bold', fontSize: 14 },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  logoutText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  // 🔥 REDUCED Avatar from 50px to 36px
  avatar: { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  companyName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  gstText: { color: '#E3F2FD', fontSize: 11, fontWeight: '600' },
  
  content: { padding: 12 }, // 🔥 REDUCED from 20
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  
  // 🔥 REDUCED Card padding and layout
  card: { backgroundColor: 'white', width: '48%', padding: 12, borderRadius: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: {width:0, height:1} },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardIcon: { fontSize: 24 }, // 🔥 REDUCED from 32
  cardTitle: { fontWeight: '600', color: '#333', fontSize: 13 },
  badge: { backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: '#2E7D32', fontSize: 9, fontWeight: 'bold' },
  
  // 🔥 SLIMMED DOWN lists
  section: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  listIcon: { fontSize: 18, marginRight: 12 },
  listText: { flex: 1, color: '#333', fontWeight: '500', fontSize: 14 },
  chevron: { color: '#ccc', fontSize: 18 },
  
  // 🔥 FLATTENED Banners
  waBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#A5D6A7' },
  waBannerTitle: { color: '#1B5E20', fontWeight: 'bold', fontSize: 14 },
  waBannerText: { color: '#2E7D32', fontSize: 11 },
  
  banner: { backgroundColor: '#2E7D32', borderRadius: 12, padding: 12 },
  bannerTitle: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  bannerText: { color: 'rgba(255,255,255,0.9)', fontSize: 11 },
});