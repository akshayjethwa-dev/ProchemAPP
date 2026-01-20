
import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="flex-1 bg-[#004AAD] flex flex-col items-center justify-center p-8">
      <div className="relative">
        <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl transform rotate-12 transition-transform duration-1000">
           <svg className="w-20 h-20 text-[#004AAD] -rotate-12" fill="currentColor" viewBox="0 0 24 24">
             <path d="M19,3H5C3.89,3 3,3.89 3,5V19C3,20.11 3.89,21 5,21H19C20.11,21 21,20.11 21,19V5C21,3.89 20.11,3 19,3M19,19H5V5H19V19M16.09,10.79L15.38,11.5C14.81,12.07 14.31,12.57 13.91,13.09L13,12.18L13,9.5H11V11.5L10,10.5C9.6,10.1 9,10.1 8.6,10.5C8.2,10.9 8.2,11.5 8.6,11.9L10,13.31L11,14.31L11.5,14.81L12.09,15.4C12.48,15.79 13.11,15.79 13.5,15.4L17.5,11.41C17.9,11.02 17.9,10.39 17.5,10C17.11,9.61 16.48,9.61 16.09,10L16.09,10.79Z" />
           </svg>
        </div>
      </div>
      <div className="mt-8 text-center">
        <h1 className="text-3xl font-bold text-white tracking-wider">PROCHEM</h1>
        <p className="text-blue-100 text-sm mt-1 uppercase tracking-widest font-medium">Chemicals Redefined</p>
      </div>
      <div className="absolute bottom-12 text-blue-200 text-xs font-semibold">
        Empowering India's Chemical Industry
      </div>
    </div>
  );
};

export default SplashScreen;
