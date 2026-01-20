
import React from 'react';
import { CartItem } from '../types';

interface Props {
  items: CartItem[];
  onBack: () => void;
  onCheckout: () => void;
  onRemove: (id: string) => void;
}

const CartScreen: React.FC<Props> = ({ items, onBack, onCheckout, onRemove }) => {
  const subtotal = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  const totalGst = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity * (item.gstPercent / 100)), 0);
  const total = subtotal + totalGst;

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden">
      <div className="bg-white p-6 pt-12 flex items-center space-x-4 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack}><svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></button>
        <h1 className="text-xl font-bold">Your Cart ({items.length})</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-6xl mb-4">🛒</span>
            <h2 className="text-xl font-bold text-gray-800">Your cart is empty</h2>
            <p className="text-gray-500 mt-2">Browse the marketplace and add chemicals to your procurement list.</p>
            <button onClick={onBack} className="mt-6 text-[#004AAD] font-bold underline">Shop Now</button>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center space-x-4 shadow-sm relative">
              <img src={item.image} className="w-20 h-20 rounded-xl object-cover" />
              <div className="flex-1">
                <h3 className="font-bold text-sm">{item.name}</h3>
                <p className="text-xs text-gray-500">{item.quantity} x {item.unit}</p>
                <p className="text-[#004AAD] font-bold mt-1">₹{(item.pricePerUnit * item.quantity).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => onRemove(item.id)}
                className="absolute top-4 right-4 text-gray-300 hover:text-red-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="bg-white p-6 border-t border-gray-200 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>GST Total</span>
              <span>₹{totalGst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Delivery Fee</span>
              <span className="text-green-600 font-bold underline cursor-pointer">Calculated at dispatch</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2 mt-2">
              <span>Total Amount</span>
              <span className="text-[#004AAD]">₹{total.toLocaleString()}</span>
            </div>
          </div>
          <button 
            onClick={onCheckout}
            className="w-full bg-[#004AAD] text-white py-4 rounded-xl font-bold shadow-lg"
          >
            Checkout Securely
          </button>
        </div>
      )}
    </div>
  );
};

export default CartScreen;
