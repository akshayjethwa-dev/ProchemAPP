import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, Avatar, IconButton, Chip, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { logoutUser } from '../services/authService';

export default function TransporterDashboard() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { user } = useAppStore();
  
  // Mock Data for "Assigned Jobs" (Active Deliveries)
  const [jobs, setJobs] = useState([
    { id: '1', from: 'Mumbai (Prochem)', to: 'Pune (ABC Corp)', status: 'Ready for Pickup', price: '₹2,500', cargo: 'Industrial Acid (500kg)' },
    { id: '2', from: 'GIDC Gujarat', to: 'Rajasthan', status: 'In Transit', price: '₹12,000', cargo: 'Solvents (2 Ton)' }
  ]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection:'row', alignItems:'center'}}>
          <Avatar.Text size={45} label="T" style={{backgroundColor:'white'}} color={theme.colors.primary} />
          <View style={{marginLeft: 12}}>
            <Text style={{color:'rgba(255,255,255,0.8)', fontSize:12}}>Transporter</Text>
            <Text variant="titleMedium" style={{color:'white', fontWeight:'bold'}}>{user?.companyName || 'Logistics Partner'}</Text>
          </View>
        </View>
        <IconButton icon="logout" iconColor="white" onPress={logoutUser} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content style={{alignItems:'center'}}>
              <Text variant="displaySmall" style={{fontWeight:'bold', color: theme.colors.primary}}>2</Text>
              <Text variant="bodySmall" style={{color:'#666'}}>Active Trips</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={{alignItems:'center'}}>
              <Text variant="displaySmall" style={{fontWeight:'bold', color: '#2E7D32'}}>₹14k</Text>
              <Text variant="bodySmall" style={{color:'#666'}}>Today's Earnings</Text>
            </Card.Content>
          </Card>
        </View>

        {/* ✅ NEW: Button to Find New Loads */}
        <Button 
          mode="contained" 
          icon="magnify" 
          onPress={() => navigation.navigate('NewOrders')} 
          style={{marginTop: 20, borderRadius: 8}}
          contentStyle={{height: 50}}
        >
          Find New Loads
        </Button>

        <Text variant="titleMedium" style={{fontWeight:'bold', marginTop: 20, marginBottom: 10}}>
          Assigned Shipments
        </Text>

        {jobs.map((job) => (
          <Card key={job.id} style={styles.jobCard}>
            <Card.Content>
              <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 8}}>
                <Chip icon="truck" compact style={{backgroundColor:'#E3F2FD'}}>{job.status}</Chip>
                <Text style={{fontWeight:'bold', color:'#2E7D32'}}>{job.price}</Text>
              </View>
              
              <View style={styles.routeRow}>
                <View style={{alignItems:'center'}}>
                  <View style={styles.dot} />
                  <View style={styles.line} />
                  <View style={[styles.dot, {backgroundColor: theme.colors.primary}]} />
                </View>
                <View style={{flex:1, marginLeft: 10, height: 60, justifyContent:'space-between'}}>
                  <View>
                    <Text variant="labelSmall" style={{color:'#888'}}>PICKUP</Text>
                    <Text style={{fontWeight:'bold'}}>{job.from}</Text>
                  </View>
                  <View>
                    <Text variant="labelSmall" style={{color:'#888'}}>DROP</Text>
                    <Text style={{fontWeight:'bold'}}>{job.to}</Text>
                  </View>
                </View>
              </View>

              <View style={{marginTop: 12, paddingTop: 12, borderTopWidth:1, borderTopColor:'#f0f0f0'}}>
                 <Text style={{color:'#666', fontSize:12}}>📦 {job.cargo}</Text>
              </View>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" compact style={{width:'100%'}} onPress={() => alert('Tracking coming soon')}>
                Update Status
              </Button>
            </Card.Actions>
          </Card>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#1E293B', padding: 20, flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  content: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: -10 },
  statCard: { flex: 1, elevation: 2 },
  jobCard: { marginBottom: 16, backgroundColor: 'white', elevation: 2 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#888' },
  line: { width: 2, height: 35, backgroundColor: '#ddd', marginLeft: 4, marginVertical: 2 }
});