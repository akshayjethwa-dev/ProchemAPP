import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Linking, TouchableOpacity, Modal, ActivityIndicator, Platform } from 'react-native';
import { Text, Avatar, List, Divider, Button, Chip, useTheme, Card, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { logoutUser } from '../services/authService';

export default function AccountScreen() {
  const navigation = useNavigation<any>();
  const { user, viewMode, setViewMode } = useAppStore();
  const theme = useTheme();
  
  // State for Switch Confirmation Modal
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSupport = () => {
    Linking.openURL('mailto:support@prochem.com?subject=Support Request');
  };

  const initiateSwitch = () => {
    // Open the custom modal (works on Web & Mobile)
    setShowSwitchModal(true);
  };

  const confirmSwitch = () => {
    setShowSwitchModal(false);
    setSwitching(true); // Show loading spinner

    const targetMode = viewMode === 'buyer' ? 'seller' : 'buyer';
    
    // Small delay to let the loading spinner render
    setTimeout(() => {
      console.log("Switching to:", targetMode);
      setViewMode(targetMode);
      // switching state will be reset when the entire app reloads into new mode
    }, 500);
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'white'}}>
      
      {/* 1. CONFIRMATION MODAL (Works on Web & Mobile) */}
      <Modal transparent visible={showSwitchModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="titleLarge" style={{fontWeight:'bold', marginBottom:10}}>
              Switch to {viewMode === 'buyer' ? 'Selling' : 'Buying'}?
            </Text>
            <Text style={{marginBottom: 20, color:'#666'}}>
              {viewMode === 'buyer' 
                ? 'Go to Seller Dashboard to manage your products and orders.' 
                : 'Go to Buyer Marketplace to browse and purchase items.'}
            </Text>
            <View style={{flexDirection:'row', justifyContent:'flex-end', gap: 10}}>
              <Button mode="text" onPress={() => setShowSwitchModal(false)}>Cancel</Button>
              <Button mode="contained" onPress={confirmSwitch}>Yes, Switch</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. LOADING SPINNER OVERLAY */}
      <Modal transparent visible={switching}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {alignItems:'center'}]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{marginTop:15, fontWeight:'bold'}}>Switching Mode...</Text>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{paddingBottom: 40}}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Avatar.Text size={60} label={user?.companyName?.[0] || "U"} style={{backgroundColor: theme.colors.primary}} />
          <View style={{marginLeft: 16, flex:1}}>
            <Text variant="titleMedium" style={{fontWeight:'bold'}}>{user?.companyName || "Business User"}</Text>
            <Text style={{color:'#666', fontSize:12}}>{user?.email}</Text>
            <View style={{flexDirection:'row', marginTop:6}}>
              <Chip 
                icon="check-decagram" 
                compact 
                textStyle={{fontSize:10, height: 24}} 
                style={{backgroundColor: user?.verified ? '#DCFCE7' : '#FFF7ED'}}
              >
                {user?.verified ? 'Verified Business' : 'Verification Pending'}
              </Chip>
            </View>
          </View>
        </View>

        {/* ✅ SWITCH MODE BUTTON */}
        <View style={{paddingHorizontal: 20, marginBottom: 20}}>
          <TouchableOpacity onPress={initiateSwitch} activeOpacity={0.8}>
            <Card style={{
              backgroundColor: viewMode === 'buyer' ? '#FFF3E0' : '#E3F2FD',
              borderColor: viewMode === 'buyer' ? '#FF9800' : '#2196F3',
              borderWidth: 1
            }}>
              <Card.Title 
                title={viewMode === 'buyer' ? "Switch to Seller Mode" : "Switch to Buyer Mode"}
                subtitle={viewMode === 'buyer' ? "Manage Products & Orders" : "Browse Marketplace"}
                titleStyle={{ fontWeight: 'bold', color: viewMode === 'buyer' ? '#E65100' : '#0D47A1' }}
                left={(props) => (
                  <Avatar.Icon 
                    {...props} 
                    icon={viewMode === 'buyer' ? "store" : "shopping"} 
                    size={40} 
                    style={{backgroundColor: 'white'}} 
                    color={viewMode === 'buyer' ? '#E65100' : '#0D47A1'} 
                  />
                )}
                right={(props) => <IconButton {...props} icon="chevron-right" />}
              />
            </Card>
          </TouchableOpacity>
        </View>

        <Divider style={{height: 8, backgroundColor:'#F1F5F9'}} />

        {/* ✅ RESTORED MENU OPTIONS */}
        <List.Section>
          <List.Subheader>Business Settings</List.Subheader>
          
          <List.Item 
            title="Business Profile"
            description="Edit Name, GST, Address" 
            left={() => <List.Icon icon="briefcase-outline" />}
            right={() => <List.Icon icon="chevron-right" />} 
            onPress={() => navigation.navigate('EditProfile')}
          />

          <List.Item 
            title="Manage Address" 
            left={() => <List.Icon icon="map-marker-outline" />} 
            right={() => <List.Icon icon="chevron-right" />} 
            onPress={() => navigation.navigate('EditProfile')}
          />

           <List.Item 
            title="KYC Documents" 
            left={() => <List.Icon icon="file-document-outline" />}
            right={() => <List.Icon icon="chevron-right" />} 
            onPress={() => alert('KYC Feature coming soon')}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Support & Legal</List.Subheader>
          <List.Item 
            title="Help Center" 
            left={() => <List.Icon icon="headset" />} 
            onPress={handleSupport}
          />
          <List.Item 
            title="Returns & Refunds" 
            left={() => <List.Icon icon="refresh" />}
            onPress={() => navigation.navigate('LegalPages')}
          />
          <List.Item 
            title="Terms of Service" 
            left={() => <List.Icon icon="file-sign" />} 
            onPress={() => navigation.navigate('LegalPages')}
          />
        </List.Section>

        <View style={{padding: 20, marginTop: 10}}>
          <Button mode="outlined" textColor="red" icon="logout" onPress={logoutUser}>
            Logout
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 12, width: '100%', maxWidth: 400, elevation: 5 }
});