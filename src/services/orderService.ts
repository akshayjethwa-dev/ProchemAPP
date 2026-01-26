import { addDoc, collection, doc, updateDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Order } from '../types';

// 1. Create Order & RETURN ID
export const placeOrder = async (orderData: Omit<Order, 'id'>) => {
  const docRef = await addDoc(collection(db, 'orders'), {
    ...orderData,
    status: 'PENDING_SELLER', // Start Status
    sellerDocuments: null,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};

// 2. Seller Updates
export const sellerAcceptOrder = async (orderId: string, documents: any) => {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, {
    status: 'PENDING_ADMIN',
    sellerDocuments: documents
  });
};

export const sellerDeclineOrder = async (orderId: string) => {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, { status: 'CANCELLED' });
};

// 3. Admin Verification
export const adminVerifyOrder = async (orderId: string, approved: boolean) => {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, {
    status: approved ? 'ACCEPTED' : 'REJECTED'
  });
};

// ✅ 4. NEW: Fetch Orders for a specific Buyer
export const getBuyerOrders = async (buyerId: string): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', buyerId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  } catch (error) {
    console.error("Error fetching buyer orders:", error);
    return [];
  }
};