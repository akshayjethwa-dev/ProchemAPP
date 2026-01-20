
import React from 'react';
import { Order } from '../types';

interface Props {
  onBack: () => void;
  order?: Order;
}

const OrderTracking: React.FC<Props> = ({ onBack, order }) => {
  const steps = [
    { title: 'Order Confirmed', time: '10:30 AM', status: 'COMPLETED' },
    { title: 'Quality Lab Check', time: '12:45 PM', status: 'COMPLETED' },
    { title: 'Vehicle Dispatched', time: 'In Progress', status: 'ACTIVE' },
    { title: 'In-Transit', time: '--', status: 'PENDING' },
    { title: 'Delivered', time: '--', status: 'PENDING' },
  ];

  return (
    <div className="flex-1 bg-white flex flex-col pt-12">
      <div className="px-6 flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button onClick={onBack}><svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></button>
          <h1 className="text-xl font-bold">Track Shipment</h1>
        </div>
        {order && <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase tracking-tighter">#{order.id}</span>}
      </div>

      <div className="flex-1 px-6 overflow-y-auto hide-scrollbar pb-10">
        <div className="bg-[#004AAD] rounded-3xl p-6 mb-8 text-white shadow-xl relative overflow-hidden">
           <div className="relative z-10">
              <h3 className="font-bold text-lg mb-1">Estimated Delivery</h3>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">24 Oct 2023</p>
              <div className="mt-6 h-2 bg-white/20 rounded-full overflow-hidden">
                 <div className="h-full bg-green-400 w-[45%]"></div>
              </div>
           </div>
        </div>

        <div className="space-y-0 pl-4 relative">
          <div className="absolute left-[2.4rem] top-0 bottom-10 w-0.5 bg-gray-100"></div>
          {steps.map((step, idx) => (
            <div key={idx} className="pb-10 flex items-start space-x-6 relative">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10 border-4 border-white shadow-sm ${
                 step.status === 'COMPLETED' ? 'bg-green-500' :
                 step.status === 'ACTIVE' ? 'bg-[#004AAD] ring-4 ring-blue-50' :
                 'bg-gray-100'
               }`}>
                 {step.status === 'COMPLETED' && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                 {step.status === 'ACTIVE' && <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>}
               </div>
               <div>
                  <h4 className={`font-black text-sm uppercase tracking-tight ${step.status === 'PENDING' ? 'text-gray-400' : 'text-gray-900'}`}>{step.title}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{step.time}</p>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
