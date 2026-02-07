import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, IconButton, Divider, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function LegalPagesScreen() {
  const navigation = useNavigation();
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineSmall" style={{fontWeight:'bold'}}>Legal & Compliance</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="displaySmall" style={styles.mainTitle}>Terms and Conditions</Text>
        <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>

        <Section title="1. Introduction">
          Welcome to Prochem. These Terms and Conditions ("Terms") govern your use of the Prochem B2B Marketplace. By registering or using our platform, you agree to be bound by these Terms.
        </Section>

        <Section title="2. Account & Eligibility">
          <Bullet>Users must be registered business entities with a valid GSTIN.</Bullet>
          <Bullet>Prochem reserves the right to verify business credentials (KYC) before activating accounts.</Bullet>
        </Section>

        <Section title="3. Pricing & Fee Structure">
          Prochem operates as a marketplace facilitator. The following fee structure applies to all transactions:
          {'\n'}
          <Text style={{fontWeight:'bold', color:'#004AAD'}}>For Buyers:</Text>
          <Bullet>Platform Fee: 1% of Order Value</Bullet>
          <Bullet>Logistic Fee: 1% of Order Value</Bullet>
          {'\n'}
          <Text style={{fontWeight:'bold', color:'#004AAD'}}>For Sellers:</Text>
          <Bullet>Platform Fee: 1.5% of Order Value</Bullet>
          <Bullet>Safety Fee: 0.25% of Order Value</Bullet>
          <Bullet>Freight Fee: 1% of Order Value</Bullet>
          {'\n'}
          <Text style={{fontStyle:'italic', fontSize:12}}>* All fees are subject to 18% GST (CGST 9% + SGST 9% for intra-state, or IGST 18%).</Text>
        </Section>

        <Section title="4. Payment Terms">
          <Bullet><Text style={{fontWeight:'bold'}}>100% Advance Payment:</Text> Full payment is required via Bank Transfer (RTGS/NEFT/IMPS) to confirm an order.</Bullet>
          <Bullet><Text style={{fontWeight:'bold'}}>Secure Settlement:</Text> Payments collected from Buyers are held in a settlement account. Funds are released to the Seller only after the order is delivered and verified by the Buyer.</Bullet>
        </Section>

        <Section title="5. Logistics & Transportation">
          <Bullet><Text style={{fontWeight:'bold'}}>Provider:</Text> Transportation is arranged by Prochem through third-party logistics partners.</Bullet>
          <Bullet><Text style={{fontWeight:'bold'}}>Liability:</Text> Prochem acts solely as a facilitator/middleman. While we ensure reputable partners, the primary responsibility for goods during transit lies with the Transporter.</Bullet>
          <Bullet><Text style={{fontWeight:'bold'}}>Delivery Timeline:</Text> Standard delivery time is 7 to 10 working days from the date of payment confirmation.</Bullet>
        </Section>

        <Section title="6. Cancellation Policy">
          <Bullet>Once payment is confirmed and the order status moves to "Processing", <Text style={{fontWeight:'bold', color:'#D32F2F'}}>NO CANCELLATIONS</Text> are entertained.</Bullet>
          <Bullet>In exceptional cases where Prochem cancels an order due to stock unavailability, a full refund will be processed within 5-7 business days.</Bullet>
        </Section>

        <Section title="7. Returns & Quality Disputes">
          Returns are accepted strictly under the following conditions:
          <Bullet>1. <Text style={{fontWeight:'bold'}}>Quality Issues Only:</Text> Material does not match the specifications (COA) provided.</Bullet>
          <Bullet>2. <Text style={{fontWeight:'bold'}}>Reporting Window:</Text> Issues must be reported within 48 Hours of delivery.</Bullet>
          <Bullet>3. <Text style={{fontWeight:'bold'}}>Evidence:</Text> Photographic evidence of the product/packaging and a valid Lab Report proving the discrepancy is mandatory.</Bullet>
        </Section>

        <Section title="8. Governing Law">
          These terms shall be governed by the laws of India. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts in <Text style={{fontWeight:'bold'}}>Ahmedabad, Gujarat</Text>.
        </Section>

        <View style={{height: 50}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components for Formatting
const Section = ({ title, children }: any) => (
  <View style={{ marginBottom: 24 }}>
    <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 8, color: '#1E293B' }}>{title}</Text>
    <Text style={{ color: '#475569', lineHeight: 22 }}>{children}</Text>
    <Divider style={{ marginTop: 15, backgroundColor: '#E2E8F0' }} />
  </View>
);

const Bullet = ({ children }: any) => (
  <View style={{ flexDirection: 'row', marginBottom: 6, paddingLeft: 8 }}>
    <Text style={{ marginRight: 8, color: '#004AAD' }}>•</Text>
    <Text style={{ color: '#475569', lineHeight: 20, flex: 1 }}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  content: { padding: 24 },
  mainTitle: { fontWeight: 'bold', marginBottom: 5, color: '#004AAD' },
  lastUpdated: { color: '#94A3B8', marginBottom: 30, fontStyle: 'italic' }
});