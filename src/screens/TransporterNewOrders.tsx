
import React from 'react';
import { TransportOrder } from '../types';

interface Props {
  transportOrders: TransportOrder[];
  onBack: () => void;
  onAccept: (order: TransportOrder) => void;
}

const TransporterNewOrders: React.FC<Props> = ({ transportOrders, onBack, onAccept }) => {
  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto hide-scrollbar">
      <div className="p-6 pt-12 sticky top-0 bg-white z-10 border-b border-gray-100 flex items-center space-x-4">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">New Load Requests</h1>
      </div>

      <div className="p-4 space-y-4">
         {transportOrders.filter(o => o.status === 'PENDING').map(o => (
           <div key={o.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="font-bold text-gray-900">{o.material}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Weight: {o.weight}</p>
                 </div>
                 <p className="text-xl font-bold text-[#004AAD]">₹{o.payout.toLocaleString()}</p>
              </div>

              <div className="space-y-4 relative">
                 <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-100"></div>
                 <div className="flex items-start space-x-4 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white mt-1 shadow-sm"></div>
                    <div>
                       <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Pickup Location</p>
                       <p className="text-xs font-bold text-gray-700">{o.pickupLocation}</p>
                    </div>
                 </div>
                 <div className="flex items-start space-x-4 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white mt-1 shadow-sm"></div>
                    <div>
                       <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Drop Location</p>
                       <p className="text-xs font-bold text-gray-700">{o.dropLocation}</p>
                    </div>
                 </div>
              </div>

              <div className="flex space-x-3 pt-2">
                 <button onClick={() => onAccept(o)} className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-100 transition-transform active:scale-95">Accept Order</button>
                 <button className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm transition-transform active:scale-95">Reject</button>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default TransporterNewOrders;