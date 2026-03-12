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
        {/* --- TERMS AND CONDITIONS --- */}
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
          <Bullet>Platform Fee: 1.5% of Order Value</Bullet>
          
          {'\n'}
          <Text style={{fontWeight:'bold', color:'#004AAD'}}>For Sellers:</Text>
          <Bullet>Platform Fee: 1% of Order Value</Bullet>
          <Bullet>Safety Fee: 0.25% of Order Value</Bullet>
          <Bullet>Freight Fee: 0.25% of Order Value</Bullet>
        </Section>

        <Section title="4. Cancellation & Returns">
          <Bullet>Once an order moves to "Processing", NO CANCELLATIONS are entertained.</Bullet>
          <Bullet>Quality disputes must be reported within 48 Hours with valid Lab Reports.</Bullet>
        </Section>

        {/* --- PRIVACY POLICY (NEW FOR PLAY STORE COMPLIANCE) --- */}
        <Divider style={{ marginVertical: 30, backgroundColor: '#004AAD', height: 2 }} />
        
        <Text variant="displaySmall" style={styles.mainTitle}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>

        <Section title="1. Data Collection">
          To facilitate B2B transactions, we collect business-critical information including:
          <Bullet>Company Name, Contact Details, and Email Address.</Bullet>
          <Bullet>GSTIN, Udyog Aadhar, and Shop Act Licenses for KYC verification.</Bullet>
          <Bullet>Bank account details and transaction history for settlement purposes.</Bullet>
        </Section>

        <Section title="2. Data Usage & Sharing">
          <Bullet>We use your data solely to verify business authenticity, process orders, and facilitate logistics.</Bullet>
          <Bullet>Your delivery address and contact info may be shared with our trusted Third-Party Logistics partners.</Bullet>
          <Bullet>We do NOT sell your data to third-party marketing agencies.</Bullet>
        </Section>

        <Section title="3. Data Retention & Account Deletion">
          <Bullet>Your data is retained as long as your account is active to comply with Indian taxation and corporate laws.</Bullet>
          <Bullet>You have the right to request account deletion directly from the App (Account {'>'} Delete Account) or by contacting our support team.</Bullet>
          <Bullet>Upon deletion, non-transactional personal data is erased. Invoices and transaction records are securely retained as mandated by GST regulations.</Bullet>
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
  lastUpdated: { color: '#94A3B8', marginBottom: 10, fontStyle: 'italic' }
});