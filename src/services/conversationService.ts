// src/services/conversationService.ts
import { collection, doc, addDoc, setDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase'; 
import { Conversation, ConversationMessage } from '../types'; 

const CONVERSATIONS_COLLECTION = 'conversations';

/**
 * Creates a new Conversation document when a negotiation is initiated.
 */
export const createConversation = async (params: {
  rfqId?: string;
  requirementId?: string;
  quoteId?: string;
  leadId?: string;
  buyerUserId: string;
  sellerUserId: string;
  initialMessage?: string;
  productName?: string;
  quantity?: any;
  targetPrice?: any;
  unit?: string;
}): Promise<string> => {
  try {
    const conversationData: any = {
      buyerUserId: params.buyerUserId,
      sellerUserId: params.sellerUserId,
      status: 'open',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (params.rfqId) conversationData.rfqId = params.rfqId;
    if (params.requirementId) conversationData.requirementId = params.requirementId;
    if (params.quoteId) conversationData.quoteId = params.quoteId;
    if (params.leadId) conversationData.leadId = params.leadId;
    if (params.productName) conversationData.productName = params.productName;
    if (params.quantity) conversationData.targetQuantity = params.quantity;
    if (params.targetPrice) conversationData.targetPrice = params.targetPrice;
    if (params.unit) conversationData.unit = params.unit;

    const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), conversationData);

    // Generate initial message matching current authenticated user
    if (params.initialMessage) {
      try {
        await addDoc(collection(db, `${CONVERSATIONS_COLLECTION}/${docRef.id}/messages`), {
          ...(params.requirementId ? { requirementId: params.requirementId } : {}),
          ...(params.rfqId ? { rfqId: params.rfqId } : {}),
          text: params.initialMessage,
          body: params.initialMessage,
          senderId: params.sellerUserId, // Authenticated seller UID
          senderRole: 'seller',
          direction: 'toBuyer',
          source: 'app',
          timestamp: Date.now(),
          isBuyer: false,
          isOffer: false
        });
      } catch (msgErr) {
        console.warn('Initial context message could not be added:', msgErr);
      }
    }

    return docRef.id;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};

/**
 * Stores a new message inside the 'messages' subcollection of a specific conversation.
 */
export const addConversationMessage = async (
  conversationId: string,
  messageData: Omit<ConversationMessage, 'id' | 'timestamp'>
): Promise<string> => {
  try {
    const messagesRef = collection(db, `${CONVERSATIONS_COLLECTION}/${conversationId}/messages`);
    
    const newMessage = {
      ...messageData,
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(messagesRef, newMessage);

    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await setDoc(conversationRef, { updatedAt: serverTimestamp() }, { merge: true });

    return docRef.id;
  } catch (error) {
    console.error("Error adding message:", error);
    throw error;
  }
};