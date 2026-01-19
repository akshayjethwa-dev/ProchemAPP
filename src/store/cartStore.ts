import { create } from 'zustand';
import { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  
  addItem: (item) => {
    const { items } = get();
    const existing = items.find(i => i.id === item.id);
    
    if (existing) {
      set({
        items: items.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        )
      });
    } else {
      set({ items: [...items, item] });
    }
  },
  
  updateQuantity: (id, quantity) => {
    set({
      items: get().items.map(item =>
        item.id === id ? { ...item, quantity } : item
      ).filter(item => item.quantity > 0)
    });
  },
  
  removeItem: (id) => {
    set({ items: get().items.filter(item => item.id !== id) });
  },
  
  clearCart: () => set({ items: [] }),
  
  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.total, 0);
  }
}));