
import React from 'react';
import { UserProfile } from '../types';

interface Props {
  profile: UserProfile;
  onBrowse: () => void;
  onOrders: () => void;
  onTrack: () => void;
  onHelp: () => void;
  onNotifications: () => void;
  onLogout: () => void;
}

const BuyerDashboard: React.FC<Props> = ({ profile, onBrowse, onOrders, onTrack, onHelp, onNotifications, onLogout }) => {
  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto hide-scrollbar">
      <div className="bg-[#004AAD] pt-12 pb-20 px-6 relative shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
             <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-[#004AAD]">P</div>
             <h1 className="text-white text-xl font-bold">Prochem Buyer</h1>
          </div>
          <div className="flex items-center space-x-3">
             <button onClick={onNotifications} className="relative text-white/90 p-1 bg-white/10 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-[#004AAD]"></span>
             </button>
             <button onClick={onLogout} className="text-white/80 text-xs bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">Logout</button>
          </div>
        </div>
        <div className="flex items-center space-x-4">
           <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl shadow-inner backdrop-blur-sm">🏢</div>
           <div>
              <h2 className="text-white font-bold text-lg">{profile.companyName}</h2>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">GST: {profile.gstNumber || 'Applied'}</p>
           </div>
        </div>
      </div>

      <div className="px-6 -mt-10 space-y-6 pb-24">
         <div className="grid grid-cols-2 gap-4">
            <button onClick={onBrowse} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center text-center transition-all active:scale-95 group">
               <span className="text-3xl mb-3 group-active:animate-pulse">🧪</span>
               <h3 className="font-bold text-gray-900">Browse Chemicals</h3>
               <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest">Marketplace</p>
            </button>
            <button onClick={onTrack} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center text-center transition-all active:scale-95 group">
               <span className="text-3xl mb-3 group-active:animate-pulse">📦</span>
               <h3 className="font-bold text-gray-900">Active Orders</h3>
               <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest">Tracking</p>
            </button>
         </div>

         <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-5 flex items-center justify-between">
               Management Tools
               <span className="text-[9px] font-bold text-[#004AAD] bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">Buyer Portal</span>
            </h3>
            <div className="space-y-2">
               <button onClick={onOrders} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center space-x-4">
                     <span className="text-xl">📜</span>
                     <span className="text-sm font-bold text-gray-700">Order History</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
               </button>
               <button className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center space-x-4">
                     <span className="text-xl">📑</span>
                     <span className="text-sm font-bold text-gray-700">GST Invoices</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
               </button>
               <button onClick={onHelp} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center space-x-4">
                     <span className="text-xl">🎧</span>
                     <span className="text-sm font-bold text-gray-700">Help & Support</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
               </button>
            </div>
         </div>

         <div className="bg-green-600 rounded-3xl p-6 text-white shadow-xl shadow-green-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
               <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12.72 2.03C12.73 2.03 12.74 2.03 12.75 2.03C13.25 2.03 13.68 2.34 13.85 2.81L14.7 5.16H18.75C19.85 5.16 20.75 6.06 20.75 7.16V18.75C20.75 19.85 19.85 20.75 18.75 20.75H5.25C4.15 20.75 3.25 19.85 3.25 18.75V7.16C3.25 6.06 4.15 5.16 5.25 5.16H9.3L10.15 2.81C10.32 2.34 10.75 2.03 11.25 2.03H12.72M12.75 3.53H11.25L10.25 6.29H13.75L12.75 3.53M18.75 6.66H5.25C4.97 6.66 4.75 6.88 4.75 7.16V18.75C4.75 19.03 4.97 19.25 5.25 19.25H18.75C19.03 19.25 19.25 19.03 19.25 18.75V7.16C19.25 6.88 19.03 6.66 18.75 6.66M12 18C9.79 18 8 16.21 8 14C8 11.79 9.79 10 12 10C14.21 10 16 11.79 16 14C16 16.21 14.21 18 12 18M12 11.5C10.62 11.5 9.5 12.62 9.5 14C9.5 15.38 10.62 16.5 12 16.5C13.38 16.5 14.5 15.38 14.5 14C14.5 12.62 13.38 11.5 12 11.5Z" /></svg>
            </div>
            <h3 className="font-bold text-base mb-1">Bulk Buy Rewards</h3>
            <p className="text-green-100 text-xs mb-4 leading-relaxed opacity-90">Order more than 10 MT to get 5% additional discount on Industrial Acids this festive season.</p>
            <button className="bg-white text-green-700 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all">Claim Now</button>
         </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;
