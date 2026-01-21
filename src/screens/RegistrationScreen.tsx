import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, HelperText, useTheme, Checkbox, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { registerUser } from '../services/authService';

export default function RegistrationScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const theme = useTheme();
  
  const { role } = route.params || { role: 'buyer' };
  const isSeller = role === 'seller';

  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '', // ✅ Mobile
    gstNumber: '',
    address: '',
    pincode: '', // ✅ Pincode
    password: '',
  });

  // ✅ Document Upload State (Simulated)
  const [documents, setDocuments] = useState({
    gstin: false,
    shopLicense: false,
    udyogAadhar: false,
  });

  const [loading, setLoading] = useState(false);

  const toggleDocument = (docKey: keyof typeof documents) => {
    setDocuments(prev => ({ ...prev, [docKey]: !prev[docKey] }));
  };

  const handleRegister = async () => {
    // Basic Validation
    if (!formData.companyName || !formData.email || !formData.password || !formData.phone || !formData.address || !formData.pincode) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    
    // Strict GST validation for sellers
    if (isSeller && (!formData.gstNumber || formData.gstNumber.length !== 15)) {
      Alert.alert('Compliance Error', 'Valid 15-digit GST Number is required for Sellers.');
      return;
    }

    // Document Validation
    if (!documents.gstin) {
      Alert.alert('Compliance Error', 'Please upload/verify your GSTIN document.');
      return;
    }

    setLoading(true);
    try {
      await registerUser(formData.email, formData.password, role, {
        companyName: formData.companyName,
        gstNumber: formData.gstNumber,
        phone: formData.phone,
        address: formData.address,
        pincode: formData.pincode,
        documents: documents
      });
      // Auth listener handles navigation
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            {isSeller ? 'Seller Registration' : 'Buyer Registration'}
          </Text>
          <Text variant="bodyMedium" style={{color: '#666'}}>
            {isSeller ? 'Verify your business to start selling' : 'Create account to browse chemicals'}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Company Name *"
            value={formData.companyName}
            onChangeText={(t) => setFormData({...formData, companyName: t})}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="Email *"
            value={formData.email}
            onChangeText={(t) => setFormData({...formData, email: t})}
            mode="outlined"
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            label="Mobile Number *"
            value={formData.phone}
            onChangeText={(t) => setFormData({...formData, phone: t})}
            mode="outlined"
            keyboardType="phone-pad"
            maxLength={10}
            style={styles.input}
          />

          <TextInput
            label="Password *"
            value={formData.password}
            onChangeText={(t) => setFormData({...formData, password: t})}
            secureTextEntry
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="GST Number *"
            value={formData.gstNumber}
            onChangeText={(t) => setFormData({...formData, gstNumber: t.toUpperCase()})}
            mode="outlined"
            maxLength={15}
            style={styles.input}
          />
          <HelperText type="info">Required for tax invoicing</HelperText>

          <View style={styles.row}>
            <TextInput
              label="Address *"
              value={formData.address}
              onChangeText={(t) => setFormData({...formData, address: t})}
              mode="outlined"
              style={[styles.input, {flex: 2, marginRight: 8}]}
            />
            <TextInput
              label="Pincode *"
              value={formData.pincode}
              onChangeText={(t) => setFormData({...formData, pincode: t})}
              mode="outlined"
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, {flex: 1}]}
            />
          </View>

          {/* ✅ Document Upload Section */}
          <Text variant="titleMedium" style={{marginTop: 16, marginBottom: 8, fontWeight:'bold'}}>
            Upload Verification Documents
          </Text>
          <Text variant="bodySmall" style={{marginBottom: 12, color:'#666'}}>
            Tap to simulate upload (Green = Uploaded)
          </Text>

          <View style={styles.docRow}>
            <Chip 
              icon={documents.gstin ? "check" : "upload"} 
              selected={documents.gstin} 
              onPress={() => toggleDocument('gstin')}
              style={styles.chip}
            >
              GSTIN Cert.
            </Chip>
            <Chip 
              icon={documents.shopLicense ? "check" : "upload"} 
              selected={documents.shopLicense} 
              onPress={() => toggleDocument('shopLicense')}
              style={styles.chip}
            >
              Shop License
            </Chip>
          </View>
          <View style={styles.docRow}>
            <Chip 
              icon={documents.udyogAadhar ? "check" : "upload"} 
              selected={documents.udyogAadhar} 
              onPress={() => toggleDocument('udyogAadhar')}
              style={styles.chip}
            >
              Udyog Aadhar
            </Chip>
          </View>

          <View style={styles.infoBox}>
            <Text style={{color:'#854d0e', fontSize: 12}}>
              ⚠️ Your account will be in <Text style={{fontWeight:'bold'}}>Pending Verification</Text> state. 
              {isSeller ? ' Selling ' : ' Buying '} will be restricted until approved.
            </Text>
          </View>

          <Button 
            mode="contained" 
            onPress={handleRegister} 
            loading={loading}
            style={styles.button}
            contentStyle={{height: 50}}
          >
            Create Account
          </Button>

          <Button mode="text" onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 24 },
  title: { fontWeight: 'bold', color: '#004AAD' },
  form: { gap: 8 },
  input: { backgroundColor: 'white' },
  row: { flexDirection: 'row' },
  button: { marginTop: 12, borderRadius: 12, backgroundColor: '#004AAD' },
  docRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: { flex: 1 },
  infoBox: { backgroundColor: '#fef9c3', padding: 12, borderRadius: 8, marginTop: 12, marginBottom: 4 }
});