// src/screens/NegotiationRoomScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  Alert, 
  ActivityIndicator, 
  Modal, 
  ScrollView, 
  Keyboard, 
  Linking,
  TouchableOpacity
} from 'react-native';
import { Text, TextInput, IconButton, Avatar, Button } from 'react-native-paper';
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
  const initialLeadInfo = route.params?.leadInfo;
  const leadId = route.params?.leadId || initialLeadInfo?.leadId;

  const isAdminView = route.params?.isAdminView || user?.userType === 'admin' || user?.userType === 'sub_admin';

  // Synchronously initialize activeItem if leadInfo or route parameters are provided
  const [activeItem, setActiveItem] = useState<any>(() => {
    if (initialLeadInfo) {
      return {
        id: requirementId || rfqId || leadId || passedConversationId || 'inquiry_lead',
        type: (initialLeadInfo.sourceType === 'RFQ' || rfqId) ? 'rfq' : 'custom_req',
        productName: initialLeadInfo.productName || 'Chemical Requirement',
        targetQuantity: initialLeadInfo.quantity || initialLeadInfo.quantityRequired || initialLeadInfo.targetQuantity || 'N/A',
        targetPrice: initialLeadInfo.targetPrice || 'Open',
        unit: initialLeadInfo.unit || 'Units',
        status: 'NEGOTIATING',
        buyerId: initialLeadInfo.buyerId || 'buyer',
        sellerId: initialLeadInfo.sellerId || (viewMode === 'seller' ? user?.uid : '') || '',
        buyerName: initialLeadInfo.buyerName || 'Buyer',
        sellerName: initialLeadInfo.sellerName || (viewMode === 'seller' ? user?.companyName || user?.name || 'Verified Supplier' : 'Verified Supplier'),
        quoteId: quoteId || undefined,
        leadId: leadId
      };
    }
    return null;
  });

  const [conversationId, setConversationId] = useState<string | null>(passedConversationId || null);
  const [roomMessages, setRoomMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(!initialLeadInfo);
  const [isProcessing, setIsProcessing] = useState(false);

  const [messageText, setMessageText] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQuantity, setOfferQuantity] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [offerModalVisible, setOfferModalVisible] = useState(false);

  const [participantsInfo, setParticipantsInfo] = useState<{buyerName: string, sellerName: string, buyerPhone?: string, sellerPhone?: string}>({ 
    buyerName: 'Buyer', 
    sellerName: 'Supplier' 
  });

  // Accurate role determination: if user.uid is not the buyerId, they are the seller in this room
  const isSeller = (viewMode === 'seller') || 
                   (user?.userType === 'seller') || 
                   (activeItem?.sellerId && activeItem.sellerId === user?.uid) ||
                   (activeItem?.buyerId && user?.uid && activeItem.buyerId !== user.uid);
  const isBuyer = !isSeller;

  // Comprehensive multi-source item resolution
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      let resolvedItem: any = null;

      // 1. Try RFQ if rfqId is provided
      if (rfqId) {
        try {
          const rfqSnap = await getDoc(doc(db, 'rfqs', rfqId));
          if (rfqSnap.exists()) {
            resolvedItem = { id: rfqSnap.id, type: 'rfq', ...rfqSnap.data() };
          }
        } catch (e) {
          console.warn('Error fetching rfq:', e);
        }
      }

      // 2. Try customRequirements if requirementId is provided
      if (!resolvedItem && requirementId) {
        try {
          const reqSnap = await getDoc(doc(db, 'customRequirements', requirementId));
          if (reqSnap.exists()) {
            const reqData = reqSnap.data();
            resolvedItem = {
              id: reqSnap.id,
              type: 'custom_req',
              productName: reqData.productName || 'Custom Requirement',
              targetQuantity: reqData.quantity || 'N/A',
              targetPrice: reqData.targetPrice || reqData.quotedPrice || 'N/A',
              unit: reqData.unit || 'Units',
              status: reqData.status === 'QUOTED' ? 'NEGOTIATING' : (reqData.status || 'PENDING'),
              buyerId: reqData.buyerId || reqData.userId,
              buyerName: reqData.buyerName || 'Buyer',
              sellerId: reqData.sellerId || '',
              sellerName: reqData.sellerName || 'Verified Supplier'
            };
          }
        } catch (e) {
          console.warn('Error fetching customRequirements:', e);
        }
      }

      // 3. Try broadcastLeads if leadId or requirementId exists
      const potentialLeadId = leadId || requirementId || rfqId;
      if (!resolvedItem && potentialLeadId) {
        try {
          const leadSnap = await getDoc(doc(db, 'broadcastLeads', potentialLeadId));
          if (leadSnap.exists()) {
            const lData = leadSnap.data();
            resolvedItem = {
              id: leadSnap.id,
              type: lData.sourceType === 'RFQ' ? 'rfq' : 'custom_req',
              productName: lData.productName || 'Chemical Requirement',
              targetQuantity: lData.quantityRequired || lData.quantity || 'N/A',
              targetPrice: lData.targetPrice || 'Open',
              unit: lData.unit || 'Units',
              status: 'NEGOTIATING',
              buyerId: lData.buyerId || 'buyer',
              buyerName: 'Buyer',
              sellerId: viewMode === 'seller' ? user?.uid : '',
              sellerName: viewMode === 'seller' ? user?.companyName || user?.name || 'Verified Supplier' : 'Verified Supplier'
            };
          }
        } catch (e) {
          console.warn('Error fetching broadcastLeads:', e);
        }
      }

      // 4. Try conversations document if conversationId is provided
      const currentConvId = conversationId || passedConversationId;
      if (!resolvedItem && currentConvId) {
        try {
          const convSnap = await getDoc(doc(db, 'conversations', currentConvId));
          if (convSnap.exists()) {
            const cData = convSnap.data();
            resolvedItem = {
              id: cData.requirementId || cData.rfqId || cData.leadId || currentConvId,
              type: cData.rfqId ? 'rfq' : 'custom_req',
              productName: cData.productName || 'Chemical Requirement',
              targetQuantity: cData.targetQuantity || 'N/A',
              targetPrice: cData.targetPrice || 'Open',
              unit: cData.unit || 'Units',
              status: 'NEGOTIATING',
              buyerId: cData.buyerUserId || 'buyer',
              sellerId: cData.sellerUserId || '',
              buyerName: 'Buyer',
              sellerName: 'Verified Supplier'
            };
          }
        } catch (e) {
          console.warn('Error fetching conversation doc:', e);
        }
      }

      // 5. Check quote if quoteId exists
      if (quoteId) {
        try {
          const quoteSnap = await getDoc(doc(db, 'supplierQuotes', quoteId));
          if (quoteSnap.exists()) {
            const qData = quoteSnap.data();
            if (resolvedItem) {
              resolvedItem.quoteId = quoteId;
              if (qData.pricePerUnit) resolvedItem.targetPrice = qData.pricePerUnit;
              if (qData.supplierId) resolvedItem.sellerId = qData.supplierId;
              if (qData.supplierName) resolvedItem.sellerName = qData.supplierName;
            } else {
              resolvedItem = {
                id: qData.leadId || quoteId,
                type: 'custom_req',
                productName: qData.productName || 'Chemical Requirement',
                targetQuantity: qData.availableQuantity || 'N/A',
                targetPrice: qData.pricePerUnit || 'N/A',
                unit: 'Units',
                status: 'NEGOTIATING',
                buyerId: 'buyer',
                sellerId: qData.supplierId || '',
                sellerName: qData.supplierName || 'Verified Supplier',
                buyerName: 'Buyer',
                quoteId: quoteId
              };
            }
          }
        } catch (e) {
          console.warn('Error fetching quote:', e);
        }
      }

      // 6. Merge with initialLeadInfo if provided
      if (initialLeadInfo) {
        if (!resolvedItem) {
          resolvedItem = {
            id: requirementId || rfqId || leadId || passedConversationId || 'inquiry_lead',
            type: (initialLeadInfo.sourceType === 'RFQ' || rfqId) ? 'rfq' : 'custom_req',
            productName: initialLeadInfo.productName || 'Chemical Requirement',
            targetQuantity: initialLeadInfo.quantity || initialLeadInfo.quantityRequired || initialLeadInfo.targetQuantity || 'N/A',
            targetPrice: initialLeadInfo.targetPrice || 'Open',
            unit: initialLeadInfo.unit || 'Units',
            status: 'NEGOTIATING',
            buyerId: initialLeadInfo.buyerId || 'buyer',
            sellerId: initialLeadInfo.sellerId || (viewMode === 'seller' ? user?.uid : '') || '',
            buyerName: initialLeadInfo.buyerName || 'Buyer',
            sellerName: initialLeadInfo.sellerName || (viewMode === 'seller' ? user?.companyName || user?.name || 'Verified Supplier' : 'Verified Supplier'),
            quoteId: quoteId || undefined
          };
        } else {
          resolvedItem.productName = resolvedItem.productName || initialLeadInfo.productName;
          resolvedItem.targetQuantity = resolvedItem.targetQuantity || initialLeadInfo.quantity;
          resolvedItem.targetPrice = resolvedItem.targetPrice || initialLeadInfo.targetPrice;
          resolvedItem.unit = resolvedItem.unit || initialLeadInfo.unit;
          if (initialLeadInfo.buyerId && (!resolvedItem.buyerId || resolvedItem.buyerId === 'buyer')) {
            resolvedItem.buyerId = initialLeadInfo.buyerId;
          }
        }
      }

      // 7. Ultimate safety fallback to guarantee activeItem is never null when params exist
      if (!resolvedItem && (passedConversationId || requirementId || rfqId || leadId)) {
        resolvedItem = {
          id: requirementId || rfqId || leadId || passedConversationId || 'desk_item',
          type: rfqId ? 'rfq' : 'custom_req',
          productName: 'Chemical Requirement',
          targetQuantity: 'N/A',
          targetPrice: 'Open',
          unit: 'Units',
          status: 'NEGOTIATING',
          buyerId: 'buyer',
          sellerId: viewMode === 'seller' ? user?.uid : '',
          buyerName: 'Buyer',
          sellerName: viewMode === 'seller' ? user?.companyName || user?.name || 'Verified Supplier' : 'Verified Supplier'
        };
      }

      if (isMounted) {
        if (resolvedItem) {
          setActiveItem((prev: any) => ({ ...(prev || {}), ...resolvedItem }));
        }
        setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [rfqId, requirementId, quoteId, leadId, passedConversationId]);

  useEffect(() => {
    if (!activeItem || !user || conversationId) return;

    const setupConversation = async () => {
      try {
        let q;
        if (activeItem.type === 'custom_req') {
           if (passedConversationId) {
             setConversationId(passedConversationId);
             return;
           } else if (quoteId) {
             q = query(collection(db, 'conversations'), where('requirementId', '==', activeItem.id), where('quoteId', '==', quoteId));
           } else {
             const partnerSellerId = isSeller ? user?.uid : activeItem.sellerId;
             if (partnerSellerId) {
               q = query(collection(db, 'conversations'), where('requirementId', '==', activeItem.id), where('sellerUserId', '==', partnerSellerId));
             } else {
               q = query(collection(db, 'conversations'), where('requirementId', '==', activeItem.id));
             }
           }
        } else {
           if (isAdminView) {
             q = query(collection(db, 'conversations'), where('rfqId', '==', activeItem.id));
           } else if (isBuyer) {
             q = query(collection(db, 'conversations'), where('rfqId', '==', activeItem.id), where('buyerUserId', '==', user?.uid || ''));
           } else {
             q = query(collection(db, 'conversations'), where('rfqId', '==', activeItem.id), where('sellerUserId', '==', user?.uid || ''));
           }
        }

        const snap = await getDocs(q);
        if (!snap.empty) {
          setConversationId(snap.docs[0].id);
        } else if (!isAdminView && (activeItem.type === 'rfq' || activeItem.type === 'custom_req')) {
          const partnerSellerId = activeItem.sellerId || (isSeller ? user?.uid : '');
          const newConvRef = await addDoc(collection(db, 'conversations'), {
            buyerUserId: activeItem.buyerId,
            sellerUserId: partnerSellerId,
            ...(activeItem.type === 'rfq' ? { rfqId: activeItem.id } : { requirementId: activeItem.id }),
            ...(quoteId ? { quoteId } : {}),
            productName: activeItem.productName || 'Chemical Product',
            targetQuantity: activeItem.targetQuantity || '',
            targetPrice: activeItem.targetPrice || '',
            unit: activeItem.unit || 'unit',
            status: 'open',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          setConversationId(newConvRef.id);

          const initialContextMsg = `Negotiation desk opened for ${activeItem.productName || 'Chemical Product'} (${activeItem.targetQuantity || 'N/A'} ${activeItem.unit || ''} at target ₹${activeItem.targetPrice || 'Open'}/${activeItem.unit || ''}).`;

          await addDoc(collection(db, 'conversations', newConvRef.id, 'messages'), {
            [activeItem.type === 'rfq' ? 'rfqId' : 'requirementId']: activeItem.id,
            text: initialContextMsg,
            body: initialContextMsg,
            senderId: user.uid,
            senderRole: isBuyer ? 'buyer' : 'seller',
            direction: isBuyer ? 'toSeller' : 'toBuyer',
            source: 'app',
            timestamp: Date.now(),
            isBuyer: isBuyer,
            isOffer: false
          });
        }
      } catch (err) {
        console.error("Error setting up conversation", err);
      }
    };

    setupConversation();
  }, [activeItem, user, conversationId, isAdminView, isSeller]);

  useEffect(() => {
    if (!conversationId) {
       if (activeItem) setLoading(false);
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
    }, (err) => {
      console.warn("Messages snapshot error:", err);
      setLoading(false);
    });
    return () => unsubMessages();
  }, [conversationId]);

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

  const openCustomOrderModal = () => {
    setOfferPrice(String(activeItem?.targetPrice || ''));
    setOfferQuantity(String(activeItem?.targetQuantity || ''));
    setOfferNotes('');
    setOfferModalVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Opening Secure Trading Desk...</Text>
      </SafeAreaView>
    );
  }

  if (!activeItem) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <IconButton icon="clipboard-text-search-outline" size={48} iconColor="#94A3B8" />
        <Text style={styles.notFoundText}>Negotiation Details Unavailable</Text>
        <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center', marginHorizontal: 32, marginTop: 4, marginBottom: 20 }}>
          The inquiry or quote could not be loaded from active records. It may have expired or been fulfilled.
        </Text>
        <Button 
          mode="contained" 
          buttonColor="#0F172A"
          onPress={() => navigation.goBack()} 
          style={{ borderRadius: 10 }}
        >
          Return to Marketplace
        </Button>
      </SafeAreaView>
    );
  }

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
    
    if (messageText !== safeTextToSend) Alert.alert("Policy Notice", "Contact info exchange is restricted prior to order confirmation.");
    setMessageText(''); 
    
    try {
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        [activeItem.type === 'rfq' ? 'rfqId' : 'requirementId']: activeItem.id,
        text: safeTextToSend, 
        body: safeTextToSend, 
        senderId: user.uid,
        senderRole: isBuyer ? 'buyer' : 'seller',
        direction: isBuyer ? 'toSeller' : 'toBuyer',
        source: 'app', 
        timestamp: Date.now(),
        isBuyer: isBuyer,
        isOffer: false
      });
      
      await updateDoc(doc(db, 'conversations', conversationId), { updatedAt: Date.now() });

      if (activeItem.status === 'PENDING') {
        try {
          const table = activeItem.type === 'rfq' ? 'rfqs' : 'customRequirements';
          await updateDoc(doc(db, table, activeItem.id), { status: 'NEGOTIATING', updatedAt: new Date().toISOString() });
        } catch (statusErr) {
          console.warn("Could not update parent status:", statusErr);
        }
      }
    } catch (e) {
      console.error("sendChatMessage error:", e);
      Alert.alert("Error", "Message could not be sent.");
    }
  };

  const sendCustomOrderOffer = async () => {
    Keyboard.dismiss();
    const price = parseFloat(offerPrice);
    const qty = parseInt(offerQuantity, 10);

    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0 || !user || !conversationId) {
        return Alert.alert("Invalid Offer", "Please specify a positive price and quantity.");
    }

    setOfferModalVisible(false); 
    
    try {
      const offerText = `Custom Order Offer: ${qty} ${activeItem.unit} at ₹${price} / ${activeItem.unit}${offerNotes ? `\nTerms: ${offerNotes}` : ''}`;
      
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        [activeItem.type === 'rfq' ? 'rfqId' : 'requirementId']: activeItem.id,
        text: offerText, 
        body: offerText, 
        senderId: user.uid, 
        senderRole: 'seller', 
        direction: 'toBuyer',
        source: 'app', 
        timestamp: Date.now(), 
        isBuyer: false, 
        isOffer: true,
        proposedPrice: price, 
        proposedQty: qty,
        offerNotes: offerNotes.trim()
      });
      
      await updateDoc(doc(db, 'conversations', conversationId), { 
        updatedAt: Date.now(),
        lastOfferPrice: price,
        lastOfferQty: qty
      });

      try {
        const table = activeItem.type === 'rfq' ? 'rfqs' : 'customRequirements';
        await updateDoc(doc(db, table, activeItem.id), { status: 'NEGOTIATING', updatedAt: new Date().toISOString() });
      } catch (statusErr) {
        console.warn("Could not update parent status on offer:", statusErr);
      }
      
      Alert.alert("Custom Order Sent", "Your official offer has been delivered to the buyer. They can accept and checkout directly.");
    } catch (e) {
      console.error("sendCustomOrderOffer error:", e);
      Alert.alert("Error", "Custom order offer could not be sent.");
    }
  };

  const proceedToCheckout = async (price: number, qty: number) => {
    setIsProcessing(true);
    try {
      const negotiatedItem = {
        id: activeItem.type === 'rfq' ? `${activeItem.productId || activeItem.id}_rfq` : `custom_${activeItem.id}`,
        productId: activeItem.productId || '',
        name: activeItem.type === 'rfq' ? `${activeItem.productName} (Custom Order)` : `${activeItem.productName} (Custom Order)`,
        quantity: qty,
        pricePerUnit: price,
        unit: activeItem.unit || 'unit',
        sellerId: activeItem.sellerId || user?.uid,
        gstPercent: activeItem.gstPercent || 18,
        ...(activeItem.type === 'custom_req' ? { customRequirementId: activeItem.id } : { rfqId: activeItem.id }),
        ...(activeItem.quoteId ? { quoteId: activeItem.quoteId } : {}),
      };

      if (conversationId) {
        await updateDoc(doc(db, 'conversations', conversationId), { status: 'won', updatedAt: Date.now() });
        await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
          text: `Custom order agreement reached! Proceeding to secure checkout for ${qty} ${activeItem.unit} at ₹${price}/${activeItem.unit}.`,
          body: `Custom order agreement reached! Proceeding to secure checkout for ${qty} ${activeItem.unit} at ₹${price}/${activeItem.unit}.`,
          senderId: user?.uid || 'system',
          senderRole: 'system', 
          source: 'app', 
          timestamp: Date.now(), 
          isBuyer: false, 
          isOffer: false
        });
      }

      if (activeItem.type === 'rfq') {
         await updateDoc(doc(db, 'rfqs', activeItem.id), { status: 'CONVERTED', agreedPrice: price, agreedQuantity: qty, updatedAt: new Date().toISOString() });
      } else {
         if (activeItem.quoteId) {
           await updateDoc(doc(db, 'supplierQuotes', activeItem.quoteId), { status: 'ACCEPTED' });
         }
      }

      setIsProcessing(false);
      navigation.navigate('Checkout', { negotiatedItem });

    } catch (error) {
      setIsProcessing(false);
      Alert.alert("Error", "Could not prepare checkout. Please try again.");
    }
  };

  const acceptOffer = (price: number, qty: number) => {
    const totalEst = price * qty * 1.18;
    const message = `Confirm custom order contract for ${qty} ${activeItem.unit} at ₹${price} / ${activeItem.unit}?\n\nEstimated invoice with 18% GST: ₹${Math.round(totalEst).toLocaleString('en-IN')}`;
    
    Alert.alert('Accept Custom Order', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept & Pay via Escrow', onPress: () => proceedToCheckout(price, qty) }
    ]);
  };

  const executeCloseNegotiation = async () => {
    setIsProcessing(true);
    try {
      if (conversationId) {
        await updateDoc(doc(db, 'conversations', conversationId), { status: 'closed', updatedAt: Date.now() });
      }
      const table = activeItem.type === 'rfq' ? 'rfqs' : 'customRequirements';
      await updateDoc(doc(db, table, activeItem.id), { status: 'REJECTED', updatedAt: new Date().toISOString() });
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Could not close chat.");
    } finally {
      setIsProcessing(false);
    }
  };

  const closeNegotiation = async () => {
    Alert.alert("Close Negotiation", "Are you sure you want to conclude and close this trading desk?", [
      { text: "Cancel", style: "cancel" },
      { text: "Close Chat", style: "destructive", onPress: executeCloseNegotiation }
    ]);
  };

  // Stepper adjustments for offer modal
  const adjustOfferPrice = (delta: number) => {
    const current = parseFloat(offerPrice) || (parseFloat(activeItem.targetPrice) || 100);
    const next = Math.max(1, current + delta);
    setOfferPrice(String(next));
  };

  // Modal live calculation
  const modalNumPrice = parseFloat(offerPrice) || 0;
  const modalNumQty = parseFloat(offerQuantity) || 0;
  const modalBase = modalNumPrice * modalNumQty;
  const modalGst = modalBase * 0.18;
  const modalTotal = modalBase + modalGst;

  // Header target deal total
  const targetPriceNum = parseFloat(activeItem.targetPrice) || 0;
  const targetQtyNum = parseFloat(activeItem.targetQuantity) || 0;
  const targetDealTotal = targetPriceNum * targetQtyNum;

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.uid;
    const isSystem = item.senderId === 'system' || item.senderRole === 'system';
    const alignRight = isAdminView ? (!item.isBuyer && !isSystem) : isMe;

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.text || item.body}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.msgWrapper, alignRight ? styles.msgRight : styles.msgLeft]}>
        {!alignRight && (
          <Avatar.Icon 
            size={30} 
            icon={item.isBuyer ? "account" : "store"} 
            style={styles.avatarThem} 
            color="#64748B" 
          />
        )}
        <View style={{ maxWidth: '84%' }}>
          <View style={[styles.msgBubble, alignRight ? styles.msgBubbleMe : styles.msgBubbleThem]}>
            {isAdminView && (
              <Text style={{ fontSize: 10, fontWeight: '700', color: item.isBuyer ? '#1D4ED8' : '#059669', marginBottom: 2 }}>
                {item.isBuyer ? participantsInfo.buyerName : participantsInfo.sellerName}
              </Text>
            )}

            <Text style={[styles.messageText, alignRight ? styles.messageTextMe : styles.messageTextThem]}>
              {item.text || item.body}
            </Text>

            {/* Structured Commercial Offer Card */}
            {item.isOffer && (item.proposedPrice || item.proposedQty) && (
              <View style={[styles.dealOfferCard, alignRight && styles.dealOfferCardMe]}>
                <View style={styles.dealOfferHeader}>
                  <IconButton icon="file-document-outline" size={16} iconColor={alignRight ? "#FFFFFF" : "#059669"} style={{ margin: 0 }} />
                  <Text style={[styles.dealOfferTitle, alignRight && { color: '#FFFFFF' }]}>
                    OFFICIAL CUSTOM ORDER OFFER
                  </Text>
                </View>

                <View style={styles.offerMetricsRow}>
                  <View>
                    <Text style={[styles.offerMetricLabel, alignRight && { color: 'rgba(255,255,255,0.8)' }]}>
                      OFFER RATE
                    </Text>
                    <Text style={[styles.offerMetricRate, alignRight && { color: '#FFFFFF' }]}>
                      ₹{item.proposedPrice} <Text style={{ fontSize: 12 }}>/ {activeItem.unit}</Text>
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.offerMetricLabel, alignRight && { color: 'rgba(255,255,255,0.8)' }]}>
                      VOLUME
                    </Text>
                    <Text style={[styles.offerMetricValue, alignRight && { color: '#FFFFFF' }]}>
                      {Number(item.proposedQty).toLocaleString('en-IN')} {activeItem.unit}
                    </Text>
                  </View>
                </View>

                {item.offerNotes && (
                  <Text style={[styles.offerNotesText, alignRight && { color: 'rgba(255,255,255,0.9)' }]}>
                    📝 {item.offerNotes}
                  </Text>
                )}

                <View style={[styles.offerTotalRow, alignRight && { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[styles.offerTotalText, alignRight && { color: 'rgba(255,255,255,0.9)' }]}>
                    Total (incl. 18% GST):
                  </Text>
                  <Text style={[styles.offerTotalValue, alignRight && { color: '#FFFFFF' }]}>
                    ₹{Math.round(item.proposedPrice * item.proposedQty * 1.18).toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Buyer Action CTA */}
                {!isAdminView && !isMe && isBuyer && (activeItem.status === 'PENDING' || activeItem.status === 'NEGOTIATING') && (
                  <TouchableOpacity
                    style={styles.acceptOfferButton}
                    onPress={() => acceptOffer(item.proposedPrice!, item.proposedQty)}
                    disabled={isProcessing}
                    activeOpacity={0.85}
                  >
                    <IconButton icon="check-circle" size={18} iconColor="#FFFFFF" style={{ margin: 0 }} />
                    <Text style={styles.acceptOfferButtonText}>
                      {isProcessing ? 'Processing Order...' : 'Accept Custom Order & Pay'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Seller sent state */}
                {isMe && (
                  <View style={styles.offerSentState}>
                    <Text style={styles.offerSentStateText}>
                      ✓ Awaiting Buyer Review & Acceptance
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <Text style={[styles.timestampText, alignRight ? { textAlign: 'right' } : { textAlign: 'left' }]}>
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.screenHeader}>
        <IconButton icon="arrow-left" size={24} iconColor="#0F172A" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.screenHeaderTitle} numberOfLines={1}>
            {activeItem.productName}
          </Text>
          <Text style={styles.screenHeaderSub}>
            {isAdminView 
              ? `${participantsInfo.buyerName} ↔ ${participantsInfo.sellerName}`
              : `Trading Desk • ${isBuyer ? 'Chemical Supplier' : 'Direct Buyer'}`}
          </Text>
        </View>
        
        {/* Custom Order Quick CTA in Top Header for Seller */}
        {isSeller && activeItem.status !== 'CONVERTED' && activeItem.status !== 'CLOSED' && (
          <TouchableOpacity
            style={styles.headerCustomOrderBtn}
            onPress={openCustomOrderModal}
            activeOpacity={0.85}
          >
            <IconButton icon="tag-plus" size={16} iconColor="#FFFFFF" style={{ margin: 0, padding: 0 }} />
            <Text style={styles.headerCustomOrderText}>Custom Order</Text>
          </TouchableOpacity>
        )}

        {!isAdminView && activeItem.status !== 'CONVERTED' && activeItem.status !== 'CLOSED' && (
          <IconButton 
            icon="close" 
            size={20} 
            iconColor="#64748B" 
            onPress={closeNegotiation} 
            disabled={isProcessing} 
          />
        )}
      </View>

      {/* Persistent Sticky Deal Terms Header (The Deal Desk) */}
      <View style={styles.dealDeskHeader}>
        <View style={styles.dealDeskRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dealDeskLabel}>INQUIRY SPECIFICATION</Text>
            <Text style={styles.dealDeskProduct} numberOfLines={1}>
              {activeItem.productName}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.dealDeskLabel}>BUYER TARGET</Text>
            <Text style={styles.dealDeskPrice}>
              ₹{activeItem.targetPrice ? Number(activeItem.targetPrice).toLocaleString('en-IN') : 'Open'}
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}> / {activeItem.unit}</Text>
            </Text>
          </View>
        </View>

        <View style={[styles.dealDeskRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0' }]}>
          <Text style={styles.dealDeskSubMetric}>
            📦 Volume: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{activeItem.targetQuantity} {activeItem.unit}</Text>
          </Text>
          {targetDealTotal > 0 && (
            <Text style={styles.dealDeskSubMetric}>
              Target Value: <Text style={{ fontWeight: '700', color: '#059669' }}>₹{Math.round(targetDealTotal).toLocaleString('en-IN')}</Text>
            </Text>
          )}
        </View>

        <View style={styles.trustBanner}>
          <Text style={styles.trustBannerText}>
            🔒 Anonymized Escrow Trade. Direct contact unlocks upon order confirmation.
          </Text>
        </View>
      </View>

      {/* Admin Action Bar */}
      {isAdminView && (
        <View style={styles.adminBar}>
          <Button icon="phone" mode="text" textColor="#1D4ED8" onPress={() => participantsInfo.buyerPhone ? Linking.openURL(`tel:${participantsInfo.buyerPhone}`) : Alert.alert('Notice', 'No buyer phone')}>
            Call Buyer
          </Button>
          <Button icon="phone" mode="text" textColor="#059669" onPress={() => participantsInfo.sellerPhone ? Linking.openURL(`tel:${participantsInfo.sellerPhone}`) : Alert.alert('Notice', 'No seller phone')}>
            Call Seller
          </Button>
        </View>
      )}

      {/* Main Messages Area */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={roomMessages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* Bottom Commercial Controls */}
        {!isAdminView && activeItem.status !== 'CONVERTED' && activeItem.status !== 'CLOSED' && (
          <View style={styles.bottomControlsWrapper}>
            {/* Primary Custom Order Trigger for Seller */}
            {isSeller && (
              <View style={styles.sellerOfferTriggerRow}>
                <TouchableOpacity
                  style={styles.sellerOfferButton}
                  onPress={openCustomOrderModal}
                  activeOpacity={0.85}
                >
                  <IconButton icon="tag-plus" size={18} iconColor="#FFFFFF" style={{ margin: 0, padding: 0 }} />
                  <Text style={styles.sellerOfferButtonText}>Create Custom Order / Offer</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Buyer counter offer button */}
            {isBuyer && (
              <View style={styles.buyerActionRow}>
                <TouchableOpacity
                  style={styles.buyerCounterButton}
                  onPress={openCustomOrderModal}
                  activeOpacity={0.85}
                >
                  <IconButton icon="handshake" size={16} iconColor="#004AAD" style={{ margin: 0, padding: 0 }} />
                  <Text style={styles.buyerCounterText}>Submit Counter-Offer Rate</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputBar}>
              {/* Quick offer shortcut icon for seller */}
              {isSeller && (
                <TouchableOpacity 
                  style={styles.quickOfferIconBtn}
                  onPress={openCustomOrderModal}
                  activeOpacity={0.8}
                >
                  <IconButton icon="tag-plus" size={22} iconColor="#059669" style={{ margin: 0 }} />
                </TouchableOpacity>
              )}

              <TextInput
                mode="outlined"
                placeholder="Type negotiation message..."
                value={messageText}
                onChangeText={setMessageText}
                style={styles.textInput}
                outlineStyle={styles.textInputOutline}
                dense
              />
              <TouchableOpacity
                style={[styles.sendButton, (!messageText.trim() || !conversationId) && styles.sendButtonDisabled]}
                onPress={sendChatMessage}
                disabled={!messageText.trim() || !conversationId}
              >
                <IconButton icon="arrow-up" size={20} iconColor="#FFFFFF" style={{ margin: 0 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modern Custom Order / Offer Creation Modal */}
      <Modal visible={offerModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.offerModalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalBadge}>COMMERCIAL CONTRACT CREATION</Text>
                <Text style={styles.modalTitle}>
                  {isSeller ? 'Create Custom Order / Offer' : 'Submit Counter-Offer'}
                </Text>
              </View>
              <IconButton icon="close" size={20} iconColor="#64748B" onPress={() => setOfferModalVisible(false)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Reference */}
              <View style={styles.modalReferenceBox}>
                <Text style={styles.modalRefText}>
                  Chemical: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{activeItem.productName}</Text>
                </Text>
                <Text style={styles.modalRefText}>
                  Buyer Target: ₹{activeItem.targetPrice ? Number(activeItem.targetPrice).toLocaleString('en-IN') : 'Open'} / {activeItem.unit}
                </Text>
              </View>

              {/* Price with Steppers */}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>QUOTED RATE PER {activeItem.unit?.toUpperCase()} (₹)</Text>
                <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  placeholder={`e.g. ${activeItem.targetPrice || '120'}`}
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#059669"
                  style={styles.modalInputField}
                />
                
                {/* Rapid Adjustment Steppers */}
                <View style={styles.stepperRow}>
                  <TouchableOpacity style={styles.stepperChip} onPress={() => adjustOfferPrice(-5)}>
                    <Text style={styles.stepperChipText}>- ₹5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepperChip} onPress={() => adjustOfferPrice(-1)}>
                    <Text style={styles.stepperChipText}>- ₹1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepperChip} onPress={() => adjustOfferPrice(1)}>
                    <Text style={styles.stepperChipText}>+ ₹1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepperChip} onPress={() => adjustOfferPrice(5)}>
                    <Text style={styles.stepperChipText}>+ ₹5</Text>
                  </TouchableOpacity>
                  {activeItem.targetPrice && (
                    <TouchableOpacity style={[styles.stepperChip, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]} onPress={() => setOfferPrice(String(activeItem.targetPrice))}>
                      <Text style={[styles.stepperChipText, { color: '#059669' }]}>Match Target</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Quantity */}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>OFFERED QUANTITY ({activeItem.unit?.toUpperCase()})</Text>
                <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  value={offerQuantity}
                  onChangeText={setOfferQuantity}
                  placeholder={`e.g. ${activeItem.targetQuantity || '5000'}`}
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#059669"
                  style={styles.modalInputField}
                />
              </View>

              {/* Optional Custom Order Notes / Terms */}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>CUSTOM ORDER SPECIFICATIONS / PACKAGING</Text>
                <TextInput
                  mode="outlined"
                  value={offerNotes}
                  onChangeText={setOfferNotes}
                  placeholder="e.g. Ready stock, 200L HDPE drums, ex-Dahej port with COA"
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#059669"
                  style={styles.modalInputField}
                />
              </View>

              {/* Live Contract Breakdown */}
              {modalBase > 0 && (
                <View style={styles.modalCalcCard}>
                  <View style={styles.modalCalcRow}>
                    <Text style={styles.modalCalcLabel}>Base Value:</Text>
                    <Text style={styles.modalCalcValue}>₹{modalBase.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.modalCalcRow}>
                    <Text style={styles.modalCalcLabel}>Estimated 18% GST:</Text>
                    <Text style={styles.modalCalcValue}>+₹{Math.round(modalGst).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={[styles.modalCalcRow, { borderTopWidth: 1, borderTopColor: '#BBF7D0', paddingTop: 6, marginTop: 4 }]}>
                    <Text style={[styles.modalCalcLabel, { fontWeight: '700', color: '#14532D' }]}>Total Contract Value:</Text>
                    <Text style={[styles.modalCalcValue, { fontWeight: '800', color: '#14532D', fontSize: 14 }]}>
                      ₹{Math.round(modalTotal).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.modalSendOfferButton}
                  onPress={sendCustomOrderOffer}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalSendOfferText}>
                    {isSeller ? 'Send Custom Order Offer to Buyer' : 'Transmit Counter-Offer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  notFoundText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },

  /* Header */
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  screenHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  screenHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  headerCustomOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
  },
  headerCustomOrderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 2,
  },

  /* Sticky Deal Desk Summary Sheet */
  dealDeskHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dealDeskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealDeskLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dealDeskProduct: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dealDeskPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
    fontVariant: ['tabular-nums'],
  },
  dealDeskSubMetric: {
    fontSize: 12,
    color: '#475569',
  },
  trustBanner: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  trustBannerText: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '500',
  },

  adminBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  /* Messages Area */
  messagesList: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  systemMessageContainer: {
    alignSelf: 'center',
    maxWidth: '85%',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  systemMessageText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  msgWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  msgRight: {
    justifyContent: 'flex-end',
  },
  msgLeft: {
    justifyContent: 'flex-start',
  },
  avatarThem: {
    marginRight: 8,
    backgroundColor: '#E2E8F0',
  },
  msgBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  msgBubbleMe: {
    backgroundColor: '#0F172A',
    borderBottomRightRadius: 2,
  },
  msgBubbleThem: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#FFFFFF',
  },
  messageTextThem: {
    color: '#1E293B',
  },
  timestampText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 3,
    marginHorizontal: 4,
  },

  /* Structured Deal Offer Card Inside Chat */
  dealOfferCard: {
    marginTop: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
  },
  dealOfferCardMe: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dealOfferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dealOfferTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.6,
  },
  offerMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  offerMetricLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  offerMetricRate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#166534',
    fontVariant: ['tabular-nums'],
  },
  offerMetricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
    fontVariant: ['tabular-nums'],
  },
  offerNotesText: {
    fontSize: 11,
    color: '#166534',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  offerTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
    paddingTop: 6,
  },
  offerTotalText: {
    fontSize: 11,
    color: '#166534',
  },
  offerTotalValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    fontVariant: ['tabular-nums'],
  },
  acceptOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    height: 40,
    marginTop: 10,
  },
  acceptOfferButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  offerSentState: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  offerSentStateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    fontWeight: '500',
  },

  /* Bottom Controls Area */
  bottomControlsWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sellerOfferTriggerRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sellerOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    backgroundColor: '#059669',
    borderRadius: 8,
  },
  sellerOfferButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  buyerActionRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  buyerCounterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  buyerCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
    marginLeft: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  quickOfferIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    fontSize: 13,
    height: 42,
  },
  textInputOutline: {
    borderRadius: 21,
    borderColor: '#E2E8F0',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  offerModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 12,
  },
  modalBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalReferenceBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalRefText: {
    fontSize: 12,
    color: '#475569',
    marginVertical: 1,
  },
  modalFieldGroup: {
    marginBottom: 12,
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  modalInputField: {
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  stepperChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepperChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  modalCalcCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  modalCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  modalCalcLabel: {
    fontSize: 12,
    color: '#166534',
  },
  modalCalcValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    fontVariant: ['tabular-nums'],
  },
  modalActionButtons: {
    marginTop: 4,
    paddingBottom: 8,
  },
  modalSendOfferButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSendOfferText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
