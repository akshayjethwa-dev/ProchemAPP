// File: src/screens/PayLaterCreditScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  IconButton,
  ActivityIndicator,
  Badge,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { useAppStore } from '../store/appStore';
import { DocumentAttachment, PayLaterApplication } from '../types';
import {
  submitPayLaterApplication,
  listenToPayLaterApplication,
} from '../services/payLaterService';

interface UploadedDocs {
  auditedFinancials: DocumentAttachment | null;
  itrCopies: DocumentAttachment | null;
  gstLastYear: DocumentAttachment | null;
  ageingSchedule: DocumentAttachment | null;
  counterpartyLedger: DocumentAttachment | null;
}

export default function PayLaterCreditScreen() {
  const navigation = useNavigation<any>();
  const { user, setUser } = useAppStore();

  const [loading, setLoading] = useState(!user?.payLaterApplication && !user?.payLaterStatus);
  const [submitting, setSubmitting] = useState(false);
  const [existingApp, setExistingApp] = useState<PayLaterApplication | null>(
    user?.payLaterApplication || null
  );
  const [showFormAnyway, setShowFormAnyway] = useState(false);

  // Form Fields
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [contactPerson, setContactPerson] = useState(user?.companyName || 'Business Owner');
  const [phone, setPhone] = useState(user?.phoneNumber || user?.phone || '');
  const [counterpartyType, setCounterpartyType] = useState<'buyer' | 'seller' | 'both'>('buyer');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [relationshipYears, setRelationshipYears] = useState('');
  const [limitsRequired, setLimitsRequired] = useState('');

  // Uploaded Files
  const [docs, setDocs] = useState<UploadedDocs>({
    auditedFinancials: null,
    itrCopies: null,
    gstLastYear: null,
    ageingSchedule: null,
    counterpartyLedger: null,
  });

  // Listen to application in real-time
  useEffect(() => {
    // If user already has application in state, show it immediately
    if (user?.payLaterApplication) {
      setExistingApp(user.payLaterApplication);
      setLoading(false);
    } else if (user?.payLaterStatus && user.payLaterStatus !== 'none') {
      setExistingApp({
        userId: user.uid,
        companyName: user.companyName || 'Business Entity',
        status: user.payLaterStatus,
        submittedAt: new Date().toISOString(),
        counterpartyName: 'Trading Partner',
        relationshipYears: 'Established',
        limitsRequired: user.payLaterApprovedLimit ? `${user.payLaterApprovedLimit}` : 'Under Review',
        approvedLimit: user.payLaterApprovedLimit,
      } as any);
      setLoading(false);
    }

    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Safety timeout: Guarantee the screen never hangs on loading
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    const unsubscribe = listenToPayLaterApplication(user.uid, (app) => {
      clearTimeout(safetyTimer);
      if (app) {
        setExistingApp(app);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid]);

  // Pick Document Handler
  const handlePickDocument = async (docKey: keyof UploadedDocs) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const docAttachment: DocumentAttachment = {
          name: file.name || 'document.pdf',
          size: file.size,
          uri: file.uri,
          mimeType: file.mimeType,
          uploadedAt: new Date().toISOString(),
        };

        setDocs((prev) => ({
          ...prev,
          [docKey]: docAttachment,
        }));
      }
    } catch (err: any) {
      console.error('File pick error:', err);
      Alert.alert('Upload Error', 'Could not select the file. Please try again.');
    }
  };

  // Remove Document
  const handleRemoveDoc = (docKey: keyof UploadedDocs) => {
    setDocs((prev) => ({
      ...prev,
      [docKey]: null,
    }));
  };

  // Format File Size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Form Submission
  const handleSubmit = async () => {
    if (!user?.uid) {
      Alert.alert('Authentication Required', 'Please sign in to apply for credit.');
      return;
    }

    if (!counterpartyName.trim()) {
      Alert.alert('Missing Detail', 'Please enter the Buyer or Seller name.');
      return;
    }

    if (!relationshipYears.trim()) {
      Alert.alert('Missing Detail', 'Please enter your years of relationship with this entity.');
      return;
    }

    if (!limitsRequired.trim()) {
      Alert.alert('Missing Detail', 'Please enter the credit limit amount required.');
      return;
    }

    // Check if at least some documents are attached
    if (!docs.auditedFinancials && !docs.itrCopies && !docs.gstLastYear && !docs.ageingSchedule && !docs.counterpartyLedger) {
      Alert.alert('Documents Required', 'Please upload your business documents to determine your credit limit.');
      return;
    }

    setSubmitting(true);

    try {
      const applicationPayload = {
        userId: user.uid,
        userEmail: user.email || '',
        userPhone: phone || user.phoneNumber || '',
        companyName: companyName || user.companyName || 'Business Entity',
        contactPerson: contactPerson || 'Authorized Signatory',
        gstNumber: user.gstNumber || '',
        counterpartyType,
        counterpartyName: counterpartyName.trim(),
        relationshipYears: relationshipYears.trim(),
        limitsRequired: limitsRequired.trim(),
        auditedFinancialsDoc: docs.auditedFinancials || undefined,
        itrCopiesDoc: docs.itrCopies || undefined,
        gstLastYearDoc: docs.gstLastYear || undefined,
        ageingScheduleDoc: docs.ageingSchedule || undefined,
        ledgerDoc: docs.counterpartyLedger || undefined,
      };

      const appId = await submitPayLaterApplication(applicationPayload);

      const submittedApp: PayLaterApplication = {
        ...applicationPayload,
        id: appId,
        status: 'under_review',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setExistingApp(submittedApp);
      if (setUser) {
        setUser({
          ...user,
          payLaterStatus: 'under_review',
          payLaterApplicationId: appId,
          payLaterApplication: submittedApp,
        });
      }

      setSubmitting(false);
      setShowFormAnyway(false);

      Alert.alert(
        'Application Submitted Successfully!',
        'Your credit limit documents have been received. Prochem credit team will review them and contact you with your approved limit amount, rates, and credit terms.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      setSubmitting(false);
      Alert.alert('Submission Error', error?.message || 'Failed to submit credit application. Please try again.');
    }
  };

  // Contact Support via Call or WhatsApp
  const handleContactDesk = () => {
    const phoneNo = '+917984856652';
    const msg = encodeURIComponent(`Hello Prochem Credit Team, I have submitted my PayLater credit application for ${user?.companyName || 'my company'}. Please update me on my credit limit status.`);
    const url = `https://wa.me/917984856652?text=${msg}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`tel:${phoneNo}`).catch(() => {
        Alert.alert('Credit Desk Contact', 'Please contact Prochem Credit Desk at credit@prochem.in or call +91-98765-43210.');
      });
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 16, color: '#64748B', fontWeight: '500' }}>
          Checking PayLater status...
        </Text>
      </View>
    );
  }

  // 1. APPLICATION IN PROCESS / UNDER REVIEW VIEW
  if (existingApp && existingApp.status === 'under_review' && !showFormAnyway) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>PayLater Credit Desk</Text>
            <Text style={styles.headerSubtitle}>Prochem Financial Services</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Status Hero Card */}
          <View style={styles.reviewHeroCard}>
            <View style={styles.reviewIconWrapper}>
              <MaterialCommunityIcons name="clock-time-four-outline" size={42} color="#D97706" />
            </View>

            <View style={styles.reviewBadge}>
              <Text style={styles.reviewBadgeText}>APPLICATION IN PROCESS</Text>
            </View>

            <Text style={styles.reviewMainTitle}>Wait to know your credit limit amount</Text>
            
            <Text style={styles.reviewDescription}>
              Your documents have been successfully received and are under assessment by our credit underwriting team.
            </Text>

            <View style={styles.contactNoticeBox}>
              <MaterialCommunityIcons name="information" size={20} color="#2563EB" style={{ marginTop: 2 }} />
              <Text style={styles.contactNoticeText}>
                The <Text style={{ fontWeight: 'bold' }}>Prochem team will contact you</Text> directly regarding your approved credit limit amount, interest rate, and flexible credit terms within 24–48 business hours.
              </Text>
            </View>
          </View>

          {/* Application Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.sectionHeading}>APPLICATION SUMMARY</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Requested Credit Limit</Text>
              <Text style={styles.infoValueHighlight}>
                {existingApp.limitsRequired?.startsWith('₹') ? existingApp.limitsRequired : `₹${existingApp.limitsRequired}`}
              </Text>
            </View>
            <Divider style={styles.itemDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trading Partner ({existingApp.counterpartyType || 'Entity'})</Text>
              <Text style={styles.infoValue}>{existingApp.counterpartyName}</Text>
            </View>
            <Divider style={styles.itemDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Relationship Duration</Text>
              <Text style={styles.infoValue}>{existingApp.relationshipYears}</Text>
            </View>
            <Divider style={styles.itemDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Submitted Date</Text>
              <Text style={styles.infoValue}>
                {existingApp.submittedAt ? new Date(existingApp.submittedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }) : 'Recently'}
              </Text>
            </View>
          </View>

          {/* Uploaded Documents Status */}
          <View style={styles.summaryCard}>
            <Text style={styles.sectionHeading}>SUBMITTED VERIFICATION DOCUMENTS</Text>

            <View style={styles.docStatusItem}>
              <MaterialCommunityIcons 
                name={existingApp.auditedFinancialsDoc ? "check-circle" : "alert-circle-outline"} 
                size={20} 
                color={existingApp.auditedFinancialsDoc ? "#059669" : "#94A3B8"} 
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docStatusTitle}>2 Years Audited Financials</Text>
                <Text style={styles.docStatusSub}>
                  {existingApp.auditedFinancialsDoc ? (existingApp.auditedFinancialsDoc.name || 'Uploaded ✓') : 'Not Provided'}
                </Text>
              </View>
            </View>
            <Divider style={styles.itemDivider} />

            <View style={styles.docStatusItem}>
              <MaterialCommunityIcons 
                name={existingApp.itrCopiesDoc ? "check-circle" : "alert-circle-outline"} 
                size={20} 
                color={existingApp.itrCopiesDoc ? "#059669" : "#94A3B8"} 
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docStatusTitle}>ITR Copies</Text>
                <Text style={styles.docStatusSub}>
                  {existingApp.itrCopiesDoc ? (existingApp.itrCopiesDoc.name || 'Uploaded ✓') : 'Not Provided'}
                </Text>
              </View>
            </View>
            <Divider style={styles.itemDivider} />

            <View style={styles.docStatusItem}>
              <MaterialCommunityIcons 
                name={existingApp.gstLastYearDoc ? "check-circle" : "alert-circle-outline"} 
                size={20} 
                color={existingApp.gstLastYearDoc ? "#059669" : "#94A3B8"} 
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docStatusTitle}>GST Returns of Last 1 Year</Text>
                <Text style={styles.docStatusSub}>
                  {existingApp.gstLastYearDoc ? (existingApp.gstLastYearDoc.name || 'Uploaded ✓') : 'Not Provided'}
                </Text>
              </View>
            </View>
            <Divider style={styles.itemDivider} />

            <View style={styles.docStatusItem}>
              <MaterialCommunityIcons 
                name={existingApp.ageingScheduleDoc ? "check-circle" : "alert-circle-outline"} 
                size={20} 
                color={existingApp.ageingScheduleDoc ? "#059669" : "#94A3B8"} 
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docStatusTitle}>Receivable & Payable Ageing Schedule</Text>
                <Text style={styles.docStatusSub}>
                  {existingApp.ageingScheduleDoc ? (existingApp.ageingScheduleDoc.name || 'Uploaded ✓') : 'Not Provided'}
                </Text>
              </View>
            </View>
            <Divider style={styles.itemDivider} />

            <View style={styles.docStatusItem}>
              <MaterialCommunityIcons 
                name={existingApp.ledgerDoc ? "check-circle" : "alert-circle-outline"} 
                size={20} 
                color={existingApp.ledgerDoc ? "#059669" : "#94A3B8"} 
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docStatusTitle}>Counterparty Trade Ledger (Last 1 Year)</Text>
                <Text style={styles.docStatusSub}>
                  {existingApp.ledgerDoc ? (existingApp.ledgerDoc.name || 'Uploaded ✓') : 'Not Provided'}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <Button
              mode="contained"
              icon="phone-outline"
              style={styles.contactBtn}
              contentStyle={styles.btnContent}
              buttonColor="#2563EB"
              onPress={handleContactDesk}
            >
              Contact Prochem Credit Desk
            </Button>

            <Button
              mode="outlined"
              icon="file-upload-outline"
              style={styles.reapplyBtn}
              textColor="#475569"
              onPress={() => setShowFormAnyway(true)}
            >
              Submit Updated Financials / Re-apply
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 2. CREDIT APPROVED VIEW
  if (existingApp && existingApp.status === 'approved' && !showFormAnyway) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>PayLater Credit Line</Text>
            <Text style={styles.headerSubtitle}>Active Credit Limit</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.reviewHeroCard, { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' }]}>
            <View style={[styles.reviewIconWrapper, { backgroundColor: '#DCFCE7' }]}>
              <MaterialCommunityIcons name="shield-check" size={42} color="#059669" />
            </View>

            <View style={[styles.reviewBadge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.reviewBadgeText, { color: '#166534' }]}>CREDIT APPROVED</Text>
            </View>

            <Text style={styles.reviewMainTitle}>Prochem Credit Line Active</Text>
            
            <View style={{ marginVertical: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>APPROVED CREDIT LIMIT</Text>
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#0F172A', marginTop: 4 }}>
                ₹{(existingApp.approvedLimit || 1000000).toLocaleString('en-IN')}
              </Text>
              {existingApp.approvedRate && (
                <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600', marginTop: 2 }}>
                  Interest Rate: {existingApp.approvedRate} • {existingApp.creditPeriodDays || 30} Days Cycle
                </Text>
              )}
            </View>

            <Text style={[styles.reviewDescription, { color: '#334155' }]}>
              You can now select "Prochem PayLater" during checkout for wholesale chemical purchases.
            </Text>
          </View>

          <View style={styles.actionSection}>
            <Button
              mode="contained"
              icon="cart-outline"
              style={styles.contactBtn}
              contentStyle={styles.btnContent}
              buttonColor="#059669"
              onPress={() => navigation.navigate('BuyerTabs')}
            >
              Browse Chemicals & Order
            </Button>

            <Button
              mode="outlined"
              icon="refresh"
              style={styles.reapplyBtn}
              textColor="#475569"
              onPress={() => setShowFormAnyway(true)}
            >
              Request Limit Enhancement
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 3. APPLICATION FORM VIEW
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Get PayLater Credit</Text>
          <Text style={styles.headerSubtitle}>B2B Trade Credit Financing</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Intro Card */}
        <View style={styles.heroIntroCard}>
          <View style={styles.heroIconBox}>
            <MaterialCommunityIcons name="credit-card-fast-outline" size={28} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Unlock Up to ₹2 Crore Credit</Text>
            <Text style={styles.heroSubtitle}>
              Upload your audited financials and business records. Prochem credit underwriters will review your documents and contact you directly with your approved credit limit amount and interest rate.
            </Text>
          </View>
        </View>

        {/* SECTION 1: TRADE & COUNTERPARTY DETAILS */}
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="handshake-outline" size={20} color="#2563EB" />
            <Text style={styles.cardTitle}>Trade & Counterparty Relationship</Text>
          </View>

          {/* Counterparty Type Selection */}
          <Text style={styles.inputLabel}>Relationship Entity Type</Text>
          <View style={styles.typeSelectorRow}>
            {(['buyer', 'seller', 'both'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                activeOpacity={0.8}
                style={[
                  styles.typeChip,
                  counterpartyType === type && styles.typeChipSelected,
                ]}
                onPress={() => setCounterpartyType(type)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    counterpartyType === type && styles.typeChipTextSelected,
                  ]}
                >
                  {type === 'both' ? 'Both (Buyer & Seller)' : type === 'buyer' ? 'Buyer Partner' : 'Seller Partner'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Buyer / Seller Name */}
          <Text style={styles.inputLabel}>Buyer / Seller Company Name *</Text>
          <TextInput
            placeholder="e.g. Gujarat Alkalies & Chemicals Ltd"
            value={counterpartyName}
            onChangeText={setCounterpartyName}
            mode="outlined"
            style={styles.textInput}
            outlineStyle={styles.inputOutline}
          />

          {/* Years of Relationship */}
          <Text style={styles.inputLabel}>Years of Business Relationship *</Text>
          <TextInput
            placeholder="e.g. 3 Years, 5 Years"
            value={relationshipYears}
            onChangeText={setRelationshipYears}
            mode="outlined"
            style={styles.textInput}
            outlineStyle={styles.inputOutline}
          />

          {/* Limits Required */}
          <Text style={styles.inputLabel}>Credit Limit Required (in ₹) *</Text>
          <TextInput
            placeholder="e.g. 25,00,000 or 50 Lakhs"
            value={limitsRequired}
            onChangeText={setLimitsRequired}
            mode="outlined"
            style={styles.textInput}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Affix text="₹ " />}
          />
        </View>

        {/* SECTION 2: REQUIRED DOCUMENTS */}
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="file-document-multiple-outline" size={20} color="#2563EB" />
            <Text style={styles.cardTitle}>Required Financial Documents</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Please upload clear PDF, Excel, or scanned copies of the documents below to evaluate your credit limit:
          </Text>

          {/* Document 1: 2 years audited financials */}
          {renderUploadSlot({
            num: 1,
            title: '2 Years Audited Financials',
            description: 'Balance Sheet, Profit & Loss Statements, Audit Reports',
            docKey: 'auditedFinancials',
            file: docs.auditedFinancials,
            onPick: () => handlePickDocument('auditedFinancials'),
            onRemove: () => handleRemoveDoc('auditedFinancials'),
          })}

          <Divider style={styles.itemDivider} />

          {/* Document 2: ITR copies */}
          {renderUploadSlot({
            num: 2,
            title: 'ITR Copies',
            description: 'Last 2 Assessment Years Income Tax Return Acknowledgements',
            docKey: 'itrCopies',
            file: docs.itrCopies,
            onPick: () => handlePickDocument('itrCopies'),
            onRemove: () => handleRemoveDoc('itrCopies'),
          })}

          <Divider style={styles.itemDivider} />

          {/* Document 3: GST of last 1 year */}
          {renderUploadSlot({
            num: 3,
            title: 'GST Returns of Last 1 Year',
            description: 'GSTR-3B & GSTR-1 filings summary or Annual GST returns',
            docKey: 'gstLastYear',
            file: docs.gstLastYear,
            onPick: () => handlePickDocument('gstLastYear'),
            onRemove: () => handleRemoveDoc('gstLastYear'),
          })}

          <Divider style={styles.itemDivider} />

          {/* Document 4: Receivable & payable ageing schedule */}
          {renderUploadSlot({
            num: 4,
            title: 'Receivable & Payable Ageing Schedule',
            description: 'Detailed Debtors and Creditors ageing report from accounting software',
            docKey: 'ageingSchedule',
            file: docs.ageingSchedule,
            onPick: () => handlePickDocument('ageingSchedule'),
            onRemove: () => handleRemoveDoc('ageingSchedule'),
          })}

          <Divider style={styles.itemDivider} />

          {/* Document 5: Last 1 year ledger */}
          {renderUploadSlot({
            num: 5,
            title: 'Last 1 Year Trade Ledger',
            description: 'Ledger statement between your entity and the specified Buyer/Seller',
            docKey: 'counterpartyLedger',
            file: docs.counterpartyLedger,
            onPick: () => handlePickDocument('counterpartyLedger'),
            onRemove: () => handleRemoveDoc('counterpartyLedger'),
          })}
        </View>

        {/* SECTION 3: APPLICANT ENTITY CONFIRMATION */}
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="domain" size={20} color="#2563EB" />
            <Text style={styles.cardTitle}>Applicant Entity Details</Text>
          </View>

          <Text style={styles.inputLabel}>Your Registered Company Name</Text>
          <TextInput
            value={companyName}
            onChangeText={setCompanyName}
            mode="outlined"
            style={styles.textInput}
            outlineStyle={styles.inputOutline}
          />

          <Text style={styles.inputLabel}>Contact Person / Signatory</Text>
          <TextInput
            value={contactPerson}
            onChangeText={setContactPerson}
            mode="outlined"
            style={styles.textInput}
            outlineStyle={styles.inputOutline}
          />

          <Text style={styles.inputLabel}>Registered Mobile Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.textInput}
            outlineStyle={styles.inputOutline}
          />
        </View>

        {/* Process Info Callout */}
        <View style={styles.infoCallout}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#0369A1" style={{ marginTop: 2 }} />
          <Text style={styles.infoCalloutText}>
            After submitting your documents, your application status will show as <Text style={{ fontWeight: 'bold' }}>"In Process"</Text>. Prochem credit underwriters will verify your documentation and call you with your sanctioned credit limit, interest rates, and revolving credit contract.
          </Text>
        </View>

        {/* SUBMIT BUTTON */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          icon="send-check"
          style={styles.submitBtn}
          contentStyle={styles.btnContent}
          labelStyle={styles.btnLabel}
        >
          Submit Documents to Know Credit Limit
        </Button>

        {/* Safe Footnote */}
        <View style={styles.footnote}>
          <MaterialCommunityIcons name="shield-lock-outline" size={16} color="#64748B" />
          <Text style={styles.footnoteText}>
            Your financial data is protected by 256-bit encryption and reviewed solely for credit assessment.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Helper to render an upload slot
  function renderUploadSlot({
    num,
    title,
    description,
    file,
    onPick,
    onRemove,
  }: {
    num: number;
    title: string;
    description: string;
    docKey: keyof UploadedDocs;
    file: DocumentAttachment | null;
    onPick: () => void;
    onRemove: () => void;
  }) {
    return (
      <View style={styles.uploadSlot}>
        <View style={styles.uploadSlotHeader}>
          <View style={styles.slotBadge}>
            <Text style={styles.slotBadgeText}>{num}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.uploadTitle}>{title}</Text>
            <Text style={styles.uploadDesc}>{description}</Text>
          </View>
        </View>

        {file ? (
          <View style={styles.fileCard}>
            <MaterialCommunityIcons name="file-check" size={28} color="#059669" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
              <Text style={styles.fileMeta}>
                {formatFileSize(file.size)} • Ready for review
              </Text>
            </View>
            <TouchableOpacity onPress={onRemove} style={styles.removeFileBtn}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.8} style={styles.uploadButtonBox} onPress={onPick}>
            <MaterialCommunityIcons name="cloud-upload-outline" size={24} color="#2563EB" />
            <Text style={styles.uploadButtonText}>Select Document (PDF / Excel / Image)</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroIntroCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 12,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 12,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    fontSize: 14,
  },
  inputOutline: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  typeChipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  typeChipTextSelected: {
    color: '#2563EB',
  },
  uploadSlot: {
    marginVertical: 6,
  },
  uploadSlotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  slotBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  slotBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  uploadDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  uploadButtonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    backgroundColor: '#F0F7FF',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  fileName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#15803D',
  },
  fileMeta: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  removeFileBtn: {
    padding: 4,
  },
  itemDivider: {
    marginVertical: 12,
    backgroundColor: '#F1F5F9',
  },
  infoCallout: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 10,
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 18,
  },
  submitBtn: {
    borderRadius: 12,
    backgroundColor: '#2563EB',
    marginTop: 8,
  },
  btnContent: {
    paddingVertical: 10,
  },
  btnLabel: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  footnoteText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    flex: 1,
  },

  // Review State Styles
  reviewHeroCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  reviewIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  reviewMainTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  reviewDescription: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  contactNoticeBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 10,
    width: '100%',
  },
  contactNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoValueHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  docStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  docStatusTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  docStatusSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  actionSection: {
    gap: 10,
    marginTop: 8,
  },
  contactBtn: {
    borderRadius: 12,
  },
  reapplyBtn: {
    borderRadius: 12,
    borderColor: '#CBD5E1',
  },
});
