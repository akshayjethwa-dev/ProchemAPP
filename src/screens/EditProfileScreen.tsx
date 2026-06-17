// src/screens/EditProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, IconButton, useTheme, ProgressBar, HelperText, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { getProfileCompletion } from '../utils/profileCompletion';
import { validateGST, validatePassword } from '../utils/validators';

export default function EditProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const { user } = useAppStore();

  // Basic Profile Fields
  const [name, setName] = useState(user?.name || '');
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [email, setEmail] = useState(user?.email || '');
  // Initialize phone but we will NOT allow changing it
  const [phone, setPhone] = useState(user?.phone || user?.phoneNumber || '');
  const [gstNumber, setGstNumber] = useState(user?.gstNumber || '');

  // Password Fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation & UI State
  const [loading, setLoading] = useState(false);
  const [gstError, setGstError] = useState(false);
  const [pwdError, setPwdError] = useState('');
  
  // 🚀 FIXED: Profile Completion now includes phone
  const completionData = getProfileCompletion({
    ...user, 
    name, 
    companyName, 
    email, 
    gstNumber,
    phone
  } as any);

  // Real-time GST Validation
  useEffect(() => {
    if (gstNumber.length > 0) {
      setGstError(!validateGST(gstNumber));
    } else {
      setGstError(false);
    }
  }, [gstNumber]);

  const handleSave = async () => {
    if (gstError) {
      return Alert.alert('Error', 'Please fix the GST Number format.');
    }
    if (newPassword) {
      if (!validatePassword(newPassword)) {
        return setPwdError('Password must be at least 8 chars, contain 1 uppercase, and 1 number.');
      }
      if (newPassword !== confirmPassword) {
        return setPwdError('New passwords do not match.');
      }
    }

    setLoading(true);
    setPwdError('');

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      // Handle Password Updates
      if (newPassword && currentUser) {
        if (user?.hasPassword) {
          // Change existing password requires re-authentication
          if (!currentPassword) {
            setLoading(false);
            return setPwdError('Current password is required to change it.');
          }
          const credential = EmailAuthProvider.credential(user.email || currentUser.email || '', currentPassword);
          await reauthenticateWithCredential(currentUser, credential);
          await updatePassword(currentUser, newPassword);
        } else {
          // Set password for the first time (mobile-registered)
          await updatePassword(currentUser, newPassword);
        }
      }

      // Update Firestore Profile
      const userRef = doc(db, 'users', user!.uid);
      const updates: any = {
        name,
        companyName,
        email,
        gstNumber: gstNumber.toUpperCase(),
        // Note: We deliberately exclude phone from updates because it shouldn't be changeable
      };

      if (newPassword) {
        updates.hasPassword = true;
      }

      await updateDoc(userRef, updates);

      // Optimistically update the local Zustand store
      useAppStore.setState((state: any) => ({
        user: { ...state.user, ...updates }
      }));

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);

    } catch (error: any) {
      console.error('Profile Update Error:', error);
      Alert.alert('Update Failed', error.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const isMobileRegistrationWithoutPassword = user?.registrationType === 'mobile' && !user?.hasPassword;

  return (
    <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{width: 48}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Progress Bar Section */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Profile Completeness</Text>
            <Text style={styles.progressPercent}>{completionData.percentage}%</Text>
          </View>
          <ProgressBar progress={completionData.percentage / 100} color="#004AAD" style={styles.progressBar} />
        </View>

        {/* Basic Details */}
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <TextInput label="Full Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
        <TextInput label="Company / Business Name" value={companyName} onChangeText={setCompanyName} mode="outlined" style={styles.input} />
        
        {/* GST Field */}
        <TextInput 
          label="GST Number" 
          value={gstNumber} 
          onChangeText={t => setGstNumber(t.toUpperCase())} 
          mode="outlined" 
          style={styles.input}
          autoCapitalize="characters"
          error={gstError}
          maxLength={15}
        />
        <HelperText type="error" visible={gstError}>
          Invalid GST format (e.g., 22AAAAA0000A1Z5)
        </HelperText>

        <TextInput label="Email Address" value={email} onChangeText={setEmail} mode="outlined" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
        
        {/* 🚀 FIXED: Mobile Number Field - Hard-locked for all users */}
        <TextInput 
          label="Mobile Number" 
          value={phone} 
          mode="outlined" 
          style={styles.input} 
          disabled={true} 
          editable={false}
          right={<TextInput.Icon icon="lock" />}
        />
        <HelperText type="info" visible>Mobile number cannot be changed.</HelperText>

        <Divider style={styles.divider} />

        {/* Dynamic Password Section */}
        <Text style={styles.sectionTitle}>
          {isMobileRegistrationWithoutPassword 
            ? 'Set Password (Required for full access)' 
            : 'Change Password'}
        </Text>
        
        {/* ONLY show Current Password if they already have a password set */}
        {user?.hasPassword && (
          <TextInput 
            label="Current Password" 
            value={currentPassword} 
            onChangeText={setCurrentPassword} 
            mode="outlined" 
            style={styles.input}
            secureTextEntry={!showPassword} 
          />
        )}

        <TextInput 
          label="New Password" 
          value={newPassword} 
          onChangeText={setNewPassword} 
          mode="outlined" 
          style={styles.input}
          secureTextEntry={!showPassword} 
          right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
        />
        
        <TextInput 
          label="Confirm New Password" 
          value={confirmPassword} 
          onChangeText={setConfirmPassword} 
          mode="outlined" 
          style={styles.input}
          secureTextEntry={!showPassword} 
        />
        
        {!!pwdError && <HelperText type="error" visible>{pwdError}</HelperText>}
        {!pwdError && <HelperText type="info" visible>Min 8 characters, 1 uppercase, 1 number.</HelperText>}

        <Button 
          mode="contained" 
          onPress={handleSave} 
          loading={loading} 
          style={styles.saveBtn}
          contentStyle={{height: 52}}
        >
          Save Profile
        </Button>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  scrollContent: { padding: 20, paddingBottom: 60, backgroundColor: '#F8FAFC' },
  
  progressContainer: { backgroundColor: '#E0F2FE', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#BAE6FD' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressTitle: { fontSize: 14, fontWeight: 'bold', color: '#0369A1' },
  progressPercent: { fontSize: 14, fontWeight: 'bold', color: '#004AAD' },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: '#BAE6FD' },
  
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
  input: { marginBottom: 4, backgroundColor: 'white' },
  divider: { marginVertical: 24 },
  
  saveBtn: { marginTop: 24, borderRadius: 12, backgroundColor: '#004AAD' }
});