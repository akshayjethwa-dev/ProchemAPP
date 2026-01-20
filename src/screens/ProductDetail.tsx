import React, { useState } from 'react';
import { Product } from '../types';

interface Props {
  product: Product;
  isFavorite: boolean;
  onBack: () => void;
  onAddToCart: (qty: number) => void;
  onBuyNow: (qty: number) => void;
  onToggleFavorite: () => void;
  onAddToCompare: () => void;
  onEnquire: (msg: string) => void;
}

const ProductDetail: React.FC<Props> = ({
  product,
  isFavorite,
  onBack,
  onAddToCart,
  onBuyNow,
  onToggleFavorite,
  onAddToCompare,
  onEnquire,
}) => {
  // ✅ FIXED: Set defaults for optional fields
  const moq = product.moq || 10;
  const pricePerUnit = product.pricePerUnit || product.price || 0;
  const gstPercent = product.gstPercent || 18;
  const unit = product.unit || 'kg';

  const [qty, setQty] = useState<number>(moq);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryMsg, setEnquiryMsg] = useState('');

  // ✅ FIXED: Use defaults in calculations
  const basePrice = pricePerUnit * qty;
  const gstAmount = basePrice * (gstPercent / 100);
  const total = basePrice + gstAmount;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Buy ${product.name} on Prochem`,
          text: `Check out ${product.name} (${product.purity || 95}% Purity) on Prochem Pvt Ltd.`,
          url: typeof window !== 'undefined' ? window.location.href : '',
        });
      } catch (e) {
        console.error('Share failed', e);
      }
    } else {
      alert('Sharing not supported on this browser.');
    }
  };

  return (
    <div className="screen-transition flex flex-col h-full bg-white">
      <div className="relative h-72 bg-gray-100 flex-shrink-0">
        <img
          src={product.imageUrl || product.image || '🧪'}
          className="w-full h-full object-cover"
          alt={product.name}
        />

        {/* Native Floating Controls */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start safe-top">
          <button
            onClick={onBack}
            className="btn-haptic w-12 h-12 bg-white/90 backdrop-blur-md flex items-center justify-center rounded-full shadow-lg"
          >
            <svg
              className="w-7 h-7 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex space-x-3">
            <button
              onClick={handleNativeShare}
              className="btn-haptic w-12 h-12 bg-white/90 backdrop-blur-md flex items-center justify-center rounded-full shadow-lg"
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
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>
            <button
              onClick={onToggleFavorite}
              className="btn-haptic w-12 h-12 bg-white/90 backdrop-blur-md flex items-center justify-center rounded-full shadow-lg"
            >
              <svg
                className={`w-6 h-6 ${
                  isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="scroll-content p-6 pb-40">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-gray-900 leading-tight">
              {product.name}
            </h1>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] font-bold bg-blue-50 text-[#004AAD] px-2 py-1 rounded uppercase tracking-widest">
                {product.category}
              </span>
              <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-1 rounded uppercase tracking-widest">
                {product.purity || 95}% Pure
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">⭐ 4.8</p>
            <p className="text-[9px] text-gray-400 font-bold uppercase">
              Verified Seller
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">
              Grade
            </p>
            <p className="font-black text-gray-800">
              {product.grade || 'Industrial'}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">
              Packaging
            </p>
            <p className="font-black text-gray-800">
              {product.packagingType || 'Drum'}
            </p>
          </div>
        </div>

        {/* CAS Number & Certifications */}
        {product.casNumber && (
          <div className="mb-8">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
              Product Details
            </h3>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <p className="text-xs font-bold text-gray-700">
                CAS Number: <span className="text-[#004AAD]">{product.casNumber}</span>
              </p>
              {product.certifications && product.certifications.length > 0 && (
                <p className="text-xs font-bold text-gray-700 mt-2">
                  Certifications: {product.certifications.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Material Safety
          </h3>
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
            <p className="text-xs text-red-800 leading-relaxed font-medium">
              Handle with extreme caution. Ensure proper ventilation and hazmat
              suits if necessary.
            </p>
            <button className="text-[10px] font-bold text-red-800 underline mt-2 uppercase tracking-widest">
              Download MSDS (PDF)
            </button>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-3xl mb-8">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-bold">
              Quantity ({unit})
            </p>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setQty(Math.max(moq, qty - 1))}
                className="btn-haptic w-10 h-10 bg-white border border-gray-200 rounded-xl font-bold"
              >
                −
              </button>
              <span className="text-lg font-black w-8 text-center">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="btn-haptic w-10 h-10 bg-[#004AAD] text-white rounded-xl font-bold"
              >
                +
              </button>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold text-center uppercase tracking-widest">
            MOQ: {moq} {unit}
          </p>
        </div>

        {/* Price Breakdown */}
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Base Price:</span>
              <span className="font-bold">₹{basePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">GST ({gstPercent}%):</span>
              <span className="font-bold">₹{gstAmount.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between text-lg">
              <span className="font-bold">Total:</span>
              <span className="font-black text-[#004AAD]">
                ₹{total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mb-8">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
              Description
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}
      </div>

      {/* Persistent Bottom Mobile Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 flex items-center justify-between safe-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[60]">
        <div>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
            Grand Total
          </p>
          <p className="text-xl font-black text-[#004AAD]">
            ₹{total.toLocaleString()}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => onAddToCart(qty)}
            className="btn-haptic px-6 py-4 bg-blue-50 text-[#004AAD] font-black text-xs uppercase rounded-2xl tracking-widest"
          >
            Cart
          </button>
          <button
            onClick={() => onBuyNow(qty)}
            className="btn-haptic px-8 py-4 bg-[#004AAD] text-white font-black text-xs uppercase rounded-2xl tracking-widest shadow-xl shadow-blue-200"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;