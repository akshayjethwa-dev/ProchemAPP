import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ✅ Types for TypeScript
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

export interface Order {
  id?: string;
  buyerId: string;
  sellerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  createdAt?: any;
  updatedAt?: any;
}

// ✅ getBuyerOrders EXPORT (THIS FIXES ERROR #1)
export const getBuyerOrders = async (buyerId: string): Promise<Order[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('buyerId', '==', buyerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Order
    })) as Order[];
  } catch (error: any) {
    console.error('Error fetching buyer orders:', error);
    return []; // ✅ Return empty array instead of throwing
  }
};

// ✅ getSellerOrders (bonus)
export const getSellerOrders = async (sellerId: string): Promise<Order[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('sellerId', '==', sellerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Order
    })) as Order[];
  } catch (error: any) {
    console.error('Error fetching seller orders:', error);
    return [];
  }
};

// Create new order
export const createOrder = async (order: Omit<Order, 'id'>): Promise<string> => {
  try {
    const ordersRef = collection(db, 'orders');
    const docRef = await addDoc(ordersRef, {
      ...order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating order:', error);
    throw new Error(error.message || 'Failed to create order');
  }
};

// Update order status
export const updateOrderStatus = async (orderId: string, status: string): Promise<void> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: status,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    throw new Error(error.message || 'Failed to update order');
  }
};

// Get order by ID
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const snapshot = await getDocs(query(
      collection(db, 'orders'),
      where('id', '==', orderId)
    ));
    
    if (snapshot.docs.length === 0) return null;
    
    const docData = snapshot.docs[0];
    return {
      id: docData.id,
      ...docData.data() as Order
    } as Order;
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return null;
  }
};

// ✅ Default export for compatibility
export default {
  createOrder,
  getBuyerOrders,
  getSellerOrders,
  updateOrderStatus,
  getOrderById
};
