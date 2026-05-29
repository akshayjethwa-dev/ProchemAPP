// src/screens/BuyerDashboard.tsx
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}><Text style={styles.logoText}>P</Text></View>
            <Text style={styles.headerTitle}>Account</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}><Text style={{fontSize: 20}}>🏢</Text></View>
          <View>
            <Text style={styles.companyName}>{user?.companyName || 'Business Profile'}</Text>
            <View style={styles.gstBadge}>
                <Text style={styles.gstText}>GST: {user?.gstNumber || 'Unverified'}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        <View style={styles.grid}>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Categories')}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapperBlue}><Text style={styles.cardIcon}>🧪</Text></View>
              <View style={styles.badge}><Text style={styles.badgeText}>{products.length} Items</Text></View>
            </View>
            <Text style={styles.cardTitle}>Browse Chemicals</Text>
            <Text style={styles.cardSub}>View global catalog</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Orders')}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapperGreen}><Text style={styles.cardIcon}>📦</Text></View>
              <View style={[styles.badge, { backgroundColor: '#E0F2FE' }]}>
                <Text style={[styles.badgeText, { color: '#0284C7' }]}>{orders.length} Active</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>Active Orders</Text>
            <Text style={styles.cardSub}>Track shipments</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sourcing Tools</Text>
          <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Orders')}>
            <View style={styles.listIconBox}><Text style={styles.listIconText}>📋</Text></View>
            <Text style={styles.listText}>Order History</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.listItem}>
            <View style={styles.listIconBox}><Text style={styles.listIconText}>📄</Text></View>
            <Text style={styles.listText}>GST Invoices</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.waBanner} 
          activeOpacity={0.9}
          onPress={() => Linking.openURL('https://wa.me/918460852903?text=Hi%20Prochem!%20Please%20link%20my%20account.')}
        >
          <Text style={{fontSize: 24, marginRight: 12}}>💬</Text>
          <View style={{flex: 1}}>
            <Text style={styles.waBannerTitle}>WhatsApp Alerts</Text>
            <Text style={styles.waBannerText}>Get real-time order updates.</Text>
          </View>
          <Text style={[styles.chevron, {color: '#047857'}]}>›</Text>
        </TouchableOpacity>

        <View style={styles.banner}>
          <View>
            <Text style={styles.bannerTitle}>Bulk Buy Rewards</Text>
            <Text style={styles.bannerText}>Order {'>'} 10 MT to unlock 5% discount.</Text>
          </View>
          <Text style={{fontSize: 24}}>🏆</Text>
        </View>

        {loading && <ActivityIndicator style={{marginTop: 20}} color="#004AAD" />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#004AAD', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 28, height: 28, backgroundColor: 'white', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoText: { color: '#004AAD', fontWeight: '900', fontSize: 16 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: 'white', fontSize: 12, fontWeight: '700' },
  
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  companyName: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  gstBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  gstText: { color: 'white', fontSize: 10, fontWeight: '600' },
  
  content: { padding: 20 }, 
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  
  card: { backgroundColor: 'white', width: '48%', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  iconWrapperBlue: { backgroundColor: '#EFF6FF', padding: 8, borderRadius: 10 },
  iconWrapperGreen: { backgroundColor: '#ECFDF5', padding: 8, borderRadius: 10 },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontWeight: '700', color: '#1E293B', fontSize: 14, marginBottom: 2 },
  cardSub: { color: '#64748B', fontSize: 10 },
  badge: { backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: '#10B981', fontSize: 10, fontWeight: 'bold' },
  
  section: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  listIconBox: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginRight: 12 },
  listIconText: { fontSize: 16 },
  listText: { flex: 1, color: '#333', fontWeight: '600', fontSize: 14 },
  chevron: { color: '#CBD5E1', fontSize: 20 },
  
  waBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#A7F3D0' },
  waBannerTitle: { color: '#047857', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
  waBannerText: { color: '#065F46', fontSize: 12 },
  
  banner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 16 },
  bannerTitle: { color: 'white', fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  bannerText: { color: '#94A3B8', fontSize: 12 },
});