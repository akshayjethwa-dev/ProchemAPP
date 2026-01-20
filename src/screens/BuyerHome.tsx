import React, { useState } from 'react';
import { CATEGORIES } from '../constants';
import { Product } from '../types';

interface Props {
  products: Product[];
  onViewProduct: (p: Product) => void;
  onViewCart: () => void;
  onViewHelp: () => void;
  onTrackOrder: () => void;
  cartCount: number;
}

const BuyerHome: React.FC<Props> = ({
  products,
  onViewProduct,
  onViewCart,
  onViewHelp,
  onTrackOrder,
  cartCount,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  // Filter products by category and search
  const filtered = products.filter(
    (p) =>
      (selectedCat === 'All' || p.category === selectedCat) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto hide-scrollbar pb-24">
      {/* Header */}
      <div className="bg-[#004AAD] pt-12 pb-6 px-6 sticky top-0 z-20 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <span className="text-[#004AAD] font-bold text-xs">P</span>
            </div>
            <span className="text-white font-bold text-lg">PROCHEM</span>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={onViewHelp} className="text-white p-1 hover:opacity-80">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            <button
              onClick={onViewCart}
              className="relative text-white p-1 hover:opacity-80"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#004AAD]">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search chemicals, sellers, grades..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white p-3.5 pl-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <svg
            className="w-5 h-5 absolute left-3 top-3.5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Categories */}
      <div className="p-6">
        <h2 className="text-gray-800 font-bold mb-4">Categories</h2>
        <div className="flex overflow-x-auto space-x-3 hide-scrollbar pb-2">
          <button
            onClick={() => setSelectedCat('All')}
            className={`px-6 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCat === 'All'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat: string) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-6 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCat === cat
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="px-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-gray-800 font-bold">Recommended for You</h2>
          <button className="text-[#004AAD] text-xs font-bold hover:underline">
            See All
          </button>
        </div>

        {filtered.length > 0 ? (
          filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => onViewProduct(p)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex cursor-pointer hover:shadow-md transition-shadow"
            >
              {/* ✅ FIXED: Use fallback for image */}
              <img
                src={p.imageUrl || p.image || '🧪'}
                className="w-28 h-28 object-cover bg-gray-100"
                alt={p.name}
              />
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 leading-tight">
                    {p.name}
                  </h3>
                  {/* ✅ FIXED: Removed sellerName and sellerRating - use defaults */}
                  <p className="text-[10px] text-gray-500 mt-1">
                    Verified Seller • ⭐ 4.8
                  </p>
                </div>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    {/* ✅ FIXED: Added default for pricePerUnit */}
                    <p className="text-[#004AAD] font-bold">
                      ₹{(p.pricePerUnit || p.price || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      per {p.unit || 'kg'} + GST
                    </p>
                  </div>
                  <div className="bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    <p className="text-[10px] text-gray-600 font-bold">
                      MOQ: {p.moq || 10}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 font-medium">No products found</p>
            <p className="text-[12px] text-gray-400 mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* Quick Access */}
      <div className="mt-8 px-6 grid grid-cols-2 gap-4">
        <div
          onClick={onTrackOrder}
          className="bg-blue-50 p-4 rounded-2xl border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
        >
          <span className="text-2xl">📦</span>
          <h4 className="font-bold text-blue-900 mt-2 text-sm">Active Orders</h4>
          <p className="text-[10px] text-blue-700">Track shipments</p>
        </div>
        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 hover:bg-green-100 transition-colors cursor-pointer">
          <span className="text-2xl">📑</span>
          <h4 className="font-bold text-green-900 mt-2 text-sm">
            GST Invoices
          </h4>
          <p className="text-[10px] text-green-700">Download reports</p>
        </div>
      </div>

      {/* Bottom Nav Simulation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex justify-around py-3 px-6 z-30 safe-bottom">
        <button className="flex flex-col items-center space-y-1 text-[#004AAD]">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" />
          </svg>
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-gray-400 hover:text-gray-600">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <span className="text-[10px] font-medium">Orders</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-gray-400 hover:text-gray-600">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-[10px] font-medium">Activity</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-gray-400 hover:text-gray-600">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="text-[10px] font-medium">Account</span>
        </button>
      </div>
    </div>
  );
};

export default BuyerHome;