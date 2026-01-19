
import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="h-full w-full bg-[#004AAD] flex flex-col items-center justify-center p-8 select-none">
      <div className="relative">
        <div className="w-36 h-36 bg-white rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform rotate-12 transition-transform duration-1000">
           <svg className="w-24 h-24 text-[#004AAD] -rotate-12" fill="currentColor" viewBox="0 0 24 24">
             <path d="M19,3H5C3.89,3 3,3.89 3,5V19C3,20.11 3.89,21 5,21H19C20.11,21 21,20.11 21,19V5C21,3.89 20.11,3 19,3M19,19H5V5H19V19M16.09,10.79L15.38,11.5C14.81,12.07 14.31,12.57 13.91,13.09L13,12.18L13,9.5H11V11.5L10,10.5C9.6,10.1 9,10.1 8.6,10.5C8.2,10.9 8.2,11.5 8.6,11.9L10,13.31L11,14.31L11.5,14.81L12.09,15.4C12.48,15.79 13.11,15.79 13.5,15.4L17.5,11.41C17.9,11.02 17.9,10.39 17.5,10C17.11,9.61 16.48,9.61 16.09,10L16.09,10.79Z" />
           </svg>
        </div>
      </div>
      <div className="mt-10 text-center">
        <h1 className="text-4xl font-black text-white tracking-tighter">PROCHEM</h1>
        <p className="text-blue-100 text-[10px] mt-2 uppercase tracking-[0.3em] font-bold opacity-80">Chemicals Redefined</p>
      </div>
      
      <div className="absolute bottom-16 flex flex-col items-center space-y-4">
        <div className="flex space-x-1.5">
           <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
           <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
           <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
        </div>
        <p className="text-blue-200 text-[9px] font-black uppercase tracking-widest">Empowering Industry Since 1995</p>
      </div>
    </div>
  );
};

export default SplashScreen;