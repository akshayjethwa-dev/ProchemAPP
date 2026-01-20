
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
  product, isFavorite, onBack, onAddToCart, onBuyNow, onToggleFavorite, onAddToCompare, onEnquire 
}) => {
  const [qty, setQty] = useState(product.moq);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryMsg, setEnquiryMsg] = useState('');
  
  const basePrice = product.pricePerUnit * qty;
  const gstAmount = basePrice * (product.gstPercent / 100);
  const total = basePrice + gstAmount;

  const handleEnquire = () => {
    if (!enquiryMsg.trim()) return;
    onEnquire(enquiryMsg);
    setShowEnquiry(false);
    setEnquiryMsg('');
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto hide-scrollbar">
      <div className="relative h-64 bg-gray-100">
        <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
        <button 
          onClick={onBack}
          className="absolute top-10 left-6 bg-white/90 p-2 rounded-full shadow-lg"
        >
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <div className="absolute top-10 right-6 flex space-x-3">
           <button onClick={onToggleFavorite} className="bg-white/90 p-2 rounded-full shadow-lg">
             <svg className={`w-6 h-6 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
           </button>
        </div>
      </div>

      <div className="p-6 pb-40">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 mr-4">
            <h1 className="text-2xl font-black text-gray-900 leading-tight flex items-center">
               {product.name}
               {product.isSellerVerified && <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white rounded-full text-[10px]"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg></span>}
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
               <span className="text-[9px] font-black text-[#004AAD] bg-blue-50 px-2 py-1 rounded uppercase tracking-widest border border-blue-100">{product.category}</span>
               <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-1 rounded uppercase tracking-widest border border-green-100">CAS: {product.casNumber || 'N/A'}</span>
            </div>
          </div>
          <div className="text-right">
             <div className="flex items-center justify-end text-yellow-500 font-bold mb-1">
                <span className="text-xs mr-1">{product.sellerRating}</span>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" /></svg>
             </div>
             <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{product.sellerName}</p>
          </div>
        </div>

        <div className="flex space-x-2 mb-6">
           <button onClick={onAddToCompare} className="flex-1 py-2 rounded-xl bg-gray-50 border border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:bg-gray-100">Add to Compare</button>
           <button onClick={() => setShowEnquiry(true)} className="flex-1 py-2 rounded-xl bg-blue-50 border border-blue-100 text-[10px] font-bold text-[#004AAD] uppercase tracking-widest hover:bg-blue-100">Enquire Now</button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Grade / Purity</p>
              <p className="font-black text-gray-900">{product.grade} • {product.purity}%</p>
           </div>
           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">GST Verified</p>
              <p className="font-black text-green-600 flex items-center">{product.gstPercent}% <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg></p>
           </div>
        </div>

        <div className="mb-8">
           <h3 className="font-black text-gray-800 text-xs uppercase tracking-widest mb-3">Product Specifications</h3>
           <p className="text-sm text-gray-500 leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-100">{product.description}</p>
        </div>

        <div className="mb-8 p-5 bg-red-50 border border-red-100 rounded-3xl">
           <h3 className="text-xs font-bold text-red-800 mb-2 uppercase tracking-widest flex items-center">
              <span className="mr-2">⚠️</span> Safety Disclaimer
           </h3>
           <p className="text-[10px] text-red-700 leading-relaxed">
             This platform acts only as a technology intermediary. Prochem Pvt Ltd does not manufacture, store, or transport chemicals. Buyers and sellers are responsible for regulatory compliance.
           </p>
           <button className="mt-3 text-[10px] font-bold text-red-800 underline uppercase tracking-widest">Download MSDS Sheet</button>
        </div>

        <div className="mb-8 p-6 border border-dashed border-gray-200 rounded-[2rem] bg-gray-50/20">
           <h3 className="text-xs font-bold text-gray-800 mb-6 uppercase tracking-widest text-center">Configure Procurement</h3>
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <span className="text-sm font-bold text-gray-900 block">Quantity ({product.unit})</span>
                 <span className="text-[10px] text-gray-400 font-bold uppercase">Min: {product.moq}</span>
              </div>
              <div className="flex items-center space-x-5">
                 <button onClick={() => setQty(Math.max(product.moq, qty - 10))} className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center font-black text-gray-400">-</button>
                 <span className="font-black text-lg text-gray-900 w-12 text-center">{qty}</span>
                 <button onClick={() => setQty(qty + 10)} className="w-10 h-10 rounded-xl bg-[#004AAD] shadow-xl flex items-center justify-center font-black text-white">+</button>
              </div>
           </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-6 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
         <div className="mr-4">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Est. Payable</p>
            <p className="text-xl font-black text-[#004AAD]">₹{total.toLocaleString()}</p>
         </div>
         <div className="flex space-x-3 flex-1">
            <button onClick={() => onAddToCart(qty)} className="px-4 py-4 rounded-2xl border-2 border-[#004AAD] text-[#004AAD] font-black text-xs uppercase tracking-widest">Add Cart</button>
            <button onClick={() => onBuyNow(qty)} className="flex-1 py-4 bg-[#004AAD] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Buy Now</button>
         </div>
      </div>

      {/* Enquiry Modal */}
      {showEnquiry && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end">
           <div className="bg-white w-full rounded-t-[2.5rem] p-8 pb-12 animate-slide-up">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black text-gray-900">Send Enquiry</h2>
                 <button onClick={() => setShowEnquiry(false)} className="text-gray-400">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                 </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">Request COA, Lead Time, or Custom Price from <strong>{product.sellerName}</strong>.</p>
              <textarea 
                value={enquiryMsg}
                onChange={(e) => setEnquiryMsg(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm h-32 outline-none focus:ring-2 focus:ring-[#004AAD]"
                placeholder="Hello, I would like to know the latest batch COA for this product..."
              ></textarea>
              <button 
                onClick={handleEnquire}
                className="w-full py-4 bg-[#004AAD] text-white rounded-2xl font-black mt-6 shadow-xl active:scale-95 transition-all"
              >
                 SEND ENQUIRY
              </button>
              <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-widest">Seller usually responds in 2 hours</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
