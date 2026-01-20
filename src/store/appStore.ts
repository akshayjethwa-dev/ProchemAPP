import { create } from 'zustand';
import { User, Product, CartItem, Order, Notification } from '../types';

interface AppStore {
  // State
  user: User | null;
  cart: CartItem[];
  orders: Order[];
  products: Product[];
  notifications: Notification[];

  // User Actions
  setUser: (user: User | null) => void;
  clearUser: () => void;

  // Cart Actions
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCart: (item: CartItem) => void;
  clearCart: () => void;
  getCartTotal: () => number;

  // Product Actions
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (productId: string, product: Product) => void;
  removeProduct: (productId: string) => void;

  // Order Actions
  addOrder: (order: Order) => void;
  setOrders: (orders: Order[]) => void;
  updateOrder: (orderId: string, order: Order) => void;

  // Notification Actions
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[]) => void;
  clearNotifications: () => void;
  markNotificationAsRead: (notificationId: string) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial State
  user: null,
  cart: [],
  orders: [],
  products: [],
  notifications: [],

  // ✅ User Actions
  setUser: (user: User | null) => set({ user }),

  clearUser: () => set({ user: null }),

  // ✅ Cart Actions
  addToCart: (item: CartItem) =>
    set((state: AppStore) => ({
      cart: [
        ...state.cart.filter((c) => c.id !== item.id),
        item,
      ],
    })),

  removeFromCart: (productId: string) =>
    set((state: AppStore) => ({
      cart: state.cart.filter(
        (c) => c.id !== productId && c.productId !== productId
      ),
    })),

  updateCart: (item: CartItem) =>
    set((state: AppStore) => ({
      cart: state.cart.map((c) => (c.id === item.id ? item : c)),
    })),

  clearCart: () => set({ cart: [] }),

  getCartTotal: () => {
    const state = get();
    return state.cart.reduce(
      (total, item) => total + item.pricePerUnit * item.quantity,
      0
    );
  },

  // ✅ Product Actions
  setProducts: (products: Product[]) => set({ products }),

  addProduct: (product: Product) =>
    set((state: AppStore) => ({
      products: [...state.products, product],
    })),

  updateProduct: (productId: string, product: Product) =>
    set((state: AppStore) => ({
      products: state.products.map((p) =>
        p.id === productId ? product : p
      ),
    })),

  removeProduct: (productId: string) =>
    set((state: AppStore) => ({
      products: state.products.filter((p) => p.id !== productId),
    })),

  // ✅ Order Actions
  addOrder: (order: Order) =>
    set((state: AppStore) => ({
      orders: [...state.orders, order],
    })),

  setOrders: (orders: Order[]) => set({ orders }),

  updateOrder: (orderId: string, order: Order) =>
    set((state: AppStore) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? order : o
      ),
    })),

  // ✅ Notification Actions
  addNotification: (notification: Notification) =>
    set((state: AppStore) => ({
      notifications: [...state.notifications, notification],
    })),

  setNotifications: (notifications: Notification[]) =>
    set({ notifications }),

  clearNotifications: () => set({ notifications: [] }),

  markNotificationAsRead: (notificationId: string) =>
    set((state: AppStore) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
    })),
}));