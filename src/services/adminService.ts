// File: src/services/adminService.ts
import { collection, getDocs, doc, updateDoc, query, orderBy, getCountFromServer, writeBatch, limit } from 'firebase/firestore';
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
  return snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as unknown as User));
};

// 3. Approve KYC
export const verifyUserKYC = async (uid: string, status: boolean) => {
  await updateDoc(doc(db, 'users', uid), {
    verified: status,
    kycStatus: status ? 'verified' : 'rejected'
  });
};

// 4. Product Monitoring (Fetch All Enriched)
export const getAllProductsForAdmin = async (): Promise<any[]> => {
  try {
    // Fetch all products
    const productsSnap = await getDocs(collection(db, 'products'));
    
    // Fetch all users to map company/business names
    const usersSnap = await getDocs(collection(db, 'users'));
    const userMap: Record<string, any> = {};
    usersSnap.docs.forEach(doc => {
      userMap[doc.id] = doc.data();
    });

    return productsSnap.docs.map(d => {
      const productData = d.data();
      const sellerData = userMap[productData.sellerId] || {};
      
      return {
        id: d.id,
        ...productData,
        sellerCompanyName: sellerData.companyName || sellerData.businessName || 'N/A',
        sellerName: productData.sellerName || sellerData.name || 'Unknown',
      };
    });
  } catch (error) {
    console.error("Error fetching products for admin:", error);
    return [];
  }
};

/**
 * Fetch all negotiation sessions for Admin monitoring
 */
export const getAllNegotiations = async () => {
  try {
    const negotiationsRef = collection(db, 'negotiations');
    const q = query(negotiationsRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching all negotiations for admin:", error);
    throw error;
  }
};

export const backfillUserSubscriptions = async (): Promise<number> => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    let totalUpdated = 0;

    snapshot.docs.forEach((userDoc) => {
      const userData = userDoc.data();
      if (userData.subscriptionTier === undefined) {
        currentBatch.update(userDoc.ref, {
          subscriptionTier: 'FREE',
          subscriptionExpiry: null,
          paymentHistory: []
        });
        
        operationCount++;
        totalUpdated++;

        if (operationCount >= 490) { 
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      }
    });

    if (operationCount > 0) {
      batches.push(currentBatch.commit());
    }

    await Promise.all(batches);
    return totalUpdated;

  } catch (error) {
    console.error('Error backfilling user subscriptions:', error);
    throw error;
  }
};

/**
 * Fetch WhatsApp Logs
 */
export const getWhatsAppLogs = async (logLimit = 100) => {
  try {
    const logsRef = collection(db, 'whatsappLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(logLimit));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching WhatsApp logs:", error);
    throw error;
  }
};