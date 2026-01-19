import React, { useEffect, useState } from 'react';
import { productService } from '../services/productService';
import { Product } from '../types';

interface Props {
  onBack: () => void;
}

const Marketplace: React.FC<Props> = ({ onBack }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // ✅ FETCH PRODUCTS ON MOUNT
  useEffect(() => {
    fetchProductsData();
  }, [selectedCategory]);

  const fetchProductsData = async () => {
    setLoading(true);
    setError('');

    const filters = selectedCategory ? { category: selectedCategory } : undefined;
    const result = await productService.fetchProducts(filters);

    setLoading(false);

    if (result.success && result.user) {
      setProducts(result.user);
      console.log('✅ Products loaded:', result.user);
    } else {
      setError(result.message || 'Failed to load products');
      console.log('❌ Error:', result.message);
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto hide-scrollbar p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black text-gray-900">Chemical Marketplace</h1>
        <button
          onClick={onBack}
          className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
        >
          <svg
            className="w-6 h-6 text-gray-800"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          Filter by Category
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === ''
                ? 'bg-[#004AAD] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Products
          </button>
          <button
            onClick={() => setSelectedCategory('Industrial Acids')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'Industrial Acids'
                ? 'bg-[#004AAD] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Industrial Acids
          </button>
          <button
            onClick={() => setSelectedCategory('Alkalis')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'Alkalis'
                ? 'bg-[#004AAD] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Alkalis
          </button>
          <button
            onClick={() => setSelectedCategory('Oxidizers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'Oxidizers'
                ? 'bg-[#004AAD] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Oxidizers
          </button>
          <button
            onClick={() => setSelectedCategory('Salts')}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'Salts'
                ? 'bg-[#004AAD] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Salts
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div>
              <div className="w-8 h-8 border-3 border-[#004AAD] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-600 mt-4 font-semibold">Loading products...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 font-semibold mb-4">⚠️ {error}</p>
            <button
              onClick={fetchProductsData}
              className="px-6 py-3 bg-[#004AAD] text-white rounded-lg font-bold hover:bg-blue-800 transition-all"
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 font-semibold">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all"
              >
                {/* Product Image */}
                <div className="w-full h-32 bg-gray-100 rounded-xl flex items-center justify-center text-4xl mb-3">
                  {product.image || '🧪'}
                </div>

                {/* Product Name */}
                <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">
                  {product.name}
                </h3>

                {/* Category */}
                <p className="text-xs text-gray-500 mb-2">{product.category}</p>

                {/* Price */}
                <p className="text-lg font-black text-[#004AAD] mb-2">
                  ₹{product.pricePerUnit.toLocaleString()}
                </p>

                {/* Seller & Rating */}
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs text-gray-600">{product.sellerName}</p>
                  <div className="flex items-center">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-xs text-gray-600 ml-1">{product.sellerRating}</span>
                  </div>
                </div>

                {/* Stock */}
                <p className="text-xs text-gray-500 mb-3">
                  {product.moq} {product.unit} available
                </p>

                {/* Add to Cart Button */}
                <button className="w-full py-2 bg-[#004AAD] text-white rounded-lg text-xs font-bold uppercase hover:bg-blue-800 transition-all">
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;