
import React from 'react';
import { Product } from '../types';

interface Props {
  products: Product[];
  onBack: () => void;
}

const SellerManageChemicals: React.FC<Props> = ({ products, onBack }) => {
  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto hide-scrollbar">
      <div className="p-6 pt-12 sticky top-0 bg-white z-10 border-b border-gray-100 flex items-center space-x-4">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Manage Chemicals</h1>
      </div>

      <div className="p-4 space-y-4">
         {products.map(p => (
           <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col space-y-4">
              <div className="flex items-center space-x-4">
                 <img src={p.image} className="w-16 h-16 rounded-xl object-cover" />
                 <div className="flex-1">
                    <h3 className="font-bold text-sm text-gray-900">{p.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{p.grade} Grade • {p.purity}% Purity</p>
                    <p className="text-xs font-bold text-green-600 mt-1">₹{p.pricePerUnit}/{p.unit}</p>
                 </div>
                 <div className="flex flex-col items-end space-y-2">
                    <button className={`px-2 py-1 rounded text-[10px] font-bold ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                       {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                 </div>
              </div>
              <div className="flex border-t border-gray-50 pt-3 space-x-3">
                 <button className="flex-1 py-2 rounded-lg bg-gray-50 text-gray-600 text-[10px] font-bold border border-gray-100">EDIT DETAILS</button>
                 <button className="flex-1 py-2 rounded-lg bg-gray-50 text-gray-600 text-[10px] font-bold border border-gray-100">UPDATE STOCK</button>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default SellerManageChemicals;
