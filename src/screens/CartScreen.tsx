import React, { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { createOrder, OrderItem } from '../services/orderService';
import { useAuthStore } from '../store/authStore';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  unit: string;
  image?: string;
  gstPercent?: number;
  sellerId: string;
}

interface Props {
  onBack: () => void;
  onCheckoutSuccess: () => void;
}

const CartScreen: React.FC<Props> = ({ onBack, onCheckoutSuccess }) => {
  const { items, removeItem, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subtotal = items.reduce((sum, item) => {
    return sum + ((item.pricePerUnit || 0) * (item.quantity || 0));
  }, 0);

  const totalGst = items.reduce((sum, item) => {
    const gstPercent = item.gstPercent || 18;
    return sum + ((item.pricePerUnit || 0) * (item.quantity || 0) * gstPercent / 100);
  }, 0);

  const total = subtotal + totalGst;

  // ✅ FIXED: Convert CartItem to OrderItem
  const convertToOrderItem = (cartItem: CartItem): OrderItem => {
    const itemTotal = cartItem.pricePerUnit * cartItem.quantity;
    return {
      productId: cartItem.id,
      productName: cartItem.name,
      quantity: cartItem.quantity,
      pricePerUnit: cartItem.pricePerUnit,
      total: itemTotal
    };
  };

  const handleCheckout = async () => {
    try {
      setError('');

      if (!user) {
        setError('Please login to checkout');
        return;
      }

      if (items.length === 0) {
        setError('Cart is empty');
        return;
      }

      setLoading(true);

      const buyerId = (user as any)?.email || (user as any)?.phone || (user as any)?.uid;
      const shippingAddress = (user as any)?.address || 'Default shipping address';

      // ✅ FIXED: Group items by seller and convert to OrderItem
      const ordersBySeller: { [key: string]: OrderItem[] } = items.reduce((acc: any, item) => {
        if (!acc[item.sellerId]) {
          acc[item.sellerId] = [];
        }
        acc[item.sellerId].push(convertToOrderItem(item));
        return acc;
      }, {});

      const orderIds: string[] = [];
      for (const [sellerId, orderItems] of Object.entries(ordersBySeller)) {
        // ✅ FIXED: Calculate total using OrderItem structure
        const sellerTotal = orderItems.reduce((sum, item) => {
          return sum + item.total;
        }, 0);

        // Add GST to seller total
        const sellerTotalWithGst = sellerTotal * 1.18; // 18% GST

        const orderId = await createOrder({
          buyerId,
          sellerId,
          items: orderItems, // ✅ Now properly typed as OrderItem[]
          totalAmount: sellerTotalWithGst,
          status: 'pending' as const,
          shippingAddress,
        });

        orderIds.push(orderId);
        console.log('✅ Order created:', orderId);
      }

      clearCart();
      setError('');
      alert(`✅ Order placed successfully!\nOrder IDs: ${orderIds.join(', ')}`);
      onCheckoutSuccess();

    } catch (err: any) {
      const errorMessage = err.message || 'Checkout failed. Please try again.';
      setError(errorMessage);
      console.error('❌ Checkout error:', err);
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
          className="px-8 py-4 bg-[#004AAD] text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl active:scale-95 transition-all"
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
        <button 
          onClick={onBack} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-all"
        >
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
          <p className="text-sm text-gray-500">{items.length} item(s)</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-red-700 font-semibold">⚠️ {error}</p>
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
        {items.map((item) => (
          <div 
            key={item.id} 
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center space-x-4"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center flex-shrink-0">
              {item.image ? (
                <img src={item.image} className="w-20 h-20 rounded-2xl object-cover" alt={item.name} />
              ) : (
                <span className="text-2xl">🧪</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-gray-900 truncate">{item.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {item.quantity} × {item.unit} @ ₹{item.pricePerUnit?.toLocaleString() || 0}/unit
              </p>
              <p className="text-[#004AAD] font-black text-lg mt-2">
                ₹{(item.pricePerUnit * item.quantity).toLocaleString()}
              </p>
            </div>

            <button
              onClick={() => removeItem(item.id)}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 active:scale-95 transition-all flex-shrink-0"
              title="Remove from cart"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0,1 16.138 21H7.862a2 2 0 0,1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0,0-1-1h-4a1 1 0 0,0-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Checkout Bar */}
      <div className="bg-white p-6 border-t border-gray-200 space-y-4 shadow-2xl">
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal ({items.length} items)</span>
            <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>GST (18%)</span>
            <span className="font-semibold">₹{totalGst.toLocaleString()}</span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-black text-gray-900">
            <span>Total Amount</span>
            <span className="text-[#004AAD]">₹{total.toLocaleString()}</span>
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading || items.length === 0 || !user}
          className="w-full bg-[#004AAD] hover:bg-[#003399] text-white py-4 rounded-3xl font-black text-lg shadow-xl hover:shadow-2xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing Order...</span>
            </div>
          ) : !user ? (
            '🔒 Login to Checkout'
          ) : (
            `Place Order Securely (₹${total.toLocaleString()})`
          )}
        </button>

        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 pt-2">
          <span>🔒</span>
          <span>Secure checkout powered by Firebase</span>
        </div>
      </div>
    </div>
  );
};

export default CartScreen;
