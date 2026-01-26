import { create } from 'zustand';
import { User, Product, CartItem } from '../types';

interface AppState {
  user: User | null;
  products: Product[];
  cart: CartItem[];
  // ✅ NEW: Tracks which dashboard is active
  viewMode: 'buyer' | 'seller'; 
  
  setUser: (user: User | null) => void;
  setProducts: (products: Product[]) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  addToCompare: (product: Product) => void;
  // ✅ NEW: Action to toggle mode
  setViewMode: (mode: 'buyer' | 'seller') => void; 
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  products: [],
  cart: [],
  viewMode: 'buyer', // Default to Buyer view on login

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
  
  // ✅ Implementation
  setViewMode: (mode) => set({ viewMode: mode }),
}));