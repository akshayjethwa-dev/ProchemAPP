
import React from 'react';

interface Props {
  onLogout: () => void;
  onNewOrders: () => void;
  onLiveTrip: () => void;
  onHelp: () => void;
}

const TransporterDashboard: React.FC<Props> = ({ onLogout, onNewOrders, onLiveTrip, onHelp }) => {
  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto hide-scrollbar">
      <div className="bg-[#004AAD] pt-12 pb-20 px-6 relative shadow-lg">
         <div className="flex justify-between items-center mb-6">
            <h1 className="text-white text-2xl font-bold">Logistics Hub</h1>
            <button onClick={onLogout} className="text-white/80 text-xs bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">Logout</button>
         </div>
         <div className="bg-white/10 p-4 rounded-2xl flex items-center space-x-4 border border-white/10">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">🚛</div>
            <div>
               <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Active Vehicle</p>
               <h3 className="text-white font-bold">GJ 06 AX 4412</h3>
               <p className="text-blue-200 text-xs mt-0.5">Tata Tanker • Licensed (Hazmat)</p>
            </div>
         </div>
      </div>

      <div className="px-6 -mt-10 space-y-6 pb-24">
         <div className="grid grid-cols-2 gap-4">
            <button onClick={onNewOrders} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center text-center transition-transform active:scale-95">
               <span className="text-3xl mb-3">🔔</span>
               <h3 className="font-bold text-gray-900">New Load Requests</h3>
               <p className="text-[10px] text-gray-500 mt-1">Available Nearby</p>
            </button>
            <button onClick={onLiveTrip} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center text-center transition-transform active:scale-95">
               <span className="text-3xl mb-3">🛰️</span>
               <h3 className="font-bold text-gray-900">Live Trip</h3>
               <p className="text-[10px] text-gray-500 mt-1">Status: In Transit</p>
            </button>
         </div>

         <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">Operations Menu</h2>
            <div className="space-y-3">
               <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="flex items-center text-sm font-bold text-gray-700"><span className="mr-3">✅</span> Completed Deliveries</span>
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">142</span>
               </button>
               <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="flex items-center text-sm font-bold text-gray-700"><span className="mr-3">💰</span> Earnings Wallet</span>
                  <span className="text-[#004AAD] text-sm font-bold">₹28,450</span>
               </button>
               <button onClick={onHelp} className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="flex items-center text-sm font-bold text-gray-700"><span className="mr-3">🎧</span> Support Desk</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TransporterDashboard;