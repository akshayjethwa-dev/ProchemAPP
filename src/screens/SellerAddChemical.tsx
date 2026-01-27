import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native';
import { Text, TextInput, Button, IconButton, Avatar, useTheme } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker'; // ✅ Using existing picker
import { useAppStore } from '../store/appStore';
import { addProduct, updateProduct } from '../services/productService';

export default function SellerAddChemical() {
  const navigation = useNavigation();
  const theme = useTheme();
  const route = useRoute<any>();
  const { user } = useAppStore();
  
  const editingProduct = route.params?.product;
  const isEditMode = !!editingProduct;

  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<any>(null); // Store selected file
  const [form, setForm] = useState({
    name: '',
    category: '',
    casNumber: '',
    pricePerUnit: '',
    unit: 'kg',
    moq: '0',
    purity: '',
    description: '',
    origin: 'India',
    imageUrl: '' // Store final URL
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
        origin: editingProduct.origin || 'India',
        imageUrl: editingProduct.imageUrl || ''
      });
      navigation.setOptions({ title: 'Edit Product' });
    }
  }, [editingProduct]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // ✅ Image Picker Logic
  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/jpg'],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        setImageFile(result.assets[0]);
        // Temporarily show local URI
        setForm(prev => ({ ...prev, imageUrl: result.assets[0].uri }));
      }
    } catch (err) {
      console.error("Image pick error:", err);
    }
  };

  const handleSubmit = async () => {
    // 1. Validation
    if (!form.name.trim()) return showAlert('Missing Field', 'Please enter Chemical Name.');
    if (!form.pricePerUnit.trim()) return showAlert('Missing Field', 'Please enter Price.');
    if (!form.category.trim()) return showAlert('Missing Field', 'Please enter Category.');

    setLoading(true);
    try {
      // 2. Mock Image Upload (Replace with real Firebase Storage later)
      let finalImageUrl = form.imageUrl;
      if (imageFile) {
        // Simulating upload delay...
        await new Promise(r => setTimeout(r, 1000));
        // In real app: finalImageUrl = await uploadToFirebase(imageFile);
      }

      // 3. Prepare Data
      const productData = {
        ...form,
        imageUrl: finalImageUrl,
        pricePerUnit: parseFloat(form.pricePerUnit) || 0,
        moq: parseInt(form.moq) || 0,
        quantity: 1000, 
        purity: parseFloat(form.purity) || 0,
        sellerId: user?.uid,
        sellerName: user?.companyName || 'Unknown',
        active: isEditMode ? editingProduct.active : true,
        updatedAt: new Date().toISOString()
      };

      if (!isEditMode) {
        // @ts-ignore
        productData.createdAt = new Date().toISOString();
      }

      // 4. Send to Firebase
      if (isEditMode) {
        await updateProduct(editingProduct.id, productData);
        showAlert('Success', 'Product updated!');
      } else {
        await addProduct(productData);
        showAlert('Success', 'Product listed!');
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1, backgroundColor: '#F8FAFC'}}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{fontWeight:'bold'}}>
          {isEditMode ? 'Edit Product' : 'Add New Chemical'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* ✅ IMAGE UPLOAD SECTION */}
        <View style={styles.imageSection}>
          <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
            {form.imageUrl ? (
              <Image source={{ uri: form.imageUrl }} style={styles.imagePreview} />
            ) : (
              <View style={{alignItems:'center'}}>
                <Avatar.Icon size={50} icon="camera-plus" style={{backgroundColor:'#E3F2FD'}} color="#004AAD" />
                <Text style={{marginTop: 8, color:'#004AAD', fontWeight:'bold'}}>Upload Image</Text>
                <Text style={{fontSize: 10, color:'#999'}}>JPG or PNG</Text>
              </View>
            )}
          </TouchableOpacity>
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
              style={[styles.input, {flex:1, marginRight:10}]} 
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
              style={[styles.input, {flex:1, marginRight:10}]} 
            />
            <TextInput 
              label="Unit" 
              placeholder="kg, ton"
              value={form.unit} 
              onChangeText={t => handleChange('unit', t)} 
              mode="outlined" 
              style={[styles.input, {flex:0.6}]} 
            />
          </View>

          <View style={styles.row}>
            <TextInput 
              label="Min Order (MOQ)" 
              keyboardType="numeric" 
              value={form.moq} 
              onChangeText={t => handleChange('moq', t)} 
              mode="outlined" 
              style={[styles.input, {flex:1, marginRight:10}]} 
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
            numberOfLines={4} 
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
            {isEditMode ? 'Save Changes' : 'List Product'}
          </Button>
          
          <View style={{height: 50}} /> 
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingBottom: 40 },
  header: { 
    flexDirection:'row', 
    alignItems:'center', 
    padding: 10, 
    backgroundColor:'white', 
    elevation: 2 
  },
  
  // Image Picker Styles
  imageSection: { alignItems: 'center', marginTop: 20 },
  imagePicker: { 
    width: 150, 
    height: 150, 
    borderRadius: 12, 
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderStyle: 'dashed',
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden'
  },
  imagePreview: { width: '100%', height: '100%' },

  form: { padding: 20 },
  input: { marginBottom: 15, backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { marginTop: 10, borderRadius: 8, backgroundColor: '#004AAD' }
});