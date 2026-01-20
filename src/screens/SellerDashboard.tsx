import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { useAppStore } from '../store/appStore';
import { getSellerOrders } from '../services/orderService';  // ✅ FIXED: Only this export
import { getSellerProducts as getProductsFromService } from '../services/productService'; // ✅ FIXED: Renamed to avoid conflict

interface Props {
  profile: UserProfile;
  onLogout: () => void;
  onAddChemical: () => void;
  onManageChemicals: () => void;
  onOrders: () => void;
  onHelp: () => void;
}

// ✅ FIXED: Define local types to avoid import conflicts
interface LocalOrder {
  id: string;
  status: string;
  totalAmount: number;
}

interface LocalProduct {
  id: string;
  name: string;
}

interface DashboardStats {
  totalSales: number;
  ordersReceived: number;
  activeListings: number;
  rating: number;
}

const SellerDashboard: React.FC<Props> = ({
  profile,
  onLogout,
  onAddChemical,
  onManageChemicals,
  onOrders,
  onHelp
}) => {
  const user = useAppStore((state: any) => state.user);

  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    ordersReceived: 0,
    activeListings: 0,
    rating: 4.8
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ✅ FIXED: Load seller data from Firebase
  useEffect(() => {
    if (user?.uid || profile?.uid) {
      loadSellerData();
    }
  }, [user?.uid, profile?.uid]);

  const loadSellerData = async () => {
    try {
      setLoading(true);
      setError('');

      const sellerId = user?.uid || profile?.uid || 'test-seller';

      console.log('🔄 Loading seller data for:', sellerId);

      // ✅ FIXED: Import from correct services
      const sellerOrders = await getSellerOrders(sellerId);
      const sellerProducts = await getProductsFromService(sellerId);

      // Calculate total sales from delivered orders
      const totalSales = sellerOrders
        .filter((o: any) => o.status === 'delivered')
        .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

      // Update stats with REAL Firebase data
      setStats({
        totalSales,
        ordersReceived: sellerOrders.length,
        activeListings: sellerProducts.length,
        rating: (profile as any)?.rating || 4.8
      });

      console.log('✅ Seller stats loaded:', {
        orders: sellerOrders.length,
        products: sellerProducts.length,
        sales: totalSales
      });

    } catch (error: any) {
      console.error('Error loading seller data:', error);
      setError('Failed to load dashboard data');
      
      setStats({
        totalSales: 0,
        ordersReceived: 0,
        activeListings: 0,
        rating: 4.8
      });
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  // Dashboard stats with real data
  const dashboardStats = [
    {
      label: 'Total Sales',
      value: formatCurrency(stats.totalSales),
      icon: '📈'
    },
    {
      label: 'Orders Received',
      value: stats.ordersReceived.toString(),
      icon: '📦'
    },
    {
      label: 'Active Listings',
      value: stats.activeListings.toString(),
      icon: '🧪'
    },
    {
      label: 'Store Rating',
      value: stats.rating.toFixed(1),
      icon: '⭐'
    }
  ];

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto hide-scrollbar">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#004AAD] to-[#0066CC] pt-12 pb-20 px-6 relative shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center font-bold text-white shadow-lg">S</div>
            <div>
              <h1 className="text-white text-xl font-black">Seller Console</h1>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Active Vendor</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="text-white/80 text-xs bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/30 font-bold uppercase tracking-widest hover:bg-white/30 transition-all"
          >
            Logout
          </button>
        </div>

        <div className="text-center">
          <h2 className="text-white font-black text-2xl mb-1">
            Welcome, {profile?.companyName || user?.email || 'Seller'}
          </h2>
          <p className="text-blue-100 text-sm opacity-90">
            GST: {profile?.gstNumber || 'Applied for verification'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 -mt-12 space-y-6 pb-24">
        {/* Loading/Error State */}
        {loading && (
          <div className="flex items-center justify-center py-16 bg-white/50 backdrop-blur-sm rounded-3xl shadow-xl">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[#004AAD]/30 border-t-[#004AAD] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold">Loading seller dashboard...</p>
              <p className="text-sm text-gray-500 mt-1">Fetching orders & listings</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 bg-red-50/80 border border-red-200 rounded-3xl shadow-lg backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs">!</div>
              <p className="font-bold text-red-800 text-lg">Dashboard Error</p>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-500 text-white px-6 py-2 rounded-2xl font-bold text-sm uppercase tracking-wider hover:bg-red-600 transition-all shadow-lg"
            >
              🔄 Reload Dashboard
            </button>
          </div>
        )}

        {/* Stats Cards - Real Firebase Data */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-4">
            {dashboardStats.map((stat, index) => (
              <div 
                key={index}
                className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{stat.icon}</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-gray-900 group-hover:text-[#004AAD] transition-colors">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Operations Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50">
          <h3 className="font-black text-xl text-gray-800 mb-6 flex items-center justify-between">
            Operations
            <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full uppercase tracking-widest">
              Go Live
            </span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={onAddChemical}
              className="group bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-5 rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all font-bold text-lg"
            >
              <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">➕</span>
              <span>Add Product</span>
            </button>

            <button 
              onClick={onManageChemicals}
              className="group bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all font-bold text-lg"
            >
              <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">📋</span>
              <span>Manage All</span>
            </button>
          </div>
        </div>

        {/* Business Menu */}
        <div className="bg-gradient-to-b from-slate-50 to-white rounded-3xl p-6 shadow-lg border border-slate-100">
          <h3 className="font-black text-lg text-gray-800 mb-5">Business Menu</h3>
          
          <div className="space-y-3">
            <button 
              onClick={onOrders}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-white hover:bg-slate-50 transition-all border border-slate-100 shadow-sm hover:shadow-md"
            >
              <span className="flex items-center space-x-4">
                <span className="text-2xl">📦</span>
                <span className="font-bold text-gray-800">Orders Received</span>
              </span>
              <span className="text-gray-400">›</span>
            </button>

            <button className="w-full flex items-center justify-between p-5 rounded-2xl bg-white hover:bg-slate-50 transition-all border border-slate-100 shadow-sm hover:shadow-md">
              <span className="flex items-center space-x-4">
                <span className="text-2xl">📊</span>
                <span className="font-bold text-gray-800">Sales Analytics</span>
              </span>
              <span className="text-gray-400">›</span>
            </button>

            <button className="w-full flex items-center justify-between p-5 rounded-2xl bg-white hover:bg-slate-50 transition-all border border-slate-100 shadow-sm hover:shadow-md">
              <span className="flex items-center space-x-4">
                <span className="text-2xl">💰</span>
                <span className="font-bold text-gray-800">Payout Wallet</span>
              </span>
              <span className="text-gray-400">›</span>
            </button>

            <button 
              onClick={onHelp}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-white hover:bg-slate-50 transition-all border border-slate-100 shadow-sm hover:shadow-md"
            >
              <span className="flex items-center space-x-4">
                <span className="text-2xl">🎧</span>
                <span className="font-bold text-gray-800">Support Desk</span>
              </span>
              <span className="text-gray-400">›</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
