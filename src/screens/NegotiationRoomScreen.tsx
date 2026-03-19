import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, ScrollView, Keyboard } from 'react-native';
import { Text, TextInput, IconButton, Avatar, Button, Card, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, collection, query, where, onSnapshot, updateDoc, addDoc } from 'firebase/firestore'; 
import { db } from '../config/firebase'; 
import { useAppStore } from '../store/appStore';
import { RFQ, NegotiationMessage } from '../types';

export default function NegotiationRoomScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const { user, viewMode } = useAppStore();
  
  const rfqId = route.params?.rfqId;

  const [activeRfq, setActiveRfq] = useState<RFQ | null>(null);
  const [roomMessages, setRoomMessages] = useState<NegotiationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [messageText, setMessageText] = useState('');
  
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQuantity, setOfferQuantity] = useState('');
  const [offerModalVisible, setOfferModalVisible] = useState(false);

  useEffect(() => {
    if (!rfqId) return;

    const unsubRfq = onSnapshot(doc(db, 'rfqs', rfqId), (docSnap) => {
      if (docSnap.exists()) {
        setActiveRfq(docSnap.data() as RFQ);
      }
    });

    const q = query(collection(db, 'messages'), where('rfqId', '==', rfqId));
    const unsubMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NegotiationMessage));
      setRoomMessages(msgs.sort((a, b) => a.timestamp - b.timestamp));
      setLoading(false);
    });

    return () => {
      unsubRfq();
      unsubMessages();
    };
  }, [rfqId]);

  if (loading) {
    return (
      <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#004AAD" />
      </SafeAreaView>
    );
  }

  if (!activeRfq) {
    return (
      <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Quote not found.</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </SafeAreaView>
    );
  }

  const maskSensitiveInfo = (text: string) => {
    let filteredText = text;
    const phoneRegex = /(\d[\s\-\.]?){8,12}/g;
    filteredText = filteredText.replace(phoneRegex, ' [PHONE NUMBER HIDDEN] ');
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    filteredText = filteredText.replace(emailRegex, ' [EMAIL HIDDEN] ');
    const sneakyWordsRegex = /\b(whatsapp|wa\.me|call me|contact me|insta|instagram)\b/gi;
    filteredText = filteredText.replace(sneakyWordsRegex, ' [RESTRICTED] ');
    return filteredText;
  };

  const sendChatMessage = async () => {
    if (!messageText.trim() || !user) return;
    
    const safeTextToSend = maskSensitiveInfo(messageText);
    
    if (messageText !== safeTextToSend) {
       Alert.alert(
         "Security Warning", 
         "Sharing contact information like phone numbers or emails is strictly against platform policy. Your message has been masked."
       );
    }
    
    setMessageText(''); 
    
    try {
      await addDoc(collection(db, 'messages'), {
        rfqId: activeRfq.id,
        text: safeTextToSend,
        senderId: user.uid,
        timestamp: Date.now(),
        isBuyer: viewMode === 'buyer',
        isOffer: false
      });
      
      if (activeRfq.status === 'PENDING') {
         await updateDoc(doc(db, 'rfqs', activeRfq.id), {
            status: 'NEGOTIATING',
            updatedAt: new Date().toISOString()
         });
      }
    } catch (e) {
      console.error("Error sending message: ", e);
      Alert.alert("Error", "Message could not be sent.");
    }
  };

  const sendOffer = async () => {
    Keyboard.dismiss();
    const price = parseFloat(offerPrice);
    const qty = parseInt(offerQuantity, 10);

    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0 || !user) {
        Alert.alert("Invalid Input", "Please enter a valid price and quantity.");
        return;
    }

    setOfferPrice('');
    setOfferQuantity('');
    setOfferModalVisible(false); 
    
    try {
      await addDoc(collection(db, 'messages'), {
        rfqId: activeRfq.id,
        text: `Sent a Custom Offer: ${qty} ${activeRfq.unit} at ₹${price} / ${activeRfq.unit}`,
        senderId: user.uid,
        timestamp: Date.now(),
        isBuyer: false,
        isOffer: true,
        proposedPrice: price,
        proposedQty: qty 
      });
      
      await updateDoc(doc(db, 'rfqs', activeRfq.id), {
        status: 'NEGOTIATING',
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error sending offer: ", e);
      Alert.alert("Error", "Offer could not be sent.");
    }
  };

  const proceedToCheckout = async (price: number, qty: number) => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'rfqs', activeRfq.id), {
        status: 'CONVERTED',
        agreedPrice: price,
        agreedQuantity: qty, 
        updatedAt: new Date().toISOString()
      });

      const negotiatedItem = {
        id: `${activeRfq.productId}_rfq`,
        productId: activeRfq.productId,
        name: `${activeRfq.productName} (Custom Quote)`,
        quantity: qty, 
        pricePerUnit: price,
        unit: activeRfq.unit || 'unit',
        sellerId: activeRfq.sellerId,
        gstPercent: 18
      };

      setIsProcessing(false);
      navigation.navigate('OrderSummary', { negotiatedItem });

    } catch (error) {
      console.error("Checkout Navigation Error: ", error);
      setIsProcessing(false);
      Alert.alert("Error", "Could not complete the checkout process. Please check your connection.");
    }
  };

  const acceptOffer = (price: number, qty: number) => {
    if (Platform.OS === 'web') {
      const isConfirmed = window.confirm(`Do you agree to transact ${qty} ${activeRfq.unit} at ₹${price} / ${activeRfq.unit}?`);
      if (isConfirmed) {
        proceedToCheckout(price, qty);
      }
    } else {
      Alert.alert('Confirm Custom Offer', `Do you agree to transact ${qty} ${activeRfq.unit} at ₹${price} / ${activeRfq.unit}?`, [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Agree & Checkout', 
          onPress: () => proceedToCheckout(price, qty) 
        }
      ]);
    }
  };

  const renderMessage = ({ item }: { item: NegotiationMessage }) => {
    const isMe = item.isBuyer === (viewMode === 'buyer');
    
    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgRight : styles.msgLeft]}>
        {!isMe && <Avatar.Icon size={32} icon={item.isBuyer ? "account" : "store"} style={{marginRight: 8, backgroundColor: '#E2E8F0'}} color="#64748B" />}
        
        <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleThem]}>
          <Text style={{color: isMe ? 'white' : '#1E293B'}}>{item.text}</Text>
          
          {item.isOffer && (item.proposedPrice || item.proposedQty) && (
             <Card style={{marginTop: 10, backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : '#F1F5F9', elevation: 0}}>
               <Card.Content style={{padding: 10}}>
                 <Text style={{fontWeight: 'bold', color: isMe ? 'white' : '#0F172A'}}>
                   {isMe ? 'You Offered:' : 'Custom Offer:'} 
                   {'\n'}{item.proposedQty || activeRfq.targetQuantity} {activeRfq.unit} at ₹{item.proposedPrice} / {activeRfq.unit}
                 </Text>
                 
                 {!isMe && viewMode === 'buyer' && (activeRfq.status === 'PENDING' || activeRfq.status === 'NEGOTIATING') && (
                    <Button 
                      mode="contained" 
                      compact 
                      icon="check-circle"
                      loading={isProcessing}
                      disabled={isProcessing}
                      style={{marginTop: 8, backgroundColor: '#10B981'}} 
                      onPress={() => acceptOffer(item.proposedPrice!, item.proposedQty || activeRfq.targetQuantity)}
                    >
                      {isProcessing ? 'Processing...' : 'Accept & Checkout'}
                    </Button>
                 )}
               </Card.Content>
             </Card>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View style={{flex: 1}}>
           <Text variant="titleMedium" style={{fontWeight: 'bold'}}>{activeRfq.productName}</Text>
           <Text style={{fontSize: 12, color: '#666'}}>
             Chat with {viewMode === 'buyer' ? 'Prochem Supplier' : 'Verified Buyer'}
           </Text>
        </View>
        <Chip style={{backgroundColor: activeRfq.status === 'CONVERTED' ? '#DCFCE7' : '#FEF9C3'}}>
           <Text style={{fontSize: 10, color: activeRfq.status === 'CONVERTED' ? '#166534' : '#854D0E'}}>
              {activeRfq.status}
           </Text>
        </Chip>
      </View>

      {/* ✅ FIXED: Changed behavior from undefined to 'height' for Android to properly push UI up */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={roomMessages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{padding: 16, flexGrow: 1}}
          keyboardShouldPersistTaps="handled"
          inverted={false} 
        />

        {activeRfq.status !== 'CONVERTED' && activeRfq.status !== 'REJECTED' && (
          <View>
            {viewMode === 'seller' && (
              <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                <Button 
                  mode="contained" 
                  icon="handshake" 
                  buttonColor="#10B981" 
                  contentStyle={{ height: 48 }}
                  onPress={() => {
                    setOfferPrice(String(activeRfq.targetPrice || ''));
                    setOfferQuantity(String(activeRfq.targetQuantity || ''));
                    setOfferModalVisible(true);
                  }}
                >
                  Create Offer
                </Button>
              </View>
            )}

            <View style={styles.inputArea}>
              <TextInput
                mode="outlined"
                placeholder="Type a message..."
                value={messageText}
                onChangeText={setMessageText}
                style={styles.input}
                outlineStyle={{borderRadius: 24, borderColor: '#E2E8F0'}}
              />
              
              <IconButton 
                icon="send" 
                mode="contained" 
                containerColor="#004AAD" 
                iconColor="white" 
                onPress={sendChatMessage} 
                style={{marginTop: 8}} 
              />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* 🚀 FIXED Offer Modal UI/UX: Made it behave exactly like the RFQ modal to prevent hiding */}
      <Modal visible={offerModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
              <Text variant="titleLarge" style={{fontWeight: 'bold', color: '#0F172A'}}>
                 Send Offer
              </Text>
              <IconButton icon="close" onPress={() => { Keyboard.dismiss(); setOfferModalVisible(false); }} />
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
               <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  label={`Quantity Offered (${activeRfq.unit})`}
                  value={offerQuantity}
                  onChangeText={setOfferQuantity}
                  style={{backgroundColor: 'white', marginBottom: 15}}
                  activeOutlineColor="#10B981"
               />

               <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  label={`Final Agreed Price (₹ / ${activeRfq.unit})`}
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  style={{backgroundColor: 'white', marginBottom: 20}}
                  activeOutlineColor="#10B981"
               />

               <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingBottom: 15}}>
                  <Button mode="text" onPress={() => setOfferModalVisible(false)} textColor="#64748B">
                     Cancel
                  </Button>
                  <Button mode="contained" onPress={sendOffer} buttonColor="#10B981">
                     Send Offer
                  </Button>
               </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  msgWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 15 },
  msgRight: { justifyContent: 'flex-end' },
  msgLeft: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  msgBubbleMe: { backgroundColor: '#004AAD', borderBottomRightRadius: 4 },
  msgBubbleThem: { backgroundColor: 'white', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: 'white', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  input: { flex: 1, backgroundColor: '#F1F5F9', marginRight: 5, height: 48, justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, elevation: 10 }
});