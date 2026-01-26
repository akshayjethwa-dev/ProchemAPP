import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, ActivityIndicator, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { validateGST } from '../services/gstService';

export default function RegistrationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { mobile } = route.params || {}; 

  const [form, setForm] = useState({
    email: '',
    password: '',
    companyName: '',
    gstNumber: '',
    address: ''
  });

  // ✅ NEW: Comprehensive Error State
  const [errors, setErrors] = useState({
    companyName: '',
    email: '',
    password: '',
    gstNumber: '',
    address: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [gstLoading, setGstLoading] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Helper to clear errors on typing
  const updateForm = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear the specific error when user types
    if (errors[key as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleVerifyGST = async () => {
    if (!form.gstNumber) {
      setErrors(prev => ({ ...prev, gstNumber: 'GST Number is required to verify' }));
      return;
    }
    if (form.gstNumber.length < 15) {
      setErrors(prev => ({ ...prev, gstNumber: 'GSTIN must be 15 characters' }));
      return;
    }
    
    setGstLoading(true);
    setErrors(prev => ({ ...prev, gstNumber: '' })); // Clear error before verifying
    
    const result = await validateGST(form.gstNumber);
    
    setGstLoading(false);
    if (result.isValid) {
      setGstVerified(true);
      if (result.legalName) {
        setForm(prev => ({ ...prev, companyName: result.legalName! }));
        // Also clear company name error if it was auto-filled
        setErrors(prev => ({ ...prev, companyName: '' }));
      }
      Alert.alert('Success', 'GSTIN is Valid & Active!');
    } else {
      setGstVerified(false);
      setErrors(prev => ({ ...prev, gstNumber: result.message || 'Invalid GSTIN' }));
    }
  };

  const validateInputs = () => {
    let isValid = true;
    let newErrors = { ...errors };

    // 1. GST Validation
    if (!form.gstNumber) {
      newErrors.gstNumber = 'GST Number is required';
      isValid = false;
    } else if (form.gstNumber.length < 15) {
      newErrors.gstNumber = 'GSTIN must be 15 characters';
      isValid = false;
    }

    // 2. Company Name
    if (!form.companyName.trim()) {
      newErrors.companyName = 'Company / Business Name is required';
      isValid = false;
    }

    // 3. Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) {
      newErrors.email = 'Email Address is required';
      isValid = false;
    } else if (!emailRegex.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // 4. Password Validation
    // Min 8 chars, 1 Uppercase, 1 Number, 1 Special Char
    const passRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!form.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (!passRegex.test(form.password)) {
      newErrors.password = 'Must be 8+ chars, 1 Uppercase, 1 Number, 1 Special Char';
      isValid = false;
    }

    // 5. Address Validation
    if (!form.address.trim()) {
      newErrors.address = 'Business Address is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    // 1. Run All Field Checks
    if (!validateInputs()) {
      // If validation fails, errors are already set in state, showing red text.
      return; 
    }

    // 2. Check Verification Status
    if (!gstVerified) {
      Alert.alert('Verification Required', 'Please click the "Verify" button for your GST Number.');
      setErrors(prev => ({ ...prev, gstNumber: 'Please verify this GST Number first' }));
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'users', uid), {
        uid,
        email: form.email,
        phone: mobile || '',
        userType: 'dual', 
        companyName: form.companyName,
        gstNumber: form.gstNumber,
        address: form.address,
        verified: true,
        kycStatus: 'verified',
        createdAt: serverTimestamp(),
      });

      Alert.alert('Welcome!', 'Account created successfully.');
      // Navigation handled by RootNavigator
      
    } catch (error: any) {
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered.';
        setErrors(prev => ({ ...prev, email: msg }));
      }
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
            <Text variant="headlineSmall" style={{fontWeight:'bold'}}>
              Create Account
            </Text>
          </View>

          <View style={styles.form}>
            
            {/* GST Field */}
            <View style={{marginBottom: 4}}>
              <View style={{flexDirection:'row', alignItems:'flex-start'}}>
                <TextInput
                  label="GST Number *"
                  value={form.gstNumber}
                  onChangeText={(t) => {
                    setForm(prev => ({ ...prev, gstNumber: t.toUpperCase() }));
                    setGstVerified(false); 
                    if (errors.gstNumber) setErrors(prev => ({ ...prev, gstNumber: '' }));
                  }}
                  mode="outlined"
                  maxLength={15}
                  error={!!errors.gstNumber}
                  style={{flex:1, backgroundColor:'white'}}
                  right={
                    gstLoading ? <TextInput.Icon icon={() => <ActivityIndicator size="small"/>} /> :
                    gstVerified ? <TextInput.Icon icon="check-circle" color="green" forceTextInputFocus={false} /> : null
                  }
                />
                <Button 
                  mode="contained-tonal" 
                  onPress={handleVerifyGST} 
                  disabled={gstLoading || gstVerified} 
                  style={{marginLeft:8, height:50, justifyContent:'center', marginTop: 6}}
                >
                  Verify
                </Button>
              </View>
              <HelperText type="error" visible={!!errors.gstNumber}>
                {errors.gstNumber}
              </HelperText>
            </View>

            {/* Company Name */}
            <View style={{marginBottom: 4}}>
              <TextInput 
                label="Company Name *" 
                value={form.companyName} 
                onChangeText={(t) => updateForm('companyName', t)} 
                mode="outlined" 
                error={!!errors.companyName}
                style={styles.input} 
              />
              <HelperText type="error" visible={!!errors.companyName}>
                {errors.companyName}
              </HelperText>
            </View>

            {/* Email */}
            <View style={{marginBottom: 4}}>
              <TextInput 
                label="Email Address *" 
                value={form.email} 
                onChangeText={(t) => updateForm('email', t)} 
                mode="outlined" 
                keyboardType="email-address" 
                autoCapitalize="none" 
                error={!!errors.email}
                style={styles.input} 
              />
              <HelperText type="error" visible={!!errors.email}>
                {errors.email}
              </HelperText>
            </View>
            
            {/* Password Field */}
            <View style={{marginBottom: 4}}>
              <TextInput 
                label="Password *" 
                value={form.password} 
                onChangeText={(t) => updateForm('password', t)} 
                mode="outlined" 
                secureTextEntry={secureTextEntry} 
                error={!!errors.password}
                style={styles.input}
                right={
                  <TextInput.Icon 
                    icon={secureTextEntry ? "eye" : "eye-off"} 
                    onPress={() => setSecureTextEntry(!secureTextEntry)} 
                    forceTextInputFocus={false} 
                  />
                }
              />
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>
            </View>

            {/* Address */}
            <View style={{marginBottom: 4}}>
              <TextInput 
                label="Business Address *" 
                value={form.address} 
                onChangeText={(t) => updateForm('address', t)} 
                mode="outlined" 
                multiline 
                numberOfLines={3}
                error={!!errors.address}
                style={styles.input} 
              />
              <HelperText type="error" visible={!!errors.address}>
                {errors.address}
              </HelperText>
            </View>

            <Button mode="contained" onPress={handleRegister} loading={loading} style={styles.btn} contentStyle={{height: 50}}>
              Create Business Account
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 10, flexDirection: 'row', alignItems: 'center' },
  content: { padding: 20 },
  form: { marginTop: 10 },
  input: { backgroundColor: 'white' },
  btn: { marginTop: 20, borderRadius: 8, backgroundColor: '#004AAD' }
});