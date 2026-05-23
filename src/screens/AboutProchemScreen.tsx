// src/screens/AboutProchemScreen.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, IconButton, List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AboutProchemScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{fontWeight: 'bold'}}>About Us</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
             <MaterialCommunityIcons name="flask" size={40} color="white" />
          </View>
          <Text variant="headlineSmall" style={styles.brandName}>PROCHEM</Text>
          <Text style={styles.version}>Version 2.1.1</Text>
        </View>

        <Text style={styles.paragraph}>
          Prochem is India's most trusted B2B chemical trading platform, connecting verified buyers directly with manufacturers and authorized distributors to ensure absolute transparency in pricing and quality.
        </Text>

        <Text style={styles.sectionTitle}>FEATURES & SERVICES</Text>
        <View style={styles.groupBlock}>
          <List.Item title="Verified Marketplace" description="Strictly KYC-verified authentic materials." left={props => <List.Icon {...props} icon="shield-check" color="#0284C7" />} />
          <Divider style={styles.divider} />
          <List.Item title="Live Negotiation" description="Send custom RFQs and negotiate real-time." left={props => <List.Icon {...props} icon="handshake" color="#D97706" />} />
          <Divider style={styles.divider} />
          <List.Item title="Integrated Logistics" description="Compliant delivery to your factory." left={props => <List.Icon {...props} icon="truck-fast" color="#166534" />} />
          <Divider style={styles.divider} />
          <List.Item title="Secure Payments" description="Escrow-like secure payment flows." left={props => <List.Icon {...props} icon="bank" color="#7E22CE" />} />
        </View>
        
        <Text style={{textAlign: 'center', color: '#94A3B8', marginTop: 30}}>© 2026 AAPA Capital Pvt. Ltd.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 8 },
  content: { padding: 16 },
  heroSection: { alignItems: 'center', marginVertical: 20 },
  logoCircle: { width: 70, height: 70, borderRadius: 16, backgroundColor: '#004AAD', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  brandName: { fontWeight: '900', color: '#0F172A', letterSpacing: 1 },
  version: { color: '#64748B', fontSize: 12, marginTop: 4 },
  paragraph: { color: '#475569', lineHeight: 22, fontSize: 14, textAlign: 'center', marginBottom: 30, paddingHorizontal: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748B', marginLeft: 16, marginBottom: 8, letterSpacing: 1 },
  groupBlock: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' },
  divider: { marginLeft: 56, backgroundColor: '#F1F5F9' }
});