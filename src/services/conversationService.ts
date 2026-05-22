// src/services/conversationService.ts
import { collection, doc, addDoc, setDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase'; // Uses your initialized Firestore instance
import { Conversation, ConversationMessage } from '../types'; // Importing the types we just created

const CONVERSATIONS_COLLECTION = 'conversations';

/**
 * Creates a new Conversation document when a negotiation is initiated.
 */
export const createConversation = async (
  rfqId: string, 
  buyerUserId: string, 
  sellerUserId: string
): Promise<string> => {
  try {
    const conversationData: Omit<Conversation, 'id'> = {
      buyerUserId,
      sellerUserId,
      rfqId,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Add to the 'conversations' root collection
    const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), conversationData);
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
    // Reference to the subcollection: conversations/{conversationId}/messages
    const messagesRef = collection(db, `${CONVERSATIONS_COLLECTION}/${conversationId}/messages`);
    
    const newMessage = {
      ...messageData,
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(messagesRef, newMessage);

    // Update the parent conversation's updatedAt timestamp
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await setDoc(conversationRef, { updatedAt: serverTimestamp() }, { merge: true });

    return docRef.id;
  } catch (error) {
    console.error("Error adding message:", error);
    throw error;
  }
};