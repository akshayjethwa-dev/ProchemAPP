import React, { useState } from 'react';
import { authService } from '../services/authService';

interface Props {
  onOTPSent: (phone: string) => void;
}

const LoginScreen: React.FC<Props> = ({ onOTPSent }) => {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOTP = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!mobile || mobile.length < 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);

    // ✅ STEP 1: Call authService.sendOTP()
    const result = await authService.sendOTP(mobile);

    setLoading(false);

    if (result.success) {
      setSuccess(result.message);
      console.log('✅ OTP sent successfully');
      
      // Move to OTP verification screen after 1.5 seconds
      setTimeout(() => onOTPSent(mobile), 1500);
    } else {
      setError(result.message);
      console.log('❌ OTP send failed:', result.message);
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto hide-scrollbar pt-20 px-6 pb-12">
      {/* Header */}
      <div className="mb-16">
        <h1 className="text-4xl font-black text-gray-900 mb-3">Prochem</h1>
        <p className="text-gray-600 font-semibold text-base">
          Chemical Marketplace for Professionals
        </p>
      </div>

      {/* Form Section */}
      <div className="space-y-8 flex-1">
        {/* Mobile Input */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Mobile Number
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={mobile}
            onChange={(e) =>
              setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))
            }
            placeholder="Enter 10-digit number"
            maxLength={10}
            disabled={loading}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xl font-bold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-2 font-medium">
            We'll send an OTP to verify your number
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <p className="text-xs text-red-700 font-bold">⚠️ {error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <p className="text-xs text-green-700 font-bold">✅ {success}</p>
          </div>
        )}

        {/* Send OTP Button */}
        <button
          onClick={handleSendOTP}
          disabled={loading || mobile.length < 10}
          className="w-full py-4 bg-[#004AAD] text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Sending OTP...</span>
            </div>
          ) : (
            'Send OTP'
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="text-center space-y-4 mt-12">
        <p className="text-xs text-gray-500 leading-relaxed">
          By continuing, you agree to our{' '}
          <span className="text-[#004AAD] font-bold cursor-pointer hover:underline">
            Terms of Service
          </span>{' '}
          and{' '}
          <span className="text-[#004AAD] font-bold cursor-pointer hover:underline">
            Privacy Policy
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;