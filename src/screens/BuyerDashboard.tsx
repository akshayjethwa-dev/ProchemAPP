import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getProducts } from '../services/productService';
import { getBuyerOrders } from '../services/orderService';

interface Props {
  profile: UserProfile;
  onBrowse: () => void;
  onOrders: () => void;
  onTrack: () => void;
  onHelp: () => void;
  onNotifications: () => void;
  onLogout: () => void;
}

// ✅ TEMPORARY Product type (until types/index.ts is fixed)
interface Product {
  id?: string;
  name: string;
  price: number;
  category: string;
  quantity: number;
  sellerId: string;
  verified: boolean;
}

// ✅ TEMPORARY Order type
interface Order {
  id?: string;
  status: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
}

const BuyerDashboard: React.FC<Props> = ({ 
  profile, 
  onBrowse, 
  onOrders, 
  onTrack, 
  onHelp, 
  onNotifications, 
  onLogout 
}) => {
  // ✅ FIXED: Proper typing
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ✅ FIXED: Load data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Get all products from Firebase
        const prods = await getProducts();
        setProducts(prods);
        console.log('✅ Loaded', prods.length, 'products from Firebase');

        // Get buyer's orders
        const buyerId = profile.email || profile.phone; // Use email or phone
        try {
          const buyerOrders = await getBuyerOrders(buyerId);
          setOrders(buyerOrders);
          console.log('✅ Loaded', buyerOrders.length, 'orders from Firebase');
        } catch (orderError) {
          console.warn('No orders found:', orderError);
          setOrders([]); // Empty array if no orders
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load data');
        console.error('Dashboard load error:', err);
        setProducts([]); // Empty on error
        setOrders([]);   // Empty on error
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      loadData();
    }
  }, [profile]);

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto hide-scrollbar">
      {/* Header */}
      <div className="bg-[#004AAD] pt-12 pb-20 px-6 relative shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-[#004AAD]">P</div>
            <h1 className="text-white text-xl font-bold">Prochem Buyer</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={onNotifications}
              className="relative text-white/90 p-1 bg-white/10 rounded-lg"
            >
              🔔
            </button>
            <button 
              onClick={onLogout}
              className="text-white/80 text-xs bg-white/10 px-3 py-1.5 rounded-lg border border-white/20"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl shadow-inner">
            🏢
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">{profile?.companyName}</h2>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">
              GST: {profile?.gstNumber || 'Applied'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 -mt-10 space-y-6 pb-24">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12 bg-white rounded-2xl shadow-sm">
            <div className="text-lg text-gray-500 animate-pulse">
              Loading your dashboard...
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && !loading && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl shadow-sm">
            <p className="text-red-700 text-sm font-bold mb-2">⚠️ {error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-xs text-red-600 underline hover:text-red-700"
            >
              🔄 Retry Loading Data
            </button>
          </div>
        )}

        {/* Quick Actions - Real Firebase Data */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={onBrowse}
              className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center text-center transition-all active:scale-95 group hover:shadow-lg"
            >
              <span className="text-3xl mb-3 group-active:animate-pulse">🧪</span>
              <h3 className="font-bold text-gray-900 text-lg">Browse Chemicals</h3>
              <p className="text-sm text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full mt-2">
                {products.length} Available
              </p>
              <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest">Marketplace</p>
            </button>

            <button 
              onClick={onTrack}
              className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center text-center transition-all active:scale-95 group hover:shadow-lg"
            >
              <span className="text-3xl mb-3 group-active:animate-pulse">📦</span>
              <h3 className="font-bold text-gray-900 text-lg">Active Orders</h3>
              <p className="text-sm text-blue-600 font-bold bg-blue-100 px-3 py-1 rounded-full mt-2">
                {orders.filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled').length} Active
              </p>
              <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest">Tracking</p>
            </button>
          </div>
        )}

        {/* Management Tools */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-5 flex items-center justify-between">
            Management Tools
            <span className="text-[9px] font-bold text-[#004AAD] bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">
              Buyer Portal
            </span>
          </h3>

          <div className="space-y-2">
            <button 
              onClick={onOrders}
              className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
            >
              <span className="flex items-center space-x-4">
                <span className="text-xl">📋</span>
                <span className="text-sm font-bold text-gray-700">Order History</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {orders.length} total
                </span>
              </span>
              <span className="text-gray-300">›</span>
            </button>

            <button className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <span className="flex items-center space-x-4">
                <span className="text-xl">📄</span>
                <span className="text-sm font-bold text-gray-700">GST Invoices</span>
              </span>
              <span className="text-gray-300">›</span>
            </button>

            <button 
              onClick={onHelp}
              className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
            >
              <span className="flex items-center space-x-4">
                <span className="text-xl">🎧</span>
                <span className="text-sm font-bold text-gray-700">Help & Support</span>
              </span>
              <span className="text-gray-300">›</span>
            </button>
          </div>
        </div>

        {/* Bulk Buy Rewards */}
        <div className="bg-green-600 rounded-3xl p-6 text-white shadow-xl shadow-green-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
            <span className="text-6xl">📦</span>
          </div>
          <h3 className="font-bold text-base mb-1">Bulk Buy Rewards</h3>
          <p className="text-green-100 text-xs mb-4 leading-relaxed opacity-90">
            Order more than 10 MT to get 5% additional discount on Industrial Acids this festive season.
          </p>
          <button className="bg-white text-green-700 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all">
            Claim Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;