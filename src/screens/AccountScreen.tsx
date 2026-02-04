import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Linking, TouchableOpacity, Modal, ActivityIndicator, Dimensions } from 'react-native';
import { Text, Avatar, List, Divider, Button, Chip, useTheme, Card, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { logoutUser } from '../services/authService';

const { width } = Dimensions.get('window');

export default function AccountScreen() {
  const navigation = useNavigation<any>();
  const { user, viewMode, setViewMode } = useAppStore();
  const theme = useTheme();
  
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSupport = () => {
    Linking.openURL('mailto:support@prochem.com?subject=Support Request');
  };

  const initiateSwitch = () => {
    setShowSwitchModal(true);
  };

  const confirmSwitch = () => {
    setShowSwitchModal(false);
    setSwitching(true);

    const targetMode = viewMode === 'buyer' ? 'seller' : 'buyer';
    
    setTimeout(() => {
      console.log("Switching to:", targetMode);
      setViewMode(targetMode);
      setSwitching(false);
    }, 800);
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 1. CONFIRMATION MODAL */}
      <Modal transparent visible={showSwitchModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
               <Avatar.Icon 
                  size={50} 
                  icon="swap-horizontal" 
                  style={{backgroundColor: '#E3F2FD', marginBottom: 15}} 
                  color="#004AAD"
               />
               <Text variant="titleLarge" style={{fontWeight:'bold', textAlign:'center'}}>
                 Switch to {viewMode === 'buyer' ? 'Selling' : 'Buying'}?
               </Text>
            </View>
            
            <Text style={styles.modalBody}>
              {viewMode === 'buyer' 
                ? 'You will be moved to the Seller Dashboard to manage your inventory and orders.' 
                : 'You will be moved to the Marketplace to browse chemicals and make purchases.'}
            </Text>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setShowSwitchModal(false)} style={{flex:1, marginRight:10}}>
                Cancel
              </Button>
              <Button mode="contained" onPress={confirmSwitch} style={{flex:1}}>
                Switch
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. LOADING SPINNER OVERLAY */}
      <Modal transparent visible={switching}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {alignItems:'center', paddingVertical: 40}]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{marginTop:20, fontWeight:'bold', fontSize: 16}}>Switching Mode...</Text>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={false}>
        
        {/* PROFILE HEADER */}
        <View style={styles.header}>
          <Avatar.Text 
            size={70} 
            label={user?.companyName?.[0]?.toUpperCase() || "U"} 
            style={{backgroundColor: theme.colors.primary, elevation: 5}} 
            color='white'
          />
          <View style={{marginLeft: 20, flex:1, justifyContent:'center'}}>
            <Text variant="titleLarge" style={{fontWeight:'bold', marginBottom: 4}} numberOfLines={1}>
              {user?.companyName || "Business User"}
            </Text>
            <Text style={{color:'#64748B', fontSize:14, marginBottom: 8}}>{user?.email}</Text>
            
            <View style={{flexDirection:'row'}}>
              <Chip 
                icon={user?.verified ? "check-decagram" : "clock-outline"} 
                compact 
                textStyle={{fontSize:11, fontWeight:'600'}} 
                style={{backgroundColor: user?.verified ? '#DCFCE7' : '#FFF7ED', height: 28}}
              >
                {user?.verified ? 'Verified Business' : 'Verification Pending'}
              </Chip>
            </View>
          </View>
        </View>

        <Divider style={{height: 1, backgroundColor:'#E2E8F0', marginVertical: 10}} />

        {/* SWITCH MODE CARD */}
        <View style={{paddingHorizontal: 20, marginVertical: 15}}>
          <TouchableOpacity onPress={initiateSwitch} activeOpacity={0.9}>
            <Card style={[styles.switchCard, {
              backgroundColor: viewMode === 'buyer' ? '#FFF8E1' : '#E3F2FD',
              borderColor: viewMode === 'buyer' ? '#FFB74D' : '#64B5F6',
            }]}>
              <View style={styles.switchContent}>
                <Avatar.Icon 
                  icon={viewMode === 'buyer' ? "store-cog" : "shopping"} 
                  size={46} 
                  style={{backgroundColor: 'white'}} 
                  color={viewMode === 'buyer' ? '#E65100' : '#0D47A1'} 
                />
                <View style={{flex:1, marginLeft: 15}}>
                  <Text style={{
                    fontWeight: 'bold', 
                    fontSize: 16,
                    color: viewMode === 'buyer' ? '#E65100' : '#0D47A1'
                  }}>
                    {viewMode === 'buyer' ? "Switch to Seller Mode" : "Switch to Buyer Mode"}
                  </Text>
                  <Text style={{fontSize: 12, color: '#555', marginTop: 2}}>
                    {viewMode === 'buyer' ? "Manage Products & Orders" : "Browse Marketplace"}
                  </Text>
                </View>
                <IconButton icon="chevron-right" iconColor={viewMode === 'buyer' ? '#E65100' : '#0D47A1'} />
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        <Divider style={{height: 8, backgroundColor:'#F1F5F9'}} />

        {/* MENU OPTIONS */}
        <List.Section style={styles.listSection}>
          <List.Subheader style={styles.subheader}>BUSINESS SETTINGS</List.Subheader>
          
          <List.Item 
            title="Business Profile"
            description="Edit Name, GST, Address" 
            left={() => <List.Icon icon="briefcase-outline" color="#64748B" />}
            right={() => <List.Icon icon="chevron-right" color="#CBD5E1" />} 
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.listItem}
          />
          <Divider style={{marginLeft: 60}} />

          {/* ✅ FIX: Navigate to AddressList instead of EditProfile */}
          <List.Item 
            title="Manage Address" 
            left={() => <List.Icon icon="map-marker-outline" color="#64748B" />} 
            right={() => <List.Icon icon="chevron-right" color="#CBD5E1" />} 
            onPress={() => navigation.navigate('AddressList')} 
            style={styles.listItem}
          />
          <Divider style={{marginLeft: 60}} />

           <List.Item 
            title="KYC Documents" 
            left={() => <List.Icon icon="file-document-outline" color="#64748B" />}
            right={() => <List.Icon icon="chevron-right" color="#CBD5E1" />} 
            onPress={() => alert('KYC Feature coming soon')}
            style={styles.listItem}
          />
        </List.Section>

        <Divider style={{height: 8, backgroundColor:'#F1F5F9'}} />

        <List.Section style={styles.listSection}>
          <List.Subheader style={styles.subheader}>SUPPORT & LEGAL</List.Subheader>
          <List.Item 
            title="Help Center" 
            left={() => <List.Icon icon="headset" color="#64748B" />} 
            right={() => <List.Icon icon="chevron-right" color="#CBD5E1" />} 
            onPress={handleSupport}
            style={styles.listItem}
          />
          <Divider style={{marginLeft: 60}} />

          <List.Item 
            title="Returns & Refunds" 
            left={() => <List.Icon icon="refresh" color="#64748B" />}
            right={() => <List.Icon icon="chevron-right" color="#CBD5E1" />} 
            onPress={() => navigation.navigate('LegalPages')}
            style={styles.listItem}
          />
          <Divider style={{marginLeft: 60}} />

          <List.Item 
            title="Terms of Service" 
            left={() => <List.Icon icon="file-sign" color="#64748B" />} 
            right={() => <List.Icon icon="chevron-right" color="#CBD5E1" />} 
            onPress={() => navigation.navigate('LegalPages')}
            style={styles.listItem}
          />
        </List.Section>

        {/* LOGOUT BUTTON */}
        <View style={{padding: 20, marginTop: 10}}>
          <Button 
            mode="outlined" 
            textColor="#EF5350" 
            style={{borderColor: '#EF5350', borderRadius: 8, borderWidth: 1}}
            contentStyle={{height: 48}}
            icon="logout" 
            onPress={logoutUser}
          >
            Sign Out
          </Button>
          <Text style={{textAlign:'center', color:'#94A3B8', marginTop: 15, fontSize: 12}}>
            App Version 1.0.0
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { padding: 24, flexDirection: 'row', alignItems: 'center' },
  switchCard: { borderWidth: 1, borderRadius: 16, elevation: 2 },
  switchContent: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  listSection: { backgroundColor: 'white' },
  subheader: { color: '#94A3B8', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  listItem: { paddingVertical: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 20, width: '100%', maxWidth: 360, elevation: 10 },
  modalHeader: { alignItems: 'center', marginBottom: 10 },
  modalBody: { textAlign: 'center', color: '#64748B', marginBottom: 25, lineHeight: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' }
});