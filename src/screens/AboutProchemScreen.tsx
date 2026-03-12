// src/screens/AboutProchemScreen.tsx

import React from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { Text, Card, IconButton, useTheme, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AboutProchemScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="white" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={styles.headerTitle}>About Prochem</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
             <MaterialCommunityIcons name="flask" size={50} color="white" />
          </View>
          <Text variant="headlineMedium" style={styles.brandName}>PROCHEM</Text>
          <Text variant="bodyMedium" style={styles.tagline}>
            India's Most Trusted B2B Chemical Trading Platform
          </Text>
        </View>

        {/* Introduction */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.paragraph}>
              Prochem (by AAPA Capital Pvt. Ltd.) is designed to digitize and simplify the bulk chemical supply chain. We connect verified buyers directly with manufacturers and authorized distributors, eliminating middlemen and ensuring absolute transparency in pricing and quality.
            </Text>
          </Card.Content>
        </Card>

        {/* Core Pillars */}
        <Text variant="titleMedium" style={styles.sectionTitle}>What We Provide</Text>

        <Card style={styles.featureCard}>
          <Card.Content style={styles.featureContent}>
            <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
              <MaterialCommunityIcons name="store-search" size={30} color="#0284C7" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Verified Marketplace</Text>
              <Text style={styles.featureDesc}>Discover thousands of industrial chemicals with transparent pricing. Every seller is strictly KYC-verified to ensure authentic materials.</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.featureCard}>
          <Card.Content style={styles.featureContent}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="handshake" size={30} color="#D97706" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Live Negotiation Rooms</Text>
              <Text style={styles.featureDesc}>Don't just take the listed price. Send custom RFQs (Request For Quotes) and negotiate prices in real-time directly with suppliers.</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.featureCard}>
          <Card.Content style={styles.featureContent}>
            <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
              <MaterialCommunityIcons name="truck-fast" size={30} color="#166534" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Integrated Logistics</Text>
              <Text style={styles.featureDesc}>Stop worrying about hazmat shipping. Once a deal is struck, our verified transport network handles safe, compliant delivery to your factory.</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.featureCard}>
          <Card.Content style={styles.featureContent}>
            <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
              <MaterialCommunityIcons name="shield-check" size={30} color="#7E22CE" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Secure Payments</Text>
              <Text style={styles.featureDesc}>Your capital is safe. We manage the escrow-like payment flow, ensuring funds are secure until the material is dispatched.</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Footer Contact */}
        <View style={styles.footer}>
          <Text style={{fontWeight: 'bold', color: '#334155', marginBottom: 5}}>Need more information?</Text>
          <Text style={{color: '#64748B'}}>Contact us at sales@prochem.org.in</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#004AAD', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5 },
  headerTitle: { color: 'white', fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 40 },
  
  heroSection: { alignItems: 'center', marginVertical: 30 },
  logoCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#004AAD', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 5 },
  brandName: { fontWeight: '900', color: '#0F172A', letterSpacing: 2 },
  tagline: { color: '#64748B', textAlign: 'center', marginTop: 5, paddingHorizontal: 20 },
  
  card: { backgroundColor: 'white', borderRadius: 12, marginBottom: 25 },
  paragraph: { color: '#334155', lineHeight: 22, fontSize: 14, textAlign: 'justify' },
  
  sectionTitle: { fontWeight: 'bold', color: '#0F172A', marginBottom: 15, marginLeft: 5 },
  
  featureCard: { backgroundColor: 'white', marginBottom: 12, borderRadius: 12, elevation: 1 },
  featureContent: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  iconBox: { width: 60, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  featureText: { flex: 1 },
  featureTitle: { fontWeight: 'bold', fontSize: 16, color: '#1E293B', marginBottom: 4 },
  featureDesc: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  
  footer: { marginTop: 30, alignItems: 'center', padding: 20, borderTopWidth: 1, borderColor: '#E2E8F0' }
});