import React, { useEffect, useState } from 'react';
import { getProducts, searchProducts } from '../services/productService';  // ✅ Firebase

// ✅ Local Product type for TypeScript
interface Product {
  id?: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  quantity: number;
  sellerId: string;
  imageUrl?: string;
  verified: boolean;
  sellerName?: string;
  sellerRating?: number;
}

interface Props {
  onBack: () => void;
  onProductSelect?: (product: Product) => void;  // ✅ Added callback
}

const Marketplace: React.FC<Props> = ({ onBack, onProductSelect }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // ✅ Load products from Firebase on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');

      // Get products from Firebase
      const prods = await getProducts(selectedCategory);
      setProducts(prods);
      setFilteredProducts(prods);

      console.log('✅ Loaded', prods.length, 'products from Firebase');
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
      console.error('Marketplace error:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter products when search changes
  useEffect(() => {
    if (searchTerm) {
      // Client-side search (Firebase doesn't support full-text yet)
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  const categories = [
    'All Products',
    'Industrial Acids',
    'Alkalis', 
    'Oxidizers',
    'Salts'
  ];

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === 'All Products' ? '' : category);
  };

  return (
    <div className="flex-1 bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 font-bold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Dashboard</span>
        </button>
        <h1 className="text-2xl font-black text-gray-900">Chemical Marketplace</h1>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-3xl p-6 shadow-lg mb-8">
        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search chemicals, CAS numbers, suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-4 pl-12 pr-12 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-semibold focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm ${
                selectedCategory === category || (category === 'All Products' && selectedCategory === '')
                  ? 'bg-[#004AAD] text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#004AAD]/20 border-t-[#004AAD] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-gray-600">Loading chemicals...</p>
            <p className="text-sm text-gray-500 mt-1">Fetching from verified suppliers</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 text-center shadow-lg">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-red-800 mb-2">{error}</h3>
          <button
            onClick={fetchProducts}
            className="bg-red-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg"
          >
            🔄 Retry Loading
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-12 text-center shadow-xl">
          <div className="text-6xl mb-6 mx-auto w-24 h-24 bg-blue-200 rounded-3xl flex items-center justify-center">🧪</div>
          <h3 className="text-2xl font-black text-gray-800 mb-3">No Chemicals Found</h3>
          <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto leading-relaxed">
            Try adjusting your search or category filters. New listings added daily by verified suppliers.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
            }}
            className="bg-[#004AAD] text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl transition-all"
          >
            🔍 Show All Products
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm font-bold text-gray-700 mb-4">
            <span>{filteredProducts.length} chemicals found</span>
            <span>Sorted by latest</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all border border-gray-100 cursor-pointer"
                onClick={() => onProductSelect?.(product)}
              >
                {/* Product Image */}
                <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#004AAD]/5 transition-colors">
                  <span className="text-4xl group-hover:text-[#004AAD] transition-colors">
                    {product.imageUrl ? '🧪' : '🧪'}
                  </span>
                </div>

                {/* Product Name */}
                <h3 className="font-black text-xl text-gray-900 mb-2 line-clamp-2 group-hover:text-[#004AAD] transition-colors">
                  {product.name}
                </h3>

                {/* Category */}
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  {product.category}
                </p>

                {/* Price */}
                <div className="flex items-baseline space-x-2 mb-4">
                  <span className="text-2xl font-black text-[#004AAD]">
                    ₹{product.price?.toLocaleString() || 'Contact'}
                  </span>
                  <span className="text-sm text-gray-500">per unit</span>
                </div>

                {/* Seller & Rating */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-yellow-900">
                      {product.sellerRating || 4.5}
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      {product.sellerName || 'Verified Seller'}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    product.verified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {product.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>

                {/* Stock & Action */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Stock: {product.quantity || 'Contact'} units
                  </span>
                  <button className="bg-[#004AAD] text-white px-6 py-3 rounded-2xl font-bold text-sm uppercase tracking-wider hover:bg-[#003399] transition-all shadow-lg group-hover:shadow-xl">
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results Footer */}
      {filteredProducts.length === 0 && !loading && !error && (
        <div className="mt-12 text-center py-12 border-t border-gray-200">
          <p className="text-gray-500 text-lg mb-4">Want specific chemicals?</p>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Our verified suppliers add new listings daily. Check back soon or contact support for custom sourcing.
          </p>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
