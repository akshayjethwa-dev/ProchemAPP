// src/screens/RoleSelectionScreen.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { UserRole } from '../types';

export default function RoleSelectionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleSelect = (role: UserRole) => {
    navigation.navigate('Registration', { role, mobile: '' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton 
          icon="arrow-left" 
          size={24} 
          iconColor="#0F172A" 
          onPress={() => navigation.goBack()} 
          style={{ margin: 0 }}
        />
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step 1 of 2</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <View style={styles.badgeRow}>
            <Text style={styles.badgeText}>ACCOUNT ONBOARDING</Text>
          </View>
          <Text style={styles.title}>Choose your business profile</Text>
          <Text style={styles.subtitle}>
            Select your primary objective on the Prochem Industrial Exchange. You can switch roles at any time.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {/* Buyer Card */}
          <TouchableOpacity 
            onPress={() => handleSelect('buyer')}
            style={styles.roleCard}
            activeOpacity={0.88}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                <IconButton icon="cart-outline" size={24} iconColor="#1D4ED8" style={{ margin: 0 }} />
              </View>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>BUYER & TRADER</Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>Chemical Procurement</Text>
            <Text style={styles.cardDesc}>
              Discover raw materials, compare verified pricing, request custom bulk quotes (RFQs), and purchase with escrow payment security.
            </Text>

            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>✓ Access 1,000+ verified chemical inventory records</Text>
              <Text style={styles.featureItem}>✓ Real-time anonymous price negotiation desk</Text>
              <Text style={styles.featureItem}>✓ 100% Escrow protected payment release</Text>
            </View>

            <View style={styles.actionRow}>
              <Text style={[styles.actionText, { color: '#1D4ED8' }]}>Continue as Buyer →</Text>
            </View>
          </TouchableOpacity>

          {/* Seller Card */}
          <TouchableOpacity 
            onPress={() => handleSelect('seller')}
            style={[styles.roleCard, styles.sellerCardBorder]}
            activeOpacity={0.88}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                <IconButton icon="storefront-outline" size={24} iconColor="#059669" style={{ margin: 0 }} />
              </View>
              <View style={[styles.roleTag, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[styles.roleTagText, { color: '#059669' }]}>MANUFACTURER & DISTRIBUTOR</Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>Chemical Supplier / Seller</Text>
            <Text style={styles.cardDesc}>
              List spot inventory, respond to live buyer requirements, send custom commercial offers, and grow direct B2B client relationships across India.
            </Text>

            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>✓ Direct broadcast inquiries from verified industrial buyers</Text>
              <Text style={styles.featureItem}>✓ Instant deal-making with custom counter-offer desk</Text>
              <Text style={styles.featureItem}>✓ Guaranteed upfront payment settlements</Text>
            </View>

            <View style={styles.actionRow}>
              <Text style={[styles.actionText, { color: '#059669' }]}>Continue as Supplier →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Existing user shortcut */}
        <View style={styles.loginShortcut}>
          <Text style={styles.loginShortcutText}>Already have a registered account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stepIndicator: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerBlock: {
    marginBottom: 24,
  },
  badgeRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 28,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sellerCardBorder: {
    borderColor: '#A7F3D0',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  featuresList: {
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 16,
  },
  featureItem: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  actionRow: {
    alignItems: 'flex-start',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  loginShortcut: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginShortcutText: {
    fontSize: 13,
    color: '#64748B',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textDecorationLine: 'underline',
  },
});
