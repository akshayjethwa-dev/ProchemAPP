import React, { useState } from 'react';
import { CartItem } from '../types';

interface Props {
  cart: CartItem[];
  onBack: () => void;
  onProceed: () => void;
}

const OrderSummaryScreen: React.FC<Props> = ({ cart, onBack, onProceed }) => {
  const [qty, setQty] = useState(cart[0]?.quantity || 10);
  const item = cart[0];

  if (!item) return null;

  // ✅ FIXED: Add defaults for optional fields
  const gstPercent = item.gstPercent || 18;
  const pricePerUnit = item.pricePerUnit || 0;
  const unit = item.unit || 'kg';

  // Base Calculation
  const subtotal = pricePerUnit * qty;
  const gstAmount = subtotal * (gstPercent / 100);
  const totalWithTax = subtotal + gstAmount;

  // ✅ NEW FEES
  const platformFee = totalWithTax * 0.01; // 1%
  const logisticFee = totalWithTax * 0.01; // 1%

  // ✅ FINAL TOTAL
  const total = totalWithTax + platformFee + logisticFee;

  return (
    <div className="flex-1 bg-gray-50 flex flex-col pt-12">
      <div className="px-6 flex items-center space-x-4 mb-8">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
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
        <h1 className="text-xl font-bold">Checkout</h1>
      </div>

      <div className="flex-1 px-6 space-y-6 overflow-y-auto hide-scrollbar pb-12">
        {/* Delivery Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-blue-50 text-[#004AAD] text-[8px] font-bold uppercase rounded-bl-xl border-b border-l border-blue-100">
            PRIMARY
          </div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
            Delivery To
          </h3>
          <div className="flex items-start space-x-4">
            <span className="text-2xl">🏢</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900 leading-tight">
                Reliable ChemWorks Pvt Ltd
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed italic">
                Sector 44, GIDC Estate, Vapi, Gujarat - 396191
              </p>
            </div>
            <button className="text-[10px] font-bold text-[#004AAD] underline hover:opacity-80">
              Change
            </button>
          </div>
        </div>

        {/* Product Config Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-gray-50">
            {/* ✅ FIXED: Better image fallback */}
            <img
              src={item.imageUrl || item.image || '🧪'}
              className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-gray-100"
              alt={item.name}
            />
            <div className="flex-1">
              <h4 className="font-bold text-sm text-gray-900 line-clamp-1">
                {item.name}
              </h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase">
                Industrial Grade • Standard
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Order Quantity ({unit})
              </p>
              <p className="text-xs text-gray-500 font-medium">
                MOQ: {item.quantity || 10}
              </p>
            </div>
            <div className="flex items-center space-x-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              <button
                onClick={() =>
                  setQty(Math.max(item.quantity || 10, qty - 50))
                }
                className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold text-gray-400 hover:bg-gray-50"
              >
                −
              </button>
              <span className="font-bold text-gray-900 w-12 text-center">
                {qty}
              </span>
              <button
                onClick={() => setQty(qty + 50)}
                className="w-10 h-10 rounded-xl bg-[#004AAD] shadow-sm flex items-center justify-center font-bold text-white hover:bg-[#003399]"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-[#004AAD] rounded-3xl p-8 text-white shadow-2xl space-y-4">
          <div className="flex justify-between text-blue-100 text-sm font-medium">
            <span>Base Value</span>
            <span className="text-white font-bold">
              ₹{subtotal.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-blue-100 text-sm font-medium">
            <span>GST ({gstPercent}%)</span>
            <span className="text-white font-bold">
              ₹{gstAmount.toLocaleString()}
            </span>
          </div>
          
          {/* ✅ UPDATED FEES */}
          <div className="flex justify-between text-blue-100 text-sm font-medium">
            <span>Platform Fee (1%)</span>
            <span className="text-white font-bold">
              ₹{platformFee.toLocaleString()}
            </span>
          </div>
           <div className="flex justify-between text-blue-100 text-sm font-medium">
            <span>Logistic Fee (1%)</span>
             <span className="text-white font-bold">
              ₹{logisticFee.toLocaleString()}
            </span>
          </div>

          <div className="h-px bg-white/10 my-4" />
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mb-1">
                Total Payable
              </p>
              <p className="text-3xl font-bold">₹{total.toLocaleString()}</p>
            </div>
            <p className="text-[10px] italic text-blue-300">Inclusive of Taxes</p>
          </div>
        </div>
      </div>

      <div className="p-8 bg-white border-t border-gray-100 sticky bottom-0 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button
          onClick={onProceed}
          className="w-full bg-[#004AAD] hover:bg-[#003399] text-white py-5 rounded-3xl font-bold shadow-2xl flex items-center justify-center space-x-3 active:scale-95 transition-all disabled:opacity-50"
        >
          <span>Proceed to Payment</span>
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
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default OrderSummaryScreen;