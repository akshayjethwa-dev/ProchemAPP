// src/screens/EditProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, IconButton, Text, ActivityIndicator, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({ 
    companyName: '', 
    phone: '', 
    address: '', 
    pincode: '', 
    gstNumber: '' 
  });

  useEffect(() => {
    if (user) {
      setFormData({
        companyName: user.companyName || '', 
        phone: user.phone || '', 
        address: user.address || '', 
        pincode: user.pincode ? String(user.pincode) : '', 
        gstNumber: user.gstNumber || ''
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), formData);
      setUser({ ...user, ...formData, pincode: formData.pincode });
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{fontWeight:'bold'}}>Company Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionTitle}>BUSINESS DETAILS</Text>
        <View style={styles.inputGroup}>
          <TextInput 
            label="Company Name" 
            value={formData.companyName} 
            onChangeText={(t) => setFormData({...formData, companyName: t})} 
            style={styles.input} 
            underlineColor="transparent" 
            theme={{colors: {background: 'transparent'}}}
          />
          <Divider />
          <TextInput 
            label="GST Number (Read Only)" 
            value={formData.gstNumber} 
            disabled 
            style={[styles.input, {backgroundColor: '#F8FAFC'}]} 
            underlineColor="transparent" 
            theme={{colors: {background: 'transparent'}}}
          />
        </View>

        <Text style={styles.sectionTitle}>CONTACT & LOCATION</Text>
        <View style={styles.inputGroup}>
          <TextInput 
            label="Phone Number" 
            value={formData.phone} 
            onChangeText={(t) => setFormData({...formData, phone: t})} 
            keyboardType="phone-pad" 
            style={styles.input} 
            underlineColor="transparent" 
            theme={{colors: {background: 'transparent'}}}
          />
          <Divider />
          <TextInput 
            label="Registered Address" 
            value={formData.address} 
            onChangeText={(t) => setFormData({...formData, address: t})} 
            multiline 
            style={styles.input} 
            underlineColor="transparent" 
            theme={{colors: {background: 'transparent'}}}
          />
          <Divider />
          <TextInput 
            label="Pincode" 
            value={formData.pincode} 
            onChangeText={(t) => setFormData({...formData, pincode: t})} 
            keyboardType="numeric" 
            maxLength={6} 
            style={styles.input} 
            underlineColor="transparent" 
            theme={{colors: {background: 'transparent'}}}
          />
        </View>

        <Button mode="contained" onPress={handleUpdate} loading={loading} style={styles.btn}>
          Save Changes
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' }, // Gray Background to make white cards pop
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 8 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748B', marginLeft: 16, marginBottom: 8, marginTop: 16, letterSpacing: 1 },
  inputGroup: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' }, // The grouped block
  input: { height: 56, paddingHorizontal: 4 }, // Flat inputs inside the group
  btn: { marginTop: 30, borderRadius: 8, paddingVertical: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});