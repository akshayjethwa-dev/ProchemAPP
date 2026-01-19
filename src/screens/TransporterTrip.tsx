import React, { useState } from 'react';
import { TransportOrder } from '../types';

interface Props {
  activeTrip: TransportOrder | null;
  onComplete: () => void;
  onBack?: () => void;
}

const TransporterTrip: React.FC<Props> = ({ activeTrip, onComplete, onBack }) => {
  // Fix: Added 'PENDING' to the step state type to match the potential status of activeTrip and avoid type mismatch during initialization
  const [step, setStep] = useState<'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED'>(activeTrip?.status || 'ACCEPTED');

  if (!activeTrip) return (
    <div className="flex-1 bg-white flex flex-col items-center justify-center p-8 text-center">
       <span className="text-6xl mb-6 opacity-30">🚚</span>
       <h2 className="text-xl font-bold text-gray-400">No Active Trip Found</h2>
       <button onClick={onComplete} className="mt-6 text-[#004AAD] font-bold">Back to Console</button>
    </div>
  );

  return (
    <div className="flex-1 bg-gray-900 flex flex-col h-full overflow-hidden">
      {/* Map Simulation Area */}
      <div className="flex-1 bg-slate-800 relative flex items-center justify-center overflow-hidden">
         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/gray-geology.png')]"></div>
         
         {/* Top Overlay - Back Button */}
         {onBack && (
           <button 
             onClick={onBack}
             className="absolute top-10 left-6 z-[60] w-12 h-12 bg-white/30 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/40 text-white active:scale-95 transition-all shadow-2xl"
           >
             <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
           </button>
         )}

         {/* Animated Vehicle/Position Marker */}
         <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-[#004AAD]/40 rounded-full animate-ping absolute"></div>
            <div className="w-16 h-16 bg-[#004AAD] rounded-full flex items-center justify-center shadow-2xl border-4 border-white relative">
               <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19,8V5H5V8H3V17H5A3,3 0 0,0 8,20A3,3 0 0,0 11,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V11L19,8M8,18.5A1.5,1.5 0 0,1 6.5,17A1.5,1.5 0 0,1 8,15.5A1.5,1.5 0 0,1 9.5,17A1.5,1.5 0 0,1 8,18.5M18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5M18,11H6V7H18V11Z"/></svg>
            </div>
            <div className="mt-8 px-6 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
               GPS Connected: Live Trip
            </div>
         </div>

         {/* Bottom HUD */}
         <div className="absolute bottom-10 left-6 right-6 flex items-center justify-between z-10">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
               <p className="text-[8px] text-gray-300 font-bold uppercase">Distance</p>
               <p className="text-sm text-white font-black">14.2 KM</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-right">
               <p className="text-[8px] text-gray-300 font-bold uppercase">ETA</p>
               <p className="text-sm text-white font-black">28 MIN</p>
            </div>
         </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-t-[3rem] p-8 pb-12 shadow-[0_-20px_60px_rgba(0,0,0,0.6)] z-20">
         <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-8"></div>
         
         <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
               <h2 className="text-2xl font-black text-gray-900 leading-tight">{activeTrip.material}</h2>
               <div className="flex items-center space-x-2 mt-2">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                 <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Destination: {activeTrip.dropLocation}</p>
               </div>
            </div>
            <div className="text-right ml-4">
               <p className="text-2xl font-black text-[#004AAD]">₹{activeTrip.payout.toLocaleString()}</p>
               <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Job Payout</p>
            </div>
         </div>

         <div className="space-y-4">
            {/* Fix: Allow 'PENDING' status to correctly trigger the start of the trip workflow */}
            {(step === 'ACCEPTED' || step === 'PENDING') && (
               <button onClick={() => setStep('PICKED_UP')} className="w-full py-5 bg-[#004AAD] text-white rounded-[2rem] font-bold shadow-2xl flex items-center justify-center space-x-3 active:scale-95 transition-all">
                  <span className="text-2xl">🏗️</span>
                  <span className="uppercase tracking-widest text-xs">Pickup Completed</span>
               </button>
            )}
            
            {(step === 'PICKED_UP') && (
               <button onClick={() => setStep('IN_TRANSIT')} className="w-full py-5 bg-[#004AAD] text-white rounded-[2rem] font-bold shadow-2xl flex items-center justify-center space-x-3 active:scale-95 transition-all">
                  <span className="text-2xl">🛣️</span>
                  <span className="uppercase tracking-widest text-xs">Set Out For Delivery</span>
               </button>
            )}

            {(step === 'IN_TRANSIT') && (
               <button onClick={() => setStep('DELIVERED')} className="w-full py-5 bg-[#22C55E] text-white rounded-[2rem] font-bold shadow-2xl flex items-center justify-center space-x-3 active:scale-95 transition-all">
                  <span className="text-2xl">🏁</span>
                  <span className="uppercase tracking-widest text-xs">Confirm Delivery</span>
               </button>
            )}

            {step === 'DELIVERED' && (
               <div className="space-y-4 animate-slide-up">
                  <div className="p-5 bg-green-50 border border-green-100 rounded-3xl flex items-center space-x-5">
                     <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center text-2xl shadow-inner">📸</div>
                     <div className="flex-1">
                        <p className="text-[10px] font-bold text-green-800 uppercase tracking-widest mb-1">Proof of Delivery</p>
                        <p className="text-xs text-green-700 font-medium italic">E-Signature & Geo-Photo Captured</p>
                     </div>
                  </div>
                  <button onClick={onComplete} className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-bold shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-xs">Close Trip & Get Payout</button>
               </div>
            )}
         </div>

         <div className="mt-10 pt-6 border-t border-gray-50 flex items-center justify-between">
            <div className="flex items-center space-x-4">
               <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 font-bold">👤</div>
               <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Buyer Desk</p>
                  <p className="text-sm font-bold text-gray-800 line-clamp-1">{activeTrip.buyerName}</p>
               </div>
            </div>
            <div className="flex space-x-2">
               <button className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-[#004AAD] shadow-sm border border-gray-100 active:scale-90 transition-transform">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" /></svg>
               </button>
               <button className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-[#004AAD] shadow-sm border border-gray-100 active:scale-90 transition-transform">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20,2H4C2.89,2 2,2.89 2,4V16C2,17.11 2.89,18 4,18H18L22,22V4C22,2.89 21.11,2 20,2M20,16H4V4H20V16Z" /></svg>
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TransporterTrip;