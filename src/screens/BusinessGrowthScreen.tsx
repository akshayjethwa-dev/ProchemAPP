import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
  ActivityIndicator, FlatList, Alert, Linking, Modal as RNModal
} from 'react-native';
import {
  Text, Card, Button, useTheme, Surface, Avatar, Chip,
  Portal, Modal, TextInput
} from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  collection, query, where, onSnapshot, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { Product } from '../types';

const { width } = Dimensions.get('window');

const RAZORPAY_LINK = 'https://razorpay.me/@aapacapitalprivatelimited';
const WHATSAPP_NUMBER = '917984856652'; // 🔁 Replace with your actual WhatsApp business number

const PLANS = {
  standard: {
    key: 'standard',
    title: 'Standard Plan',
    amount: '50,000',
    amountRaw: 50000,
    duration: '1 Year',
    description: 'Perfect for businesses looking to scale their sourcing and sales.',
    highlights: ['Access to verified buyers & sellers', 'Live market leads', 'Ready-to-dispatch inventory', 'Full Prochem team support'],
  },
  growth: {
    key: 'growth',
    title: '3-Year Growth Plan',
    amount: '1,00,000',
    amountRaw: 100000,
    duration: '3 Years',
    description: 'Lock in the best rates and secure your platform growth long-term.',
    highlights: ['Everything in Standard', 'Save ₹50,000 vs yearly', 'Priority market leads', 'WhatsApp & Email promotion', 'Dedicated account manager'],
  },
};

export default function BusinessGrowthScreen() {
  const { user } = useAppStore();
  const isPremium = user?.subscriptionTier === 'GROWTH_PACKAGE';
  if (!isPremium) return <SalesPitchUI />;
  return <PremiumHubCombined />;
}

// ==========================================
// 🌟 COMBINED PREMIUM HUB (With Tabs)
// ==========================================
function PremiumHubCombined() {
  const { viewMode } = useAppStore();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'buyers' | 'sellers'>(
    viewMode === 'seller' ? 'sellers' : 'buyers'
  );

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: 0 }]}>
      <View style={[styles.premiumHeader, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="crown" size={28} color="#F59E0B" />
          <Text variant="titleLarge" style={{ color: 'white', fontWeight: 'bold', marginLeft: 8 }}>
            Premium Hub
          </Text>
        </View>
        <Text style={{ color: '#FDE68A', marginTop: 4 }}>
          Your Exclusive Business Growth Dashboard
        </Text>
      </View>

      <View style={styles.premiumToggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, activeTab === 'buyers' && styles.toggleButtonActive]}
          onPress={() => setActiveTab('buyers')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, activeTab === 'buyers' && styles.toggleTextActive]}>
            For Buyers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, activeTab === 'sellers' && styles.toggleButtonActive]}
          onPress={() => setActiveTab('sellers')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, activeTab === 'sellers' && styles.toggleTextActive]}>
            For Sellers
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, marginTop: 10 }}>
        {activeTab === 'buyers' ? <PremiumBuyerHubContent /> : <PremiumSellerHubContent />}
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// 1. PREMIUM BUYER CONTENT
// ==========================================
function PremiumBuyerHubContent() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'products'),
      where('readyToDispatch', '==', true),
      where('active', '==', true)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(fetched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 50 }} />;

  return (
    <FlatList
      data={products}
      keyExtractor={item => item.id!}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      numColumns={2}
      columnWrapperStyle={{ justifyContent: 'space-between' }}
      ListHeaderComponent={
        <Text style={{ fontWeight: 'bold', color: '#1E293B', marginBottom: 12, fontSize: 16 }}>
          ⚡ Ready-to-Dispatch Inventory
        </Text>
      }
      ListEmptyComponent={
        <Text style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>
          No ready-to-dispatch inventory available at the moment.
        </Text>
      }
      renderItem={({ item }) => (
        <Card
          style={[styles.productCard, { borderColor: '#FDE68A', borderWidth: 1 }]}
          onPress={() => navigation.navigate('ProductDetail', { product: item })}
        >
          <Card.Content style={{ padding: 12, alignItems: 'center' }}>
            <View style={styles.imagePlaceholder}>
              <Text style={{ fontSize: 30 }}>⚡</Text>
            </View>
            <Text numberOfLines={1} style={{ fontWeight: 'bold', marginTop: 8, textAlign: 'center' }}>
              {item.name}
            </Text>
            <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{item.origin || 'India'}</Text>
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold', marginTop: 4 }}>
              ₹{item.pricePerUnit || item.price}/{item.unit || 'kg'}
            </Text>
            <Chip
              compact
              icon="flash"
              style={{ backgroundColor: '#FEF3C7', marginTop: 8 }}
              textStyle={{ fontSize: 9, color: '#D97706', fontWeight: 'bold' }}
            >
              Ships Today
            </Chip>
          </Card.Content>
        </Card>
      )}
    />
  );
}

// ==========================================
// 2. PREMIUM SELLER CONTENT
// ==========================================
function PremiumSellerHubContent() {
  const { user } = useAppStore();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [dispatchDays, setDispatchDays] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'broadcastLeads'), where('status', '==', 'OPEN'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLeads(fetched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const submitQuote = async () => {
    if (!price || !quantity || !dispatchDays) {
      Alert.alert('Error', 'Please fill all fields to submit your quote.');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'supplierQuotes'), {
        leadId: selectedLead?.id,
        productName: selectedLead?.productName,
        supplierId: user?.uid,
        supplierName: user?.companyName || 'Premium Supplier',
        pricePerUnit: Number(price),
        availableQuantity: quantity,
        dispatchDays,
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Success', 'Your Premium quote has been sent to the Admin.');
      setSelectedLead(null);
      setPrice(''); setQuantity(''); setDispatchDays('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit quote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 50 }} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={leads}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListHeaderComponent={
          <Text style={{ fontWeight: 'bold', color: '#1E293B', marginBottom: 12, fontSize: 16 }}>
            📡 Live Market Requirements
          </Text>
        }
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>
            No active market leads at the moment.
          </Text>
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 12, backgroundColor: 'white', elevation: 2 }}>
            <Card.Title
              title={item.productName}
              titleStyle={{ fontWeight: 'bold', fontSize: 16 }}
              subtitle={`Posted: ${new Date(item.createdAt).toLocaleDateString()}`}
              left={(props) => (
                <Avatar.Icon
                  {...props}
                  icon="account-search"
                  style={{ backgroundColor: '#E0F2FE' }}
                  color="#0284C7"
                />
              )}
            />
            <Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Required Qty</Text>
                  <Text style={{ fontWeight: 'bold', color: '#1E293B' }}>
                    {item.quantityRequired} {item.unit}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Target Price</Text>
                  <Text style={{ fontWeight: 'bold', color: '#16A34A' }}>
                    ₹{item.targetPrice} / {item.unit}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color="#64748B" />
                <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>
                  Delivery to Pincode: {item.deliveryRegion}
                </Text>
              </View>
            </Card.Content>
            <Card.Actions style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <Button mode="contained" buttonColor="#004AAD" onPress={() => setSelectedLead(item)}>
                Submit Quote
              </Button>
            </Card.Actions>
          </Card>
        )}
      />

      <Portal>
        <Modal
          visible={!!selectedLead}
          onDismiss={() => setSelectedLead(null)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleLarge" style={{ marginBottom: 15, fontWeight: 'bold' }}>
            Quote for {selectedLead?.productName}
          </Text>
          <TextInput
            label={`Price per ${selectedLead?.unit} (₹)`}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Quantity you can supply"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Estimated Dispatch (e.g., 2 Days)"
            value={dispatchDays}
            onChangeText={setDispatchDays}
            mode="outlined"
            style={styles.input}
          />
          <Button mode="contained" onPress={submitQuote} loading={isSubmitting} style={{ marginTop: 15 }}>
            Send to Admin
          </Button>
          <Button mode="text" onPress={() => setSelectedLead(null)} style={{ marginTop: 5 }}>
            Cancel
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

// ==========================================
// 3. UPGRADE PAYMENT MODAL
// ==========================================
function UpgradePaymentModal({
  visible,
  plan,
  onClose,
}: {
  visible: boolean;
  plan: (typeof PLANS)[keyof typeof PLANS] | null;
  onClose: () => void;
}) {
  const { user } = useAppStore();

  if (!plan) return null;

  const handlePayNow = () => {
    Linking.openURL(RAZORPAY_LINK).catch(() =>
      Alert.alert('Error', 'Could not open payment link. Please try again.')
    );
  };

  const handleSendReceipt = () => {
    const userId = user?.uid || 'N/A';
    const userName = user?.companyName || user?.businessName || 'User';


    const userEmail = user?.email || 'N/A';
    const phone = user?.phone || 'N/A';
    const message =
      `Hi Prochem Team,\n\n` +
      `I have completed the payment for the *${plan.title}* (₹${plan.amount} / ${plan.duration}).\n\n` +
      `Please find the payment screenshot attached above.\n\n` +
      `--- My Account Details ---\n` +
      `Name: ${userName}\n` +
      `User ID: ${userId}\n` +
      `Email: ${userEmail}\n` +
      `Phone: ${phone}\n` +
      `Plan: ${plan.title}\n` +
      `Amount: ₹${plan.amount}\n\n` +
      `Kindly activate my account. Thank you!`;

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl).catch(() =>
      Alert.alert('Error', 'Could not open WhatsApp. Please send receipt manually.')
    );
  };

  return (
    <RNModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={upgradeStyles.overlay}>
        <View style={upgradeStyles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Close Button */}
            <TouchableOpacity style={upgradeStyles.closeBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>

            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={upgradeStyles.shieldIcon}>
                <MaterialCommunityIcons name="shield-check" size={30} color="#004AAD" />
              </View>
              <Text style={upgradeStyles.title}>Upgrade to {plan.title}</Text>
              <Text style={upgradeStyles.amountLine}>
                Amount to pay: <Text style={{ fontWeight: '900', color: '#1E293B' }}>₹{plan.amount}</Text>
              </Text>
            </View>

            {/* Plan Details */}
            <View style={upgradeStyles.detailsBox}>
              <View style={upgradeStyles.detailRow}>
                <MaterialCommunityIcons name="calendar-range" size={18} color="#004AAD" />
                <Text style={upgradeStyles.detailText}>Duration: <Text style={{ fontWeight: '700' }}>{plan.duration}</Text></Text>
              </View>
              {plan.highlights.map((h, i) => (
                <View key={i} style={upgradeStyles.detailRow}>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color="#10B981" />
                  <Text style={upgradeStyles.detailText}>{h}</Text>
                </View>
              ))}
            </View>

            {/* Company Note */}
            <View style={upgradeStyles.noteBox}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#004AAD" style={{ marginTop: 2 }} />
              <Text style={upgradeStyles.noteText}>
                <Text style={{ fontWeight: '700' }}>Note: </Text>
                Prochem is proudly developed and run by{' '}
                <Text style={{ fontWeight: '800', color: '#1E293B' }}>Aapa Capital Private Limited</Text>.
                Your payment will be securely processed under this company name on the Razorpay checkout page.
              </Text>
            </View>

            {/* Step 2 – SS Reminder shown FIRST so user knows before paying */}
            <View style={[upgradeStyles.stepBox, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
              <Text style={[upgradeStyles.stepLabel, { color: '#16A34A' }]}>STEP 2 — Before You Pay</Text>
              <Text style={upgradeStyles.stepDescription}>
                📸 After paying, you'll need to send us your payment screenshot to activate your plan.
                Don't close the payment page before taking a screenshot!
              </Text>
            </View>

            {/* Step 1 – Pay Now */}
            <View style={upgradeStyles.stepBox}>
              <Text style={upgradeStyles.stepLabel}>STEP 1</Text>
              <Text style={upgradeStyles.stepDescription}>
                Click below to pay securely via Razorpay. An invoice will be sent to your email.
              </Text>
              <TouchableOpacity style={upgradeStyles.payButton} onPress={handlePayNow} activeOpacity={0.85}>
                <MaterialCommunityIcons name="open-in-new" size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={upgradeStyles.payButtonText}>Pay ₹{plan.amount} Securely</Text>
              </TouchableOpacity>
            </View>

            {/* Step 2 – Send Receipt */}
            <View style={[upgradeStyles.stepBox, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
              <Text style={[upgradeStyles.stepLabel, { color: '#16A34A' }]}>STEP 2</Text>
              <Text style={upgradeStyles.stepDescription}>
                After successful payment, send us your receipt screenshot to activate your plan.
              </Text>
              <TouchableOpacity
                style={[upgradeStyles.payButton, { backgroundColor: '#16A34A' }]}
                onPress={handleSendReceipt}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="whatsapp" size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={upgradeStyles.payButtonText}>Send Receipt via WhatsApp</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
}

// ==========================================
// 4. SALES PITCH UI (Free Users)
// ==========================================
function SalesPitchUI() {
  const insets = useSafeAreaInsets();
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState<'buyers' | 'sellers'>('buyers');
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLANS | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const buyerFeatures = [
    { title: 'Compare products with 5+ verified companies', isReady: true },
    { title: 'Best market price instantly', isReady: true },
    { title: 'Transportation support available', isReady: true },
    { title: 'Pay later options (as per bank/NBFC rules)', isReady: false },
    { title: 'Full support from Prochem team', isReady: true },
  ];

  const sellerFeatures = [
    { title: 'Direct bulk buyers, no middleman', isReady: true },
    { title: 'No time waste', isReady: true },
    { title: 'Dashboard marketing in app', isReady: true },
    { title: 'Product promotion via WhatsApp & Email', isReady: false },
    { title: '100% secure payments', isReady: true },
    { title: '100% upfront payment assurance', isReady: true },
    { title: 'Full support from Prochem team', isReady: true },
  ];

  const featuresToDisplay = activeTab === 'buyers' ? buyerFeatures : sellerFeatures;

  const handleUpgradeNow = () => {
    if (!selectedPlan) {
      Alert.alert('Select a Plan', 'Please select a plan before proceeding.');
      return;
    }
    setShowUpgradeModal(true);
  };

  const handleTalkToSales = () => {
    const msg = encodeURIComponent(`Hi, I'm interested in learning more about Prochem's Business Growth Package. My User ID is: ${user?.uid || 'N/A'}`);
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`);
  };

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.heroSection}>
          <MaterialCommunityIcons name="rocket-launch" size={48} color="#FBBF24" style={styles.heroIcon} />
          <Text style={styles.heroTitle}>Supercharge Your B2B Business</Text>
          <Text style={styles.heroSubtitle}>
            Unlock premium tools, verified partners, and secure transactions with the Prochem Business Growth Package.
          </Text>
        </View>

        {/* Tab Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'buyers' && styles.toggleButtonActive]}
            onPress={() => setActiveTab('buyers')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeTab === 'buyers' && styles.toggleTextActive]}>
              For Buyers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'sellers' && styles.toggleButtonActive]}
            onPress={() => setActiveTab('sellers')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeTab === 'sellers' && styles.toggleTextActive]}>
              For Sellers
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text variant="titleMedium" style={styles.sectionHeader}>
            What you get as a {activeTab === 'buyers' ? 'Buyer' : 'Seller'}:
          </Text>
          <View style={styles.featuresList}>
            {featuresToDisplay.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                {feature.isReady ? (
                  <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
                ) : (
                  <MaterialCommunityIcons name="clock-fast" size={24} color="#F59E0B" />
                )}
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureText}>{feature.title}</Text>
                  {!feature.isReady && (
                    <Surface style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Coming Soon</Text>
                    </Surface>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Plan Selection */}
        <View style={styles.pricingSection}>
          <Text variant="titleLarge" style={styles.pricingHeader}>Choose Your Plan</Text>

          {/* Standard Plan Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSelectedPlan('standard')}
          >
            <Card
              style={[
                styles.pricingCard,
                selectedPlan === 'standard' && upgradeStyles.selectedCard,
              ]}
              mode="outlined"
            >
              <Card.Content style={styles.pricingCardContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.planTitle}>Standard Plan</Text>
                  <View style={[
                    upgradeStyles.radioCircle,
                    selectedPlan === 'standard' && upgradeStyles.radioCircleSelected,
                  ]}>
                    {selectedPlan === 'standard' && (
                      <View style={upgradeStyles.radioInner} />
                    )}
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceSymbol}>₹</Text>
                  <Text style={styles.priceAmount}>50,000</Text>
                  <Text style={styles.priceDuration}>/ Year</Text>
                </View>
                <Text style={styles.planDescription}>
                  Perfect for businesses looking to scale their sourcing and sales.
                </Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>

          {/* Growth Plan Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSelectedPlan('growth')}
          >
            <Card
              style={[
                styles.pricingCard,
                styles.premiumCard,
                selectedPlan === 'growth' && upgradeStyles.selectedCard,
              ]}
              mode="elevated"
            >
              <View style={styles.bestValueBanner}>
                <MaterialCommunityIcons name="star" size={14} color="#78350F" style={{ marginRight: 4 }} />
                <Text style={styles.bestValueText}>BEST VALUE — SAVE ₹50,000</Text>
              </View>
              <Card.Content style={styles.pricingCardContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.planTitle, { color: '#B45309' }]}>3-Year Growth Plan</Text>
                  <View style={[
                    upgradeStyles.radioCircle,
                    selectedPlan === 'growth' && upgradeStyles.radioCircleSelected,
                  ]}>
                    {selectedPlan === 'growth' && <View style={upgradeStyles.radioInner} />}
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceSymbol}>₹</Text>
                  <Text style={styles.priceAmount}>1,00,000</Text>
                  <Text style={styles.priceDuration}>/ 3 Years</Text>
                </View>
                <Text style={styles.planDescription}>
                  Lock in the best rates and secure your platform growth long-term.
                </Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <Surface
        style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
        elevation={4}
      >
        <Button
          mode="outlined"
          style={styles.salesButton}
          onPress={handleTalkToSales}
          icon="phone-outline"
        >
          Talk to Sales
        </Button>
        <Button
          mode="contained"
          style={[
            styles.upgradeButton,
            !selectedPlan && { opacity: 0.5 },
          ]}
          buttonColor="#F59E0B"
          textColor="#ffffff"
          onPress={handleUpgradeNow}
        >
          Upgrade Now
        </Button>
      </Surface>

      {/* Upgrade Payment Modal */}
      <UpgradePaymentModal
        visible={showUpgradeModal}
        plan={selectedPlan ? PLANS[selectedPlan] : null}
        onClose={() => setShowUpgradeModal(false)}
      />
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  premiumHeader: { backgroundColor: '#1E293B', paddingHorizontal: 20, paddingBottom: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 4 },
  premiumToggleContainer: { flexDirection: 'row', backgroundColor: 'white', marginHorizontal: 20, marginTop: -25, borderRadius: 12, padding: 4, elevation: 4 },
  productCard: { width: '48%', marginBottom: 16, backgroundColor: 'white' },
  imagePlaceholder: { width: 60, height: 60, backgroundColor: '#F1F5F9', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 10 },
  input: { marginBottom: 10, backgroundColor: 'white' },
  toggleContainer: { flexDirection: 'row', backgroundColor: 'white', marginHorizontal: 20, marginTop: -25, borderRadius: 12, padding: 4, elevation: 4 },
  toggleButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  toggleButtonActive: { backgroundColor: '#F1F5F9' },
  toggleText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  toggleTextActive: { color: '#004AAD', fontWeight: '800' },
  scrollContent: { paddingBottom: 100 },
  heroSection: { backgroundColor: '#004AAD', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 50, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  heroIcon: { marginBottom: 16 },
  heroTitle: { color: '#FBBF24', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  heroSubtitle: { color: '#E2E8F0', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  featuresSection: { paddingHorizontal: 20, marginTop: 30 },
  sectionHeader: { fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  featuresList: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  featureTextContainer: { marginLeft: 12, flex: 1 },
  featureText: { fontSize: 15, color: '#334155', lineHeight: 22, fontWeight: '500' },
  comingSoonBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start' },
  comingSoonText: { color: '#D97706', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  pricingSection: { paddingHorizontal: 20, marginTop: 30, marginBottom: 20 },
  pricingHeader: { fontWeight: 'bold', textAlign: 'center', color: '#1E293B', marginBottom: 20 },
  pricingCard: { backgroundColor: 'white', marginBottom: 16, borderColor: '#E2E8F0', borderRadius: 16 },
  premiumCard: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D', borderWidth: 2 },
  pricingCardContent: { padding: 20 },
  bestValueBanner: { backgroundColor: '#FDE68A', paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  bestValueText: { color: '#78350F', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
  planTitle: { fontSize: 18, fontWeight: '700', color: '#475569', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  priceSymbol: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginRight: 4 },
  priceAmount: { fontSize: 36, fontWeight: '900', color: '#1E293B' },
  priceDuration: { fontSize: 16, color: '#64748B', marginLeft: 4 },
  planDescription: { color: '#64748B', lineHeight: 20 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  salesButton: { flex: 1, marginRight: 10, borderColor: '#004AAD', borderRadius: 8 },
  upgradeButton: { flex: 1.5, borderRadius: 8 },
});

const upgradeStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', padding: 20, paddingTop: 28 },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, backgroundColor: '#F1F5F9', borderRadius: 20, padding: 6 },
  shieldIcon: { backgroundColor: '#EFF6FF', borderRadius: 50, padding: 14, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  amountLine: { fontSize: 15, color: '#64748B', marginTop: 6, textAlign: 'center' },
  detailsBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText: { fontSize: 14, color: '#334155', marginLeft: 8, flex: 1 },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE' },
  noteText: { fontSize: 13, color: '#1E40AF', marginLeft: 8, flex: 1, lineHeight: 20 },
  stepBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  stepLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  stepDescription: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
  payButton: { backgroundColor: '#004AAD', borderRadius: 10, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  payButtonText: { color: 'white', fontSize: 15, fontWeight: '700' },
  selectedCard: { borderColor: '#004AAD', borderWidth: 2, shadowColor: '#004AAD', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  radioCircleSelected: { borderColor: '#004AAD' },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#004AAD' },
});
