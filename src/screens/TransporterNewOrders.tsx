import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton, Button, Card, Chip, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// Mock Data
const orders = [
  { id: '1', material: 'Industrial Acid', weight: '500 KG', payout: 2500, pickup: 'GIDC Vatva, Ahmedabad', drop: 'Sanand, Gujarat', status: 'PENDING' },
  { id: '2', material: 'Solvent Drums', weight: '2 TON', payout: 12000, pickup: 'Mumbai Port', drop: 'Pune Industrial Area', status: 'PENDING' }
];

export default function TransporterNewOrders() {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  const handleAccept = (order: any) => {
    // Navigate to Trip Screen with this order
    navigation.navigate('Trip', { order });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{fontWeight:'bold'}}>New Load Requests</Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 16}}>
        {orders.map((o) => (
          <Card key={o.id} style={styles.card}>
            <Card.Content>
              {/* Top Row */}
              <View style={styles.rowBetween}>
                <View>
                  <Text variant="titleMedium" style={{fontWeight:'bold'}}>{o.material}</Text>
                  <Text style={styles.label}>WEIGHT: {o.weight}</Text>
                </View>
                <Text variant="titleLarge" style={{fontWeight:'bold', color: theme.colors.primary}}>
                  ₹{o.payout.toLocaleString()}
                </Text>
              </View>

              {/* Timeline Route */}
              <View style={styles.timeline}>
                <View style={styles.timelineLine} />
                <View style={styles.timelineItem}>
                  <View style={[styles.dot, {backgroundColor: '#2196F3'}]} />
                  <View>
                    <Text style={styles.tinyLabel}>PICKUP LOCATION</Text>
                    <Text style={styles.locationText}>{o.pickup}</Text>
                  </View>
                </View>
                <View style={[styles.timelineItem, {marginTop: 20}]}>
                  <View style={[styles.dot, {backgroundColor: '#4CAF50'}]} />
                  <View>
                    <Text style={styles.tinyLabel}>DROP LOCATION</Text>
                    <Text style={styles.locationText}>{o.drop}</Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionRow}>
                <Button 
                  mode="contained" 
                  style={{flex:1, marginRight: 8, backgroundColor: '#4CAF50'}}
                  onPress={() => handleAccept(o)}
                >
                  Accept Order
                </Button>
                <Button 
                  mode="contained" 
                  buttonColor="#F3F4F6" 
                  textColor="#666" 
                  style={{flex:1, marginLeft: 8}}
                >
                  Reject
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: 'white', elevation: 2 },
  card: { marginBottom: 16, backgroundColor: 'white', borderRadius: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: 10, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginTop: 4 },
  tinyLabel: { fontSize: 8, fontWeight: 'bold', color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 },
  locationText: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  timeline: { marginVertical: 20, paddingLeft: 10 },
  timelineLine: { position: 'absolute', left: 16, top: 10, bottom: 10, width: 2, backgroundColor: '#F0F0F0' },
  timelineItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: 'white', marginRight: 12, elevation: 2 },
  actionRow: { flexDirection: 'row', marginTop: 10 }
});