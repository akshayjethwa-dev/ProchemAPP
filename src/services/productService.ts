import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Define Product interface to fix TypeScript errors
export interface Product {
  id?: string;
  name: string;
  price: number;  // ← This fixes the error
  category: string;
  description: string;
  quantity: number;
  sellerId: string;
  imageUrl?: string;
  verified: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Get all products (for buyers)
export const getProducts = async (category?: string): Promise<Product[]> => {
  try {
    const productsRef = collection(db, 'products');
    let q;

    if (category) {
      q = query(productsRef, where('category', '==', category), where('verified', '==', true));
    } else {
      q = query(productsRef, where('verified', '==', true), orderBy('createdAt', 'desc'));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Product
    })) as Product[];
  } catch (error: any) {
    console.error('Error fetching products:', error);
    throw new Error(error.message || 'Failed to fetch products');
  }
};

// Get products by seller (for sellers)
export const getSellerProducts = async (sellerId: string): Promise<Product[]> => {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('sellerId', '==', sellerId));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Product
    })) as Product[];
  } catch (error: any) {
    console.error('Error fetching seller products:', error);
    throw new Error(error.message || 'Failed to fetch seller products');
  }
};

// Add new product
export const addProduct = async (product: Omit<Product, 'id'>): Promise<string> => {
  try {
    const productsRef = collection(db, 'products');
    const docRef = await addDoc(productsRef, {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      verified: false
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error adding product:', error);
    throw new Error(error.message || 'Failed to add product');
  }
};

// Update product
export const updateProduct = async (productId: string, productData: Partial<Product>): Promise<void> => {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      ...productData,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    throw new Error(error.message || 'Failed to update product');
  }
};

// Delete product
export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      deleted: true,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    throw new Error(error.message || 'Failed to delete product');
  }
};

// Search products
export const searchProducts = async (searchTerm: string): Promise<Product[]> => {
  try {
    const productsRef = collection(db, 'products');
    // Note: Full-text search requires Algolia or similar service
    // For now, we'll filter client-side (basic implementation)
    const snapshot = await getDocs(query(productsRef, where('verified', '==', true)));
    
    const allProducts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Product
    })) as Product[];

    return allProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error: any) {
    console.error('Error searching products:', error);
    throw new Error(error.message || 'Failed to search products');
  }
};

export default {
  getProducts,
  getSellerProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  searchProducts
};
