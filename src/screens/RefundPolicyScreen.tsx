// src/screens/RefundPolicyScreen.tsx

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Card, useTheme, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RefundPolicyScreen() {
  const navigation = useNavigation();
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={styles.headerTitle}>
          Refund & Cancellation
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.introBox}>
          <MaterialCommunityIcons name="shield-check" size={32} color="#004AAD" style={{ marginBottom: 10 }} />
          <Text style={styles.introText}>
            Prochem ensures a secure B2B trading environment. Our policies are designed to protect both buyers and sellers from unfair losses while maintaining industry standards for bulk chemical procurement.
          </Text>
        </View>

        {/* 1. Quality Discrepancy Policy */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="flask-outline" size={24} color="#DC2626" />
              <Text variant="titleMedium" style={styles.cardTitle}>1. Quality Discrepancy (Returns)</Text>
            </View>
            <Divider style={styles.divider} />
            <Text style={styles.paragraph}>
              If the delivered product's quality does not match the specifications mentioned in the order or the provided Certificate of Analysis (CoA):
            </Text>
            <View style={styles.bulletPoint}>
              <MaterialCommunityIcons name="circle-small" size={16} color="#64748B" />
              <Text style={styles.bulletText}>The product will be returned to the Seller.</Text>
            </View>
            <View style={styles.bulletPoint}>
              <MaterialCommunityIcons name="circle-small" size={16} color="#64748B" />
              <Text style={styles.bulletText}>
                The <Text style={styles.bold}>Seller</Text> is liable to pay all transportation and logistics charges for the return.
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <MaterialCommunityIcons name="circle-small" size={16} color="#64748B" />
              <Text style={styles.bulletText}>
                The <Text style={styles.bold}>Buyer</Text> will receive a 100% full refund, including the product amount and the Buyer's Platform Fee.
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <MaterialCommunityIcons name="circle-small" size={16} color="#64748B" />
              <Text style={styles.bulletText}>
                The <Text style={styles.bold}>Seller's Platform Fee</Text> is strictly non-refundable as the platform has fulfilled its matching and processing duties.
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* 2. Buyer Cancellation Policy */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="account-cancel-outline" size={24} color="#F59E0B" />
              <Text variant="titleMedium" style={styles.cardTitle}>2. Cancellation by Buyer</Text>
            </View>
            <Divider style={styles.divider} />
            <Text style={styles.paragraph}>
              In the B2B chemical industry, logistics and inventory blocking are highly time-sensitive.
            </Text>
            <Text style={styles.subHeading}>Before Dispatch:</Text>
            <Text style={styles.paragraph}>
              If the buyer cancels the order before the material is loaded or dispatched, the product amount will be refunded. However, the <Text style={styles.bold}>Buyer's Platform Fee is non-refundable</Text>.
            </Text>
            <Text style={styles.subHeading}>After Dispatch / In-Transit:</Text>
            <Text style={styles.paragraph}>
              Cancellations are strictly prohibited once the material has left the seller's facility. If the buyer rejects the material at the delivery gate without a valid quality-related reason, the <Text style={styles.bold}>Buyer</Text> will be liable for two-way freight charges and a 5% restocking penalty.
            </Text>
          </Card.Content>
        </Card>

        {/* 3. Seller Cancellation Policy */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="store-remove-outline" size={24} color="#004AAD" />
              <Text variant="titleMedium" style={styles.cardTitle}>3. Cancellation by Seller</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.bulletPoint}>
              <MaterialCommunityIcons name="circle-small" size={16} color="#64748B" />
              <Text style={styles.bulletText}>
                If the seller cancels the order due to stock unavailability or fails to dispatch within the agreed timeline, the <Text style={styles.bold}>Buyer</Text> receives a full refund (including platform fees).
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <MaterialCommunityIcons name="circle-small" size={16} color="#64748B" />
              <Text style={styles.bulletText}>
                The Seller will forfeit their platform fee and may face account suspension for repeated unfulfilled orders.
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* 4. Refund Processing */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="bank-transfer" size={24} color="#10B981" />
              <Text variant="titleMedium" style={styles.cardTitle}>4. Refund Processing</Text>
            </View>
            <Divider style={styles.divider} />
            <Text style={styles.paragraph}>
              Approved refunds will be initiated immediately from our end. Please allow <Text style={styles.bold}>5-7 business days</Text> for the amount to reflect in your original payment source or registered bank account, depending on your bank's processing times.
            </Text>
          </Card.Content>
        </Card>

        {/* 5. Dispute Resolution */}
        <Card style={[styles.card, { marginBottom: 40 }]} mode="outlined">
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="scale-balance" size={24} color="#475569" />
              <Text variant="titleMedium" style={styles.cardTitle}>5. Dispute Resolution</Text>
            </View>
            <Divider style={styles.divider} />
            <Text style={styles.paragraph}>
              In case of a disagreement regarding quality or dispatch timelines, the Prochem Admin team will step in to mediate. Buyers must provide lab test reports or clear photographic evidence of quality discrepancies within 48 hours of delivery to initiate a return.
            </Text>
          </Card.Content>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  scrollContent: {
    padding: 16,
  },
  introBox: {
    backgroundColor: '#EFF6FF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  introText: {
    color: '#1E40AF',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
  },
  card: {
    backgroundColor: 'white',
    marginBottom: 16,
    borderRadius: 12,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#1E293B',
    marginLeft: 8,
  },
  divider: {
    marginBottom: 12,
  },
  paragraph: {
    color: '#475569',
    lineHeight: 22,
    fontSize: 14,
    marginBottom: 8,
  },
  subHeading: {
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 8,
    marginBottom: 4,
    fontSize: 14,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletText: {
    flex: 1,
    color: '#475569',
    lineHeight: 20,
    fontSize: 14,
  },
  bold: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
});