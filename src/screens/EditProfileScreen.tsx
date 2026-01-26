import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, IconButton, Text, ActivityIndicator } from 'react-native-paper';
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

  // ✅ FIX: Watch for user changes and populate form automatically
  useEffect(() => {
    if (user) {
      setFormData({
        companyName: user.companyName || '',
        phone: user.phone || '',
        address: user.address || '',
        pincode: user.pincode ? String(user.pincode) : '', // Handle string/number conversion
        gstNumber: user.gstNumber || ''
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, formData);
      
      // Update local store
      setUser({ 
        ...user, 
        ...formData,
        pincode: formData.pincode 
      });
      
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineSmall" style={{fontWeight:'bold'}}>Edit Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          label="Company Name"
          value={formData.companyName}
          onChangeText={(t) => setFormData({...formData, companyName: t})}
          mode="outlined"
          style={styles.input}
        />
        <TextInput
          label="Phone Number"
          value={formData.phone}
          onChangeText={(t) => setFormData({...formData, phone: t})}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
        />
        <TextInput
          label="Address"
          value={formData.address}
          onChangeText={(t) => setFormData({...formData, address: t})}
          mode="outlined"
          multiline
          style={styles.input}
        />
        <TextInput
          label="Pincode"
          value={formData.pincode}
          onChangeText={(t) => setFormData({...formData, pincode: t})}
          mode="outlined"
          keyboardType="numeric"
          maxLength={6}
          style={styles.input}
        />
        <TextInput
          label="GST Number"
          value={formData.gstNumber}
          mode="outlined"
          disabled // GST usually shouldn't be changed easily
          style={[styles.input, {backgroundColor: '#f0f0f0'}]}
        />

        <Button 
          mode="contained" 
          onPress={handleUpdate} 
          loading={loading}
          style={styles.btn}
        >
          Save Changes
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  content: { padding: 20 },
  input: { marginBottom: 16, backgroundColor: 'white' },
  btn: { marginTop: 10, borderRadius: 8 }
});