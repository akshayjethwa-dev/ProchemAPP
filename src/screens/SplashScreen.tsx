import React from 'react';

interface Props {
  onContinue: () => void;  // ✅ NEW: Navigation callback to proceed to login
}

const SplashScreen: React.FC<Props> = ({ onContinue }) => {
  return (
    <div className="flex-1 bg-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Gradient Effect */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-300 rounded-full blur-3xl" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8">
        {/* Logo/Icon Container */}
        <div className="relative">
          {/* Outer Ring Animation */}
          <div className="absolute inset-0 w-32 h-32 bg-gradient-to-r from-blue-400/20 to-blue-200/20 rounded-full animate-pulse" />
          
          {/* Main Logo Box */}
          <div className="relative w-32 h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl shadow-2xl flex items-center justify-center border-2 border-blue-200">
            {/* Checkmark Icon */}
            <svg
              className="w-16 h-16 text-gray-900"
              fill="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={0.5}
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            PROCHEM
          </h1>
          <p className="text-lg font-bold text-blue-600">
            Chemicals Redefined
          </p>
        </div>

        {/* Taglines */}
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-600 font-medium leading-relaxed max-w-xs">
            Empowering Industry Since 1995
          </p>
          <p className="text-xs text-gray-400 font-semibold tracking-wider uppercase">
            B2B Chemical Marketplace Platform
          </p>
        </div>

        {/* Get Started Button - ✅ FIXED: Added onClick callback */}
        <button
          onClick={onContinue}
          className="mt-12 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 flex items-center space-x-2 transform"
        >
          <span className="text-lg">Get Started</span>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>

        {/* Features Badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100">
            <span className="text-sm font-semibold text-blue-900">✓ Secure Transactions</span>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 rounded-full border border-green-100">
            <span className="text-sm font-semibold text-green-900">✓ Real-time Tracking</span>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 bg-purple-50 rounded-full border border-purple-100">
            <span className="text-sm font-semibold text-purple-900">✓ Expert Support</span>
          </div>
        </div>
      </div>

      {/* Footer - Version Info */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center space-y-2">
        <p className="text-xs text-gray-400 font-medium">Made in India 🇮🇳</p>
        <p className="text-[10px] text-gray-300 font-semibold tracking-wider uppercase">
          Prochem v1.0.0
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;