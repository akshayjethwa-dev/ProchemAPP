// src/screens/CompanyProfileScreen.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, IconButton, Avatar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserProfile } from '../types';

interface Props {
  profile: UserProfile;
  onBack: () => void;
}

const CompanyProfileScreen: React.FC<Props> = ({ profile, onBack }) => {
  const details = [
    { label: 'Company Name', value: profile.companyName, icon: 'domain' },
    { label: 'GST Number', value: profile.gstNumber || 'Not Provided', icon: 'file-document-outline' },
    { label: 'CIN (Corporate ID)', value: profile.cin || 'L24110GJ1995PLC026214', icon: 'identifier' },
    { label: 'Registered Address', value: profile.address || 'N/A', icon: 'map-marker-outline' },
    { label: 'Support Email', value: 'support@prochem.in', icon: 'email-outline' },
    { label: 'Support Phone', value: '+91 22 4567 8900', icon: 'phone-outline' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={onBack} />
        <Text variant="titleLarge" style={{fontWeight:'bold'}}>Supplier Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHero}>
           <Avatar.Icon size={70} icon="domain" style={{backgroundColor: '#004AAD'}} />
           <View style={{marginLeft: 16, flex: 1}}>
              <Text variant="titleLarge" style={{fontWeight: 'bold'}}>{profile.companyName}</Text>
              <Text style={styles.verifiedBadge}>✓ VERIFIED PARTNER</Text>
           </View>
        </View>

        <Text style={styles.sectionTitle}>BUSINESS INFORMATION</Text>
        <View style={styles.infoGroup}>
           {details.map((d, i) => (
             <View key={i}>
               <View style={styles.row}>
                  <Avatar.Icon size={40} icon={d.icon} color="#64748B" style={{backgroundColor: '#F8FAFC'}} />
                  <View style={{marginLeft: 16, flex: 1}}>
                     <Text style={styles.label}>{d.label}</Text>
                     <Text style={styles.value}>{d.value}</Text>
                  </View>
               </View>
               {i < details.length - 1 && <Divider style={{marginLeft: 56}} />}
             </View>
           ))}
        </View>

        <View style={styles.noticeBox}>
           <Text style={styles.noticeTitle}>NOTICE</Text>
           <Text style={styles.noticeText}>To update legal company information, please contact our administrative desk with supporting documents.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 8 },
  content: { padding: 16 },
  profileHero: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 20 },
  verifiedBadge: { fontSize: 10, fontWeight: 'bold', color: '#004AAD', letterSpacing: 1, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748B', marginLeft: 16, marginBottom: 8, letterSpacing: 1 },
  infoGroup: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  label: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 14, color: '#1E293B', fontWeight: '500' },
  noticeBox: { backgroundColor: '#FFF7ED', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FFEDD5' },
  noticeTitle: { fontSize: 10, fontWeight: 'bold', color: '#C2410C', letterSpacing: 1, marginBottom: 4 },
  noticeText: { fontSize: 12, color: '#9A3412', lineHeight: 18 }
});

export default CompanyProfileScreen;