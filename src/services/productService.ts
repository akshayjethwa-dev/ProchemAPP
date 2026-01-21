import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  deleteDoc, 
  updateDoc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Product } from '../types';

// Collection reference
const productsRef = collection(db, 'products');

export const getProducts = async (): Promise<Product[]> => {
  try {
    const q = query(productsRef);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const getSellerProducts = async (sellerId: string): Promise<Product[]> => {
  try {
    const q = query(productsRef, where('sellerId', '==', sellerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (error) {
    console.error('Error fetching seller products:', error);
    return [];
  }
};

export const addProduct = async (productData: Omit<Product, 'id'>) => {
  try {
    const docRef = await addDoc(productsRef, {
      ...productData,
      createdAt: new Date(),
      verified: false // Products pending verification by default
    });
    return { id: docRef.id, ...productData };
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

export const deleteProduct = async (productId: string) => {
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

export const updateProduct = async (productId: string, data: Partial<Product>) => {
  try {
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

// Export object for default imports if needed, but named exports are preferred
export default {
  getProducts,
  getSellerProducts,
  addProduct,
  deleteProduct,
  updateProduct
};