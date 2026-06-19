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
  buyerUserId: string;
  sellerUserId: string;
  initialMessage?: string; // ✅ Added support for system-generated initial message
}): Promise<string> => {
  try {
    const conversationData: Omit<Conversation, 'id'> = {
      buyerUserId: params.buyerUserId,
      sellerUserId: params.sellerUserId,
      rfqId: params.rfqId || '', // Fallback for existing RFQ logic
      requirementId: params.requirementId || '', // New logic for custom reqs
      quoteId: params.quoteId || '', // New logic for quotes
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), conversationData);

    // ✅ Generate the context message automatically if passed
    if (params.initialMessage) {
      await addDoc(collection(db, `${CONVERSATIONS_COLLECTION}/${docRef.id}/messages`), {
        text: params.initialMessage,
        body: params.initialMessage,
        senderId: 'system',
        senderRole: 'system',
        direction: 'both',
        source: 'app',
        timestamp: serverTimestamp(),
        isBuyer: false,
        isOffer: false
      });
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