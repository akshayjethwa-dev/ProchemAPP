import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
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
  
  // 🚀 FIXED: Extracted viewMode from store to handle dual-role accounts correctly
  const { user, viewMode, addToCart } = useAppStore();
  
  const rfqId = route.params?.rfqId;
  const isBuyerMode = viewMode === 'buyer'; // 🚀 FIXED: Relying on viewMode

  // REAL-TIME STATES
  const [activeRfq, setActiveRfq] = useState<RFQ | null>(null);
  const [roomMessages, setRoomMessages] = useState<NegotiationMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);

  // FIREBASE LISTENERS
  useEffect(() => {
    if (!rfqId) return;

    // 1. Listen to RFQ Details
    const unsubRfq = onSnapshot(doc(db, 'rfqs', rfqId), (docSnap) => {
      if (docSnap.exists()) {
        setActiveRfq(docSnap.data() as RFQ);
      }
    });

    // 2. Listen to Chat Messages
    const q = query(collection(db, 'messages'), where('rfqId', '==', rfqId));
    const unsubMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NegotiationMessage));
      // Sort messages in memory by timestamp
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

  // WRITE TO FIREBASE (Send Message)
  const sendMessage = async () => {
    if (!messageText.trim() || !user) return;
    
    const isOffer = messageText.toLowerCase().startsWith('offer:');
    let proposedPrice = undefined;
    if (isOffer) {
       const numbers = messageText.match(/\d+/g);
       if (numbers) proposedPrice = parseFloat(numbers[0]);
    }

    const msgPayload = {
      rfqId: activeRfq.id,
      text: messageText,
      senderId: user.uid,
      timestamp: Date.now(),
      isBuyer: isBuyerMode,
      isOffer: isOffer,
      proposedPrice: proposedPrice
    };

    setMessageText(''); // Clear instantly for good UX
    
    try {
      await addDoc(collection(db, 'messages'), msgPayload);
      
      // Update RFQ Status if it was pending
      if (activeRfq.status === 'PENDING') {
         await updateDoc(doc(db, 'rfqs', activeRfq.id), {
            status: 'NEGOTIATING',
            updatedAt: new Date().toISOString()
         });
      } else {
         await updateDoc(doc(db, 'rfqs', activeRfq.id), {
            updatedAt: new Date().toISOString()
         });
      }
    } catch (e) {
      console.error("Error sending message: ", e);
      Alert.alert("Error", "Message could not be sent.");
    }
  };

  // WRITE TO FIREBASE (Accept Offer)
  const acceptOffer = (price: number) => {
    Alert.alert('Confirm Acceptance', `Do you agree to transact at ₹${price} / ${activeRfq.unit}?`, [
       { text: 'Cancel', style: 'cancel' },
       { 
         text: isBuyerMode ? 'Agree & Checkout' : 'Confirm Deal', 
         onPress: async () => {
           try {
             await updateDoc(doc(db, 'rfqs', activeRfq.id), {
               status: 'CONVERTED',
               agreedPrice: price,
               updatedAt: new Date().toISOString()
             });

             if (isBuyerMode) {
               addToCart({
                 id: `${activeRfq.productId}_rfq`,
                 name: `${activeRfq.productName} (Custom Quote)`,
                 quantity: activeRfq.targetQuantity,
                 pricePerUnit: price,
                 unit: activeRfq.unit,
                 sellerId: activeRfq.sellerId
               });
               navigation.navigate('BuyerTabs', { screen: 'Cart' });
             } else {
               Alert.alert("Success", "The buyer has been notified to proceed to checkout.");
               navigation.goBack();
             }
           } catch (e) {
             Alert.alert("Error", "Could not complete acceptance.");
           }
         }
       }
    ]);
  };

  const renderMessage = ({ item }: { item: NegotiationMessage }) => {
    const isMe = item.isBuyer === isBuyerMode;
    
    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgRight : styles.msgLeft]}>
        {!isMe && <Avatar.Icon size={32} icon={item.isBuyer ? "account" : "store"} style={{marginRight: 8, backgroundColor: '#E2E8F0'}} color="#64748B" />}
        
        <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleThem]}>
          <Text style={{color: isMe ? 'white' : '#1E293B'}}>{item.text}</Text>
          
          {item.isOffer && item.proposedPrice && (
             <Card style={{marginTop: 10, backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : '#F1F5F9', elevation: 0}}>
               <Card.Content style={{padding: 10}}>
                 <Text style={{fontWeight: 'bold', color: isMe ? 'white' : '#0F172A'}}>Proposed: ₹{item.proposedPrice} / {activeRfq.unit}</Text>
                 
                 {!isMe && (activeRfq.status === 'PENDING' || activeRfq.status === 'NEGOTIATING') && (
                    <Button mode="contained" compact style={{marginTop: 8, backgroundColor: '#10B981'}} onPress={() => acceptOffer(item.proposedPrice!)}>
                      {isBuyerMode ? 'Accept & Checkout' : 'Accept Quote'}
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
             Chat with {isBuyerMode ? 'Prochem Supplier' : 'Verified Buyer'}
           </Text>
        </View>
        <Chip style={{backgroundColor: activeRfq.status === 'CONVERTED' ? '#DCFCE7' : '#FEF9C3'}}>
           <Text style={{fontSize: 10, color: activeRfq.status === 'CONVERTED' ? '#166534' : '#854D0E'}}>
              {activeRfq.status}
           </Text>
        </Chip>
      </View>

      <FlatList
        data={roomMessages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{padding: 16, flexGrow: 1}}
      />

      {activeRfq.status !== 'CONVERTED' && activeRfq.status !== 'REJECTED' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputArea}>
            <TextInput
              mode="outlined"
              placeholder='Type msg or "Offer: 90" to bid...'
              value={messageText}
              onChangeText={setMessageText}
              style={styles.input}
              outlineStyle={{borderRadius: 24, borderColor: '#E2E8F0'}}
            />
            <IconButton icon="send" mode="contained" containerColor="#004AAD" iconColor="white" onPress={sendMessage} style={{marginTop: 8}} />
          </View>
        </KeyboardAvoidingView>
      )}
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
  input: { flex: 1, backgroundColor: '#F1F5F9', marginRight: 10 }
});