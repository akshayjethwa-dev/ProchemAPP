import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, BackHandler, Image, Clipboard, Platform } from 'react-native'; 
import { Text, Card, Button, Divider, IconButton, TextInput, HelperText, useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native'; 
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore'; 
import { useAppStore } from '../store/appStore';
import { placeOrder } from '../services/orderService';
import { db, storage } from '../config/firebase';
import { Address, User } from '../types';

// 🏦 BANK DETAILS CONFIGURATION
const BANK_DETAILS = {
  accountName: "AAPA CAPITAL PRIVATE LIMITED",
  accountNumber: "0052572593",
  ifscCode: "KKBK0000832",
  bankName: "Kotak Mahindra Bank",
  Branch: "Anand - Vallabh Vidyanagar" 
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
  
  // ✅ GST STATE LOGIC
  const [sellerState, setSellerState] = useState<string | null>(null);
  const [calculatingTax, setCalculatingTax] = useState(true);

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

  // --- ADDRESS & SELLER LOGIC ---
  useEffect(() => {
    // 1. Set Buyer Address
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

    // 2. Fetch Seller State
    fetchSellerDetails();
  }, [user, route.params]);

  const fetchSellerDetails = async () => {
    if (cart.length === 0) return;
    try {
      const sellerId = cart[0].sellerId;
      const sellerRef = doc(db, 'users', sellerId);
      const sellerSnap = await getDoc(sellerRef);
      
      if (sellerSnap.exists()) {
        const sellerData = sellerSnap.data() as User;
        let state = null;
        if (sellerData.addresses && sellerData.addresses.length > 0) {
          state = sellerData.addresses[0].state; 
        }
        setSellerState(state || 'Gujarat'); 
      }
    } catch (error) {
      console.error("Error fetching seller details:", error);
    } finally {
      setCalculatingTax(false);
    }
  };

  // --- FINANCIAL CALCULATIONS ---
  const BUYER_PLATFORM_FEE_PERCENT = 0.01; 
  const BUYER_LOGISTIC_FEE_PERCENT = 0.01; 

  const SELLER_PLATFORM_FEE_PERCENT = 0.015; 
  const SELLER_SAFETY_FEE_PERCENT = 0.0025;  
  const SELLER_FREIGHT_FEE_PERCENT = 0.01;   

  const productTotal = cart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  
  const totalGstAmount = cart.reduce((sum, item) => sum + ((item.pricePerUnit * item.quantity) * ((item.gstPercent || 18) / 100)), 0);
  
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let isInterState = true; 

  if (selectedAddress?.state && sellerState) {
    if (selectedAddress.state.toLowerCase() === sellerState.toLowerCase()) {
      isInterState = false;
      cgst = totalGstAmount / 2;
      sgst = totalGstAmount / 2;
    } else {
      isInterState = true;
      igst = totalGstAmount;
    }
  } else {
     igst = totalGstAmount;
  }

  const productTotalWithTax = productTotal + totalGstAmount;
  
  const platformFeeBuyer = productTotalWithTax * BUYER_PLATFORM_FEE_PERCENT;
  const logisticFee = productTotalWithTax * BUYER_LOGISTIC_FEE_PERCENT;
  const finalPayableAmount = productTotalWithTax + platformFeeBuyer + logisticFee; 

  const platformFeeSeller = productTotalWithTax * SELLER_PLATFORM_FEE_PERCENT;
  const safetyFee = productTotalWithTax * SELLER_SAFETY_FEE_PERCENT;
  const freightFee = productTotalWithTax * SELLER_FREIGHT_FEE_PERCENT;
  const payoutAmount = productTotalWithTax - platformFeeSeller - safetyFee - freightFee;

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
        taxAmount: totalGstAmount,
        cgst: cgst,
        sgst: sgst,
        igst: igst,
        
        platformFeeBuyer: platformFeeBuyer,
        logisticFee: logisticFee,
        
        platformFeeSeller: platformFeeSeller,
        safetyFee: safetyFee,
        freightFee: freightFee,

        totalAmount: finalPayableAmount,
        payoutAmount: payoutAmount,
        
        status: 'PENDING_SELLER', 
        paymentStatus: 'pending_verification',
        paymentMode: 'BANK_TRANSFER',
        paymentReference: utrNumber,
        paymentScreenshot: proofUrl,
        sellerPayoutStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        date: new Date().toISOString(),
      } as any);

      // ✅ 4. NOTIFICATIONS (Wrapped in try/catch to avoid false failures)
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: 'ALL_ADMINS',
          type: 'ORDER',
          title: 'New Manual Payment Order',
          message: `Order #${orderId.slice(0,6).toUpperCase()} placed. UTR: ${utrNumber}`,
          data: { orderId },
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (notifyError) {
        console.warn("Notification skipped due to permissions/error:", notifyError);
      }
      
      clearCart();
      setLoading(false);
      
      // ✅ 5. REDIRECT LOGIC
      const resetAction = CommonActions.reset({
        index: 0,
        routes: [{
          name: 'BuyerTabs',
          state: {
            routes: [{ name: 'Orders' }], 
          },
        }],
      });

      if (Platform.OS === 'web') {
        // ✅ WEB FIX: Standard window.alert blocks until clicked, then navigates
        window.alert("Order Placed Successfully! Your order has been sent to the Seller.");
        navigation.dispatch(resetAction);
      } else {
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
      console.error("Order Failure:", error);
      setLoading(false);
      setUploading(false);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    }
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
  };

  if (calculatingTax) {
    return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* 1. Address Section */}
      <Card style={[styles.card, errors.address && { borderColor: theme.colors.error, borderWidth: 1 }]}>
        <Card.Title title="Delivery To" left={(props) => <Text {...props}>📍</Text>} />
        <Card.Content>
          {selectedAddress ? (
            <View>
              <Text style={{fontWeight:'bold'}}>{selectedAddress.label}</Text>
              <Text>{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state}</Text>
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
           
           {!isInterState ? (
             <>
                <View style={styles.row}>
                  <Text>CGST (9%)</Text>
                  <Text>₹{cgst.toFixed(2)}</Text>
                </View>
                <View style={styles.row}>
                  <Text>SGST (9%)</Text>
                  <Text>₹{sgst.toFixed(2)}</Text>
                </View>
             </>
           ) : (
             <View style={styles.row}>
                <Text>IGST (18%)</Text>
                <Text>₹{igst.toFixed(2)}</Text>
             </View>
           )}

           <Divider style={{marginVertical: 5}} />
           
           <View style={styles.row}><Text>Platform Fee (1%)</Text><Text>₹{platformFeeBuyer.toFixed(2)}</Text></View>
           <View style={styles.row}><Text>Logistic Fee (1%)</Text><Text>₹{logisticFee.toFixed(2)}</Text></View>
           
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