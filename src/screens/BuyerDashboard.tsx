import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl, Linking } from 'react-native'; // ✅ Added Linking
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
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}><Text style={{fontSize: 24}}>🏢</Text></View>
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
            <Text style={styles.cardIcon}>🧪</Text>
            <Text style={styles.cardTitle}>Browse Chemicals</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{products.length} Available</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('Orders')}
          >
            <Text style={styles.cardIcon}>📦</Text>
            <Text style={styles.cardTitle}>Active Orders</Text>
            <View style={[styles.badge, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.badgeText, { color: '#1976D2' }]}>
                {orders.length} Active
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Management Tools</Text>
          
          <TouchableOpacity 
            style={styles.listItem}
            onPress={() => navigation.navigate('Orders')}
          >
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

        {/* 🚀 NEW: WhatsApp CTA Banner */}
        <TouchableOpacity 
          style={styles.waBanner} 
          activeOpacity={0.9}
          onPress={() => Linking.openURL('https://wa.me/918460852903?text=Hi%20Prochem!%20Please%20link%20my%20account.')}
        >
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{fontSize: 30, marginRight: 15}}>💬</Text>
            <View style={{flex: 1}}>
              <Text style={styles.waBannerTitle}>Get WhatsApp Alerts</Text>
              <Text style={styles.waBannerText}>Tap here to say Hi and instantly link your number for order tracking.</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
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
  header: { backgroundColor: '#004AAD', padding: 20, paddingBottom: 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 32, height: 32, backgroundColor: 'white', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoText: { color: '#004AAD', fontWeight: 'bold' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  companyName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  gstText: { color: '#E3F2FD', fontSize: 12, fontWeight: 'bold' },
  content: { padding: 20 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  card: { backgroundColor: 'white', width: '48%', padding: 20, borderRadius: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width:0, height:2} },
  cardIcon: { fontSize: 32, marginBottom: 12 },
  cardTitle: { fontWeight: 'bold', color: '#333', marginBottom: 8, textAlign: 'center' },
  badge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#2E7D32', fontSize: 10, fontWeight: 'bold' },
  section: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  listIcon: { fontSize: 20, marginRight: 16 },
  listText: { flex: 1, color: '#333', fontWeight: '600' },
  chevron: { color: '#ccc', fontSize: 20 },
  // WA Banner styles
  waBanner: { backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#A5D6A7' },
  waBannerTitle: { color: '#1B5E20', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  waBannerText: { color: '#2E7D32', fontSize: 12 },
  
  banner: { backgroundColor: '#2E7D32', borderRadius: 16, padding: 20 },
  bannerTitle: { color: 'white', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  bannerText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
});