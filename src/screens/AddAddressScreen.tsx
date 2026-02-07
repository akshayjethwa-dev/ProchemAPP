import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker'; // ✅ Import Picker
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { Address } from '../types';
import { INDIAN_STATES } from '../constants'; // ✅ Import States

export default function AddAddressScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(false);

  // Check if editing
  const addressToEdit = route.params?.addressToEdit;
  const isEditing = !!addressToEdit;

  const [form, setForm] = useState({
    label: '', 
    street: '',
    city: '',
    state: 'Gujarat', // ✅ Default State
    zipCode: '',
    country: 'India'
  });

  // ✅ Pre-fill form if editing
  useEffect(() => {
    if (isEditing) {
      setForm({
        label: addressToEdit.label,
        street: addressToEdit.street,
        city: addressToEdit.city,
        state: addressToEdit.state,
        zipCode: addressToEdit.zipCode,
        country: addressToEdit.country
      });
      navigation.setOptions({ title: 'Edit Address' });
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!form.label || !form.street || !form.city || !form.zipCode) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }

    setLoading(true);
    try {
      const currentAddresses = user?.addresses || [];
      let updatedAddresses: Address[] = [];

      if (isEditing) {
        // ✅ UPDATE Existing Address
        const updatedAddress: Address = {
          ...addressToEdit,
          ...form
        };

        updatedAddresses = currentAddresses.map(addr => 
          addr.id === addressToEdit.id ? updatedAddress : addr
        );

      } else {
        // ✅ ADD New Address
        const newAddress: Address = {
          id: Math.random().toString(36).substr(2, 9), 
          ...form
        };
        updatedAddresses = [...currentAddresses, newAddress];
      }

      // 1. Update Firestore
      const userRef = doc(db, 'users', user!.uid);
      await updateDoc(userRef, {
        addresses: updatedAddresses
      });

      // 2. Update Global Store
      if (setUser && user) {
        setUser({ 
          ...user, 
          addresses: updatedAddresses 
        });
      }

      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={{marginBottom: 20, fontWeight:'bold'}}>
        {isEditing ? 'Edit Address' : 'New Address'}
      </Text>

      <TextInput 
        label="Address Label (e.g., Main Warehouse)" 
        value={form.label} 
        onChangeText={t => setForm({...form, label: t})} 
        mode="outlined" 
        style={styles.input} 
      />
      
      <TextInput 
        label="Street Address / Area" 
        value={form.street} 
        onChangeText={t => setForm({...form, street: t})} 
        mode="outlined" 
        style={styles.input} 
      />

      <View style={styles.row}>
        <TextInput 
          label="City" 
          value={form.city} 
          onChangeText={t => setForm({...form, city: t})} 
          mode="outlined" 
          style={[styles.input, {flex:1, marginRight: 10}]} 
        />
        <TextInput 
          label="Pincode" 
          value={form.zipCode} 
          onChangeText={t => setForm({...form, zipCode: t})} 
          mode="outlined" 
          keyboardType="numeric"
          style={[styles.input, {flex:1}]} 
        />
      </View>

      {/* ✅ NEW: Dropdown for State Selection */}
      <Text style={{marginBottom: 5, color: '#666'}}>State</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.state}
          onValueChange={(itemValue) => setForm({...form, state: itemValue})}
        >
          {INDIAN_STATES.map((state) => (
            <Picker.Item key={state} label={state} value={state} />
          ))}
        </Picker>
      </View>

      <Button mode="contained" onPress={handleSave} loading={loading} style={styles.btn}>
        {isEditing ? 'Update Address' : 'Save Address'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: 'white', flexGrow: 1 },
  input: { marginBottom: 15, backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  pickerContainer: { 
    borderWidth: 1, 
    borderColor: '#79747E', 
    borderRadius: 5, 
    marginBottom: 15, 
    backgroundColor: 'white'
  },
  btn: { marginTop: 10, backgroundColor: '#004AAD' }
});