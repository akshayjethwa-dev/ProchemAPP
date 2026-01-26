import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { addProduct, updateProduct } from '../services/productService';

export default function SellerAddChemical() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user } = useAppStore();
  
  const editingProduct = route.params?.product;
  const isEditMode = !!editingProduct;

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: '',
    casNumber: '',
    pricePerUnit: '',
    unit: 'kg',
    moq: '0',
    purity: '',
    description: '',
    origin: 'India'
  });

  // Helper: Cross-Platform Alert
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    if (isEditMode) {
      setForm({
        name: editingProduct.name || '',
        category: editingProduct.category || '',
        casNumber: editingProduct.casNumber || '',
        pricePerUnit: String(editingProduct.pricePerUnit || ''),
        unit: editingProduct.unit || 'kg',
        moq: String(editingProduct.moq || '0'),
        purity: String(editingProduct.purity || ''),
        description: editingProduct.description || '',
        origin: editingProduct.origin || 'India'
      });
      navigation.setOptions({ title: 'Edit Product' });
    }
  }, [editingProduct]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    // 1. Validation
    if (!form.name.trim()) {
      showAlert('Missing Field', 'Please enter the Chemical Name.');
      return;
    }
    if (!form.category.trim()) {
      showAlert('Missing Field', 'Please enter a Category.');
      return;
    }
    if (!form.pricePerUnit.trim()) {
      showAlert('Missing Field', 'Please enter the Price.');
      return;
    }
    // Note: Stock Quantity validation removed

    setLoading(true);
    try {
      // 2. Prepare Data
      const productData = {
        ...form,
        pricePerUnit: parseFloat(form.pricePerUnit) || 0,
        moq: parseInt(form.moq) || 0,
        quantity: 1000, // Default value (since field was removed)
        purity: parseFloat(form.purity) || 0,
        sellerId: user?.uid,
        sellerName: user?.companyName || 'Unknown',
        active: isEditMode ? editingProduct.active : true 
      };

      // 3. Send to Firebase
      if (isEditMode) {
        await updateProduct(editingProduct.id, productData);
        showAlert('Success', 'Product updated successfully!');
      } else {
        await addProduct(productData);
        showAlert('Success', 'Product listed successfully!');
      }
      
      navigation.goBack();
    } catch (error: any) {
      console.error("Submission Error:", error);
      showAlert('Error', error.message || 'Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
          <Text variant="headlineSmall" style={{fontWeight:'bold'}}>
            {isEditMode ? 'Edit Product' : 'Add New Chemical'}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput 
            label="Chemical Name *" 
            value={form.name} 
            onChangeText={t => handleChange('name', t)} 
            mode="outlined" 
            style={styles.input} 
          />
          
          <View style={styles.row}>
            <TextInput 
              label="Category *" 
              value={form.category} 
              onChangeText={t => handleChange('category', t)} 
              mode="outlined" 
              style={[styles.input, {flex:1, marginRight:8}]} 
            />
            <TextInput 
              label="CAS Number" 
              value={form.casNumber} 
              onChangeText={t => handleChange('casNumber', t)} 
              mode="outlined" 
              style={[styles.input, {flex:1}]} 
            />
          </View>

          <View style={styles.row}>
            <TextInput 
              label="Price (₹) *" 
              keyboardType="numeric" 
              value={form.pricePerUnit} 
              onChangeText={t => handleChange('pricePerUnit', t)} 
              mode="outlined" 
              style={[styles.input, {flex:1, marginRight:8}]} 
            />
            <TextInput 
              label="Unit (e.g. kg, ton)" 
              value={form.unit} 
              onChangeText={t => handleChange('unit', t)} 
              mode="outlined" 
              style={[styles.input, {flex:1}]} 
            />
          </View>

          {/* Reorganized Row: MOQ + Purity */}
          <View style={styles.row}>
            <TextInput 
              label="MOQ" 
              keyboardType="numeric" 
              value={form.moq} 
              onChangeText={t => handleChange('moq', t)} 
              mode="outlined" 
              style={[styles.input, {flex:1, marginRight:8}]} 
            />
             <TextInput 
              label="Purity (%)" 
              keyboardType="numeric" 
              value={form.purity} 
              onChangeText={t => handleChange('purity', t)} 
              mode="outlined" 
              style={[styles.input, {flex:1}]} 
            />
          </View>
          
          <TextInput 
            label="Description / Specs" 
            multiline 
            numberOfLines={3} 
            value={form.description} 
            onChangeText={t => handleChange('description', t)} 
            mode="outlined" 
            style={styles.input} 
          />

          <Button 
            mode="contained" 
            onPress={handleSubmit} 
            loading={loading} 
            style={styles.btn}
            contentStyle={{height: 50}}
          >
            {isEditMode ? 'Update Product' : 'List Product'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F8FAFC', paddingBottom: 30 },
  header: { flexDirection:'row', alignItems:'center', padding: 10 },
  form: { padding: 20 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { marginTop: 20, borderRadius: 8, backgroundColor: '#004AAD' }
});