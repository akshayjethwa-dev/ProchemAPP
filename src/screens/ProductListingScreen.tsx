
import React, { useState } from 'react';
import { Product, ChemicalCategory } from '../types';

interface Props {
  category: ChemicalCategory;
  products: Product[];
  onBack: () => void;
  onProductSelect: (p: Product) => void;
  onToggleFavorite: (id: string) => void;
  onAddToCompare: (product: Product) => void;
}

const ProductListingScreen: React.FC<Props> = ({ category, products, onBack, onProductSelect, onToggleFavorite, onAddToCompare }) => {
  const [sortBy, setSortBy] = useState<'price_asc' | 'popularity'>('popularity');

  let filtered = products.filter(p => p.category === category);
  
  if (sortBy === 'price_asc') {
    filtered.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  } else {
    filtered.sort((a, b) => b.sellerRating - a.sellerRating);
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      <div className="bg-white p-4 pt-12 flex items-center space-x-4 border-b border-gray-100 sticky top-0 z-20">
         <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 active:scale-95 transition-all">
            <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
         </button>
         <div className="flex-1 overflow-hidden">
            <h1 className="text-sm font-black text-gray-900 line-clamp-1">{category}</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{filtered.length} Verified Sources</p>
         </div>
         <div className="flex items-center space-x-2">
            <button className="p-2 text-[#004AAD] bg-blue-50 rounded-lg">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </button>
         </div>
      </div>

      <div className="bg-white flex divide-x divide-gray-100 border-b border-gray-100 shadow-sm">
         <button 
           onClick={() => setSortBy(sortBy === 'price_asc' ? 'popularity' : 'price_asc')}
           className="flex-1 py-3 flex items-center justify-center space-x-2 text-[11px] font-black text-gray-600 uppercase tracking-widest"
         >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg>
            <span>Sort: {sortBy === 'price_asc' ? 'Price' : 'Trust Score'}</span>
         </button>
         <button className="flex-1 py-3 flex items-center justify-center space-x-2 text-[11px] font-black text-gray-600 uppercase tracking-widest">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
            <span>Filters</span>
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
         {filtered.map(p => (
           <div 
             key={p.id} 
             className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex active:scale-[0.98] transition-all relative"
           >
              <div onClick={() => onProductSelect(p)} className="w-32 h-32 relative bg-gray-50 flex-shrink-0 cursor-pointer">
                 <img src={p.image} className="w-full h-full object-cover" />
                 {p.isSellerVerified && (
                   <div className="absolute top-2 left-2 bg-[#004AAD] text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-sm">VERIFIED</div>
                 )}
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between">
                 <div onClick={() => onProductSelect(p)} className="cursor-pointer">
                    <div className="flex justify-between items-start">
                       <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{p.name}</h3>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                       <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{p.grade}</span>
                       <span className="text-[9px] font-black text-green-600 uppercase bg-green-50 px-1 rounded flex items-center">
                         {p.purity}% Purity
                       </span>
                    </div>
                    <p className="text-[8px] text-gray-400 font-bold uppercase mt-2 line-clamp-1">{p.sellerName}</p>
                 </div>
                 <div className="flex justify-between items-end mt-2">
                    <div>
                       <p className="text-lg font-black text-[#004AAD]">₹{p.pricePerUnit}</p>
                       <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Per {p.unit} + GST</p>
                    </div>
                    <div className="flex space-x-2">
                       <button 
                         onClick={(e) => { e.stopPropagation(); onAddToCompare(p); }} 
                         className="p-1.5 bg-gray-50 rounded-lg border border-gray-100"
                         title="Compare"
                       >
                         <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                       </button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); onToggleFavorite(p.id); }} 
                         className={`p-1.5 bg-gray-50 rounded-lg border border-gray-100 ${p.isFavorite ? 'text-red-500' : 'text-gray-400'}`}
                         title="Favorite"
                       >
                         <svg className={`w-4 h-4 ${p.isFavorite ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                       </button>
                    </div>
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default ProductListingScreen;