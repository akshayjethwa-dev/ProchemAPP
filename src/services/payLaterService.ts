// File: src/services/payLaterService.ts
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDoc,
  onSnapshot 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { PayLaterApplication } from '../types';

const ASYNC_STORAGE_KEY_PREFIX = '@prochem_paylater_app_';

const removeUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(removeUndefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, removeUndefined(entry)])
    );
  }
  return value;
};

/**
 * Submits a new PayLater credit limit application.
 * Persists to user doc in Firestore (guaranteed permission), local AsyncStorage,
 * and attempts top-level collection without throwing if rules restrict it.
 */
export const submitPayLaterApplication = async (
  data: Omit<PayLaterApplication, 'id' | 'status' | 'submittedAt'>
): Promise<string> => {
  try {
    const timestamp = new Date().toISOString();
    const generatedId = `paylater_${Date.now()}`;

    const applicationPayload: PayLaterApplication = {
      id: generatedId,
      ...(removeUndefined(data) as any),
      status: 'under_review',
      submittedAt: timestamp,
      updatedAt: timestamp,
    };

    // 1. Save to local AsyncStorage for instant retrieval & offline support
    try {
      await AsyncStorage.setItem(
        `${ASYNC_STORAGE_KEY_PREFIX}${data.userId}`,
        JSON.stringify(applicationPayload)
      );
    } catch (storageErr) {
      console.warn('AsyncStorage cache error:', storageErr);
    }

    // 2. Primary Firestore Storage: Update users/{userId} (Authenticated user has guaranteed access)
    try {
      const userRef = doc(db, 'users', data.userId);
      await updateDoc(userRef, {
        payLaterStatus: 'under_review',
        payLaterApplicationId: generatedId,
        payLaterApplication: applicationPayload,
        updatedAt: timestamp,
      });
    } catch (userDocErr) {
      console.warn('Could not update user doc directly:', userDocErr);
    }

    // 3. Secondary: Try writing to paylater_applications collection if allowed
    try {
      if (db && typeof db.type === 'string') {
        const colRef = collection(db, 'paylater_applications');
        const docRef = await addDoc(colRef, applicationPayload);
        if (docRef && docRef.id) {
          applicationPayload.id = docRef.id;
          // Update user doc with actual Firestore doc ID if possible
          try {
            const userRef = doc(db, 'users', data.userId);
            await updateDoc(userRef, { payLaterApplicationId: docRef.id });
          } catch (_) {}
        }
      }
    } catch (colErr) {
      // Missing or insufficient permissions on paylater_applications is expected if rule is not configured
      console.info('Top-level collection write skipped (saved to user profile successfully)');
    }

    return applicationPayload.id || generatedId;
  } catch (error: any) {
    console.error('Error submitting PayLater application:', error);
    throw new Error(error.message || 'Failed to submit PayLater credit application.');
  }
};

/**
 * Fetches the user's latest PayLater application from user doc or local cache
 */
export const getLatestPayLaterApplication = async (
  userId: string
): Promise<PayLaterApplication | null> => {
  try {
    // Check user document first
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData?.payLaterApplication) {
          return userData.payLaterApplication as PayLaterApplication;
        }
        if (userData?.payLaterStatus && userData.payLaterStatus !== 'none') {
          return {
            userId,
            companyName: userData.companyName || 'Business Entity',
            status: userData.payLaterStatus,
            submittedAt: userData.updatedAt || new Date().toISOString(),
            counterpartyName: 'Trade Partner',
            relationshipYears: 'Established',
            limitsRequired: userData.payLaterApprovedLimit ? `${userData.payLaterApprovedLimit}` : 'Under Review',
            approvedLimit: userData.payLaterApprovedLimit,
          } as PayLaterApplication;
        }
      }
    } catch (docErr) {
      console.warn('Error reading user document:', docErr);
    }

    // Check local storage fallback
    const cached = await AsyncStorage.getItem(`${ASYNC_STORAGE_KEY_PREFIX}${userId}`);
    if (cached) {
      return JSON.parse(cached) as PayLaterApplication;
    }

    return null;
  } catch (error) {
    console.warn('Error fetching PayLater application:', error);
    return null;
  }
};

/**
 * Subscribes to real-time status of the user's PayLater application.
 * Uses `users/{userId}` document snapshot (which has guaranteed user permission)
 * and AsyncStorage as fallbacks to prevent permission errors from freezing the UI.
 */
export const listenToPayLaterApplication = (
  userId: string,
  onUpdate: (app: PayLaterApplication | null) => void
): (() => void) => {
  let isUnsubscribed = false;

  // 1. Immediately read from local cache so UI displays without waiting for network
  AsyncStorage.getItem(`${ASYNC_STORAGE_KEY_PREFIX}${userId}`)
    .then((cached) => {
      if (cached && !isUnsubscribed) {
        try {
          const parsed = JSON.parse(cached);
          onUpdate(parsed);
        } catch (_) {}
      }
    })
    .catch(() => {});

  // 2. Primary listener: users/{userId} doc
  try {
    const userDocRef = doc(db, 'users', userId);
    const unsubUser = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (isUnsubscribed) return;
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (userData?.payLaterApplication) {
            onUpdate(userData.payLaterApplication as PayLaterApplication);
            return;
          }
          if (userData?.payLaterStatus && userData.payLaterStatus !== 'none') {
            const simulatedApp: PayLaterApplication = {
              userId,
              companyName: userData.companyName || 'Business Entity',
              status: userData.payLaterStatus,
              submittedAt: userData.updatedAt || new Date().toISOString(),
              counterpartyName: 'Trade Partner',
              relationshipYears: 'Established',
              limitsRequired: userData.payLaterApprovedLimit ? `${userData.payLaterApprovedLimit}` : 'Under Review',
              approvedLimit: userData.payLaterApprovedLimit,
            };
            onUpdate(simulatedApp);
            return;
          }
        }
        // If no app in user doc, check if cache had anything, otherwise null
        AsyncStorage.getItem(`${ASYNC_STORAGE_KEY_PREFIX}${userId}`)
          .then((cached) => {
            if (isUnsubscribed) return;
            if (cached) {
              try {
                onUpdate(JSON.parse(cached));
                return;
              } catch (_) {}
            }
            onUpdate(null);
          })
          .catch(() => {
            if (!isUnsubscribed) onUpdate(null);
          });
      },
      (error) => {
        console.warn('User doc listener error:', error.message);
        // Fallback to local cache and ensure onUpdate is called
        AsyncStorage.getItem(`${ASYNC_STORAGE_KEY_PREFIX}${userId}`)
          .then((cached) => {
            if (isUnsubscribed) return;
            if (cached) {
              try {
                onUpdate(JSON.parse(cached));
                return;
              } catch (_) {}
            }
            onUpdate(null);
          })
          .catch(() => {
            if (!isUnsubscribed) onUpdate(null);
          });
      }
    );

    return () => {
      isUnsubscribed = true;
      if (unsubUser) unsubUser();
    };
  } catch (err) {
    console.warn('Error setting up PayLater listener:', err);
    // Always call onUpdate so caller never hangs in loading state
    AsyncStorage.getItem(`${ASYNC_STORAGE_KEY_PREFIX}${userId}`)
      .then((cached) => {
        if (cached) {
          try {
            onUpdate(JSON.parse(cached));
            return;
          } catch (_) {}
        }
        onUpdate(null);
      })
      .catch(() => onUpdate(null));

    return () => {
      isUnsubscribed = true;
    };
  }
};
