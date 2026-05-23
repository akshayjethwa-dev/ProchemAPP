// src/screens/LegalPagesScreen.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function LegalPagesScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{fontWeight:'bold'}}>Legal & Privacy</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.documentCard}>
          <Text style={styles.mainTitle}>Terms and Conditions</Text>
          <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>

          <Text style={styles.sectionHeading}>1. Account & Eligibility</Text>
          <Text style={styles.bodyText}>Users must be registered business entities with a valid GSTIN. Prochem reserves the right to verify business credentials (KYC) before activating accounts.</Text>

          <Text style={styles.sectionHeading}>2. Pricing & Fee Structure</Text>
          <Text style={styles.bodyText}>Prochem operates as a marketplace facilitator.</Text>
          <Text style={styles.bulletPoint}>• Buyers: 1.5% Platform Fee</Text>
          <Text style={styles.bulletPoint}>• Sellers: 1% Platform Fee, 0.25% Safety Fee, 0.25% Freight Fee</Text>

          <Text style={styles.sectionHeading}>3. Cancellation & Returns</Text>
          <Text style={styles.bodyText}>Once an order moves to "Processing", cancellations are not entertained. Quality disputes must be reported within 48 Hours with valid Lab Reports.</Text>
        </View>

        <View style={[styles.documentCard, {marginTop: 16}]}>
          <Text style={styles.mainTitle}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>

          <Text style={styles.sectionHeading}>1. Data Collection</Text>
          <Text style={styles.bodyText}>We collect Company Name, Contact Details, Email, GSTIN, Udyog Aadhar, Shop Act Licenses, and Bank details for KYC and settlement purposes.</Text>

          <Text style={styles.sectionHeading}>2. Data Usage & Sharing</Text>
          <Text style={styles.bodyText}>We use data solely to verify authenticity and process orders. Delivery info may be shared with 3PL partners. We do NOT sell data.</Text>

          <Text style={styles.sectionHeading}>3. Data Retention</Text>
          <Text style={styles.bodyText}>Data is retained while active. You may request account deletion from the App Settings. Transaction records are retained as mandated by GST laws.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 8 },
  content: { padding: 16, paddingBottom: 40 },
  documentCard: { backgroundColor: 'white', borderRadius: 12, padding: 20 },
  mainTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  lastUpdated: { fontSize: 11, color: '#94A3B8', marginBottom: 20 },
  sectionHeading: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginTop: 16, marginBottom: 8 },
  bodyText: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 8 },
  bulletPoint: { fontSize: 13, color: '#475569', lineHeight: 20, paddingLeft: 8, marginBottom: 4 }
});