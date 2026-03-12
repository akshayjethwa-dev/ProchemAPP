import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, ActivityIndicator, Button, useTheme, IconButton, Badge } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getAdminStats } from '../../services/adminService';
import { logoutUser } from '../../services/authService';
import { collection, query, onSnapshot, where } from 'firebase/firestore'; 
import { db } from '../../config/firebase';

export default function AdminDashboard() {
  const theme = useTheme();
  const navigation = useNavigation<any>(); 
  const [stats, setStats] = useState({ totalUsers: 0, totalProducts: 0, totalOrders: 0 });
  const [loading, setLoading] = useState(true);
  
  // State for unread custom requirements
  const [pendingLeads, setPendingLeads] = useState(0); 

  useEffect(() => {
    loadStats();

    // Real-time listener for pending custom requirements
    const qLeads = query(collection(db, 'custom_requirements'), where('status', '==', 'PENDING'));
    const unsubLeads = onSnapshot(qLeads, (snap) => {
      setPendingLeads(snap.size);
    });

    return () => {
      unsubLeads(); // Cleanup listener on unmount
    };
  }, []);

  const loadStats = async () => {
    try {
      const data = await getAdminStats();
      if (data) setStats(data);
    } catch (error) {
      console.error("Failed to load admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{color:'white', fontWeight:'bold'}}>Admin Console</Text>
        <Button 
          mode="text" 
          compact={true} 
          textColor="white" 
          onPress={logoutUser}
        >
          Logout
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="titleMedium" style={{marginBottom: 10, fontWeight:'bold'}}>Platform Overview</Text>
        
        {loading ? <ActivityIndicator size="large" color={theme.colors.primary} /> : (
          <View style={styles.grid}>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="displaySmall" style={{color: theme.colors.primary, fontWeight:'bold'}}>{stats.totalUsers}</Text>
                <Text variant="bodySmall">Registered Users</Text>
              </Card.Content>
            </Card>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="displaySmall" style={{color: '#E65100', fontWeight:'bold'}}>{stats.totalProducts}</Text>
                <Text variant="bodySmall">Total Listings</Text>
              </Card.Content>
            </Card>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="displaySmall" style={{color: '#2E7D32', fontWeight:'bold'}}>{stats.totalOrders}</Text>
                <Text variant="bodySmall">Total Orders</Text>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Lead Management Section */}
        <Text variant="titleMedium" style={{marginTop: 20, marginBottom: 10, fontWeight:'bold'}}>Lead Management</Text>
        
        <Card 
          style={{marginBottom: 12, backgroundColor: 'white'}} 
          onPress={() => navigation.navigate('AdminCustomRequirements')}
        >
          <Card.Title 
            title={
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <Text style={{fontSize: 16, fontWeight: 'bold'}}>Custom Requirements</Text>
                 {pendingLeads > 0 && (
                    <Badge style={{backgroundColor: '#EF4444', marginLeft: 8}} size={22}>
                      {/* ✅ FIXED: Passed as a single template literal string */}
                      {`${pendingLeads} New`}
                    </Badge>
                 )}
               </View>
            }
            subtitle="View chemicals requested by buyers" 
            left={(props) => <IconButton icon="clipboard-text-search-outline" iconColor="#EA580C" size={28} />}
            right={(props) => <IconButton icon="chevron-right" {...props} />}
          />
        </Card>

        {/* Finance & Actions Section */}
        <Text variant="titleMedium" style={{marginTop: 20, marginBottom: 10, fontWeight:'bold'}}>Finance & Actions</Text>
        
        <Card 
          style={{marginBottom: 12, backgroundColor: 'white'}} 
          onPress={() => navigation.navigate('Payments')} 
        >
          <Card.Title 
            title="Seller Payouts" 
            subtitle="Manage pending payments and release funds" 
            left={(props) => <IconButton icon="cash-multiple" iconColor={theme.colors.primary} size={28} />}
            right={(props) => <IconButton icon="chevron-right" {...props} />}
          />
        </Card>

        {/* Quick Actions */}
        <Text variant="titleMedium" style={{marginTop: 20, marginBottom: 10, fontWeight:'bold'}}>Quick Actions</Text>
        <Card style={{marginBottom: 20}} onPress={() => navigation.navigate('SendNotification')}>
          <Card.Title 
            title="Send Broadcast Notification" 
            subtitle="Send alerts or promos to all users"
            left={(props) => <Button icon="bell-ring" mode="contained" onPress={() => navigation.navigate('SendNotification')}>Send</Button>}
          />
        </Card>

        <Text variant="titleMedium" style={{marginBottom: 10, fontWeight:'bold'}}>System Health</Text>
        <Card style={{backgroundColor:'#E3F2FD'}}>
          <Card.Title 
            title="GST API Status" 
            subtitle="Operational • Latency 120ms" 
            left={(props) => <Text style={{fontSize:24}}>🟢</Text>} 
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#1E293B', padding: 20, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  content: { padding: 16 },
  grid: { flexDirection: 'row', gap: 10, flexWrap:'wrap' },
  card: { flex: 1, minWidth: '45%', marginBottom: 10 }
});