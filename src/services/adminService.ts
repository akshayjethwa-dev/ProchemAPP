import { collection, getDocs, doc, updateDoc, query, where, orderBy, getCountFromServer } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Product } from '../types';

// 1. Dashboard Stats
export const getAdminStats = async () => {
  try {
    const usersSnap = await getCountFromServer(collection(db, 'users'));
    const productsSnap = await getCountFromServer(collection(db, 'products'));
    const ordersSnap = await getCountFromServer(collection(db, 'orders'));
    
    return {
      totalUsers: usersSnap.data().count,
      totalProducts: productsSnap.data().count,
      totalOrders: ordersSnap.data().count
    };
  } catch (error) {
    console.error(error);
    return { totalUsers: 0, totalProducts: 0, totalOrders: 0 };
  }
};

// 2. User Management (Fetch All)
export const getAllUsers = async (): Promise<User[]> => {
  const snapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
  
  // ✅ FIX: Map doc.id to 'uid' (not 'id') to match your User type
  return snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as unknown as User));
};

// 3. Approve KYC
export const verifyUserKYC = async (uid: string, status: boolean) => {
  await updateDoc(doc(db, 'users', uid), {
    verified: status,
    kycStatus: status ? 'verified' : 'rejected'
  });
};

// 4. Product Moderation (Fetch Pending)
export const getPendingProducts = async (): Promise<Product[]> => {
  // Fetch products where verified is false
  const q = query(collection(db, 'products'), where('verified', '==', false));
  const snapshot = await getDocs(q);
  
  // Products usually use 'id', so this remains 'id'
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
};

// 5. Approve Product
export const approveProductListing = async (productId: string) => {
  await updateDoc(doc(db, 'products', productId), { verified: true });
};