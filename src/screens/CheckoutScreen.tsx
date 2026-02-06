import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, BackHandler, Image, Clipboard, Platform } from 'react-native'; // ✅ Import Platform
import { Text, Card, Button, Divider, IconButton, TextInput, HelperText, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native'; // ✅ Import CommonActions
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore'; 
import { useAppStore } from '../store/appStore';
import { placeOrder } from '../services/orderService';
import { db, storage } from '../config/firebase';
import { Address } from '../types';

// 🏦 BANK DETAILS CONFIGURATION
const BANK_DETAILS = {
  accountName: "PROCHEM MARKETPLACE PVT LTD",
  accountNumber: "987654321012",
  ifscCode: "HDFC0001234",
  bankName: "HDFC Bank, Mumbai Branch",
  upiId: "prochem@hdfcbank" 
};

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  const { cart, user, clearCart } = useAppStore();
  
  // State
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  // Payment Proof State
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);

  // Validation State
  const [errors, setErrors] = useState({
    address: false,
    utr: false
  });

  // --- NAVIGATION HANDLERS ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />,
      title: "Secure Checkout"
    });
  }, [navigation]);

  useEffect(() => {
    const backAction = () => { navigation.goBack(); return true; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // --- FINANCIAL CALCULATIONS ---
  const PLATFORM_FEE_PERCENT = 0.025; // 2.5%
  const SAFETY_FEE_PERCENT = 0.0075;  // 0.75%

  const productTotal = cart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  const gstAmount = cart.reduce((sum, item) => sum + ((item.pricePerUnit * item.quantity) * ((item.gstPercent || 18) / 100)), 0);
  const productTotalWithTax = productTotal + gstAmount;
  
  const platformFeeBuyer = productTotalWithTax * PLATFORM_FEE_PERCENT;
  const platformFeeSeller = productTotalWithTax * PLATFORM_FEE_PERCENT;
  const safetyFee = productTotalWithTax * SAFETY_FEE_PERCENT;

  const finalPayableAmount = productTotalWithTax + platformFeeBuyer; 
  const payoutAmount = productTotalWithTax - platformFeeSeller - safetyFee;

  // --- ADDRESS LOGIC ---
  useEffect(() => {
    if (route.params?.selectedAddress) {
      setSelectedAddress(route.params.selectedAddress);
      setErrors(prev => ({ ...prev, address: false })); 
    } else if (user?.addresses && user.addresses.length > 0) {
      setSelectedAddress(user.addresses[0]); 
    } else if (user?.address) {
      setSelectedAddress({ 
        id: 'legacy', label: 'Default', street: user.address, city: '', state: '', zipCode: '', country: 'India' 
      });
    }
  }, [user, route.params]);

  // --- IMAGE PICKER ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setScreenshotUri(result.assets[0].uri);
    }
  };

  const uploadScreenshot = async (uri: string): Promise<string | null> => {
    if (!uri) return null;
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `payment_proofs/${user?.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Upload failed", error);
      Alert.alert("Upload Error", "Failed to upload screenshot.");
      return null;
    }
  };

  // --- SUBMIT ORDER ---
  const handlePlaceOrder = async () => {
    // 1. Validation
    let hasError = false;
    const newErrors = { address: false, utr: false };

    if (!selectedAddress) {
      newErrors.address = true;
      hasError = true;
    }
    if (!utrNumber || utrNumber.trim().length < 6) {
      newErrors.utr = true;
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) {
      Alert.alert("Required Fields", "Please select a Delivery Address and enter the Payment UTR.");
      return;
    }

    setLoading(true);

    try {
      // 2. Upload Screenshot if exists
      let proofUrl = null;
      if (screenshotUri) {
        setUploading(true);
        proofUrl = await uploadScreenshot(screenshotUri);
        setUploading(false);
        if (!proofUrl) { setLoading(false); return; } 
      }

      // 3. Place Order
      const orderId = await placeOrder({
        buyerId: user!.uid,
        sellerId: cart[0].sellerId, 
        items: cart,
        shippingAddress: JSON.stringify(selectedAddress),
        
        // Financials
        subTotal: productTotal,
        taxAmount: gstAmount,
        platformFeeBuyer: platformFeeBuyer,
        platformFeeSeller: platformFeeSeller,
        safetyFee: safetyFee,
        totalAmount: finalPayableAmount,
        payoutAmount: payoutAmount,
        
        // Status & Payment
        status: 'PENDING_SELLER', 
        paymentStatus: 'pending_verification',
        paymentMode: 'BANK_TRANSFER',
        paymentReference: utrNumber,
        paymentScreenshot: proofUrl,
        sellerPayoutStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        date: new Date().toISOString(),
      } as any);

      // 4. Notify Admin
      await addDoc(collection(db, 'notifications'), {
        userId: 'ALL_ADMINS',
        type: 'ORDER',
        title: 'New Manual Payment Order',
        message: `Order #${orderId.slice(0,6).toUpperCase()} placed. UTR: ${utrNumber}`,
        data: { orderId },
        read: false,
        createdAt: new Date().toISOString()
      });
      
      clearCart();
      setLoading(false);
      
      // ✅ 5. ROBUST NAVIGATION FIX FOR WEB & MOBILE
      const resetAction = CommonActions.reset({
        index: 0,
        routes: [{
          name: 'BuyerTabs',
          state: {
            routes: [{ name: 'Orders' }], // Force 'Orders' tab to be active
          },
        }],
      });

      if (Platform.OS === 'web') {
        // 🌍 WEB FIX: Use standard window.alert which blocks execution until OK is clicked
        window.alert("Order Placed Successfully! Redirecting to Orders...");
        navigation.dispatch(resetAction);
      } else {
        // 📱 MOBILE FIX: Use Native Alert
        Alert.alert(
          "Order Placed Successfully!", 
          "Your order has been sent to the Seller. You can track its status in the Orders tab.",
          [{ 
            text: "Go to Orders", 
            onPress: () => navigation.dispatch(resetAction)
          }]
        );
      }

    } catch (error) {
      console.error(error);
      setLoading(false);
      setUploading(false);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    }
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* 1. Address Section */}
      <Card style={[styles.card, errors.address && { borderColor: theme.colors.error, borderWidth: 1 }]}>
        <Card.Title title="Delivery To" left={(props) => <Text {...props}>📍</Text>} />
        <Card.Content>
          {selectedAddress ? (
            <View>
              <Text style={{fontWeight:'bold'}}>{selectedAddress.label}</Text>
              <Text>{selectedAddress.street}, {selectedAddress.city}</Text>
            </View>
          ) : (
            <Text style={{color: errors.address ? theme.colors.error : 'orange'}}>
              {errors.address ? '⚠️ Address is required' : 'No address selected'}
            </Text>
          )}
          <Button mode="text" onPress={() => navigation.navigate('AddressList', { selectable: true })}>
            {selectedAddress ? 'Change' : 'Add Address'}
          </Button>
        </Card.Content>
      </Card>

      {/* 2. Bill Details */}
      <Card style={styles.card}>
        <Card.Title title="Order Summary" />
        <Card.Content>
           <View style={styles.row}><Text>Item Total</Text><Text>₹{productTotal.toFixed(2)}</Text></View>
           <View style={styles.row}><Text>GST (18%)</Text><Text>₹{gstAmount.toFixed(2)}</Text></View>
           <View style={styles.row}><Text>Platform Fee (2.5%)</Text><Text>₹{platformFeeBuyer.toFixed(2)}</Text></View>
           <Divider style={{marginVertical: 10}} />
           <View style={styles.row}>
              <Text variant="titleMedium" style={{fontWeight:'bold'}}>Total Payable</Text>
              <Text variant="titleMedium" style={{fontWeight:'bold', color: theme.colors.primary}}>₹{finalPayableAmount.toFixed(2)}</Text>
           </View>
        </Card.Content>
      </Card>

      {/* 3. BANK TRANSFER DETAILS */}
      <Card style={[styles.card, { borderColor: theme.colors.primary, borderWidth: 1 }]}>
        <Card.Title title="Step 1: Transfer Payment" subtitle="RTGS / NEFT / IMPS" left={(props) => <IconButton icon="bank" {...props} />} />
        <Card.Content style={{backgroundColor: '#F0F4F8', padding: 10, borderRadius: 8}}>
          <DetailRow label="Account Name" value={BANK_DETAILS.accountName} onCopy={() => copyToClipboard(BANK_DETAILS.accountName)} />
          <DetailRow label="Account No" value={BANK_DETAILS.accountNumber} onCopy={() => copyToClipboard(BANK_DETAILS.accountNumber)} />
          <DetailRow label="IFSC Code" value={BANK_DETAILS.ifscCode} onCopy={() => copyToClipboard(BANK_DETAILS.ifscCode)} />
          <DetailRow label="Bank" value={BANK_DETAILS.bankName} />
          <Text style={{fontSize:11, color:'#666', marginTop: 10, fontStyle:'italic'}}>
             *Please transfer exactly ₹{finalPayableAmount.toFixed(2)} to the account above.
          </Text>
        </Card.Content>
      </Card>

      {/* 4. UPLOAD PROOF */}
      <Card style={[styles.card, errors.utr && { borderColor: theme.colors.error, borderWidth: 1 }]}>
        <Card.Title title="Step 2: Upload Proof" subtitle="Verify your payment" left={(props) => <IconButton icon="upload" {...props} />} />
        <Card.Content>
          <TextInput
            label="UTR / Reference Number *"
            placeholder="e.g. CMS12345678"
            value={utrNumber}
            onChangeText={(text) => {
               setUtrNumber(text);
               if(text) setErrors(prev => ({...prev, utr: false}));
            }}
            mode="outlined"
            style={{marginBottom: 5, backgroundColor:'white'}}
            activeOutlineColor={theme.colors.primary}
            error={errors.utr}
          />
          <HelperText type="error" visible={errors.utr}>
            Transaction ID (UTR) is required.
          </HelperText>

          <Text style={{fontWeight:'bold', marginBottom: 10, marginTop: 5}}>Payment Screenshot (Optional)</Text>
          <View style={{flexDirection:'row', alignItems:'center'}}>
            <Button mode="outlined" icon="camera" onPress={pickImage}>
              {screenshotUri ? 'Change Image' : 'Select Image'}
            </Button>
            {screenshotUri && (
              <Image source={{ uri: screenshotUri }} style={{ width: 50, height: 50, borderRadius: 4, marginLeft: 15 }} />
            )}
          </View>
        </Card.Content>
      </Card>

      {/* 5. SUBMIT BUTTON */}
      <Button 
        mode="contained" 
        onPress={handlePlaceOrder} 
        loading={loading}
        disabled={loading}
        style={{backgroundColor: theme.colors.primary, marginTop: 10, marginBottom: 30}} 
        contentStyle={{height: 50}}
        icon="check-circle"
      >
        {uploading ? 'Uploading Proof...' : 'Place Order'}
      </Button>

    </ScrollView>
  );
}

const DetailRow = ({ label, value, onCopy }: any) => (
  <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 8, alignItems:'center'}}>
    <View style={{flex:1}}>
      <Text style={{fontSize:12, color:'#666'}}>{label}</Text>
      <Text style={{fontWeight:'bold', fontSize:15}}>{value}</Text>
    </View>
    {onCopy && (
      <IconButton icon="content-copy" size={18} onPress={onCopy} />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#F8FAFC', flexGrow: 1 },
  card: { marginBottom: 16, backgroundColor: 'white', borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems:'center' }
});