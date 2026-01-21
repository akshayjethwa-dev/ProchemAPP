import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../store/appStore';
import { logoutUser } from '../services/authService';
import { getSellerOrders } from '../services/orderService';
import { getSellerProducts } from '../services/productService';
import { RootStackParamList } from '../navigation/types';

export default function SellerDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused(); // ✅ Detects when screen is focused
  const user = useAppStore(state => state.user);
  
  const [stats, setStats] = useState({ totalSales: 0, ordersReceived: 0, activeListings: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const sellerId = user.uid;
      const orders = await getSellerOrders(sellerId);
      const products = await getSellerProducts(sellerId);

      setStats({
        totalSales: orders.filter((o: any) => o.status === 'delivered').reduce((acc: number, curr: any) => acc + (curr.totalAmount || 0), 0),
        ordersReceived: orders.length,
        activeListings: products.length
      });
    } catch (error) {
      console.error('Error loading seller data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // ✅ Refresh data whenever the screen comes into focus
  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, loadData]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      Alert.alert('Error', 'Logout failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{flexDirection:'row', alignItems:'center'}}>
            <View style={styles.iconBox}><Text style={{color:'#fff', fontWeight:'bold'}}>S</Text></View>
            <View style={{marginLeft: 12}}>
              <Text style={styles.headerTitle}>Seller Console</Text>
              <Text style={styles.subText}>Active Vendor</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={{color:'white', fontSize:12, fontWeight:'bold'}}>Logout</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.welcomeText}>Welcome, {user?.companyName || 'Seller'}</Text>
        <Text style={{color: '#BFDBFE'}}>GST: {user?.gstNumber || 'N/A'}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Sales</Text>
            <Text style={styles.cardValue}>₹{stats.totalSales}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Orders</Text>
            <Text style={styles.cardValue}>{stats.ordersReceived}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Listings</Text>
            <Text style={styles.cardValue}>{stats.activeListings}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Rating</Text>
            <Text style={styles.cardValue}>4.8</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operations</Text>
          <View style={styles.row}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#10B981', marginRight: 8 }]}
              onPress={() => navigation.navigate('AddChemical')}
            >
              <Text style={styles.btnIcon}>➕</Text>
              <Text style={styles.btnText}>Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#3B82F6', marginLeft: 8 }]}
              onPress={() => navigation.navigate('ManageChemicals')}
            >
              <Text style={styles.btnIcon}>📋</Text>
              <Text style={styles.btnText}>Manage All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && <ActivityIndicator size="large" color="#004AAD" style={{marginTop: 20}} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#004AAD', padding: 24, borderBottomRightRadius: 30, borderBottomLeftRadius: 30, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  subText: { color: '#BFDBFE', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  welcomeText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  content: { padding: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  card: { width: '48%', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2 },
  cardLabel: { color: '#6B7280', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  cardValue: { color: '#111827', fontSize: 24, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  row: { flexDirection: 'row' },
  actionBtn: { flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  btnIcon: { fontSize: 24, marginBottom: 8 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});