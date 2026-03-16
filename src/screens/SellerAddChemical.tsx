import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native';
import { Text, TextInput, Button, IconButton, Avatar, useTheme, Menu, Card, Divider, Checkbox, Switch } from 'react-native-paper'; 
import { useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker'; 
import { useAppStore } from '../store/appStore';
import { addProduct, updateProduct } from '../services/productService';

// --- CONSTANTS ---
const UNIT_OPTIONS = [
  'Kilogram (KGS)', 'Metric Ton (MTQ)', 'Liter (LTR)', 'Gram (GMS)', 'Piece (PCS)', 'Other'
];

const CATEGORY_OPTIONS = [
  'Industrial Chemicals', 'Pharma Chemicals', 'Agriculture', 'Food & Beverage', 'Lab Research', 'Other'
];

// 🚀 NEW CONSTANTS FOR CHEMICAL DATA
const GST_SLABS = ['5', '12', '18', '28'];
const HAZARD_CLASSES = ['Non-Hazardous', 'Flammable', 'Corrosive', 'Toxic', 'Oxidizer', 'Explosive'];
const PACKAGING_OPTIONS = ['200L Drum', '25kg Bag', '50kg Bag', 'IBC Tote', '1L Bottle', 'Tanker', 'Other'];

const SELLER_PLATFORM_FEE = 0.01;
const SELLER_SAFETY_FEE = 0.0025;  
const SELLER_FREIGHT_FEE = 0.0025;

export default function SellerAddChemical() {
  const navigation = useNavigation();
  const theme = useTheme();
  const route = useRoute<any>();
  const { user } = useAppStore();
  
  const editingProduct = route.params?.product;
  const isEditMode = !!editingProduct;

  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<any>(null);
  
  // 🚀 Document States
  const [msdsFile, setMsdsFile] = useState<any>(null);
  const [tdsFile, setTdsFile] = useState<any>(null);
  const [coaFile, setCoaFile] = useState<any>(null);

  const [isCompliant, setIsCompliant] = useState(false);
  
  // --- DROPDOWN STATES ---
  const [menus, setMenus] = useState({ unit: false, category: false, gst: false, hazard: false, packaging: false });
  
  // 🚀 NEW STATES: Tiered Pricing & Samples
  const [tiers, setTiers] = useState([{ minQty: '', pricePerUnit: '' }]);
  const [sample, setSample] = useState({ available: false, price: '', size: '100g' });

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
    imageUrl: '',
    gstPercent: GST_SLABS[2], // Default 18%
    packagingType: PACKAGING_OPTIONS[0],
    customPackagingType: '', // ✅ NEW: State for custom packaging
    hazardClass: HAZARD_CLASSES[0],
    unNumber: '',
    storageConditions: '',
    manufactureDate: '',
    expiryDate: ''
  });

  const [payoutStats, setPayoutStats] = useState({ basePrice: 0, platformFee: 0, safetyFee: 0, freightFee: 0, netPayout: 0 });

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
    else Alert.alert(title, message);
  };

  useEffect(() => {
    if (isEditMode) {
      // ✅ Handle case where edited product has a custom packaging type not in the default dropdown
      const isStandardPackaging = PACKAGING_OPTIONS.includes(editingProduct.packagingType);
      
      setForm({
        name: editingProduct.name || '',
        category: editingProduct.category || CATEGORY_OPTIONS[0],
        casNumber: editingProduct.casNumber || '',
        pricePerUnit: String(editingProduct.pricePerUnit || ''),
        unit: editingProduct.unit || UNIT_OPTIONS[0],
        moq: String(editingProduct.moq || '0'),
        purity: String(editingProduct.purity || ''),
        description: editingProduct.description || '',
        origin: editingProduct.origin || 'India',
        imageUrl: editingProduct.imageUrl || '',
        gstPercent: String(editingProduct.gstPercent || '18'),
        packagingType: isStandardPackaging ? (editingProduct.packagingType || PACKAGING_OPTIONS[0]) : 'Other',
        customPackagingType: !isStandardPackaging && editingProduct.packagingType ? editingProduct.packagingType : '',
        hazardClass: editingProduct.hazardClass || HAZARD_CLASSES[0],
        unNumber: editingProduct.unNumber || '',
        storageConditions: editingProduct.storageConditions || '',
        manufactureDate: editingProduct.manufactureDate || '',
        expiryDate: editingProduct.expiryDate || ''
      });
      
      // Load existing Tiers and Sample data if available
      if (editingProduct.tieredPricing) {
        setTiers(editingProduct.tieredPricing.map((t:any) => ({ minQty: String(t.minQty), pricePerUnit: String(t.pricePerUnit) })));
      }
      if (editingProduct.sampleAvailable) {
        setSample({ available: true, price: String(editingProduct.samplePrice || ''), size: editingProduct.sampleSize || '100g' });
      }

      setIsCompliant(true);
      navigation.setOptions({ title: 'Edit Product' });
    }
  }, [editingProduct]);

  useEffect(() => {
    const price = parseFloat(form.pricePerUnit) || 0;
    setPayoutStats({
      basePrice: price,
      platformFee: price * SELLER_PLATFORM_FEE,
      safetyFee: price * SELLER_SAFETY_FEE,
      freightFee: price * SELLER_FREIGHT_FEE,
      netPayout: price - (price * SELLER_PLATFORM_FEE) - (price * SELLER_SAFETY_FEE) - (price * SELLER_FREIGHT_FEE)
    });
  }, [form.pricePerUnit]);

  const handleChange = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleMenu = (key: keyof typeof menus, show: boolean) => setMenus(prev => ({ ...prev, [key]: show }));

  // 🚀 Manage Volume Pricing Tiers
  const addTier = () => setTiers([...tiers, { minQty: '', pricePerUnit: '' }]);
  const updateTier = (index: number, field: string, value: string) => {
    const newTiers = [...tiers];
    // @ts-ignore
    newTiers[index][field] = value;
    setTiers(newTiers);
  };
  const removeTier = (index: number) => setTiers(tiers.filter((_, i) => i !== index));

  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
      if (result.assets?.length) {
        setImageFile(result.assets[0]);
        setForm(prev => ({ ...prev, imageUrl: result.assets[0].uri }));
      }
    } catch (err) { console.error("Image pick error:", err); }
  };

  const pickDocument = async (docType: 'msds' | 'tds' | 'coa') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true });
      if (result.assets?.length) {
        if (docType === 'msds') setMsdsFile(result.assets[0]);
        if (docType === 'tds') setTdsFile(result.assets[0]);
        if (docType === 'coa') setCoaFile(result.assets[0]);
      }
    } catch (err) { console.error("Doc pick error:", err); }
  };

  const handleSubmit = async () => {
    // ✅ ADDED VALIDATION FOR DESCRIPTION AND CUSTOM PACKAGING
    if (!form.name.trim() || !form.pricePerUnit.trim() || !form.description.trim()) {
      return showAlert('Missing Field', 'Please enter Name, Base Price, and Description.');
    }
    if (form.packagingType === 'Other' && !form.customPackagingType.trim()) {
      return showAlert('Missing Field', 'Please specify the custom packaging type.');
    }
    if (!isCompliant) return showAlert('Compliance Required', 'You must verify that this chemical is legally permitted for sale.');

    setLoading(true);
    try {
      // Clean up Tiers for Database
      const validTiers = tiers
        .filter(t => t.minQty && t.pricePerUnit)
        .map(t => ({
          minQty: parseInt(t.minQty),
          pricePerUnit: parseFloat(t.pricePerUnit)
        }))
        .sort((a, b) => a.minQty - b.minQty); // Sort ascending by quantity

      // Note: In production, upload files to Firebase Storage here and get URLs
      const productData = {
        ...form,
        pricePerUnit: parseFloat(form.pricePerUnit) || 0,
        moq: parseInt(form.moq) || 0,
        purity: parseFloat(form.purity) || 0,
        gstPercent: parseInt(form.gstPercent) || 18,
        
        // ✅ Decide which packaging type to save
        packagingType: form.packagingType === 'Other' ? form.customPackagingType.trim() : form.packagingType,
        
        quantity: 1000, 
        sellerId: user?.uid,
        sellerName: user?.companyName || 'Unknown',
        active: isEditMode ? editingProduct.active : true,
        msdsUrl: msdsFile?.uri || editingProduct?.msdsUrl || '', 
        tdsUrl: tdsFile?.uri || editingProduct?.tdsUrl || '',
        coaUrl: coaFile?.uri || editingProduct?.coaUrl || '',
        
        // 🚀 B2B Commerce Upgrades Data Attach
        tieredPricing: validTiers,
        sampleAvailable: sample.available,
        samplePrice: parseFloat(sample.price) || 0,
        sampleSize: sample.size,
        
        updatedAt: new Date().toISOString()
      };

      // Clean up local-only state before saving
      // @ts-ignore
      delete productData.customPackagingType; 

      if (!isEditMode) {
        // @ts-ignore
        productData.createdAt = new Date().toISOString();
        await addProduct(productData);
        showAlert('Success', 'Product listed!');
      } else {
        await updateProduct(editingProduct.id, productData);
        showAlert('Success', 'Product updated!');
      }
      navigation.goBack();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  const renderDropdown = (label: string, value: string, options: string[], menuKey: keyof typeof menus) => (
    <View style={{flex: 1, marginHorizontal: 4, marginBottom: 15}}>
      <Menu
        visible={menus[menuKey]}
        onDismiss={() => toggleMenu(menuKey, false)}
        anchor={
          <TouchableOpacity onPress={() => toggleMenu(menuKey, true)}>
            <TextInput label={label} value={value} mode="outlined" editable={false} style={{backgroundColor:'white'}} right={<TextInput.Icon icon="chevron-down" onPress={() => toggleMenu(menuKey, true)} />} />
          </TouchableOpacity>
        }
      >
        <ScrollView style={{maxHeight: 250}}>
          {options.map(opt => (
            <Menu.Item key={opt} onPress={() => { handleChange(menuKey === 'gst' ? 'gstPercent' : menuKey === 'packaging' ? 'packagingType' : menuKey === 'hazard' ? 'hazardClass' : menuKey, opt); toggleMenu(menuKey, false); }} title={opt + (menuKey === 'gst' ? '%' : '')} />
          ))}
        </ScrollView>
      </Menu>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1, backgroundColor: '#F8FAFC'}}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{fontWeight:'bold'}}>
          {isEditMode ? 'Edit Product' : 'Add New Chemical'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* IMAGE UPLOAD */}
        <View style={styles.imageSection}>
          <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
            {form.imageUrl ? <Image source={{ uri: form.imageUrl }} style={styles.imagePreview} /> : <View style={{alignItems:'center'}}><Avatar.Icon size={50} icon="camera-plus" style={{backgroundColor:'#E3F2FD'}} color="#004AAD" /><Text style={{color:'#004AAD', fontWeight:'bold'}}>Upload Image</Text></View>}
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text variant="titleMedium" style={styles.sectionTitle}>1. Basic Information</Text>
          <TextInput label="Chemical Name *" value={form.name} onChangeText={t => handleChange('name', t)} mode="outlined" style={styles.input} />
          
          <View style={styles.row}>
            {renderDropdown('Category *', form.category, CATEGORY_OPTIONS, 'category')}
            <TextInput label="CAS Number" value={form.casNumber} onChangeText={t => handleChange('casNumber', t)} mode="outlined" style={[styles.input, {flex:1, marginHorizontal:4}]} />
          </View>

          <View style={styles.row}>
             <TextInput label="Purity (%)" keyboardType="numeric" value={form.purity} onChangeText={t => handleChange('purity', t)} mode="outlined" style={[styles.input, {flex:1, marginHorizontal:4}]} />
             <TextInput label="Origin (Country)" value={form.origin} onChangeText={t => handleChange('origin', t)} mode="outlined" style={[styles.input, {flex:1, marginHorizontal:4}]} />
          </View>

          <Text variant="titleMedium" style={styles.sectionTitle}>2. Pricing & Commercials</Text>
          <View style={styles.row}>
            <TextInput label="Base Price (₹) *" keyboardType="numeric" value={form.pricePerUnit} onChangeText={t => handleChange('pricePerUnit', t)} mode="outlined" style={[styles.input, {flex:1, marginHorizontal:4}]} />
            {renderDropdown('Unit *', form.unit, UNIT_OPTIONS, 'unit')}
          </View>

          <View style={styles.row}>
             <TextInput label="Min Order (MOQ)" keyboardType="numeric" value={form.moq} onChangeText={t => handleChange('moq', t)} mode="outlined" style={[styles.input, {flex:1, marginHorizontal:4}]} />
             {renderDropdown('GST Slab *', form.gstPercent, GST_SLABS, 'gst')}
          </View>

          {/* 🚀 PAYOUT CARD */}
          {payoutStats.basePrice > 0 && (
            <Card style={styles.payoutCard}>
              <Card.Content>
                <Text variant="labelLarge" style={{color:'#666', fontWeight:'bold', marginBottom: 5}}>💰 Estimated Payout (on Base Price)</Text>
                <Divider style={{marginBottom: 8}} />
                <View style={styles.payoutRow}><Text style={styles.payoutLabel}>Base Price:</Text><Text style={styles.payoutValue}>₹{payoutStats.basePrice.toFixed(2)}</Text></View>
                <View style={styles.payoutRow}><Text style={[styles.payoutLabel, {color:'#D32F2F'}]}>Platform + Safety + Freight Fees:</Text><Text style={[styles.payoutValue, {color:'#D32F2F'}]}>- ₹{(payoutStats.platformFee + payoutStats.safetyFee + payoutStats.freightFee).toFixed(2)}</Text></View>
                <Divider style={{marginVertical: 8}} />
                <View style={styles.payoutRow}><Text style={{fontWeight:'bold', color: theme.colors.primary}}>Est. Net Payout:</Text><Text style={{fontWeight:'bold', fontSize: 16, color: theme.colors.primary}}>₹{payoutStats.netPayout.toFixed(2)}</Text></View>
              </Card.Content>
            </Card>
          )}

          <Text variant="titleMedium" style={styles.sectionTitle}>3. Logistics & Packaging</Text>
          <View style={styles.row}>
             {renderDropdown('Packaging Type', form.packagingType, PACKAGING_OPTIONS, 'packaging')}
             <TextInput label="Storage Conditions" placeholder="e.g. Store below 25°C" value={form.storageConditions} onChangeText={t => handleChange('storageConditions', t)} mode="outlined" style={[styles.input, {flex:1, marginHorizontal:4}]} />
          </View>
          
          {/* ✅ CONDITIONAL TEXT INPUT FOR CUSTOM PACKAGING */}
          {form.packagingType === 'Other' && (
            <TextInput 
              label="Specify Packaging Type *" 
              placeholder="e.g. 100 ml Bottle, 5kg Tin" 
              value={form.customPackagingType} 
              onChangeText={t => handleChange('customPackagingType', t)} 
              mode="outlined" 
              style={styles.input} 
            />
          )}

          <Text variant="titleMedium" style={styles.sectionTitle}>4. Safety & Compliance</Text>
          <View style={styles.row}>
             {renderDropdown('Hazard Class', form.hazardClass, HAZARD_CLASSES, 'hazard')}
             <TextInput label="UN Number (if Hazmat)" value={form.unNumber} onChangeText={t => handleChange('unNumber', t)} mode="outlined" style={[styles.input, {flex:1, marginHorizontal:4}]} />
          </View>

          <Text variant="titleMedium" style={styles.sectionTitle}>5. Technical Documents (PDFs)</Text>
          <View style={styles.docUploadContainer}>
             <Button icon="file-pdf-box" mode={msdsFile ? "contained" : "outlined"} onPress={() => pickDocument('msds')} style={styles.docBtn} buttonColor={msdsFile ? '#4CAF50' : undefined}>
                {msdsFile ? 'MSDS Uploaded' : 'Upload MSDS'}
             </Button>
             <Button icon="file-document-outline" mode={tdsFile ? "contained" : "outlined"} onPress={() => pickDocument('tds')} style={styles.docBtn} buttonColor={tdsFile ? '#4CAF50' : undefined}>
                {tdsFile ? 'TDS Uploaded' : 'Upload TDS'}
             </Button>
             <Button icon="certificate-outline" mode={coaFile ? "contained" : "outlined"} onPress={() => pickDocument('coa')} style={styles.docBtn} buttonColor={coaFile ? '#4CAF50' : undefined}>
                {coaFile ? 'CoA Uploaded' : 'Upload Sample CoA'}
             </Button>
          </View>

          <TextInput label="Description and usage of the product *" multiline numberOfLines={4} value={form.description} onChangeText={t => handleChange('description', t)} mode="outlined" style={styles.input} />

          {/* COMPLIANCE CHECKBOX */}
          <View style={styles.complianceContainer}>
             <Checkbox status={isCompliant ? 'checked' : 'unchecked'} onPress={() => setIsCompliant(!isCompliant)} color={theme.colors.primary} />
             <Text style={styles.complianceText}>I declare that this product is not a banned substance and complies with all safety and transport regulations.</Text>
          </View>

          <Button mode="contained" onPress={handleSubmit} loading={loading} style={styles.btn} contentStyle={{height: 50}}>
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
  header: { flexDirection:'row', alignItems:'center', padding: 10, backgroundColor:'white', elevation: 2 },
  sectionTitle: { fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#334155' },
  imageSection: { alignItems: 'center', marginTop: 20 },
  imagePicker: { width: 120, height: 120, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%' },
  form: { padding: 16 },
  input: { marginBottom: 15, backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -4 },
  btn: { marginTop: 20, borderRadius: 8, backgroundColor: '#004AAD' },
  payoutCard: { marginBottom: 15, backgroundColor: '#F1F8E9', borderColor: '#C8E6C9', borderWidth: 1 },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  payoutLabel: { fontSize: 12, color: '#555' },
  payoutValue: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  docUploadContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 },
  docBtn: { flexGrow: 1, borderColor: '#CBD5E1' },
  complianceContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, backgroundColor: '#FFF3E0', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FFE0B2' },
  complianceText: { flex: 1, fontSize: 12, color: '#E65100', marginTop: 8 }
});