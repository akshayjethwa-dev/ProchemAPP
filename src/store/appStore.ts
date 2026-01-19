import create from 'zustand';
import { User, Product, CartItem, Order } from '../types';

interface AppStore {
  user: User | null;
  cart: CartItem[];
  orders: Order[];
  products: Product[];
  notifications: any[];
  
  // Actions
  setUser: (user: User | null) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCart: (item: CartItem) => void;
  clearCart: () => void;
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  addOrder: (order: Order) => void;
  setOrders: (orders: Order[]) => void;
  addNotification: (notification: any) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  cart: [],
  orders: [],
  products: [],
  notifications: [],
  
  setUser: (user) => set({ user }),
  
  addToCart: (item) => set((state) => ({
    cart: [...state.cart.filter(c => c.productId !== item.productId), item]
  })),
  
  removeFromCart: (productId) => set((state) => ({
    cart: state.cart.filter(c => c.productId !== productId)
  })),
  
  updateCart: (item) => set((state) => ({
    cart: state.cart.map(c => c.productId === item.productId ? item : c)
  })),
  
  clearCart: () => set({ cart: [] }),
  
  setProducts: (products) => set({ products }),
  
  addProduct: (product) => set((state) => ({
    products: [...state.products, product]
  })),
  
  addOrder: (order) => set((state) => ({
    orders: [...state.orders, order]
  })),
  
  setOrders: (orders) => set({ orders }),
  
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, notification]
  })),
}));
