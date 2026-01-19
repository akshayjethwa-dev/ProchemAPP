import React, { useState, useEffect } from 'react';
import { orderService } from '../services/orderService';
import { useAuthStore } from '../store/authStore';

interface Props {
  onBack: () => void;
}

const OrderHistoryScreen: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const userOrders = await orderService.fetchUserOrders(user!.gstNumber || user!.email || 'buyer_default', 'buyer');
      setOrders(userOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#004AAD]/20 border-t-[#004AAD] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col pt-12">
      <div className="px-6 flex items-center space-x-4 mb-8 bg-white pb-6 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 shadow-sm">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">My Orders ({orders.length})</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-12 hide-scrollbar">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl mb-6 block">📦</span>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-8">Your orders will appear here once you place them</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">#{order.id}</h3>
                  <p className="text-lg font-bold text-gray-900">{order.items[0]?.name || 'Multiple Items'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {order.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-4">
                <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                <span>₹{order.totalAmount?.toLocaleString()}</span>
              </div>
              <div className="flex space-x-4 pt-4 border-t border-gray-100">
                <button className="flex-1 py-3 bg-blue-50 text-[#004AAD] rounded-xl font-bold text-sm uppercase tracking-wider">
                  Track Order
                </button>
                <button className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl font-bold text-sm uppercase tracking-wider">
                  Reorder
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrderHistoryScreen;