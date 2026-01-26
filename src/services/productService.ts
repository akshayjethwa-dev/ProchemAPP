import { collection, getDocs, addDoc, query, where, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Product } from '../types';

// 1. Fetch Products for BUYERS (Only Active & Verified)
export const getProducts = async (): Promise<Product[]> => {
  try {
    const q = query(
      collection(db, 'products'),
      where('active', '==', true), // ✅ Only show Active products
      // where('verified', '==', true) // Uncomment this when you want strict Admin moderation
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (error) {
    console.error("Error fetching products", error);
    return [];
  }
};

// 2. Fetch Seller's Own Products (Show All)
export const getSellerProducts = async (sellerId: string): Promise<Product[]> => {
  const q = query(collection(db, 'products'), where('sellerId', '==', sellerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
};

// 3. Add New Product
export const addProduct = async (productData: any) => {
  await addDoc(collection(db, 'products'), {
    ...productData,
    active: true, // Default to true
    verified: false, // Default to false (requires Admin approval)
    createdAt: new Date().toISOString()
  });
};

// 4. ✅ NEW: Update Existing Product
export const updateProduct = async (productId: string, updatedData: any) => {
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, updatedData);
};

// 5. ✅ NEW: Toggle Active Status
export const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, { active: !currentStatus });
};

// 6. Delete Product
export const deleteProduct = async (productId: string) => {
  await deleteDoc(doc(db, 'products', productId));
};