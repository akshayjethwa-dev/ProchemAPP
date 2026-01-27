import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Checkbox, Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import uuid from 'react-native-uuid'; // Use simple random string if not installed: Math.random().toString()

export default function AddAddressScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAppStore();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    label: '', // e.g. Warehouse A
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India'
  });

  const handleSave = async () => {
    if (!form.label || !form.street || !form.city || !form.zipCode) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }

    setLoading(true);
    try {
      const newAddress = {
        id: Math.random().toString(36).substr(2, 9), // Simple ID generation
        ...form
      };

      const userRef = doc(db, 'users', user!.uid);
      await updateDoc(userRef, {
        addresses: arrayUnion(newAddress)
      });

      // Callback to refresh list
      if (route.params?.onGoBack) {
        route.params.onGoBack();
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
      <Text variant="titleLarge" style={{marginBottom: 20, fontWeight:'bold'}}>New Address</Text>

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

      <TextInput 
        label="State" 
        value={form.state} 
        onChangeText={t => setForm({...form, state: t})} 
        mode="outlined" 
        style={styles.input} 
      />

      <Button mode="contained" onPress={handleSave} loading={loading} style={styles.btn}>
        Save Address
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: 'white', flexGrow: 1 },
  input: { marginBottom: 15, backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { marginTop: 10, backgroundColor: '#004AAD' }
});