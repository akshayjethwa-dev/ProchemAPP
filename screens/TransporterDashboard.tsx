
import React from 'react';
import { UserProfile } from '../types';

interface Props {
  profile: UserProfile;
  onLogout: () => void;
  onNewOrders: () => void;
  onLiveTrip: () => void;
  onHelp: () => void;
}

const TransporterDashboard: React.FC<Props> = ({ profile, onLogout, onNewOrders, onLiveTrip, onHelp }) => {
  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto hide-scrollbar">
      <div className="bg-[#004AAD] pt-12 pb-20 px-6 relative shadow-lg">
         <div className="flex justify-between items-center mb-6">
            <h1 className="text-white text-2xl font-black italic tracking-tighter">TRANS-PORTAL</h1>
            <button onClick={onLogout} className="text-white/80 text-xs bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 active:scale-95">Logout</button>
         </div>
         <div className="bg-white/10 p-5 rounded-3xl flex items-center space-x-4 border border-white/10 backdrop-blur-md">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner">🚛</div>
            <div className="flex-1">
               <p className="text-blue-100 text-[9px] font-bold uppercase tracking-widest">Active Fleet Unit</p>
               <h3 className="text-white font-black text-lg">{profile.vehicleNumber || 'GJ 06 AX 4412'}</h3>
               <div className="flex items-center space-x-2 mt-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <p className="text-blue-200 text-[10px] font-bold">GPS: ONLINE • HAZMAT OK</p>
               </div>
            </div>
         </div>
      </div>

      <div className="px-6 -mt-10 space-y-6 pb-24">
         <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-white flex items-center justify-between">
            <div className="flex-1 border-r border-gray-50 mr-4">
               <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Today's Earnings</p>
               <p className="text-2xl font-black text-gray-900 mt-1">₹4,820</p>
               <p className="text-[9px] text-green-600 font-bold uppercase mt-1">↑ 12% vs Yesterday</p>
            </div>
            <div className="text-center">
               <div className="w-14 h-14 rounded-full border-4 border-green-500 border-t-gray-100 flex items-center justify-center rotate-45">
                  <span className="text-xs font-black text-gray-900 -rotate-45">98%</span>
               </div>
               <p className="text-[8px] text-gray-400 font-bold uppercase mt-2">Driver Score</p>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <button onClick={onNewOrders} className="bg-white p-8 rounded-[2rem] shadow-md border border-gray-50 flex flex-col items-center text-center group active:scale-95 transition-all">
               <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-3xl group-hover:scale-110 transition-transform">🔔</div>
               <h3 className="font-bold text-gray-900 text-sm">Find Loads</h3>
               <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-widest">8 Nearby</p>
            </button>
            <button onClick={onLiveTrip} className="bg-white p-8 rounded-[2rem] shadow-md border border-gray-50 flex flex-col items-center text-center group active:scale-95 transition-all">
               <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4 text-3xl group-hover:scale-110 transition-transform">🛰️</div>
               <h3 className="font-bold text-gray-900 text-sm">Live Trip</h3>
               <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-widest">Track GPS</p>
            </button>
         </div>

         <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50">
            <h2 className="font-black text-gray-800 text-xs uppercase tracking-widest mb-6">Transporter Wallet</h2>
            <div className="space-y-3">
               <div className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center">
                     <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm mr-4">💰</span>
                     <span className="text-[10px] font-bold text-gray-700 uppercase">Available Payout</span>
                  </div>
                  <span className="text-sm font-black text-[#004AAD]">₹28,450</span>
               </div>
               <div className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center">
                     <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-sm mr-4">⛽</span>
                     <span className="text-[10px] font-bold text-gray-700 uppercase">Fuel Advances</span>
                  </div>
                  <span className="text-sm font-black text-orange-600">Pending</span>
               </div>
               <button onClick={onHelp} className="w-full flex items-center justify-between p-4 bg-gray-900 rounded-2xl text-white mt-4 active:scale-95 transition-all">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Logistics Support</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TransporterDashboard;
