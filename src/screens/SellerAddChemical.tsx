import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native';
import { Text, TextInput, Button, IconButton, Avatar, useTheme, Menu, Card, Divider } from 'react-native-paper'; // ✅ Added Card, Divider
import { useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker'; 
import { useAppStore } from '../store/appStore';
import { addProduct, updateProduct } from '../services/productService';

// --- CONSTANTS ---
const UNIT_OPTIONS = [
  'Kilogram (KGS)', 'Gram (GMS)', 'Quintal (QTL)', 'Metric Ton (MTQ)', 'Metric Ton (MTS)',
  'Liter (LTR)', 'Milliliter (MLT)', 'Cubic Meter (MTQ)', 'Kiloliter (KLR)', 
  'Piece (PCS)', 'Dozen (DOZ)', 'Number (NOS)', 'Bottle (BTL)', 'Pack (PAC)', 
  'Unit (UNT)', 'Box (BOX)', 'Other'
];

const CATEGORY_OPTIONS = [
  'Industrial Chemicals',
  'Pharma Chemicals',
  'Agriculture',
  'Food & Beverage',
  'Lab Research',
  'Other'
];

// ✅ FEE CONSTANTS (Matches Checkout Logic)
const SELLER_PLATFORM_FEE = 0.015; // 1.5%
const SELLER_SAFETY_FEE = 0.0025;  // 0.25%
const SELLER_FREIGHT_FEE = 0.01;   // 1.0%

export default function SellerAddChemical() {
  const navigation = useNavigation();
  const theme = useTheme();
  const route = useRoute<any>();
  const { user } = useAppStore();
  
  const editingProduct = route.params?.product;
  const isEditMode = !!editingProduct;

  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<any>(null);
  
  // --- DROPDOWN STATES ---
  const [unitMenuVisible, setUnitMenuVisible] = useState(false);
  const [unitDropdownValue, setUnitDropdownValue] = useState(UNIT_OPTIONS[0]);

  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [categoryDropdownValue, setCategoryDropdownValue] = useState(CATEGORY_OPTIONS[0]);

  const [form, setForm] = useState({
    name: '',
    category: CATEGORY_OPTIONS[0], 
    casNumber: '',
    pricePerUnit: '',
    unit: UNIT_OPTIONS[0], 
    moq: '0',
    purity: '',
    description: '',
    origin: 'India',
    imageUrl: '' 
  });

  // ✅ Calculation State
  const [payoutStats, setPayoutStats] = useState({
    basePrice: 0,
    platformFee: 0,
    safetyFee: 0,
    freightFee: 0,
    netPayout: 0
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
      const existingUnit = editingProduct.unit || 'kg';
      const isStandardUnit = UNIT_OPTIONS.includes(existingUnit);
      setUnitDropdownValue(isStandardUnit ? existingUnit : 'Other');

      const existingCat = editingProduct.category || 'Industrial Chemicals';
      const isStandardCat = CATEGORY_OPTIONS.includes(existingCat);
      setCategoryDropdownValue(isStandardCat ? existingCat : 'Other');

      setForm({
        name: editingProduct.name || '',
        category: existingCat,
        casNumber: editingProduct.casNumber || '',
        pricePerUnit: String(editingProduct.pricePerUnit || ''),
        unit: existingUnit,
        moq: String(editingProduct.moq || '0'),
        purity: String(editingProduct.purity || ''),
        description: editingProduct.description || '',
        origin: editingProduct.origin || 'India',
        imageUrl: editingProduct.imageUrl || ''
      });
      navigation.setOptions({ title: 'Edit Product' });
    }
  }, [editingProduct]);

  // ✅ Update Calculations whenever Price changes
  useEffect(() => {
    const price = parseFloat(form.pricePerUnit) || 0;
    const pFee = price * SELLER_PLATFORM_FEE;
    const sFee = price * SELLER_SAFETY_FEE;
    const fFee = price * SELLER_FREIGHT_FEE;
    const net = price - pFee - sFee - fFee;

    setPayoutStats({
      basePrice: price,
      platformFee: pFee,
      safetyFee: sFee,
      freightFee: fFee,
      netPayout: net
    });
  }, [form.pricePerUnit]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/jpg'],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        setImageFile(result.assets[0]);
        setForm(prev => ({ ...prev, imageUrl: result.assets[0].uri }));
      }
    } catch (err) {
      console.error("Image pick error:", err);
    }
  };

  const handleUnitSelect = (val: string) => {
    setUnitMenuVisible(false);
    setUnitDropdownValue(val);
    if (val !== 'Other') {
      setForm(prev => ({ ...prev, unit: val }));
    } else {
      setForm(prev => ({ ...prev, unit: '' }));
    }
  };

  const handleCategorySelect = (val: string) => {
    setCategoryMenuVisible(false);
    setCategoryDropdownValue(val);
    if (val !== 'Other') {
      setForm(prev => ({ ...prev, category: val }));
    } else {
      setForm(prev => ({ ...prev, category: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return showAlert('Missing Field', 'Please enter Chemical Name.');
    if (!form.category.trim()) return showAlert('Missing Field', 'Please select or enter a Category.');
    if (!form.pricePerUnit.trim()) return showAlert('Missing Field', 'Please enter Price.');
    if (!form.unit.trim()) return showAlert('Missing Field', 'Please specify a Unit.');

    setLoading(true);
    try {
      let finalImageUrl = form.imageUrl;
      if (imageFile) {
        await new Promise(r => setTimeout(r, 1000));
      }

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
        
        {/* IMAGE UPLOAD SECTION */}
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
            <View style={{flex: 1, marginRight: 10}}>
              <Menu
                visible={categoryMenuVisible}
                onDismiss={() => setCategoryMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setCategoryMenuVisible(true)}>
                    <TextInput
                      label="Category *"
                      value={categoryDropdownValue}
                      mode="outlined"
                      editable={false}
                      right={<TextInput.Icon icon="chevron-down" onPress={() => setCategoryMenuVisible(true)} />}
                      style={{backgroundColor:'white', marginBottom: 15}}
                    />
                  </TouchableOpacity>
                }
              >
                <ScrollView style={{maxHeight: 250}}>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <Menu.Item 
                      key={opt} 
                      onPress={() => handleCategorySelect(opt)} 
                      title={opt} 
                    />
                  ))}
                </ScrollView>
              </Menu>
            </View>

            <TextInput 
              label="CAS Number" 
              value={form.casNumber} 
              onChangeText={t => handleChange('casNumber', t)} 
              mode="outlined" 
              style={[styles.input, {flex:1}]} 
            />
          </View>

          {categoryDropdownValue === 'Other' && (
            <TextInput 
              label="Specify Custom Category *" 
              value={form.category} 
              onChangeText={t => handleChange('category', t)} 
              mode="outlined" 
              placeholder="e.g. Polymers"
              style={[styles.input, {marginTop: -10}]} 
            />
          )}

          {/* ROW: PRICE & UNIT */}
          <View style={styles.row}>
            <TextInput 
              label="Price (₹) *" 
              keyboardType="numeric" 
              value={form.pricePerUnit} 
              onChangeText={t => handleChange('pricePerUnit', t)} 
              mode="outlined" 
              style={[styles.input, {flex:1, marginRight:10}]} 
            />
            
            <View style={{flex: 1}}>
              <Menu
                visible={unitMenuVisible}
                onDismiss={() => setUnitMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setUnitMenuVisible(true)}>
                    <TextInput
                      label="Unit *"
                      value={unitDropdownValue}
                      mode="outlined"
                      editable={false}
                      right={<TextInput.Icon icon="chevron-down" onPress={() => setUnitMenuVisible(true)} />}
                      style={{backgroundColor:'white', marginBottom: 15}}
                    />
                  </TouchableOpacity>
                }
              >
                <ScrollView style={{maxHeight: 250}}>
                  {UNIT_OPTIONS.map((opt) => (
                    <Menu.Item 
                      key={opt} 
                      onPress={() => handleUnitSelect(opt)} 
                      title={opt} 
                    />
                  ))}
                </ScrollView>
              </Menu>
            </View>
          </View>

          {/* ✅ NEW: ESTIMATED PAYOUT CARD */}
          {payoutStats.basePrice > 0 && (
            <Card style={styles.payoutCard}>
              <Card.Content>
                <Text variant="labelLarge" style={{color:'#666', fontWeight:'bold', marginBottom: 5}}>
                  💰 Estimated Payout Calculation
                </Text>
                <Divider style={{marginBottom: 8}} />
                
                <View style={styles.payoutRow}>
                  <Text style={styles.payoutLabel}>Base Price:</Text>
                  <Text style={styles.payoutValue}>₹{payoutStats.basePrice.toFixed(2)}</Text>
                </View>

                <View style={styles.payoutRow}>
                  <Text style={[styles.payoutLabel, {color:'#D32F2F'}]}>Platform Fee (1.5%):</Text>
                  <Text style={[styles.payoutValue, {color:'#D32F2F'}]}>- ₹{payoutStats.platformFee.toFixed(2)}</Text>
                </View>

                <View style={styles.payoutRow}>
                  <Text style={[styles.payoutLabel, {color:'#D32F2F'}]}>Safety Fee (0.25%):</Text>
                  <Text style={[styles.payoutValue, {color:'#D32F2F'}]}>- ₹{payoutStats.safetyFee.toFixed(2)}</Text>
                </View>

                <View style={styles.payoutRow}>
                  <Text style={[styles.payoutLabel, {color:'#D32F2F'}]}>Freight Fee (1.0%):</Text>
                  <Text style={[styles.payoutValue, {color:'#D32F2F'}]}>- ₹{payoutStats.freightFee.toFixed(2)}</Text>
                </View>

                <Divider style={{marginVertical: 8}} />
                
                <View style={styles.payoutRow}>
                  <Text style={{fontWeight:'bold', color: theme.colors.primary}}>Est. Net Payout (per unit):</Text>
                  <Text style={{fontWeight:'bold', fontSize: 16, color: theme.colors.primary}}>
                    ₹{payoutStats.netPayout.toFixed(2)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          )}

          {unitDropdownValue === 'Other' && (
            <TextInput 
              label="Specify Custom Unit *" 
              value={form.unit} 
              onChangeText={t => handleChange('unit', t)} 
              mode="outlined" 
              placeholder="e.g. Gallon"
              style={[styles.input, {marginTop: -10}]} 
            />
          )}

          {/* ROW: MOQ & PURITY */}
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
  btn: { marginTop: 10, borderRadius: 8, backgroundColor: '#004AAD' },

  // Payout Card Styles
  payoutCard: { marginBottom: 20, backgroundColor: '#F1F8E9', borderColor: '#C8E6C9', borderWidth: 1 },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  payoutLabel: { fontSize: 12, color: '#555' },
  payoutValue: { fontSize: 12, fontWeight: 'bold', color: '#333' }
});