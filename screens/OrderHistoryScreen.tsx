
import React from 'react';
import { UserRole } from '../types';

interface Props {
  role: UserRole;
  onBack: () => void;
}

const OrderHistoryScreen: React.FC<Props> = ({ role, onBack }) => {
  const orders = [
    { id: 'ORD-92831', date: '22 Oct 2023', item: 'Sulphuric Acid', qty: '1000 kg', status: 'DELIVERED', amount: '₹28,320' },
    { id: 'ORD-91122', date: '20 Oct 2023', item: 'Urea', qty: '500 kg', status: 'DELIVERED', amount: '₹9,450' },
    { id: 'ORD-89920', date: '15 Oct 2023', item: 'Acetone', qty: '200 L', status: 'DELIVERED', amount: '₹22,420' },
  ];

  return (
    <div className="flex-1 bg-gray-50 flex flex-col pt-12">
      <div className="px-6 flex items-center space-x-4 mb-8">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm transition-transform active:scale-95">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        {/* Fix: Replaced UserRole.BUYER with UserRole.BUSINESS as BUYER is not defined in the enum */}
        <h1 className="text-xl font-bold text-gray-900">{role === UserRole.BUSINESS ? 'My Orders' : 'Orders Received'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-12 hide-scrollbar">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col space-y-3">
            <div className="flex justify-between items-start">
               <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{order.id}</h3>
                  <p className="text-sm font-bold text-gray-900 mt-1">{order.item}</p>
               </div>
               <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">{order.status}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
               <p>{order.qty} • {order.date}</p>
               <p className="text-gray-900 font-bold text-sm">{order.amount}</p>
            </div>
            <div className="pt-3 border-t border-gray-50 flex space-x-3">
               <button className="flex-1 py-2 text-[10px] font-bold text-[#004AAD] bg-blue-50 rounded-lg uppercase tracking-wider">Download Invoice</button>
               {/* Fix: Replaced UserRole.BUYER with UserRole.BUSINESS */}
               {role === UserRole.BUSINESS && <button className="flex-1 py-2 text-[10px] font-bold text-gray-600 bg-gray-50 rounded-lg uppercase tracking-wider">Reorder</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderHistoryScreen;
