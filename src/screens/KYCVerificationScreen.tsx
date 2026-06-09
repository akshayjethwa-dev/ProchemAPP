// src/screens/KYCVerificationScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, IconButton, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
// In a real app, you would also import Firestore logic here to save the result.

export default function KYCVerificationScreen() {
  const navigation = useNavigation();
  const { user, setUser } = useAppStore(); // To update the state post-verification
  
  const [gstNumber, setGstNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedBusiness, setVerifiedBusiness] = useState<{name: string, status: string} | null>(null);

  const handleVerifyGST = () => {
    setError('');
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    
    if (!gstNumber || !gstRegex.test(gstNumber.toUpperCase())) {
      setError('Please enter a valid 15-character GST Number.');
      return;
    }

    setLoading(true);

    // MOCK BACKEND GST VERIFICATION API CALL
    setTimeout(() => {
      setLoading(false);
      
      // MOCK RESPONSE
      const isApiSuccess = true; 
      
      if (isApiSuccess) {
        setVerifiedBusiness({
          name: "Prochem Traders Pvt Ltd", // Mock fetched business name
          status: "Active"
        });
      } else {
        setError('The provided GST number is invalid or inactive.');
      }
    }, 2000);
  };

  const handleConfirmAndSave = async () => {
    setLoading(true);
    // TODO: Await actual update in Firestore -> updateDoc(doc(db, 'users', user.uid), { gstNumber, kycStatus: 'verified' })
    
    setTimeout(() => {
      // Update local store to remove the gating restriction immediately
      if (user) {
        setUser({
          ...user,
          gstNumber: gstNumber.toUpperCase(),
          kycStatus: 'verified',
          verified: true
        });
      }
      setLoading(false);
      
      // Go back to the screen the user was previously on
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('BuyerApp' as never);
      }
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Business Verification</Text>
        <View style={{ width: 48 }} /> {/* Balances header */}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content}>
          
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="shield-check" size={60} color="#2563EB" />
          </View>
          
          <Text style={styles.title}>Complete your KYC</Text>
          <Text style={styles.subtitle}>
            To keep our marketplace secure, we require businesses to verify their GST number before placing orders, negotiating, or adding products.
          </Text>

          {!verifiedBusiness ? (
            <>
              <TextInput
                mode="outlined"
                label="Enter GST Number"
                value={gstNumber}
                onChangeText={(text) => {
                  setGstNumber(text);
                  setError('');
                }}
                autoCapitalize="characters"
                maxLength={15}
                style={styles.input}
                error={!!error}
                left={<TextInput.Icon icon="card-account-details-outline" color="#64748B" />}
              />
              {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}

              <Button 
                mode="contained" 
                onPress={handleVerifyGST} 
                loading={loading}
                disabled={loading}
                style={styles.btn}
                contentStyle={styles.btnContent}
              >
                Verify Business
              </Button>
            </>
          ) : (
            <View style={styles.successCard}>
              <MaterialCommunityIcons name="check-circle" size={40} color="#059669" style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={styles.successTitle}>Business Verified Successfully</Text>
              
              <View style={styles.detailsBox}>
                <Text style={styles.label}>Legal Business Name:</Text>
                <Text style={styles.value}>{verifiedBusiness.name}</Text>
                
                <Text style={[styles.label, { marginTop: 12 }]}>GST Number:</Text>
                <Text style={styles.value}>{gstNumber.toUpperCase()}</Text>

                <Text style={[styles.label, { marginTop: 12 }]}>Status:</Text>
                <Text style={[styles.value, { color: '#059669' }]}>{verifiedBusiness.status}</Text>
              </View>

              <Button 
                mode="contained" 
                onPress={handleConfirmAndSave} 
                loading={loading}
                style={[styles.btn, { marginTop: 24 }]}
                contentStyle={styles.btnContent}
              >
                Confirm & Continue
              </Button>
              
              <Button 
                mode="text" 
                onPress={() => setVerifiedBusiness(null)}
                style={{ marginTop: 8 }}
                textColor="#64748B"
              >
                Use a different GST
              </Button>
            </View>
          )}
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  keyboardView: { flex: 1 },
  content: { padding: 24 },
  iconContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#EFF6FF',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  input: { backgroundColor: '#FFFFFF', fontSize: 16 },
  btn: { borderRadius: 12, marginTop: 16, backgroundColor: '#2563EB' },
  btnContent: { paddingVertical: 8 },
  successCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  successTitle: { fontSize: 18, fontWeight: 'bold', color: '#065F46', textAlign: 'center', marginBottom: 20 },
  detailsBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  label: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 4 },
  value: { fontSize: 15, color: '#0F172A', fontWeight: 'bold' }
});