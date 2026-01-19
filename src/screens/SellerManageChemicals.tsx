import React, { useEffect, useState } from 'react';
import { productService } from '../services/productService';
import { useAppStore } from '../store/appStore';
import { Product } from '../types';

interface Props {
  products: Product[];
  onBack: () => void;
  onEdit: (product: Product) => void;
}

interface EditingProduct {
  id: string;
  stock: number;
}

const SellerManageChemicals: React.FC<Props> = ({ onBack, onEdit }) => {
  const user = useAppStore((state: any) => state.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingStock, setEditingStock] = useState<EditingProduct | null>(null);
  const [newStock, setNewStock] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load seller's products on component mount
  useEffect(() => {
    if (user?.uid) {
      loadSellerProducts();
    }
  }, [user?.uid]);

  const loadSellerProducts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch seller's products
      const result = await productService.getSellerProducts(user.uid);
      
      if (result.success && result.data) {
        setProducts(result.data);
      } else {
        setError(result.message || 'Failed to load products');
      }
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError(err.message || 'An error occurred while loading products');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      setDeletingId(productId);
      const result = await productService.deleteProduct(productId, user.uid);

      if (result.success) {
        setSuccess('Product deleted successfully! ✅');
        setProducts(products.filter(p => p.id !== productId));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Failed to delete product');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting product');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle update stock
  const handleUpdateStock = async (productId: string) => {
    if (!newStock || parseFloat(newStock) < 0) {
      setError('Please enter a valid stock quantity');
      return;
    }

    try {
      const updatedProduct = products.find(p => p.id === productId);
      if (!updatedProduct) return;

      const result = await productService.updateProduct(productId, {
        ...updatedProduct,
        moq: parseFloat(newStock), // Assuming moq is used for stock
      }, user.uid);

      if (result.success) {
        setSuccess('Stock updated successfully! ✅');
        setEditingStock(null);
        setNewStock('');
        // Update local state
        setProducts(products.map(p => 
          p.id === productId 
            ? { ...p, moq: parseFloat(newStock) }
            : p
        ));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Failed to update stock');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating stock');
    }
  };

  // Handle toggle stock status
  const handleToggleStock = async (product: Product) => {
    try {
      const result = await productService.updateProduct(
        product.id,
        {
          ...product,
          inStock: !product.inStock,
        },
        user.uid
      );

      if (result.success) {
        setSuccess(product.inStock ? 'Product marked out of stock' : 'Product marked in stock');
        setProducts(products.map(p => 
          p.id === product.id 
            ? { ...p, inStock: !p.inStock }
            : p
        ));
        setTimeout(() => setSuccess(''), 2500);
      } else {
        setError(result.message || 'Failed to update stock status');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto hide-scrollbar">
      {/* Header */}
      <div className="p-6 pt-12 sticky top-0 bg-white z-10 border-b border-gray-100 flex items-center space-x-4">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Manage Chemicals</h1>
          <p className="text-xs text-gray-500 mt-1">{products.length} products listed</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <p className="text-xs text-red-700 font-bold">⚠️ {error}</p>
          <button
            onClick={() => setError('')}
            className="text-xs text-red-600 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mx-6 mt-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg animate-pulse">
          <p className="text-xs text-green-700 font-bold">✅ {success}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#004AAD] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600 font-medium">Loading your products...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No Products Yet</h2>
            <p className="text-sm text-gray-600 mb-4">
              You haven't added any products to the marketplace yet.
            </p>
            <button
              onClick={onBack}
              className="px-6 py-2 bg-[#004AAD] text-white rounded-lg font-semibold text-sm"
            >
              Add Your First Product
            </button>
          </div>
        </div>
      )}

      {/* Products List */}
      {!loading && products.length > 0 && (
        <div className="p-4 space-y-4 pb-12">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col space-y-4"
            >
              {/* Product Info */}
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  {product.image || '🧪'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900 line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                    {product.category}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">
                    <span className="font-bold text-gray-600">{product.grade}</span> • 
                    <span className="ml-1">{product.purity}% Purity</span>
                  </p>
                  <p className="text-sm font-bold text-[#004AAD] mt-2">
                    ₹{product.pricePerUnit}/{product.unit}
                  </p>
                </div>

                {/* Stock Status Badge */}
                <button
                  onClick={() => handleToggleStock(product)}
                  className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap transition-all ${
                    product.inStock
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {product.inStock ? '🟢 ACTIVE' : '🔴 INACTIVE'}
                </button>
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-center">
                  <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">MOQ</p>
                  <p className="text-sm font-bold text-gray-900">{product.moq}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">GST</p>
                  <p className="text-sm font-bold text-gray-900">{product.gstPercent}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">CAS</p>
                  <p className="text-[11px] font-bold text-gray-900 line-clamp-1">
                    {product.casNumber || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Stock Update Section */}
              {editingStock?.id === product.id ? (
                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                    Update Stock Quantity
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                      placeholder="Enter new quantity"
                      className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#004AAD] outline-none"
                    />
                    <button
                      onClick={() => handleUpdateStock(product.id)}
                      disabled={deletingId === product.id}
                      className="px-3 py-2 rounded-lg bg-green-500 text-white text-[10px] font-bold hover:bg-green-600 transition-all disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingStock(null);
                        setNewStock('');
                      }}
                      className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 text-[10px] font-bold hover:bg-gray-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex border-t border-gray-100 pt-3 space-x-3">
                <button
                  onClick={() => {
                    setEditingStock({ id: product.id, stock: product.moq });
                    setNewStock(product.moq.toString());
                  }}
                  className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-all"
                >
                  📊 UPDATE STOCK
                </button>

                <button
                  onClick={() => onEdit?.(product)}
                  className="flex-1 py-2 rounded-lg bg-gray-50 text-gray-700 text-[10px] font-bold border border-gray-100 hover:bg-gray-100 transition-all"
                >
                  ✏️ EDIT
                </button>

                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  disabled={deletingId === product.id}
                  className="flex-1 py-2 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold border border-red-100 hover:bg-red-100 transition-all disabled:opacity-50"
                >
                  {deletingId === product.id ? '🗑️ DELETING...' : '🗑️ DELETE'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      {!loading && products.length > 0 && (
        <div className="p-4 pb-6">
          <button
            onClick={loadSellerProducts}
            className="w-full py-3 bg-[#004AAD] text-white rounded-lg font-semibold text-sm hover:bg-[#003580] transition-all"
          >
            🔄 Refresh Products
          </button>
        </div>
      )}
    </div>
  );
};

export default SellerManageChemicals;