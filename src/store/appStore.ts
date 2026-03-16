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
  compareList: Product[];

  // Admin Impersonation States
  adminImpersonating: boolean;
  originalAdminUser: User | null;

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

  addToCompare: (product: Product) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;

  // Admin Impersonation Actions
  impersonateUser: (targetUser: User, currentAdmin: User) => void;
  stopImpersonating: () => void;
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
      compareList: [], 
      
      adminImpersonating: false,
      originalAdminUser: null,
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
      
      removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((i) => i.id !== id) })),
      clearCart: () => set({ cart: [] }),
      setViewMode: (mode) => set({ viewMode: mode }),

      addRfq: (rfq) => set((state) => ({ rfqs: [rfq, ...state.rfqs] })),
      updateRfqStatus: (id, status, agreedPrice) => set((state) => ({
        rfqs: state.rfqs.map(r => r.id === id ? { ...r, status, agreedPrice: agreedPrice || r.agreedPrice } : r)
      })),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

      addToCompare: (product) => set((state) => {
        if (state.compareList.find((p) => p.id === product.id)) return state; 
        const newList = [...state.compareList, product];
        if (newList.length > 3) newList.shift(); 
        return { compareList: newList };
      }),
      removeFromCompare: (id) => set((state) => ({ compareList: state.compareList.filter((p) => p.id !== id) })),
      clearCompare: () => set({ compareList: [] }),
      completeOnboarding: () => set({ hasSeenOnboarding: true }),

      // 🚀 UPDATED: Impersonation Logic
      impersonateUser: (targetUser, currentAdmin) => {
        // Automatically set the view mode so they don't land on a blank screen
        const newViewMode = (targetUser.userType === 'seller' || targetUser.userType === 'dual') ? 'seller' : 'buyer';
        set({
          user: targetUser,
          originalAdminUser: currentAdmin,
          adminImpersonating: true,
          viewMode: newViewMode
        });
      },

      stopImpersonating: () => set((state) => ({
        user: state.originalAdminUser,
        originalAdminUser: null,
        adminImpersonating: false,
        viewMode: 'buyer'
      })),
    }),
    {
      name: 'prochem-app-storage', 
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        viewMode: state.viewMode,
      }),
    }
  )
);