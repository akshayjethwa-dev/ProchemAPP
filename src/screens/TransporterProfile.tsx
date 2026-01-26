import React from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, Avatar, List, Divider, Button, Switch, useTheme, Card, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';
import { logoutUser } from '../services/authService';

export default function TransporterProfile() {
  const { user } = useAppStore();
  const theme = useTheme();
  const [isOnline, setIsOnline] = React.useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{paddingBottom: 40}}>
        
        {/* Header Profile Card */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <Avatar.Text size={70} label="T" style={{backgroundColor: '#FFC107'}} color="black" />
            <View style={{marginLeft: 16, flex:1}}>
              <Text variant="headlineSmall" style={{fontWeight:'bold', color:'white'}}>
                {user?.companyName || 'Transporter'}
              </Text>
              <Text style={{color:'rgba(255,255,255,0.7)'}}>ID: {user?.uid.slice(0,6).toUpperCase()}</Text>
              <View style={styles.badge}>
                <Text style={{fontSize:10, fontWeight:'bold', color:'black'}}>✅ Verified Partner</Text>
              </View>
            </View>
            <IconButton icon="pencil" iconColor="white" onPress={() => Alert.alert('Edit', 'Edit Profile')} />
          </View>

          {/* Online Status Toggle */}
          <View style={styles.statusCard}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
              <View style={[styles.dot, {backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E'}]} />
              <Text style={{marginLeft: 8, fontWeight:'bold', color: isOnline ? '#4CAF50' : '#666'}}>
                {isOnline ? 'You are Online' : 'You are Offline'}
              </Text>
            </View>
            <Switch value={isOnline} onValueChange={setIsOnline} color="#4CAF50" />
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuContainer}>
          <List.Section>
            <List.Subheader>Fleet Management</List.Subheader>
            <List.Item 
              title="My Vehicles" 
              description="Manage trucks and documents"
              left={() => <List.Icon icon="truck" color="#004AAD" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => {}}
              style={styles.listItem}
            />
            <List.Item 
              title="Drivers" 
              description="Manage driver profiles"
              left={() => <List.Icon icon="card-account-details" color="#004AAD" />}
              right={() => <List.Icon icon="chevron-right" />}
              style={styles.listItem}
            />
          </List.Section>

          <Divider style={{marginVertical: 10}} />

          <List.Section>
            <List.Subheader>Earnings & Legal</List.Subheader>
            <List.Item 
              title="Bank Account" 
              description="**** 8892"
              left={() => <List.Icon icon="bank" color="#004AAD" />}
              right={() => <List.Icon icon="chevron-right" />}
              style={styles.listItem}
            />
            <List.Item 
              title="Trip History" 
              left={() => <List.Icon icon="history" color="#004AAD" />}
              right={() => <List.Icon icon="chevron-right" />}
              style={styles.listItem}
            />
             <List.Item 
              title="Terms & Conditions" 
              left={() => <List.Icon icon="file-document" color="#666" />}
              right={() => <List.Icon icon="chevron-right" />}
              style={styles.listItem}
            />
          </List.Section>
        </View>

        <View style={{padding: 20}}>
          <Button mode="outlined" textColor="#D32F2F" icon="logout" onPress={logoutUser} style={{borderColor: '#D32F2F'}}>
            Logout
          </Button>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#1E293B', padding: 24, paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  badge: { backgroundColor: '#FFC107', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf:'flex-start', marginTop: 6 },
  statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, elevation: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  menuContainer: { padding: 16, marginTop: 10 },
  listItem: { backgroundColor: 'white', marginBottom: 8, borderRadius: 12 }
});