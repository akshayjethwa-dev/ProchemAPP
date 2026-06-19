// src/screens/NegotiationRoomScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, ScrollView, Keyboard, Linking } from 'react-native';
import { Text, TextInput, IconButton, Avatar, Button, Card, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, collection, query, where, onSnapshot, updateDoc, addDoc, getDoc, getDocs } from 'firebase/firestore'; 
import { db } from '../config/firebase'; 
import { useAppStore } from '../store/appStore';

export default function NegotiationRoomScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const { user, viewMode } = useAppStore();
  
  const rfqId = route.params?.rfqId;
  const requirementId = route.params?.requirementId;
  const quoteId = route.params?.quoteId;
  const passedConversationId = route.params?.conversationId;

  const isAdminView = route.params?.isAdminView || user?.userType === 'admin' || user?.userType === 'sub_admin';

  // Unified State for RFQ or Custom Requirement
  const [activeItem, setActiveItem] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(passedConversationId || null);
  const [roomMessages, setRoomMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [messageText, setMessageText] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQuantity, setOfferQuantity] = useState('');
  const [offerModalVisible, setOfferModalVisible] = useState(false);

  const [participantsInfo, setParticipantsInfo] = useState<{buyerName: string, sellerName: string, buyerPhone?: string, sellerPhone?: string}>({ buyerName: 'Buyer', sellerName: 'Supplier' });

  // 1. Fetch Active Document (RFQ or Custom Req)
  useEffect(() => {
    if (rfqId) {
      const unsub = onSnapshot(doc(db, 'rfqs', rfqId), (docSnap) => {
        if (docSnap.exists()) setActiveItem({ id: docSnap.id, type: 'rfq', ...docSnap.data() });
      });
      return () => unsub();
    } else if (requirementId && quoteId) {
      const unsubReq = onSnapshot(doc(db, 'customRequirements', requirementId), async (reqSnap) => {
        const reqData = reqSnap.data();
        const quoteSnap = await getDoc(doc(db, 'supplierQuotes', quoteId));
        const quoteData = quoteSnap.data();
        if (reqData && quoteData) {
          setActiveItem({
            id: reqSnap.id,
            type: 'custom_req',
            productName: reqData.productName,
            targetQuantity: reqData.quantity,
            targetPrice: reqData.targetPrice || quoteData.pricePerUnit,
            unit: reqData.unit,
            status: reqData.status === 'QUOTED' ? 'NEGOTIATING' : reqData.status,
            buyerId: reqData.buyerId,
            sellerId: quoteData.supplierId,
            buyerName: reqData.buyerName,
            sellerName: quoteData.supplierName,
            quoteId: quoteSnap.id
          });
        }
      });
      return () => unsubReq();
    }
  }, [rfqId, requirementId, quoteId]);

  // 2. Setup Conversation Id
  useEffect(() => {
    if (!activeItem || !user || conversationId) return;

    const setupConversation = async () => {
      try {
        let q;
        if (activeItem.type === 'custom_req') {
           // For custom reqs, we expect the conversation to be created by the admin approval
           q = query(collection(db, 'conversations'), where('requirementId', '==', activeItem.id), where('quoteId', '==', quoteId));
        } else {
           if (isAdminView) {
             q = query(collection(db, 'conversations'), where('rfqId', '==', activeItem.id));
           } else if (viewMode === 'buyer') {
             q = query(collection(db, 'conversations'), where('rfqId', '==', activeItem.id), where('buyerUserId', '==', user?.uid || ''));
           } else {
             q = query(collection(db, 'conversations'), where('rfqId', '==', activeItem.id), where('sellerUserId', '==', user?.uid || ''));
           }
        }

        const snap = await getDocs(q);
        if (!snap.empty) {
          setConversationId(snap.docs[0].id);
        } else if (!isAdminView && activeItem.type === 'rfq') {
          // Auto create ONLY for RFQs if missing. Admin handles custom_req creations.
          const newConvRef = await addDoc(collection(db, 'conversations'), {
            buyerUserId: activeItem.buyerId,
            sellerUserId: activeItem.sellerId,
            rfqId: activeItem.id,
            status: 'open',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          setConversationId(newConvRef.id);

          // ✅ SYSTEM MESSAGE: Add initial context message for the new negotiation
          const initialContextMsg = `System: Negotiation started for ${activeItem.productName || 'Product'}
Quantity: ${activeItem.targetQuantity || 'N/A'} ${activeItem.unit || ''}
Target Price: ₹${activeItem.targetPrice || 'N/A'} / ${activeItem.unit || ''}
Reference ID: ${activeItem.id || 'N/A'}
Buyer: ${activeItem.buyerName || 'N/A'}
Supplier: ${activeItem.sellerName || 'N/A'}`;

          await addDoc(collection(db, 'conversations', newConvRef.id, 'messages'), {
            rfqId: activeItem.id,
            text: initialContextMsg,
            body: initialContextMsg,
            senderId: 'system',
            senderRole: 'system',
            direction: 'both',
            source: 'app',
            timestamp: Date.now(),
            isBuyer: false,
            isOffer: false
          });
        }
      } catch (err) {
        console.error("Error setting up conversation", err);
      }
    };

    setupConversation();
  }, [activeItem, user, conversationId, isAdminView, viewMode]);

  // 3. Fetch Messages
  useEffect(() => {
    if (!conversationId) {
       setLoading(!activeItem); // Stop loading if activeItem exists but no chat found (pending)
       return;
    }
    const q = query(collection(db, 'conversations', conversationId, 'messages'));
    const unsubMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setRoomMessages(msgs.sort((a: any, b: any) => {
         const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : a.timestamp;
         const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : b.timestamp;
         return timeA - timeB;
      }));
      setLoading(false);
    });
    return () => unsubMessages();
  }, [conversationId]);

  // 4. Load Participant Profiles
  useEffect(() => {
    if (!activeItem || !isAdminView) return;
    const fetchParticipants = async () => {
      try {
        let bPhone = ''; let sPhone = '';
        if (activeItem.buyerId) {
          const bSnap = await getDoc(doc(db, 'users', activeItem.buyerId));
          if (bSnap.exists()) bPhone = bSnap.data().phone || '';
        }
        if (activeItem.sellerId) {
          const sSnap = await getDoc(doc(db, 'users', activeItem.sellerId));
          if (sSnap.exists()) sPhone = sSnap.data().phone || '';
        }
        setParticipantsInfo({
          buyerName: activeItem.buyerName || 'Buyer',
          sellerName: activeItem.sellerName || 'Supplier',
          buyerPhone: bPhone,
          sellerPhone: sPhone
        });
      } catch (error) {}
    };
    fetchParticipants();
  }, [activeItem?.id, isAdminView]);

  if (loading) return <SafeAreaView style={{flex: 1, justifyContent: 'center'}}><ActivityIndicator size="large" color="#004AAD" /></SafeAreaView>;
  if (!activeItem) return <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text>Quote not found.</Text><Button onPress={() => navigation.goBack()}>Go Back</Button></SafeAreaView>;

  const maskSensitiveInfo = (text: string) => {
    let filteredText = text;
    filteredText = filteredText.replace(/(\d[\s\-\.]?){8,12}/g, ' [PHONE NUMBER HIDDEN] ');
    filteredText = filteredText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' [EMAIL HIDDEN] ');
    filteredText = filteredText.replace(/\b(whatsapp|wa\.me|call me|contact me|insta|instagram)\b/gi, ' [RESTRICTED] ');
    return filteredText;
  };

  const sendChatMessage = async () => {
    if (!messageText.trim() || !user || !conversationId) return;
    const safeTextToSend = maskSensitiveInfo(messageText);
    
    if (messageText !== safeTextToSend) Alert.alert("Warning", "Contact info is against policy and was masked.");
    setMessageText(''); 
    
    try {
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        [activeItem.type === 'rfq' ? 'rfqId' : 'requirementId']: activeItem.id,
        text: safeTextToSend, 
        body: safeTextToSend, 
        senderId: user.uid,
        senderRole: viewMode === 'buyer' ? 'buyer' : 'seller',
        direction: viewMode === 'buyer' ? 'toSeller' : 'toBuyer',
        source: 'app', 
        timestamp: Date.now(),
        isBuyer: viewMode === 'buyer',
        isOffer: false
      });
      
      await updateDoc(doc(db, 'conversations', conversationId), { updatedAt: Date.now() });

      if (activeItem.status === 'PENDING') {
         const table = activeItem.type === 'rfq' ? 'rfqs' : 'customRequirements';
         await updateDoc(doc(db, table, activeItem.id), { status: 'NEGOTIATING', updatedAt: new Date().toISOString() });
      }
    } catch (e) {
      Alert.alert("Error", "Message could not be sent.");
    }
  };

  const sendOffer = async () => {
    Keyboard.dismiss();
    const price = parseFloat(offerPrice);
    const qty = parseInt(offerQuantity, 10);

    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0 || !user || !conversationId) {
        return Alert.alert("Invalid Input", "Please enter a valid price and quantity.");
    }

    setOfferPrice(''); setOfferQuantity(''); setOfferModalVisible(false); 
    
    try {
      const offerText = `Sent a Custom Offer: ${qty} ${activeItem.unit} at ₹${price} / ${activeItem.unit}`;
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        [activeItem.type === 'rfq' ? 'rfqId' : 'requirementId']: activeItem.id,
        text: offerText, body: offerText, 
        senderId: user.uid, senderRole: 'seller', direction: 'toBuyer',
        source: 'app', timestamp: Date.now(), isBuyer: false, isOffer: true,
        proposedPrice: price, proposedQty: qty 
      });
      await updateDoc(doc(db, 'conversations', conversationId), { updatedAt: Date.now() });

      const table = activeItem.type === 'rfq' ? 'rfqs' : 'customRequirements';
      await updateDoc(doc(db, table, activeItem.id), { status: 'NEGOTIATING', updatedAt: new Date().toISOString() });
    } catch (e) {
      Alert.alert("Error", "Offer could not be sent.");
    }
  };

  const proceedToCheckout = async (price: number, qty: number) => {
    setIsProcessing(true);
    try {
      if (conversationId) {
        await updateDoc(doc(db, 'conversations', conversationId), { status: 'won', updatedAt: Date.now() });
        await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
          text: `System: This requirement has been successfully fulfilled and closed.`,
          body: `System: This requirement has been successfully fulfilled and closed.`,
          senderId: 'system', senderRole: 'system', source: 'app', timestamp: Date.now(), isBuyer: false, isOffer: false
        });
      }

      if (activeItem.type === 'rfq') {
         await updateDoc(doc(db, 'rfqs', activeItem.id), { status: 'CONVERTED', agreedPrice: price, agreedQuantity: qty, updatedAt: new Date().toISOString() });
      } else {
         await updateDoc(doc(db, 'customRequirements', activeItem.id), { status: 'FULFILLED' });
         if (activeItem.quoteId) {
           await updateDoc(doc(db, 'supplierQuotes', activeItem.quoteId), { status: 'ACCEPTED' });
         }
      }

      const negotiatedItem = {
        id: activeItem.type === 'rfq' ? `${activeItem.productId}_rfq` : `custom_${activeItem.id}`,
        productId: activeItem.productId || '',
        name: activeItem.type === 'rfq' ? `${activeItem.productName} (Quote)` : `${activeItem.productName} (Custom Req)`,
        quantity: qty, 
        pricePerUnit: price,
        unit: activeItem.unit || 'unit',
        sellerId: activeItem.sellerId,
        gstPercent: 18 // Default GST for chemicals if not linked to standard product catalog
      };

      setIsProcessing(false);
      navigation.navigate('Checkout', { negotiatedItem });

    } catch (error) {
      setIsProcessing(false);
      Alert.alert("Error", "Could not complete the checkout process.");
    }
  };

  const acceptOffer = (price: number, qty: number) => {
    Alert.alert('Confirm Custom Offer', `Do you agree to transact ${qty} ${activeItem.unit} at ₹${price} / ${activeItem.unit}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Agree & Checkout', onPress: () => proceedToCheckout(price, qty) }
    ]);
  };

  const closeNegotiation = async () => {
    Alert.alert("End Negotiation", "Are you sure you want to close this negotiation?", [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Close Chat", style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              if (conversationId) {
                await updateDoc(doc(db, 'conversations', conversationId), { status: 'closed', updatedAt: Date.now() });
              }
              const table = activeItem.type === 'rfq' ? 'rfqs' : 'customRequirements';
              await updateDoc(doc(db, table, activeItem.id), { status: 'REJECTED', updatedAt: new Date().toISOString() });
            } catch (err) {
              Alert.alert("Error", "Could not close the chat.");
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.uid;
    const isSystem = item.senderId === 'system' || item.senderRole === 'system';
    const alignRight = isAdminView ? (!item.isBuyer && !isSystem) : isMe;
    
    let bubbleStyle: any = styles.msgBubbleThem;
    let textStyle: any = { color: '#1E293B' };
    
    if (isAdminView) {
       if (isSystem) {
           bubbleStyle = { ...styles.msgBubbleThem, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' };
           textStyle = { fontStyle: 'italic', color: '#64748B' };
       } else if (item.isBuyer) {
           bubbleStyle = { ...styles.msgBubbleThem, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' };
       } else {
           bubbleStyle = { ...styles.msgBubbleThem, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' };
       }
    } else {
       if (isSystem) {
           bubbleStyle = { ...styles.msgBubbleThem, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' };
           textStyle = { fontStyle: 'italic', color: '#64748B' };
       } else if (isMe) {
           bubbleStyle = styles.msgBubbleMe;
           textStyle = { color: 'white' };
       }
    }

    return (
      <View style={[styles.msgWrapper, alignRight ? styles.msgRight : styles.msgLeft]}>
        {!alignRight && <Avatar.Icon size={32} icon={isSystem ? "robot-outline" : (item.isBuyer ? "account" : "store")} style={{marginRight: 8, backgroundColor: '#E2E8F0'}} color="#64748B" />}
        <View>
          <View style={[styles.msgBubble, bubbleStyle]}>
            {isAdminView && !isSystem && (
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: item.isBuyer ? '#1D4ED8' : '#15803D', marginBottom: 2 }}>
                {item.isBuyer ? participantsInfo.buyerName : participantsInfo.sellerName}
              </Text>
            )}
            <Text style={textStyle}>{item.text || item.body}</Text>
            
            {item.isOffer && (item.proposedPrice || item.proposedQty) && (
              <Card style={{marginTop: 10, backgroundColor: (!isAdminView && isMe) ? 'rgba(255,255,255,0.2)' : '#F1F5F9', elevation: 0}}>
                <Card.Content style={{padding: 10}}>
                  <Text style={{fontWeight: 'bold', color: (!isAdminView && isMe) ? 'white' : '#0F172A'}}>
                    {isAdminView ? `Offer:` : (isMe ? 'You Offered:' : 'Custom Offer:')} {'\n'}
                    {item.proposedQty} {activeItem.unit} at ₹{item.proposedPrice} / {activeItem.unit}
                  </Text>
                  
                  {!isAdminView && !isMe && viewMode === 'buyer' && (activeItem.status === 'PENDING' || activeItem.status === 'NEGOTIATING') && (
                    <Button 
                      mode="contained" compact icon="check-circle"
                      loading={isProcessing} disabled={isProcessing}
                      style={{marginTop: 8, backgroundColor: '#10B981'}} 
                      onPress={() => acceptOffer(item.proposedPrice!, item.proposedQty)}
                    >
                      {isProcessing ? 'Processing...' : 'Accept & Checkout'}
                    </Button>
                  )}
                </Card.Content>
              </Card>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View style={{flex: 1}}>
           <Text variant="titleMedium" style={{fontWeight: 'bold'}}>{activeItem?.productName}</Text>
           <Text style={{fontSize: 12, color: '#666'}}>
             {isAdminView 
                ? `${participantsInfo.buyerName} ↔ ${participantsInfo.sellerName}`
                : `Chat with ${viewMode === 'buyer' ? 'Prochem Supplier' : 'Verified Buyer'}`
             }
           </Text>
        </View>
        <Chip style={{backgroundColor: activeItem?.status === 'CONVERTED' || activeItem?.status === 'FULFILLED' ? '#DCFCE7' : (activeItem?.status === 'REJECTED' || activeItem?.status === 'CLOSED' ? '#FEE2E2' : '#FEF9C3'), marginRight: 5}}>
           <Text style={{fontSize: 10, color: activeItem?.status === 'CONVERTED' || activeItem?.status === 'FULFILLED' ? '#166534' : (activeItem?.status === 'REJECTED' || activeItem?.status === 'CLOSED' ? '#991B1B' : '#854D0E')}}>
              {activeItem?.status}
           </Text>
        </Chip>
        {!isAdminView && activeItem?.status !== 'CONVERTED' && activeItem?.status !== 'FULFILLED' && activeItem?.status !== 'REJECTED' && (
          <IconButton icon="close-circle-outline" iconColor="#EF4444" size={24} onPress={closeNegotiation} disabled={isProcessing} />
        )}
      </View>

      {isAdminView && (
         <View style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'white', paddingBottom: 10, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
            <Button icon="phone" mode="text" textColor="#1D4ED8" onPress={() => participantsInfo.buyerPhone ? Linking.openURL(`tel:${participantsInfo.buyerPhone}`) : Alert.alert('Error', 'No buyer phone')}>Call Buyer</Button>
            <Button icon="phone" mode="text" textColor="#15803D" onPress={() => participantsInfo.sellerPhone ? Linking.openURL(`tel:${participantsInfo.sellerPhone}`) : Alert.alert('Error', 'No seller phone')}>Call Seller</Button>
         </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          data={roomMessages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{padding: 16, flexGrow: 1}}
          keyboardShouldPersistTaps="handled"
        />

        {!isAdminView && activeItem?.status !== 'CONVERTED' && activeItem?.status !== 'FULFILLED' && activeItem?.status !== 'REJECTED' && activeItem?.status !== 'CLOSED' && (
          <View>
            {viewMode === 'seller' && (
              <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                <Button 
                  mode="contained" icon="handshake" buttonColor="#10B981" contentStyle={{ height: 48 }}
                  onPress={() => { setOfferPrice(String(activeItem.targetPrice || '')); setOfferQuantity(String(activeItem.targetQuantity || '')); setOfferModalVisible(true); }}
                >
                  Create Offer
                </Button>
              </View>
            )}

            <View style={styles.inputArea}>
              <TextInput mode="outlined" placeholder="Type a message..." value={messageText} onChangeText={setMessageText} style={styles.input} outlineStyle={{borderRadius: 24, borderColor: '#E2E8F0'}} />
              <IconButton icon="send" mode="contained" containerColor="#004AAD" iconColor="white" onPress={sendChatMessage} style={{marginTop: 8}} disabled={!conversationId} />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal visible={offerModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
              <Text variant="titleLarge" style={{fontWeight: 'bold', color: '#0F172A'}}>Send Offer</Text>
              <IconButton icon="close" onPress={() => { Keyboard.dismiss(); setOfferModalVisible(false); }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
               <TextInput mode="outlined" keyboardType="numeric" label={`Quantity Offered (${activeItem?.unit})`} value={offerQuantity} onChangeText={setOfferQuantity} style={{backgroundColor: 'white', marginBottom: 15}} activeOutlineColor="#10B981" />
               <TextInput mode="outlined" keyboardType="numeric" label={`Final Agreed Price (₹ / ${activeItem?.unit})`} value={offerPrice} onChangeText={setOfferPrice} style={{backgroundColor: 'white', marginBottom: 20}} activeOutlineColor="#10B981" />
               <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingBottom: 15}}>
                  <Button mode="text" onPress={() => setOfferModalVisible(false)} textColor="#64748B">Cancel</Button>
                  <Button mode="contained" onPress={sendOffer} buttonColor="#10B981">Send Offer</Button>
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