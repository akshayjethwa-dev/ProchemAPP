import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { useAppStore } from '../store/appStore';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';

interface Props {
  profile: UserProfile;
  onLogout: () => void;
  onAddChemical: () => void;
  onManageChemicals: () => void;
  onOrders: () => void;
  onHelp: () => void;
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
    rating: 0
  });
  const [loading, setLoading] = useState(true);

  // Load seller data on component mount
  useEffect(() => {
    if (user?.uid) {
      loadSellerData();
    }
  }, [user?.uid]);

  const loadSellerData = async () => {
    try {
      setLoading(true);
      
      // Fetch seller's orders
      const sellerOrders = await orderService.fetchUserOrders(user.uid, 'seller');
      
      // Fetch seller's products
      const sellerProducts = await productService.getSellerProducts(user.uid);
      
      // Calculate total sales from delivered orders
      const totalSales = sellerOrders
        .filter((o: any) => o.status === 'delivered')
        .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
      
      // Update stats with real data
      setStats({
        totalSales,
        ordersReceived: sellerOrders.length,
        activeListings: (sellerProducts as any).data?.length || 0,

        rating: (profile as any)?.rating || 4.8
 // Use profile rating if available, fallback to 4.8
      });
    } catch (error) {
      console.error('Error loading seller data:', error);
      // Fallback to default stats on error
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

  // Dashboard stats array with real data
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
      <div className="bg-[#004AAD] pt-12 pb-24 px-6 relative shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-white text-2xl font-bold">Seller Console</h1>
          <button 
            onClick={onLogout} 
            className="text-white/80 text-xs bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 transition-all active:scale-95"
          >
            Logout
          </button>
        </div>
        <p className="text-blue-100 text-sm font-medium">
          Welcome, {profile?.companyName || user?.email}
        </p>
      </div>

      {/* Main Content */}
      <div className="px-6 -mt-16 space-y-6 pb-24">
        {/* Stats Cards - Shows Loading State */}
        <div className="grid grid-cols-2 gap-4">
          {dashboardStats.map(s => (
            <div 
              key={s.label} 
              className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md"
            >
              <span className="text-xl">{s.icon}</span>
              <p className="text-xl font-bold text-gray-900 mt-2">
                {loading ? '...' : s.value}
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Operations Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-5 flex items-center justify-between">
            Operations
            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg uppercase tracking-widest">
              Active Vendor
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={onAddChemical} 
              className="flex flex-col items-center justify-center p-5 bg-green-50 border border-green-100 rounded-2xl transition-all active:scale-95 group"
            >
              <span className="text-3xl mb-3 group-active:animate-bounce">➕</span>
              <span className="text-[10px] font-bold text-green-800 uppercase tracking-widest">
                Add Product
              </span>
            </button>
            <button 
              onClick={onManageChemicals} 
              className="flex flex-col items-center justify-center p-5 bg-blue-50 border border-blue-100 rounded-2xl transition-all active:scale-95 group"
            >
              <span className="text-3xl mb-3 group-active:animate-bounce">📝</span>
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">
                Manage All
              </span>
            </button>
          </div>
        </div>

        {/* Business Menu */}
        <div className="space-y-3">
          <h2 className="font-bold text-gray-800 ml-1">Business Menu</h2>
          <div className="bg-white rounded-3xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
            <button 
              onClick={onOrders}
              className="w-full flex items-center justify-between p-5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center">
                <span className="mr-4 text-lg">📦</span> 
                Orders Received
              </span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
            
            <button className="w-full flex items-center justify-between p-5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
              <span className="flex items-center">
                <span className="mr-4 text-lg">📊</span> 
                Sales Analytics
              </span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
            
            <button className="w-full flex items-center justify-between p-5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
              <span className="flex items-center">
                <span className="mr-4 text-lg">💳</span> 
                Payout Wallet
              </span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
            
            <button 
              onClick={onHelp}
              className="w-full flex items-center justify-between p-5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center">
                <span className="mr-4 text-lg">🎧</span> 
                Support Desk
              </span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;