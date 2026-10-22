// src/screens/AccountScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Linking, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { Text, Avatar, List, Divider, Button, useTheme, Switch, Badge, ProgressBar, IconButton } from 'react-native-paper'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'; 
import { db } from '../config/firebase'; 
import { useAppStore } from '../store/appStore';
import { logoutUser, deleteUserAccount } from '../services/authService';
import { getProfileCompletion } from '../utils/profileCompletion';
import { listenToPayLaterApplication } from '../services/payLaterService';
import { PayLaterApplication } from '../types';

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

  const [payLaterApp, setPayLaterApp] = useState<PayLaterApplication | null>(
    user?.payLaterApplication || null
  );

  const isMobileReg = user?.registrationType === 'mobile';
  const completionData = user ? getProfileCompletion(user) : { percentage: 0, isComplete: false };

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

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenToPayLaterApplication(user.uid, (app) => {
      setPayLaterApp(app);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [user?.uid]);

  const confirmSwitch = () => {
    setShowSwitchModal(false);
    setSwitching(true);
    setTimeout(() => {
      setViewMode(viewMode === 'buyer' ? 'seller' : 'buyer');
      setSwitching(false);
    }, 600);
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await deleteUserAccount();
      Alert.alert("Account Deleted", "Your enterprise profile has been permanently removed.");
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
  const openWhatsApp = () => Linking.openURL('whatsapp://send?phone=918460852903&text=Hello, I need assistance with the ProChem Enterprise Platform.');

  const SettingsGroup = ({ children, title }: any) => (
    <View style={styles.groupContainer}>
      {title && <Text style={styles.groupTitle}>{title}</Text>}
      <View style={styles.groupBlock}>{children}</View>
    </View>
  );

  const initialChar = user?.companyName?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'P';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      
      {/* WHATSAPP PREFERENCES MODAL */}
      <Modal transparent visible={showWaPrefsModal} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.waModalHeader}>
              <View style={styles.waIconBox}>
                <IconButton icon="whatsapp" size={24} iconColor="#FFFFFF" style={{ margin: 0 }} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.waModalTitle}>WhatsApp Alerts</Text>
                <Text style={styles.waModalSub}>Commercial notifications & updates</Text>
              </View>
              <IconButton icon="close" size={20} iconColor="#64748B" onPress={() => setShowWaPrefsModal(false)} />
            </View>

            <View style={{ padding: 18 }}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchLabel}>Market Alerts</Text>
                  <Text style={styles.switchSub}>Live chemical requirements & bids</Text>
                </View>
                <Switch value={waPrefs.marketAlerts} onValueChange={(val) => toggleWaPref('marketAlerts', val)} color="#059669" />
              </View>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchLabel}>Negotiations & Orders</Text>
                  <Text style={styles.switchSub}>Chat relays, counter-offers, payment status</Text>
                </View>
                <Switch value={waPrefs.negotiations} onValueChange={(val) => toggleWaPref('negotiations', val)} color="#059669" />
              </View>
              <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchLabel}>General & Digest</Text>
                  <Text style={styles.switchSub}>Weekly chemical commodity summaries</Text>
                </View>
                <Switch value={waPrefs.digest} onValueChange={(val) => toggleWaPref('digest', val)} color="#059669" />
              </View>

              <TouchableOpacity 
                style={styles.modalPrimaryBtn} 
                onPress={() => setShowWaPrefsModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalPrimaryBtnText}>Save Preferences</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SWITCH MODE MODAL */}
      <Modal transparent visible={showSwitchModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ padding: 22, alignItems: 'center' }}>
              <View style={[styles.modalIconBox, { backgroundColor: '#F1F5F9' }]}>
                <IconButton icon="swap-horizontal" size={28} iconColor="#0F172A" style={{ margin: 0 }} />
              </View>
              <Text style={styles.modalHeaderTitle}>
                Switch to {viewMode === 'buyer' ? 'Seller Workspace' : 'Buyer Marketplace'}?
              </Text>
              <Text style={styles.modalBodyText}>
                {viewMode === 'buyer' 
                  ? 'You will switch to the Supplier Desk to manage your products, live RFQs, and commercial bids.'
                  : 'You will switch to the Chemical Marketplace to discover chemicals, request quotes, and source materials.'}
              </Text>
              <View style={styles.modalActionButtons}>
                <Button mode="outlined" onPress={() => setShowSwitchModal(false)} style={{ flex: 1, marginRight: 8, borderColor: '#CBD5E1' }}>
                  Cancel
                </Button>
                <Button mode="contained" buttonColor="#0F172A" onPress={confirmSwitch} style={{ flex: 1 }}>
                  Switch Workspace
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* SUPPORT MODAL */}
      <Modal transparent visible={showSupportModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[styles.modalIconBox, { backgroundColor: '#EFF6FF', marginBottom: 0 }]}>
                  <IconButton icon="headset" size={22} iconColor="#1D4ED8" style={{ margin: 0 }} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.modalHeaderTitle}>Prochem Trade Concierge</Text>
                  <Text style={styles.modalBodySub}>Direct support for orders, escrow & testing</Text>
                </View>
                <IconButton icon="close" size={20} iconColor="#64748B" onPress={() => setShowSupportModal(false)} />
              </View>

              <TouchableOpacity style={styles.supportOptionBtn} onPress={openWhatsApp} activeOpacity={0.85}>
                <IconButton icon="whatsapp" size={22} iconColor="#FFFFFF" style={{ margin: 0 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.supportOptionTitle}>Chat on WhatsApp Desk</Text>
                  <Text style={styles.supportOptionSub}>Immediate response from chemical trade desk</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.supportOptionBtn, { backgroundColor: '#0F172A', marginTop: 10 }]} onPress={openDialer} activeOpacity={0.85}>
                <IconButton icon="phone-in-talk" size={22} iconColor="#FFFFFF" style={{ margin: 0 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.supportOptionTitle}>Call +91-84608 52903</Text>
                  <Text style={styles.supportOptionSub}>Direct phone line (Mon-Sat, 9AM-8PM)</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE ACCOUNT MODAL */}
      <Modal transparent visible={showDeleteModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ padding: 22, alignItems: 'center' }}>
              <View style={[styles.modalIconBox, { backgroundColor: '#FEE2E2' }]}>
                <IconButton icon="alert" size={26} iconColor="#DC2626" style={{ margin: 0 }} />
              </View>
              <Text style={[styles.modalHeaderTitle, { color: '#DC2626' }]}>Delete Account?</Text>
              <Text style={styles.modalBodyText}>
                Permanently deletes your corporate credentials, active RFQs, and supplier profiles. This action is irreversible.
              </Text>
              <View style={styles.modalActionButtons}>
                <Button mode="outlined" onPress={() => setShowDeleteModal(false)} style={{ flex: 1, marginRight: 8, borderColor: '#CBD5E1' }} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button mode="contained" buttonColor="#DC2626" onPress={handleDeleteAccount} style={{ flex: 1 }} loading={isDeleting} disabled={isDeleting}>
                  Delete
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* SWITCHING SPINNER */}
      <Modal transparent visible={switching}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center', paddingVertical: 36 }]}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={{ marginTop: 16, fontWeight: '700', fontSize: 15, color: '#0F172A' }}>
              Switching Workspace...
            </Text>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* EXECUTIVE PROFILE HEADER */}
        <TouchableOpacity 
          style={styles.profileHeader} 
          onPress={() => navigation.navigate('EditProfile')} 
          activeOpacity={0.88}
        >
          <View style={styles.avatarBox}>
            <Text style={styles.avatarChar}>{initialChar}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={styles.nameRow}>
              <Text style={styles.companyName} numberOfLines={1}>
                {user?.companyName || user?.name || "Business Enterprise"}
              </Text>
            </View>
            <Text style={styles.companyEmail} numberOfLines={1}>
              {user?.email || 'Corporate Account'}
            </Text>
            
            <View style={styles.verificationRow}>
              <View style={[styles.verificationBadge, (user?.verified || user?.isGSTVerified) ? styles.verifiedBadge : styles.pendingBadge]}>
                <Text style={[styles.verificationBadgeText, (user?.verified || user?.isGSTVerified) ? styles.verifiedText : styles.pendingText]}>
                  {(user?.verified || user?.isGSTVerified) ? '✓ GST VERIFIED' : 'PENDING VERIFICATION'}
                </Text>
              </View>
              {Boolean((user as any)?.gstin || user?.gstNumber) && (
                <Text style={styles.gstText}>GST: {(user as any)?.gstin || user?.gstNumber}</Text>
              )}
            </View>

            {/* Profile completion bar */}
            {isMobileReg && !completionData.isComplete && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.completionText}>
                  Profile Completeness: {completionData.percentage}%
                </Text>
                <ProgressBar 
                  progress={completionData.percentage / 100} 
                  color="#059669" 
                  style={styles.progressBar} 
                />
              </View>
            )}
          </View>
          <IconButton icon="chevron-right" size={20} iconColor="#94A3B8" />
        </TouchableOpacity>

        {/* WORKSPACE SWITCHER BANNER */}
        <TouchableOpacity 
          style={styles.workspaceBanner}
          onPress={() => setShowSwitchModal(true)}
          activeOpacity={0.88}
        >
          <View style={[styles.workspaceIconBox, { backgroundColor: viewMode === 'buyer' ? '#EFF6FF' : '#ECFDF5' }]}>
            <IconButton 
              icon={viewMode === 'buyer' ? "storefront-outline" : "cart-outline"} 
              size={22} 
              iconColor={viewMode === 'buyer' ? '#1D4ED8' : '#059669'} 
              style={{ margin: 0 }} 
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.workspacePretitle}>ACTIVE WORKSPACE</Text>
            <Text style={styles.workspaceTitle}>
              {viewMode === 'buyer' ? 'Buyer Mode (Procurement)' : 'Seller Mode (Supplier Desk)'}
            </Text>
            <Text style={styles.workspaceSubtitle}>
              {viewMode === 'buyer' ? 'Tap to switch to Supplier Desk' : 'Tap to switch to Marketplace'}
            </Text>
          </View>
          <View style={styles.workspaceSwitchBtn}>
            <Text style={styles.workspaceSwitchBtnText}>Switch</Text>
          </View>
        </TouchableOpacity>

        {/* TRADE CREDIT / PAYLATER */}
        <SettingsGroup title="FINANCIAL SERVICES">
          <List.Item 
            title="PayLater Credit" 
            description={
              payLaterApp?.status === 'under_review' 
                ? "Application Under Review • Credit assessment underway"
                : payLaterApp?.status === 'approved' 
                ? `Approved • Limit: ₹${(payLaterApp.approvedLimit || 1000000).toLocaleString('en-IN')}`
                : "Apply for collateral-free chemical trade credit"
            }
            titleStyle={{ color: '#0F172A', fontWeight: '700', fontSize: 14 }}
            descriptionStyle={{ fontSize: 11, color: '#64748B' }}
            left={props => (
              <List.Icon 
                {...props} 
                icon="credit-card-clock-outline" 
                color={payLaterApp?.status === 'under_review' ? '#D97706' : payLaterApp?.status === 'approved' ? '#059669' : '#0F172A'} 
              />
            )} 
            right={props => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[
                  styles.statusBadgeSmall,
                  payLaterApp?.status === 'approved' ? { backgroundColor: '#DCFCE7' } : { backgroundColor: '#FEF3C7' }
                ]}>
                  <Text style={[
                    styles.statusBadgeSmallText,
                    payLaterApp?.status === 'approved' ? { color: '#166534' } : { color: '#B45309' }
                  ]}>
                    {payLaterApp?.status === 'approved' ? 'APPROVED' : payLaterApp?.status === 'under_review' ? 'PENDING' : 'APPLY'}
                  </Text>
                </View>
                <List.Icon {...props} icon="chevron-right" color="#94A3B8" />
              </View>
            )} 
            onPress={() => navigation.navigate('PayLaterCredit')} 
          />
        </SettingsGroup>

        {/* COMMERCIAL ACTIVITY */}
        {viewMode === 'buyer' && (
          <SettingsGroup title="COMMERCIAL ACTIVITY">
            <List.Item 
              title="My Negotiations" 
              description="Active supplier deals and counter-offers"
              titleStyle={styles.menuItemTitle}
              descriptionStyle={styles.menuItemSub}
              left={props => <List.Icon {...props} icon="handshake-outline" color="#0F172A" />} 
              right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} 
              onPress={() => navigation.navigate('NegotiationsList')} 
            />
            <Divider style={styles.divider} />
            <List.Item 
              title="Sourcing Inquiries" 
              description="Custom volume & specification requests"
              titleStyle={styles.menuItemTitle}
              descriptionStyle={styles.menuItemSub}
              left={props => <List.Icon {...props} icon="clipboard-text-outline" color="#0F172A" />} 
              right={props => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {quotedReqsCount > 0 && (
                    <View style={styles.badgeNew}>
                      <Text style={styles.badgeNewText}>{quotedReqsCount} Quoted</Text>
                    </View>
                  )}
                  <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />
                </View>
              )} 
              onPress={() => navigation.navigate('BuyerRequirements')} 
            />
          </SettingsGroup>
        )}

        {/* SETTINGS GROUP */}
        <SettingsGroup title="ENTERPRISE SETTINGS">
          <List.Item 
            title="Company Profile & GST" 
            description="Manage legal identity and bank info"
            titleStyle={styles.menuItemTitle}
            descriptionStyle={styles.menuItemSub}
            left={props => <List.Icon {...props} icon="domain" color="#0F172A" />} 
            right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} 
            onPress={() => navigation.navigate('EditProfile')} 
          />
          <Divider style={styles.divider} />
          <List.Item 
            title="Delivery Addresses" 
            description="Factory and warehouse dispatch locations"
            titleStyle={styles.menuItemTitle}
            descriptionStyle={styles.menuItemSub}
            left={props => <List.Icon {...props} icon="map-marker-outline" color="#0F172A" />} 
            right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} 
            onPress={() => navigation.navigate('AddressList')} 
          />
          <Divider style={styles.divider} />
          <List.Item 
            title="WhatsApp Alerts" 
            description="Trade relays and daily market digests"
            titleStyle={styles.menuItemTitle}
            descriptionStyle={styles.menuItemSub}
            left={props => <List.Icon {...props} icon="whatsapp" color="#059669" />} 
            right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} 
            onPress={() => setShowWaPrefsModal(true)} 
          />
        </SettingsGroup>

        {/* SUPPORT & ABOUT */}
        <SettingsGroup title="SUPPORT & COMPLIANCE">
          <List.Item 
            title="Trade Concierge & Help Desk" 
            description="Direct WhatsApp & phone hotline"
            titleStyle={styles.menuItemTitle}
            descriptionStyle={styles.menuItemSub}
            left={props => <List.Icon {...props} icon="headset" color="#0F172A" />} 
            right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} 
            onPress={() => setShowSupportModal(true)} 
          />
          <Divider style={styles.divider} />
          <List.Item 
            title="Terms of Trade & Privacy" 
            description="Platform rules and escrow conditions"
            titleStyle={styles.menuItemTitle}
            descriptionStyle={styles.menuItemSub}
            left={props => <List.Icon {...props} icon="file-document-outline" color="#0F172A" />} 
            right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} 
            onPress={() => navigation.navigate('LegalPages')} 
          />
          <Divider style={styles.divider} />
          <List.Item 
            title="About Prochem Exchange" 
            description="Platform overview and network members"
            titleStyle={styles.menuItemTitle}
            descriptionStyle={styles.menuItemSub}
            left={props => <List.Icon {...props} icon="information-outline" color="#0F172A" />} 
            right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />} 
            onPress={() => navigation.navigate('AboutProchem')} 
          />
        </SettingsGroup>

        {/* LOGOUT & DANGER ZONE */}
        <SettingsGroup>
          <List.Item 
            title="Sign Out" 
            titleStyle={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }} 
            left={props => <List.Icon {...props} icon="logout" color="#EF4444" />} 
            onPress={logoutUser} 
          />
          <Divider style={styles.divider} />
          <List.Item 
            title="Delete Account" 
            titleStyle={{ color: '#64748B', fontSize: 13 }} 
            left={props => <List.Icon {...props} icon="delete-outline" color="#94A3B8" />} 
            onPress={() => setShowDeleteModal(true)} 
          />
        </SettingsGroup>

        <Text style={styles.versionText}>Prochem Chemical Exchange • v2.2.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  profileHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },
  avatarBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChar: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyName: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  companyEmail: { 
    color: '#64748B', 
    fontSize: 12, 
    marginTop: 1,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  verificationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  verificationBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  verifiedText: {
    color: '#059669',
  },
  pendingText: {
    color: '#D97706',
  },
  gstText: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  completionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 3,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    width: '90%',
  },

  /* Workspace Banner */
  workspaceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  workspaceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspacePretitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  workspaceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  workspaceSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  workspaceSwitchBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  workspaceSwitchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Groups */
  groupContainer: { 
    paddingHorizontal: 16, 
    marginBottom: 16,
  },
  groupTitle: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#64748B', 
    marginLeft: 4, 
    marginBottom: 6, 
    letterSpacing: 0.6,
  },
  groupBlock: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#64748B',
  },
  divider: { 
    marginLeft: 54, 
    backgroundColor: '#F1F5F9',
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  statusBadgeSmallText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  badgeNew: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  badgeNewText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },

  /* Modals */
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20,
  },
  modalCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    width: '100%', 
    maxWidth: 380, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalHeaderTitle: { 
    fontWeight: '800', 
    fontSize: 17, 
    textAlign: 'center',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalBodyText: { 
    textAlign: 'center', 
    color: '#64748B', 
    marginBottom: 20, 
    lineHeight: 18,
    fontSize: 13,
  },
  modalBodySub: {
    fontSize: 11,
    color: '#64748B',
  },
  modalActionButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    width: '100%',
  },
  modalPrimaryBtn: {
    backgroundColor: '#0F172A',
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* WhatsApp Modal */
  waModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  waIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  waModalSub: {
    fontSize: 11,
    color: '#64748B',
  },
  switchRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9',
  },
  switchLabel: { 
    fontWeight: '700', 
    fontSize: 13, 
    color: '#0F172A',
  },
  switchSub: { 
    fontSize: 11, 
    color: '#64748B', 
    marginTop: 2,
  },

  /* Support */
  supportOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    borderRadius: 10,
    padding: 14,
  },
  supportOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  supportOptionSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
  },

  versionText: { 
    textAlign: 'center', 
    color: '#94A3B8', 
    marginTop: 16, 
    fontSize: 11,
  },
});
