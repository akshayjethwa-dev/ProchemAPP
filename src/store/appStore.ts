import { create } from 'zustand';
import { User, Product, CartItem } from '../types';

interface AppStore {
  user: User | null;
  products: Product[];
  cart: CartItem[];
  compareList: Product[]; // ✅ ADDED: Comparison List

  setUser: (user: User | null) => void;
  setProducts: (products: Product[]) => void;
  
  // Cart Actions
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // Compare Actions
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  products: [],
  cart: [],
  compareList: [],

  setUser: (user) => set({ user }),
  setProducts: (products) => set({ products }),

  addToCart: (item) =>
    set((state) => ({
      cart: [...state.cart.filter((c) => c.id !== item.id), item],
    })),

  removeFromCart: (productId) =>
    set((state) => ({
      cart: state.cart.filter((c) => c.id !== productId),
    })),

  clearCart: () => set({ cart: [] }),

  // ✅ Compare Logic
  addToCompare: (product) =>
    set((state) => {
      if (state.compareList.find((p) => p.id === product.id)) return state;
      if (state.compareList.length >= 3) {
        // Limit to 3 items for comparison
        return { compareList: [...state.compareList.slice(1), product] };
      }
      return { compareList: [...state.compareList, product] };
    }),

  removeFromCompare: (productId) =>
    set((state) => ({
      compareList: state.compareList.filter((p) => p.id !== productId),
    })),

  clearCompare: () => set({ compareList: [] }),
}));