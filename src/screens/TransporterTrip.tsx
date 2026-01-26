import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Text, IconButton, Button, Card, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function TransporterTrip() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const theme = useTheme();
  
  // Get order data passed from "New Orders"
  const order = route.params?.order || {
    material: 'Unknown Load', 
    payout: 0, 
    drop: 'Destination'
  };

  const [step, setStep] = useState<'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED'>('ACCEPTED');

  return (
    <View style={styles.container}>
      {/* 1. Map Simulation Area */}
      <View style={styles.mapArea}>
        {/* Placeholder for Map Background */}
        <ImageBackground 
          source={{uri: 'https://www.transparenttextures.com/patterns/gray-geology.png'}} // Use a local map image if available
          style={styles.mapBackground}
          imageStyle={{opacity: 0.1}}
        >
           {/* Top Back Button */}
           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
             <IconButton icon="arrow-left" iconColor="white" />
           </TouchableOpacity>

           {/* Vehicle Marker */}
           <View style={styles.markerContainer}>
             <View style={styles.pulseRing} />
             <View style={styles.vehicleDot}>
                <IconButton icon="truck-fast" iconColor="white" size={20} />
             </View>
             <View style={styles.gpsBadge}>
               <Text style={styles.gpsText}>GPS CONNECTED • LIVE</Text>
             </View>
           </View>

           {/* HUD Stats */}
           <View style={styles.hudContainer}>
             <View style={styles.hudBox}>
               <Text style={styles.hudLabel}>DISTANCE</Text>
               <Text style={styles.hudValue}>14.2 KM</Text>
             </View>
             <View style={styles.hudBox}>
               <Text style={styles.hudLabel}>ETA</Text>
               <Text style={styles.hudValue}>28 MIN</Text>
             </View>
           </View>
        </ImageBackground>
      </View>

      {/* 2. Control Panel (Bottom Sheet style) */}
      <View style={styles.controlPanel}>
        <View style={styles.handle} />
        
        <View style={styles.rowBetween}>
          <View>
            <Text variant="headlineSmall" style={{fontWeight:'bold'}}>{order.material}</Text>
            <View style={{flexDirection:'row', alignItems:'center', marginTop: 4}}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>DESTINATION: {order.drop}</Text>
            </View>
          </View>
          <View style={{alignItems:'flex-end'}}>
            <Text variant="headlineSmall" style={{color: theme.colors.primary, fontWeight:'bold'}}>
              ₹{order.payout.toLocaleString()}
            </Text>
            <Text style={styles.tinyLabel}>PAYOUT</Text>
          </View>
        </View>

        <View style={{marginTop: 30}}>
          {step === 'ACCEPTED' && (
            <Button mode="contained" onPress={() => setStep('PICKED_UP')} style={styles.actionBtn} contentStyle={{height: 60}}>
              🏗️  Pickup Completed
            </Button>
          )}
          {step === 'PICKED_UP' && (
            <Button mode="contained" onPress={() => setStep('IN_TRANSIT')} style={styles.actionBtn} contentStyle={{height: 60}}>
              🛣️  Start Delivery
            </Button>
          )}
          {step === 'IN_TRANSIT' && (
            <Button mode="contained" buttonColor="#4CAF50" onPress={() => setStep('DELIVERED')} style={styles.actionBtn} contentStyle={{height: 60}}>
              🏁  Confirm Delivery
            </Button>
          )}
          {step === 'DELIVERED' && (
            <View style={{alignItems:'center'}}>
              <Card style={{backgroundColor:'#E8F5E9', width:'100%', marginBottom: 20}}>
                <Card.Content style={{flexDirection:'row', alignItems:'center'}}>
                   <IconButton icon="camera" iconColor="#2E7D32" size={30} />
                   <View>
                     <Text style={{fontWeight:'bold', color:'#2E7D32'}}>Proof of Delivery</Text>
                     <Text style={{fontSize:12, color:'#2E7D32'}}>Photo & Signature Captured</Text>
                   </View>
                </Card.Content>
              </Card>
              <Button mode="contained" buttonColor="black" onPress={() => navigation.goBack()} style={{width:'100%'}} contentStyle={{height: 50}}>
                Close Trip
              </Button>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E293B' },
  mapArea: { flex: 1, backgroundColor: '#334155' },
  mapBackground: { flex: 1, justifyContent:'center', alignItems:'center' },
  backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 30 },
  markerContainer: { alignItems:'center', justifyContent:'center' },
  pulseRing: { position:'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0, 74, 173, 0.3)' },
  vehicleDot: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#004AAD', alignItems:'center', justifyContent:'center', borderWidth:4, borderColor:'white', elevation: 10 },
  gpsBadge: { marginTop: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  gpsText: { color:'white', fontSize: 10, fontWeight:'bold' },
  hudContainer: { position: 'absolute', bottom: 40, flexDirection:'row', width:'100%', justifyContent:'space-between', paddingHorizontal: 20 },
  hudBox: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 10, minWidth: 80, alignItems:'center' },
  hudLabel: { color:'#aaa', fontSize: 8, fontWeight:'bold' },
  hudValue: { color:'white', fontSize: 16, fontWeight:'bold' },
  
  controlPanel: { backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, paddingBottom: 50, marginTop: -30 },
  handle: { width: 50, height: 5, backgroundColor: '#E0E0E0', borderRadius: 5, alignSelf:'center', marginBottom: 20 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 6 },
  statusText: { fontSize: 10, color: '#666', fontWeight:'bold' },
  tinyLabel: { fontSize: 9, color: '#999', fontWeight:'bold', textTransform:'uppercase' },
  actionBtn: { borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 }
});