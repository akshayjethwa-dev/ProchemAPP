
import React, { useState } from 'react';
// Fix: Removed non-existent MOCK_PRODUCTS from constants import
import { CATEGORIES } from '../constants';
import { Product } from '../types';

interface Props {
  // Fix: Added products prop to replace removed MOCK_PRODUCTS constant
  products: Product[];
  onBack: () => void;
  onViewProduct: (p: Product) => void;
  cartCount: number;
}

const Marketplace: React.FC<Props> = ({ products, onBack, onViewProduct, cartCount }) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  // Fix: Use products prop instead of MOCK_PRODUCTS
  const filtered = products.filter(p => 
    (selectedCat === 'All' || p.category === selectedCat) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto hide-scrollbar pb-12">
      <div className="bg-[#004AAD] pt-12 pb-8 px-6 sticky top-0 z-20 shadow-xl rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="text-white bg-white/10 p-2 rounded-xl backdrop-blur-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 className="text-white font-bold text-xl">Marketplace</h1>
          </div>
          <div className="relative text-white">
             <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
             </div>
             {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#004AAD] font-bold shadow-lg">{cartCount}</span>}
          </div>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search chemicals, suppliers, grades..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white p-4 rounded-2xl text-sm outline-none pl-12 shadow-inner font-medium"
          />
          <svg className="w-5 h-5 absolute left-4 top-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>

      <div className="p-6 flex overflow-x-auto space-x-3 hide-scrollbar">
         {['All', ...CATEGORIES].map(cat => (
           <button 
             key={cat} 
             onClick={() => setSelectedCat(cat)}
             className={`px-6 py-2.5 rounded-2xl text-[10px] font-bold whitespace-nowrap border uppercase tracking-widest shadow-sm transition-all ${selectedCat === cat ? 'bg-[#004AAD] text-white border-[#004AAD]' : 'bg-white text-gray-500 border-gray-100'}`}
           >{cat}</button>
         ))}
      </div>

      <div className="px-6 space-y-5 pb-12">
         {filtered.map(p => (
           <div key={p.id} onClick={() => onViewProduct(p)} className="bg-white rounded-3xl p-4 flex shadow-sm border border-gray-100 active:scale-[0.98] transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 px-3 py-1 bg-green-50 text-green-600 text-[8px] font-bold uppercase tracking-widest border-b border-l border-green-100 rounded-bl-2xl">
                 {p.purity}% PURITY
              </div>
              <img src={p.image} className="w-24 h-24 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
              <div className="ml-5 flex-1 flex flex-col justify-between">
                 <div>
                    <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{p.name}</h3>
                    <div className="flex items-center space-x-1 mt-1">
                       <span className="text-[10px] font-bold text-yellow-500 bg-yellow-50 px-1.5 py-0.5 rounded-lg">⭐ {p.sellerRating}</span>
                       <span className="text-[10px] text-gray-400 font-medium line-clamp-1">• {p.sellerName}</span>
                    </div>
                 </div>
                 <div className="flex justify-between items-end mt-3">
                    <div>
                       <p className="text-[#004AAD] font-bold text-xl">₹{p.pricePerUnit}</p>
                       <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">per {p.unit} + GST</p>
                    </div>
                    <div className="bg-gray-50 px-3 py-1.5 rounded-xl text-[10px] font-bold text-gray-600 border border-gray-100 shadow-inner uppercase tracking-tighter">MOQ: {p.moq} {p.unit}</div>
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default Marketplace;
