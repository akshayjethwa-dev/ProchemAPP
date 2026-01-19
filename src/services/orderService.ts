import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { Order, CartItem } from '../types';

export const orderService = {
  async createOrder(
    buyerId: string,
    items: CartItem[],
    totalAmount: number,
    shippingAddress: string
  ): Promise<string> {
    try {
      // Group items by seller
      const ordersBySeller = items.reduce((acc: Record<string, CartItem[]>, item: CartItem) => {
        if (!acc[item.sellerId]) acc[item.sellerId] = [];
        acc[item.sellerId].push(item);
        return acc;
      }, {});
      
      // Create separate order for each seller
      const orderIds: string[] = [];
      for (const [sellerId, sellerItems] of Object.entries(ordersBySeller)) {
        const total = (sellerItems as CartItem[]).reduce((sum: number, item: CartItem) => sum + item.total, 0);
        
        const orderRef = await addDoc(collection(db, 'orders'), {
          buyerId,
          sellerId,
          items: sellerItems,
          totalAmount: total,
          status: 'pending',
          shippingAddress,
          createdAt: new Date(),
        });
        orderIds.push(orderRef.id);
      }
      
      return orderIds[0]; // Return first order ID
    } catch (error: any) {
      throw new Error(error.message);
    }
  },
  
  async fetchUserOrders(userId: string, userRole: string): Promise<Order[]> {
    try {
      const field = userRole === 'buyer' ? 'buyerId' : 'sellerId';
      const q = query(
        collection(db, 'orders'),
        where(field, '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
    } catch (error: any) {
      throw new Error(error.message);
    }
  },
  
  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
};