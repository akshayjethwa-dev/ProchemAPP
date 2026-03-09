// src/store/appStore.ts
import { create } from 'zustand';
import { User, Product, CartItem, RFQ, NegotiationMessage } from '../types';

interface AppState {
  user: User | null;
  products: Product[];
  cart: CartItem[];
  viewMode: 'buyer' | 'seller'; 
  
  // 🚀 NEW: RFQ & Negotiation State
  rfqs: RFQ[];
  messages: NegotiationMessage[];
  
  setUser: (user: User | null) => void;
  setProducts: (products: Product[]) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  addToCompare: (product: Product) => void;
  setViewMode: (mode: 'buyer' | 'seller') => void; 
  
  // 🚀 NEW: Actions for RFQ & Negotiations
  addRfq: (rfq: RFQ) => void;
  updateRfqStatus: (id: string, status: RFQ['status'], agreedPrice?: number) => void;
  addMessage: (message: NegotiationMessage) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  products: [],
  cart: [],
  viewMode: 'buyer', 
  
  // Initialize with empty arrays
  rfqs: [],
  messages: [],

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
  addToCompare: (product) => console.log('Added to compare:', product.name),
  setViewMode: (mode) => set({ viewMode: mode }),

  // 🚀 NEW: RFQ Implementation
  addRfq: (rfq) => set((state) => ({ rfqs: [rfq, ...state.rfqs] })),
  
  updateRfqStatus: (id, status, agreedPrice) => set((state) => ({
    rfqs: state.rfqs.map(r => r.id === id ? { ...r, status, agreedPrice: agreedPrice || r.agreedPrice } : r)
  })),
  
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] }))
}));