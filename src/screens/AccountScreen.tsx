// src/screens/AccountScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Linking, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { Text, Avatar, List, Divider, Button, useTheme, Switch, Badge } from 'react-native-paper'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'; 
import { db } from '../config/firebase'; 
import { useAppStore } from '../store/appStore';
import { logoutUser, deleteUserAccount } from '../services/authService';

export default function AccountScreen() {
  const navigation = useNavigation<any>();
  const { user, viewMode, setViewMode } = useAppStore();
  const theme = useTheme();
  
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false); 
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showWaPrefsModal, setShowWaPrefsModal] = useState(false); 
  const [switching, setSwitching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [quotedReqsCount, setQuotedReqsCount] = useState(0);

  const [waPrefs, setWaPrefs] = useState({
    general: true, marketAlerts: true, negotiations: true, digest: true
  });

  useEffect(() => {
    if (!user?.uid || viewMode !== 'buyer') return;
    const qReq = query(collection(db, 'customRequirements'), where('buyerId', '==', user.uid), where('status', '==', 'QUOTED'));
    const unsub = onSnapshot(qReq, snap => setQuotedReqsCount(snap.docs.length));
    return () => unsub();
  }, [user?.uid, viewMode]);

  useEffect(() => {
    if (user?.whatsappPreferences) {
      setWaPrefs({
        general: user.whatsappPreferences.general ?? true,
        marketAlerts: user.whatsappPreferences.marketAlerts ?? true,
        negotiations: user.whatsappPreferences.negotiations ?? true,
        digest: user.whatsappPreferences.digest ?? true,
      });
    }
  }, [user]);

  const confirmSwitch = () => {
    setShowSwitchModal(false);
    setSwitching(true);
    setTimeout(() => {
      setViewMode(viewMode === 'buyer' ? 'seller' : 'buyer');
      setSwitching(false);
    }, 800);
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await deleteUserAccount();
      Alert.alert("Account Deleted", "Your account has been permanently removed.");
    } catch (error: any) {
      Alert.alert("Deletion Failed", error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const toggleWaPref = async (key: keyof typeof waPrefs, value: boolean) => {
    const newPrefs = { ...waPrefs, [key]: value };
    setWaPrefs(newPrefs);
    if (user?.uid) {
      try { await updateDoc(doc(db, 'users', user.uid), { whatsappPreferences: newPrefs }); } 
      catch { setWaPrefs({ ...waPrefs }); }
    }
  };

  const openDialer = () => Linking.openURL('tel:+918460852903');
  const openWhatsApp = () => Linking.openURL('whatsapp://send?phone=918460852903&text=Hello, I need assistance with the ProChem App.');

  // UI Component for grouping lists cleanly
  const SettingsGroup = ({ children, title }: any) => (
    <View style={styles.groupContainer}>
      {title && <Text style={styles.groupTitle}>{title}</Text>}
      <View style={styles.groupBlock}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 🚀 WHATSAPP PREFS MODAL */}
      <Modal transparent visible={showWaPrefsModal} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 0, overflow: 'hidden' }]}>
            <View style={{backgroundColor: '#25D366', padding: 20, alignItems: 'center'}}>
              <Avatar.Icon size={50} icon="whatsapp" style={{backgroundColor: 'white'}} color="#25D366" />
              <Text variant="titleLarge" style={{fontWeight:'bold', color: 'white', marginTop: 10}}>
                WhatsApp Notifications
              </Text>
            </View>
            <View style={{padding: 20}}>
              <View style={styles.switchRow}>
                <View style={{flex: 1}}><Text style={styles.switchLabel}>General Updates</Text><Text style={styles.switchSub}>Marketing, promos, and platform news.</Text></View>
                <Switch value={waPrefs.general} onValueChange={(val) => toggleWaPref('general', val)} color="#25D366" />
              </View>
              <View style={styles.switchRow}>
                <View style={{flex: 1}}><Text style={styles.switchLabel}>Market Alerts</Text><Text style={styles.switchSub}>Live buyer requirements and sourcing requests.</Text></View>
                <Switch value={waPrefs.marketAlerts} onValueChange={(val) => toggleWaPref('marketAlerts', val)} color="#25D366" />
              </View>
              <View style={styles.switchRow}>
                <View style={{flex: 1}}><Text style={styles.switchLabel}>Negotiations & Orders</Text><Text style={styles.switchSub}>Chat relays, quotes, and payment status.</Text></View>
                <Switch value={waPrefs.negotiations} onValueChange={(val) => toggleWaPref('negotiations', val)} color="#25D366" />
              </View>
              <View style={[styles.switchRow, {borderBottomWidth: 0}]}>
                <View style={{flex: 1}}><Text style={styles.switchLabel}>Weekly Digest</Text><Text style={styles.switchSub}>Weekly summary of your market activity.</Text></View>
                <Switch value={waPrefs.digest} onValueChange={(val) => toggleWaPref('digest', val)} color="#25D366" />
              </View>
              <Button mode="contained" onPress={() => setShowWaPrefsModal(false)} style={{marginTop: 10, backgroundColor: '#1E293B'}}>Done</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* 1. SWITCH MODE CONFIRMATION MODAL */}
      <Modal transparent visible={showSwitchModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
               <Avatar.Icon size={50} icon="swap-horizontal" style={{backgroundColor: '#E3F2FD', marginBottom: 15}} color="#004AAD" />
               <Text variant="titleLarge" style={{fontWeight:'bold', textAlign:'center'}}>Switch to {viewMode === 'buyer' ? 'Selling' : 'Buying'}?</Text>
            </View>
            <Text style={styles.modalBody}>{viewMode === 'buyer' ? 'You will be moved to the Seller Dashboard.' : 'You will be moved to the Marketplace.'}</Text>
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setShowSwitchModal(false)} style={{flex:1, marginRight:10}}>Cancel</Button>
              <Button mode="contained" onPress={confirmSwitch} style={{flex:1}}>Switch</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. SUPPORT DETAILS MODAL */}
      <Modal transparent visible={showSupportModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
               <Avatar.Icon size={50} icon="headset" style={{backgroundColor: '#E3F2FD', marginBottom: 15}} color="#004AAD" />
               <Text variant="titleLarge" style={{fontWeight:'bold', textAlign:'center'}}>Promact Support</Text>
            </View>
            <Text style={[styles.modalBody, {marginBottom: 20}]}>We are here to help! Choose a method below to contact us.</Text>
            <View style={{width: '100%'}}>
               <Button mode="outlined" icon="phone" onPress={openDialer} style={{borderColor: '#004AAD', marginBottom: 10}} textColor="#004AAD">Call +91-84608 52903</Button>
               <Button mode="outlined" icon="whatsapp" onPress={openWhatsApp} style={{borderColor: '#25D366', marginBottom: 15}} textColor="#25D366">Chat on WhatsApp</Button>
               <Button mode="contained" onPress={() => setShowSupportModal(false)} style={{backgroundColor: '#64748B'}}>Close</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. DELETE ACCOUNT CONFIRMATION MODAL */}
      <Modal transparent visible={showDeleteModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
               <Avatar.Icon size={50} icon="alert" style={{backgroundColor: '#FFEBEE', marginBottom: 15}} color="#D32F2F" />
               <Text variant="titleLarge" style={{fontWeight:'bold', textAlign:'center', color: '#D32F2F'}}>Delete Account?</Text>
            </View>
            <Text style={styles.modalBody}>Are you sure you want to permanently delete your account? This action cannot be undone.</Text>
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setShowDeleteModal(false)} style={{flex:1, marginRight:10}} disabled={isDeleting}>Cancel</Button>
              <Button mode="contained" buttonColor="#D32F2F" onPress={handleDeleteAccount} style={{flex:1}} loading={isDeleting} disabled={isDeleting}>Delete</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. LOADING SPINNER OVERLAY */}
      <Modal transparent visible={switching}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {alignItems:'center', paddingVertical: 40}]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{marginTop:20, fontWeight:'bold', fontSize: 16}}>Switching Mode...</Text>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={false}>
        
        {/* COMPACT PROFILE HEADER */}
        <TouchableOpacity style={styles.profileHeader} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.7}>
          <Avatar.Text size={60} label={user?.companyName?.[0]?.toUpperCase() || "U"} style={{backgroundColor: theme.colors.primary}} color='white'/>
          <View style={{flex: 1, marginLeft: 16}}>
            <Text variant="titleMedium" style={{fontWeight:'bold'}} numberOfLines={1}>{user?.companyName || "Business User"}</Text>
            <Text style={{color:'#64748B', fontSize: 13}}>{user?.email}</Text>
            <Text style={{color: user?.verified ? '#059669' : '#D97706', fontSize: 12, fontWeight: 'bold', marginTop: 4}}>
              {user?.verified ? '✓ Verified Business' : 'Pending Verification'}
            </Text>
          </View>
          <List.Icon icon="chevron-right" color="#CBD5E1" />
        </TouchableOpacity>

        {/* WORKSPACE SWITCHER */}
        <SettingsGroup>
          <List.Item 
            title={viewMode === 'buyer' ? "Switch to Seller Mode" : "Switch to Buyer Mode"}
            description={viewMode === 'buyer' ? "Manage Products & Orders" : "Browse Marketplace"}
            left={props => <List.Icon {...props} icon={viewMode === 'buyer' ? "store-cog" : "shopping"} color={viewMode === 'buyer' ? '#E65100' : '#0D47A1'} />}
            right={props => <List.Icon {...props} icon="swap-horizontal" color="#CBD5E1" />}
            onPress={() => setShowSwitchModal(true)}
          />
        </SettingsGroup>

        {/* ACTIVITY GROUP */}
        {viewMode === 'buyer' && (
          <SettingsGroup title="BUYING ACTIVITY">
            <List.Item title="My Negotiations" left={props => <List.Icon {...props} icon="handshake-outline" color="#475569" />} right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} onPress={() => navigation.navigate('NegotiationsList')} />
            <Divider style={styles.divider} />
            <List.Item title="Sourcing Requests" left={props => <List.Icon {...props} icon="clipboard-search-outline" color="#475569" />} right={props => <View style={{flexDirection:'row', alignItems:'center'}}>{quotedReqsCount > 0 && <Badge style={{marginRight: 8}}>{`${quotedReqsCount} New`}</Badge>}<List.Icon {...props} icon="chevron-right" color="#CBD5E1" /></View>} onPress={() => navigation.navigate('BuyerRequirements')} />
          </SettingsGroup>
        )}

        {/* SETTINGS GROUP */}
        <SettingsGroup title="ACCOUNT SETTINGS">
          <List.Item title="Company Details" left={props => <List.Icon {...props} icon="domain" color="#475569" />} right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} onPress={() => navigation.navigate('EditProfile')} />
          <Divider style={styles.divider} />
          <List.Item title="Saved Addresses" left={props => <List.Icon {...props} icon="map-marker-outline" color="#475569" />} right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} onPress={() => navigation.navigate('AddressList')} />
          <Divider style={styles.divider} />
          <List.Item title="WhatsApp Notifications" left={props => <List.Icon {...props} icon="whatsapp" color="#25D366" />} right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} onPress={() => setShowWaPrefsModal(true)} />
        </SettingsGroup>

        {/* SUPPORT & LEGAL GROUP */}
        <SettingsGroup title="SUPPORT & ABOUT">
          <List.Item title="Help Center" left={props => <List.Icon {...props} icon="headset" color="#475569" />} right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} onPress={() => setShowSupportModal(true)} />
          <Divider style={styles.divider} />
          <List.Item title="About Prochem" left={props => <List.Icon {...props} icon="information-outline" color="#475569" />} right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} onPress={() => navigation.navigate('AboutProchem')} />
          <Divider style={styles.divider} />
          <List.Item title="Legal & Privacy" left={props => <List.Icon {...props} icon="file-document-outline" color="#475569" />} right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} onPress={() => navigation.navigate('LegalPages')} />
        </SettingsGroup>

        {/* DANGER ZONE */}
        <SettingsGroup>
          <List.Item title="Sign Out" titleStyle={{color: '#EF5350', fontWeight: 'bold'}} left={props => <List.Icon {...props} icon="logout" color="#EF5350" />} onPress={logoutUser} />
          <Divider style={styles.divider} />
          <List.Item title="Delete Account" titleStyle={{color: '#D32F2F'}} left={props => <List.Icon {...props} icon="delete-outline" color="#D32F2F" />} onPress={() => setShowDeleteModal(true)} />
        </SettingsGroup>

        <Text style={{textAlign:'center', color:'#94A3B8', marginTop: 20, fontSize: 12}}>App Version 2.1.1</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white', marginBottom: 20 },
  groupContainer: { paddingHorizontal: 16, marginBottom: 24 },
  groupTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748B', marginLeft: 16, marginBottom: 8, letterSpacing: 1 },
  groupBlock: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' },
  divider: { marginLeft: 56, backgroundColor: '#F1F5F9' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 20, width: '100%', maxWidth: 360, elevation: 10 },
  modalHeader: { alignItems: 'center', marginBottom: 10 },
  modalBody: { textAlign: 'center', color: '#64748B', marginBottom: 25, lineHeight: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  switchLabel: { fontWeight: 'bold', fontSize: 16, color: '#1E293B' },
  switchSub: { fontSize: 12, color: '#64748B', marginTop: 2 }
});