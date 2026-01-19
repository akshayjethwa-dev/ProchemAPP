import { Product, AuthResponse } from '../types';

/**
 * Mock Product Service
 * TODO: Replace with Firebase Firestore integration
 */

// In-memory product database (replace with Firebase)
let productsDatabase: Product[] = [
  {
    id: 'prod_001',
    name: 'Sulfuric Acid (98%)',
    category: 'Industrial Acids',
    pricePerUnit: 45000,
    moq: 500,
    unit: 'kg',
    sellerName: 'ChemWorks Ltd',
    sellerRating: 4.5,
    image: '🧪',
    casNumber: '7664-93-9',
    grade: 'Industrial',
    purity: 98.0,
    packagingType: 'Drum',
    gstPercent: 18,
    sellerId: 'seller_001',
    inStock: true,
    certifications: [],
    createdAt: new Date()
  },
  {
    id: 'prod_002',
    name: 'Hydrochloric Acid (37%)',
    category: 'Industrial Acids',
    pricePerUnit: 38000,
    moq: 300,
    unit: 'kg',
    sellerName: 'Reliable Industries',
    sellerRating: 4.3,
    image: '⚗️',
    casNumber: '7647-01-0',
    grade: 'Industrial',
    purity: 37.0,
    packagingType: 'Can',
    gstPercent: 18,
    sellerId: 'seller_002',
    inStock: true,
    certifications: [],
    createdAt: new Date(),
  },
  {
    id: 'prod_003',
    name: 'Sodium Hydroxide Pellets',
    category: 'Alkalis',
    pricePerUnit: 52000,
    moq: 200,
    unit: 'kg',
    sellerName: 'Premium Chemicals',
    sellerRating: 4.7,
    image: '🔬',
    casNumber: '1310-73-2',
    grade: 'Industrial',
    purity: 99.0,
    packagingType: 'Bag',
    gstPercent: 18,
    sellerId: 'seller_003',
    inStock: true,
    certifications: [],
    createdAt: new Date(),
  },
  {
    id: 'prod_004',
    name: 'Potassium Permanganate',
    category: 'Oxidizers',
    pricePerUnit: 95000,
    moq: 50,
    unit: 'kg',
    sellerName: 'TechChem Solutions',
    sellerRating: 4.6,
    image: '💜',
    casNumber: '7722-64-3',
    grade: 'Industrial',
    purity: 99.0,
    packagingType: 'Bottle',
    gstPercent: 18,
    sellerId: 'seller_004',
    inStock: true,
    certifications: [],
    createdAt: new Date(),
  },
  {
    id: 'prod_005',
    name: 'Calcium Carbonate Powder',
    category: 'Salts',
    pricePerUnit: 18000,
    moq: 1000,
    unit: 'kg',
    sellerName: 'EcoChemicals',
    sellerRating: 4.4,
    image: '⚪',
    casNumber: '7722-65-3',
    grade: 'Industrial',
    purity: 99.0,
    packagingType: 'Bottle',
    gstPercent: 18,        
    sellerId: 'seller_005',
    inStock: true,
    certifications: [],
    createdAt: new Date(),
  },
];

export const productService = {
  /**
   * Fetch all products from Firebase
   * @param filters Optional: category, priceMin, priceMax, seller
   * @returns Promise with products array
   */
  fetchProducts: async (filters?: {
    category?: string;
    priceMin?: number;
    priceMax?: number;
    seller?: string;
    searchQuery?: string;
  }): Promise<AuthResponse<Product[]>> => {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      let results = [...productsDatabase];

      // Apply filters
      if (filters?.category) {
        results = results.filter(p => p.category === filters.category);
      }

      if (filters?.priceMin) {
        results = results.filter(p => p.pricePerUnit >= filters.priceMin!);
      }

      if (filters?.priceMax) {
        results = results.filter(p => p.pricePerUnit <= filters.priceMax!);
      }

      if (filters?.seller) {
        results = results.filter(p => p.sellerName.toLowerCase().includes(filters.seller!.toLowerCase()));
      }

      if (filters?.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        results = results.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.sellerName.toLowerCase().includes(query)
        );
      }

      console.log(`[PRODUCTS] Fetched ${results.length} products`);

      return {
        success: true,
        message: `Found ${results.length} products`,
        user: results,
      };
    } catch (error) {
      console.error('fetchProducts error:', error);
      return {
        success: false,
        message: 'Failed to fetch products',
      };
    }
  },

  /**
   * Get single product by ID
   * @param productId Product ID
   * @returns Promise with product data
   */
  getProduct: async (productId: string): Promise<AuthResponse<Product>> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const product = productsDatabase.find(p => p.id === productId);

      if (!product) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      console.log(`[PRODUCTS] Fetched product: ${product.name}`);

      return {
        success: true,
        message: 'Product retrieved',
        user: product,
      };
    } catch (error) {
      console.error('getProduct error:', error);
      return {
        success: false,
        message: 'Failed to fetch product',
      };
    }
  },

  /**
   * Add new product (for sellers)
   * @param product Product data
   * @param sellerId Seller ID
   * @returns Promise with created product
   */
  addProduct: async (
    product: Omit<Product, 'id'>,
    sellerId: string
  ): Promise<AuthResponse<Product>> => {
    try {
      // Validate required fields
      if (!product.name || !product.category || !product.pricePerUnit || !product.moq) {
        return {
          success: false,
          message: 'Missing required fields: name, category, price, quantity',
        };
      }

      if (product.pricePerUnit < 1000) {
        return {
          success: false,
          message: 'Price must be at least ₹1,000',
        };
      }

      if (product.moq < 10) {
        return {
          success: false,
          message: 'Quantity must be at least 10 units',
        };
      }

      // Create new product
      const newProduct: Product = {
        ...product,
        id: `prod_${Date.now()}`,
        sellerRating: 0, // New products start with 0 rating
      };

      // Add to database
      productsDatabase.push(newProduct);

      console.log('[PRODUCTS] Product added:', newProduct);

      // TODO: Save to Firebase Firestore
      // await db.collection('products').doc(newProduct.id).set({
      //   ...newProduct,
      //   sellerId,
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      // });

      // TODO: Update seller's product list
      // await db.collection('sellers').doc(sellerId).update({
      //   productIds: firebase.firestore.FieldValue.arrayUnion(newProduct.id),
      // });

      return {
        success: true,
        message: 'Product added successfully',
        user: newProduct,
      };
    } catch (error) {
      console.error('addProduct error:', error);
      return {
        success: false,
        message: 'Failed to add product',
      };
    }
  },

  /**
   * Update product (for sellers)
   * @param productId Product ID
   * @param updates Fields to update
   * @param sellerId Seller ID
   * @returns Promise with updated product
   */
  updateProduct: async (
    productId: string,
    updates: Partial<Product>,
    sellerId: string
  ): Promise<AuthResponse<Product>> => {
    try {
      const productIndex = productsDatabase.findIndex(p => p.id === productId);

      if (productIndex === -1) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      const updatedProduct = {
        ...productsDatabase[productIndex],
        ...updates,
        id: productId, // Don't allow ID change
      };

      productsDatabase[productIndex] = updatedProduct;

      console.log('[PRODUCTS] Product updated:', updatedProduct);

      // TODO: Update in Firebase
      // await db.collection('products').doc(productId).update({
      //   ...updates,
      //   updatedAt: new Date(),
      // });

      return {
        success: true,
        message: 'Product updated successfully',
        user: updatedProduct,
      };
    } catch (error) {
      console.error('updateProduct error:', error);
      return {
        success: false,
        message: 'Failed to update product',
      };
    }
  },

  /**
   * Delete product (for sellers)
   * @param productId Product ID
   * @param sellerId Seller ID
   * @returns Promise with success status
   */
  deleteProduct: async (
    productId: string,
    sellerId: string
  ): Promise<AuthResponse> => {
    try {
      const productIndex = productsDatabase.findIndex(p => p.id === productId);

      if (productIndex === -1) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      const deletedProduct = productsDatabase[productIndex];
      productsDatabase.splice(productIndex, 1);

      console.log('[PRODUCTS] Product deleted:', deletedProduct);

      // TODO: Delete from Firebase
      // await db.collection('products').doc(productId).delete();
      // await db.collection('sellers').doc(sellerId).update({
      //   productIds: firebase.firestore.FieldValue.arrayRemove(productId),
      // });

      return {
        success: true,
        message: 'Product deleted successfully',
      };
    } catch (error) {
      console.error('deleteProduct error:', error);
      return {
        success: false,
        message: 'Failed to delete product',
      };
    }
  },

  /**
   * Get products by seller
   * @param sellerId Seller ID
   * @returns Promise with seller's products
   */
  getSellerProducts: async (sellerId: string): Promise<AuthResponse<Product[]>> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 600));

      // In real implementation, this would query by sellerId
      // For now, just return all products as mock
      const sellerProducts = productsDatabase;

      console.log(`[PRODUCTS] Fetched ${sellerProducts.length} products for seller`);

      return {
        success: true,
        message: `Found ${sellerProducts.length} products`,
        user: sellerProducts,
      };
    } catch (error) {
      console.error('getSellerProducts error:', error);
      return {
        success: false,
        message: 'Failed to fetch seller products',
      };
    }
  },

  /**
   * Get product categories
   * @returns Array of unique categories
   */
  getCategories: async (): Promise<string[]> => {
    const categories = [...new Set(productsDatabase.map(p => p.category))];
    return categories.sort();
  },
};