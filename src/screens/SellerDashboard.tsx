import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Text, Card, ActivityIndicator, Button, useTheme, Avatar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { logoutUser } from '../services/authService';

const { width } = Dimensions.get('window');

export default function SellerDashboard() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAppStore();
  
  const [stats, setStats] = useState({ 
    activeOrders: 0, 
    totalProducts: 0, 
    totalRevenue: 0 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadSellerStats();
  }, [user]);

  const loadSellerStats = async () => {
    if (!user) return;
    try {
      // 1. Count My Products
      const productsQ = query(collection(db, 'products'), where('sellerId', '==', user.uid));
      const productsSnap = await getDocs(productsQ);
      
      // 2. Count My Active Orders & Revenue
      const ordersQ = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
      const ordersSnap = await getDocs(ordersQ);

      let revenue = 0;
      let activeCount = 0;

      ordersSnap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'delivered') {
          revenue += data.totalAmount || 0;
        }
        if (['PENDING_SELLER', 'PENDING_ADMIN', 'ACCEPTED', 'shipped'].includes(data.status)) {
          activeCount++;
        }
      });

      setStats({
        totalProducts: productsSnap.size,
        activeOrders: activeCount,
        totalRevenue: revenue
      });

    } catch (error) {
      console.error("Failed to load seller stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{flex: 1}}>
          <Text variant="headlineSmall" style={{color:'white', fontWeight:'bold'}}>Dashboard</Text>
          <Text style={{color:'rgba(255,255,255,0.8)', fontSize: 12}} numberOfLines={1}>
            {user?.companyName || 'My Company'}
          </Text>
        </View>
        
        {/* ✅ ADDED: Notification Icon + Logout */}
        <View style={{flexDirection:'row', alignItems:'center'}}>
            <IconButton 
              icon="bell" 
              iconColor="white" 
              size={24}
              onPress={() => navigation.navigate('Notifications')} 
            />
            <IconButton 
              icon="logout" 
              iconColor="white" 
              size={24}
              onPress={logoutUser} 
            />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Overview</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#004AAD" style={{marginVertical: 20}} />
        ) : (
          <View style={styles.grid}>
            {/* Active Orders Card */}
            <Card style={styles.card} onPress={() => navigation.navigate('Orders')}>
              <Card.Content style={{alignItems:'center'}}>
                <Text variant="displayMedium" style={{color: '#E65100', fontWeight:'bold'}}>{stats.activeOrders}</Text>
                <Text variant="bodySmall" style={{textAlign:'center'}}>Active Orders</Text>
              </Card.Content>
            </Card>

            {/* Listings Card */}
            <Card style={styles.card} onPress={() => navigation.navigate('MyListings')}>
              <Card.Content style={{alignItems:'center'}}>
                <Text variant="displayMedium" style={{color: '#004AAD', fontWeight:'bold'}}>{stats.totalProducts}</Text>
                <Text variant="bodySmall" style={{textAlign:'center'}}>Live Listings</Text>
              </Card.Content>
            </Card>

            {/* Revenue Card (Full Width) */}
            <Card style={[styles.card, {width: '100%'}]}>
              <Card.Title 
                title="Total Earnings" 
                titleStyle={{fontWeight:'bold', fontSize: 16}}
                left={(props) => <Avatar.Icon {...props} icon="cash" style={{backgroundColor:'#E8F5E9'}} color="#2E7D32" size={40} />} 
              />
              <Card.Content>
                 <Text variant="headlineMedium" style={{color: '#2E7D32', fontWeight:'bold', marginTop: 5}}>
                   ₹{stats.totalRevenue.toLocaleString()}
                 </Text>
                 <Text variant="bodySmall" style={{color:'#666'}}>Lifetime revenue</Text>
              </Card.Content>
            </Card>
          </View>
        )}

        <Text variant="titleMedium" style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.actionGrid}>
           {/* Add Chemical -> Direct to Add Screen */}
           <Card 
             style={[styles.actionCard, {backgroundColor:'#F8FAFC'}]}
             onPress={() => navigation.navigate('AddChemical')} 
             mode="elevated"
           >
              <Card.Content style={styles.actionContent}>
                 <Avatar.Icon icon="flask-plus" size={48} style={{backgroundColor:'#E3F2FD', marginBottom: 10}} color="#004AAD" />
                 <Text variant="titleMedium" style={{fontWeight:'bold'}}>Add Chemical</Text>
                 <Text variant="bodySmall" style={{color:'#666', textAlign:'center', marginTop: 4}}>Post new stock</Text>
              </Card.Content>
           </Card>

           {/* Pending Orders -> Direct to Orders Screen */}
           <Card 
             style={[styles.actionCard, {backgroundColor:'#F8FAFC'}]}
             onPress={() => navigation.navigate('Orders')}
             mode="elevated"
           >
              <Card.Content style={styles.actionContent}>
                 <Avatar.Icon icon="clipboard-alert" size={48} style={{backgroundColor:'#FFF3E0', marginBottom: 10}} color="#E65100" />
                 <Text variant="titleMedium" style={{fontWeight:'bold'}}>Pending Orders</Text>
                 <Text variant="bodySmall" style={{color:'#666', textAlign:'center', marginTop: 4}}>Review requests</Text>
              </Card.Content>
           </Card>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: '#004AAD', 
    padding: 20, 
    flexDirection:'row', 
    justifyContent:'space-between', 
    alignItems:'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4
  },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { marginTop: 20, marginBottom: 12, fontWeight:'bold', color: '#334155' },
  grid: { flexDirection: 'row', gap: 12, flexWrap:'wrap', justifyContent: 'space-between' },
  card: { 
    width: (width / 2) - 24, // Responsive 2-column layout 
    marginBottom: 4, 
    backgroundColor:'white', 
    elevation: 2,
    borderRadius: 12
  },
  actionGrid: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, elevation: 3, borderRadius: 16 },
  actionContent: { alignItems:'center', paddingVertical: 20 }
});