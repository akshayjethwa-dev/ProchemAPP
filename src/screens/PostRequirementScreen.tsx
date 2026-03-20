// src/screens/PostRequirementScreen.tsx

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar } from 'react-native-paper';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { useNavigation } from '@react-navigation/native';

export default function PostRequirementScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAppStore();

  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [targetPrice, setTargetPrice] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSubmit = async () => {
    if (!productName.trim() || !quantity.trim()) {
      setToastMessage('Please provide the Product Name and Estimated Quantity.');
      setToastVisible(true);
      return;
    }

    setLoading(true);
    try {
      // ✅ FIXED: Changed to camelCase 'customRequirements' to match Admin panel
      await addDoc(collection(db, 'customRequirements'), {
        buyerId: user?.uid || 'UNKNOWN',
        buyerName: user?.companyName || user?.businessName || 'Unknown Company',
        buyerPhone: user?.phone || '',
        productName: productName.trim(),
        quantity: quantity.trim(),
        unit: unit.trim(),
        targetPrice: targetPrice.trim(),
        description: description.trim(),
        status: 'PENDING',
        createdAt: serverTimestamp()
      });

      setToastMessage('Requirement Submitted! Redirecting...');
      setToastVisible(true);
      
      setTimeout(() => {
        navigation.navigate('BuyerRequirements'); // Navigate to the new requirements list
      }, 1500);

    } catch (error: any) {
      console.error('Error posting requirement:', error);
      setToastMessage(error.message || 'Failed to submit requirement. Please try again.');
      setToastVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerArea}>
            <Text variant="headlineSmall" style={styles.title}>What are you looking for?</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              If you couldn't find a chemical on our marketplace, fill out this form. We'll source it directly from our trusted manufacturer network for you.
            </Text>
          </View>

          <TextInput
            label="Chemical / Product Name *"
            value={productName}
            onChangeText={setProductName}
            mode="outlined"
            style={styles.input}
          />

          <View style={styles.row}>
            <TextInput
              label="Estimated Quantity *"
              value={quantity}
              onChangeText={setQuantity}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, { flex: 2, marginRight: 10 }]}
            />
            <TextInput
              label="Unit"
              value={unit}
              onChangeText={setUnit}
              mode="outlined"
              style={[styles.input, { flex: 1 }]}
            />
          </View>

          <TextInput
            label="Target Price (Optional)"
            value={targetPrice}
            onChangeText={setTargetPrice}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            left={<TextInput.Affix text="₹" />}
          />

          <TextInput
            label="Additional Specifications / Notes"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={[styles.input, { minHeight: 100 }]}
          />

          <Button 
            mode="contained" 
            onPress={handleSubmit} 
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            contentStyle={{ paddingVertical: 8 }}
          >
            Submit Requirement
          </Button>

          {/* ✅ NEW: Button to view past requirements */}
          <Button 
            mode="text" 
            onPress={() => navigation.navigate('BuyerRequirements')} 
            style={{marginTop: 15}}
          >
            View My Past Requirements
          </Button>

        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        duration={3000}
        style={{ backgroundColor: '#333' }}
        action={{ label: 'OK', textColor: theme.colors.primaryContainer, onPress: () => setToastVisible(false) }}
      >
        {toastMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, paddingBottom: 100 },
  headerArea: { marginBottom: 24 },
  title: { fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
  subtitle: { color: '#64748B' },
  input: { marginBottom: 16, backgroundColor: '#F8FAFC' },
  row: { flexDirection: 'row' },
  submitButton: { marginTop: 10, borderRadius: 8, backgroundColor: '#004AAD' }
});