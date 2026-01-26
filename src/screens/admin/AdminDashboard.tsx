import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, ActivityIndicator, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAdminStats } from '../../services/adminService';
import { logoutUser } from '../../services/authService';

export default function AdminDashboard() {
  const theme = useTheme();
  const [stats, setStats] = useState({ totalUsers: 0, totalProducts: 0, totalOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
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
        
        {/* ✅ FIX: 'compact' is a boolean prop, 'mode' must be text/outlined/contained */}
        <Button 
          mode="text" 
          compact={true} 
          textColor="white" 
          onPress={logoutUser}
        >
          Logout
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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

        <Text variant="titleMedium" style={{marginTop: 20, marginBottom: 10, fontWeight:'bold'}}>System Health</Text>
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