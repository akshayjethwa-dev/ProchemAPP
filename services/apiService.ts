
import { Product, Order, TransportOrder, ChemicalCategory } from '../types';

// Production API Base URL placeholder
const API_BASE_URL = 'https://api.prochem.in/v1';

// Simulation delay to mimic real network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Prochem API Service
 * Handles all backend communications for the marketplace.
 */
export const apiService = {
  // --- AUTHENTICATION ---
  
  /** POST /login */
  login: async (mobile: string): Promise<{ success: boolean; message: string }> => {
    console.log(`API CALL: POST /login - Mobile: ${mobile}`);
    await delay(1000);
    return { success: true, message: 'OTP sent successfully' };
  },

  /** POST /verify-otp */
  verifyOtp: async (mobile: string, otp: string): Promise<{ success: boolean; token: string }> => {
    console.log(`API CALL: POST /verify-otp - Mobile: ${mobile}, OTP: ${otp}`);
    await delay(1200);
    return { success: true, token: 'JWT_TOKEN_PLACEHOLDER' };
  },

  // --- PRODUCTS ---

  /** GET /products */
  getProducts: async (category?: ChemicalCategory): Promise<Product[]> => {
    console.log(`API CALL: GET /products - Category: ${category || 'All'}`);
    await delay(800);
    // In production, this would be: 
    // const res = await fetch(`${API_BASE_URL}/products${category ? `?category=${category}` : ''}`);
    // return res.json();
    return INITIAL_DATA.products.filter(p => !category || p.category === category);
  },

  /** POST /products (Seller side) */
  createProduct: async (productData: Partial<Product>): Promise<Product> => {
    console.log('API CALL: POST /products', productData);
    await delay(1500);
    const newProduct = { ...productData, id: `PROD-${Date.now()}`, isActive: true } as Product;
    INITIAL_DATA.products.unshift(newProduct);
    return newProduct;
  },

  /** PATCH /products/:id (Seller side) */
  updateProduct: async (id: string, updates: Partial<Product>): Promise<Product> => {
    console.log(`API CALL: PATCH /products/${id}`, updates);
    await delay(800);
    return {} as Product;
  },

  // --- ORDERS ---

  /** GET /orders */
  getOrders: async (role: 'BUYER' | 'SELLER'): Promise<Order[]> => {
    console.log(`API CALL: GET /orders - Role: ${role}`);
    await delay(1000);
    return INITIAL_DATA.orders;
  },

  /** POST /create-order (Buyer side) */
  createOrder: async (orderData: Partial<Order>): Promise<Order> => {
    console.log('API CALL: POST /create-order', orderData);
    await delay(2000);
    const order = { ...orderData, id: `PRC-${Math.floor(Math.random() * 900000) + 100000}`, status: 'PENDING', orderDate: new Date().toLocaleDateString('en-IN') } as Order;
    INITIAL_DATA.orders.unshift(order);
    return order;
  },

  // --- LOGISTICS ---

  /** GET /transport-orders (Transporter side) */
  getTransportOrders: async (): Promise<TransportOrder[]> => {
    console.log('API CALL: GET /transport-orders');
    await delay(1000);
    return INITIAL_DATA.transportOrders;
  }
};

// Seed data moved inside service to simulate a "Live" database for the demo
const INITIAL_DATA = {
  products: [
    { id: 'ph1', name: 'Paracetamol API', category: 'Pharma Chemicals', grade: 'Pharma', purity: 99.8, pricePerUnit: 450, unit: 'kg', moq: 100, inventory: 5000, packagingType: 'Drum', gstPercent: 12, sellerName: 'Sun Pharma Ltd', sellerRating: 4.9, image: 'https://picsum.photos/seed/ph1/400/300', description: 'Pharmaceutical grade Paracetamol API.', isActive: true },
    { id: 'ind1', name: 'Caustic Soda Flakes', category: 'Industrial Chemicals', grade: 'Industrial', purity: 98, pricePerUnit: 38, unit: 'kg', moq: 1000, inventory: 25000, packagingType: 'Bag', gstPercent: 18, sellerName: 'Grasim Industries', sellerRating: 4.5, image: 'https://picsum.photos/seed/ind1/400/300', description: 'Sodium Hydroxide for industrial use.', isActive: true },
    { id: 'ag1', name: 'Urea (46% Nitrogen)', category: 'Agriculture / Fertilizers', grade: 'Industrial', purity: 46, pricePerUnit: 18, unit: 'kg', moq: 500, inventory: 200000, packagingType: 'Bag', gstPercent: 5, sellerName: 'IFFCO', sellerRating: 4.9, image: 'https://picsum.photos/seed/ag1/400/300', description: 'Standard agricultural urea.', isActive: true },
    { id: 'fd1', name: 'Citric Acid', category: 'Food & Beverage Chemicals', grade: 'Food', purity: 99.5, pricePerUnit: 110, unit: 'kg', moq: 200, inventory: 8000, packagingType: 'Bag', gstPercent: 12, sellerName: 'Adani Wilmar', sellerRating: 4.8, image: 'https://picsum.photos/seed/fd1/400/300', description: 'Natural preservative.', isActive: true },
    { id: 'lb1', name: 'Ethanol (Lab Grade)', category: 'Lab & Research Chemicals', grade: 'Lab', purity: 99.9, pricePerUnit: 180, unit: 'L', moq: 20, inventory: 2000, packagingType: 'Bottle', gstPercent: 18, sellerName: 'S D Fine-Chem', sellerRating: 4.8, image: 'https://picsum.photos/seed/lb1/400/300', description: 'Absolute alcohol.', isActive: true }
  ] as Product[],
  orders: [] as Order[],
  transportOrders: [
    {
      id: 'TRP-101',
      material: 'Sulphuric Acid (98%)',
      weight: '24 MT',
      payout: 12500,
      pickupLocation: 'GIDC Vapi, Gujarat',
      dropLocation: 'Pimpri-Chinchwad, Pune',
      items: [],
      totalAmount: 0,
      status: 'PENDING',
      orderDate: '24 Oct 2023',
      buyerName: 'Reliable ChemWorks',
      address: 'Pune, Maharashtra'
    }
  ] as TransportOrder[]
};
