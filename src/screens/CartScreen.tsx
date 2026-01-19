import React from 'react';
import { useCartStore } from '../store/cartStore';
import { orderService } from '../services/orderService';
import { useAuthStore } from '../store/authStore'; // assuming you have auth store

interface Props {
  onBack: () => void;
  onCheckoutSuccess: () => void;
}

const CartScreen: React.FC<Props> = ({ onBack, onCheckoutSuccess }) => {
  const { items, removeItem, clearCart, getTotal } = useCartStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(false);

  const subtotal = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  const totalGst = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity * item.gstPercent / 100), 0);
  const total = getTotal();

  const handleCheckout = async () => {
    if (!user || items.length === 0) return;
    
    setLoading(true);
    try {
      await orderService.createOrder(
        user.gstNumber || user.email || 'buyer_default',
        items,
        total,
        user.address || 'Default shipping address'
      );
      
      clearCart(); // Clear cart after successful order
      onCheckoutSuccess();
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-12 text-center">
        <span className="text-6xl mb-6">🛒</span>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Browse chemicals and add to your procurement list</p>
        <button
          onClick={onBack}
          className="px-8 py-4 bg-[#004AAD] text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white p-6 pt-12 flex items-center space-x-4 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Your Cart ({items.length})</h1>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
        {items.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
            <img src={item.image} className="w-20 h-20 rounded-2xl object-cover" alt={item.name} />
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{item.quantity} x {item.unit}</p>
              <p className="text-[#004AAD] font-bold text-xl mt-2">
                ₹{(item.pricePerUnit * item.quantity).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0,1 16.138 21H7.862a2 2 0 0,1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0,0-1-1h-4a1 1 0 0,0-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Checkout Bar */}
      <div className="bg-white p-6 border-t border-gray-200 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>₹{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>GST</span>
            <span>₹{totalGst.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex justify-between text-xl font-bold text-gray-900">
          <span>Total Amount</span>
          <span>₹{total.toLocaleString()}</span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={loading || items.length === 0}
          className="w-full bg-[#004AAD] text-white py-4 rounded-3xl font-black text-lg shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : `Place Order Securely (₹${total.toLocaleString()})`}
        </button>
      </div>
    </div>
  );
};

export default CartScreen;