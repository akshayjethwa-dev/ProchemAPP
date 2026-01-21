import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, IconButton, Switch, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { addProduct } from '../services/productService';

export default function SellerAddChemical() {
  const navigation = useNavigation();
  const theme = useTheme();
  const user = useAppStore(state => state.user);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Industrial Acids',
    casNumber: '',
    grade: 'Industrial',
    purity: '95',
    unit: 'kg',
    pricePerUnit: '',
    origin: '', // ✅ Added Origin
    moq: '10',
    description: '',
    inStock: true
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.pricePerUnit || !formData.origin) {
      Alert.alert('Error', 'Please fill Name, Price and Origin');
      return;
    }

    setLoading(true);
    try {
      await addProduct({
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.pricePerUnit),
        pricePerUnit: parseFloat(formData.pricePerUnit),
        description: formData.description,
        moq: parseInt(formData.moq),
        unit: formData.unit,
        sellerId: user?.uid || 'unknown',
        sellerName: user?.companyName || 'Prochem Seller',
        origin: formData.origin, // ✅ Saving Origin
        verified: false,
        grade: formData.grade,
        purity: parseFloat(formData.purity),
        inStock: formData.inStock,
        image: '',
        imageUrl: ''
      } as any);

      Alert.alert('Success', 'Product added successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineSmall" style={{fontWeight:'bold'}}>Add Chemical</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.content}>
          <TextInput
            label="Product Name *"
            mode="outlined"
            value={formData.name}
            onChangeText={(t) => handleChange('name', t)}
            style={styles.input}
          />

          <TextInput
            label="Origin (City, State) *"
            mode="outlined"
            placeholder="e.g. Vapi, Gujarat"
            value={formData.origin}
            onChangeText={(t) => handleChange('origin', t)}
            style={styles.input}
          />

          <View style={styles.row}>
            <TextInput
              label="Price (₹)"
              mode="outlined"
              value={formData.pricePerUnit}
              keyboardType="numeric"
              onChangeText={(t) => handleChange('pricePerUnit', t)}
              style={[styles.input, {flex:1, marginRight:8}]}
            />
             <TextInput
              label="Unit"
              mode="outlined"
              value={formData.unit}
              onChangeText={(t) => handleChange('unit', t)}
              style={[styles.input, {width: 100, marginLeft: 8}]}
            />
          </View>

          <TextInput
            label="MOQ (Min Order Qty)"
            mode="outlined"
            value={formData.moq}
            keyboardType="numeric"
            onChangeText={(t) => handleChange('moq', t)}
            style={styles.input}
          />

          <TextInput
            label="CAS Number"
            mode="outlined"
            value={formData.casNumber}
            onChangeText={(t) => handleChange('casNumber', t)}
            style={styles.input}
          />

          <TextInput
            label="Description"
            mode="outlined"
            value={formData.description}
            onChangeText={(t) => handleChange('description', t)}
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <Button 
            mode="contained" 
            onPress={handleSubmit} 
            loading={loading}
            style={styles.submitBtn}
            contentStyle={{height: 50}}
          >
            List Product
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  content: { padding: 20 },
  input: { marginBottom: 16, backgroundColor: 'white' },
  row: { flexDirection: 'row', marginBottom: 0 },
  submitBtn: { marginTop: 10, borderRadius: 12 }
});