import { collection, getDocs, doc, updateDoc, query, where, orderBy, getCountFromServer, writeBatch } from 'firebase/firestore';
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

// 4. Product Moderation (Fetch Pending)
export const getPendingProducts = async (): Promise<Product[]> => {
  const q = query(collection(db, 'products'), where('verified', '==', false));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
};

// 5. Approve Product
export const approveProductListing = async (productId: string) => {
  await updateDoc(doc(db, 'products', productId), { verified: true });
};

/**
 * NEW: Fetch all negotiation sessions for Admin monitoring
 * This allows the admin to oversee all price discussions on the platform
 */
export const getAllNegotiations = async () => {
  try {
    const negotiationsRef = collection(db, 'negotiations');
    // Fetching all negotiations ordered by most recent update
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
    
    // Firestore batches allow a maximum of 500 operations per batch
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    let totalUpdated = 0;

    snapshot.docs.forEach((userDoc) => {
      const userData = userDoc.data();
      
      // Only update if they don't already have the subscription field
      if (userData.subscriptionTier === undefined) {
        currentBatch.update(userDoc.ref, {
          subscriptionTier: 'FREE',
          subscriptionExpiry: null,
          paymentHistory: []
        });
        
        operationCount++;
        totalUpdated++;

        // If we approach the 500 limit, commit the batch and start a new one
        if (operationCount >= 490) { 
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      }
    });

    // Commit any remaining operations in the final batch
    if (operationCount > 0) {
      batches.push(currentBatch.commit());
    }

    await Promise.all(batches);
    console.log(`Successfully backfilled ${totalUpdated} users.`);
    return totalUpdated;

  } catch (error) {
    console.error('Error backfilling user subscriptions:', error);
    throw error;
  }
};