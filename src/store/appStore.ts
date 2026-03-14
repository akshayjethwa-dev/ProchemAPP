// src/store/appStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Product, CartItem, RFQ, NegotiationMessage } from '../types';

interface AppState {
  user: User | null;
  products: Product[];
  cart: CartItem[];
  viewMode: 'buyer' | 'seller'; 
  
  rfqs: RFQ[];
  messages: NegotiationMessage[];

  // 🚀 NEW: Compare State
  compareList: Product[];

  setUser: (user: User | null) => void;
  setProducts: (products: Product[]) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  setViewMode: (mode: 'buyer' | 'seller') => void; 
  
  addRfq: (rfq: RFQ) => void;
  updateRfqStatus: (id: string, status: RFQ['status'], agreedPrice?: number) => void;
  addMessage: (message: NegotiationMessage) => void;

  hasSeenOnboarding: boolean;
  completeOnboarding: () => void;

  // 🚀 NEW: Compare Actions
  addToCompare: (product: Product) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      products: [],
      cart: [],
      viewMode: 'buyer', 
      rfqs: [],
      messages: [],
      compareList: [], // Initialize empty
      
      // Only defined once here:
      hasSeenOnboarding: false,

      setUser: (user) => set({ user }),
      setProducts: (products) => set({ products }),
      
      addToCart: (item) => set((state) => {
        const existing = state.cart.find((i) => i.id === item.id);
        if (existing) {
          return {
            cart: state.cart.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
            ),
          };
        }
        return { cart: [...state.cart, item] };
      }),
      
      removeFromCart: (id) => set((state) => ({
        cart: state.cart.filter((i) => i.id !== id),
      })),
      clearCart: () => set({ cart: [] }),
      setViewMode: (mode) => set({ viewMode: mode }),

      addRfq: (rfq) => set((state) => ({ rfqs: [rfq, ...state.rfqs] })),
      updateRfqStatus: (id, status, agreedPrice) => set((state) => ({
        rfqs: state.rfqs.map(r => r.id === id ? { ...r, status, agreedPrice: agreedPrice || r.agreedPrice } : r)
      })),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

      // 🚀 NEW: Actual Compare Logic (Max 3 items)
      addToCompare: (product) => set((state) => {
        if (state.compareList.find((p) => p.id === product.id)) return state; // Prevent duplicates
        const newList = [...state.compareList, product];
        if (newList.length > 3) newList.shift(); // Keep only the latest 3 for mobile layout limits
        return { compareList: newList };
      }),
      removeFromCompare: (id) => set((state) => ({
        compareList: state.compareList.filter((p) => p.id !== id),
      })),
      clearCompare: () => set({ compareList: [] }),

      // 🚀 Flip this to true when slider finishes (Only defined once here)
      completeOnboarding: () => set({ hasSeenOnboarding: true }),
    }),
    {
      name: 'prochem-app-storage', // The name of the storage container on the device
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these specific fields to avoid overwriting auth/cart states unintentionally
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        viewMode: state.viewMode,
      }),
    }
  )
);