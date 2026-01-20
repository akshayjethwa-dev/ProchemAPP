import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

interface Props {
  mobile: string;
  onVerified: (phone: string) => void;
  onBack: () => void;
  onVerify?: () => void;
}

const OTPVerificationScreen: React.FC<Props> = ({ mobile, onVerified, onBack }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;

    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleVerifyOTP = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (otp.length !== 6) {
      setError('Please enter 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      // NOTE:
      // Proper Firebase phone auth uses confirmationResult.confirm(otp).
      // For now, use a test OTP for development.
      if (otp === '123456') {
        setSuccess('OTP verified successfully');
        console.log('✅ OTP verified successfully');

        // Move to registration screen after 1.5 seconds
        setTimeout(() => onVerified(mobile), 1500);
      } else {
        setError('Invalid OTP. Please try again.');
        console.log('❌ OTP verification failed: Invalid code');
      }
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
      console.error('❌ OTP verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setSuccess('');
    setResendLoading(true);

    try {
      // Placeholder for resend logic (signInWithPhoneNumber in real flow)
      setSuccess('New OTP sent! Check your messages');
      setOtp('');
      setResendTimer(30); // 30 seconds cooldown
      console.log('✅ OTP resent successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
      console.error('❌ Resend OTP error:', err);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto hide-scrollbar pt-20 px-6 pb-12">
      {/* Back Button */}
      <button
        onClick={onBack}
        disabled={loading}
        className="mb-10 w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        <svg
          className="w-6 h-6 text-gray-800"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Header */}
      <div className="mb-16">
        <h1 className="text-4xl font-black text-gray-900 mb-2">Enter OTP</h1>
        <p className="text-gray-600 font-semibold text-base">
          Sent to {mobile}
        </p>
      </div>

      {/* Form Section */}
      <div className="space-y-8 flex-1">
        {/* OTP Input */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            6-Digit OTP Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="000000"
            maxLength={6}
            disabled={loading}
            className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-2xl text-5xl font-black text-center text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50 tracking-[0.3em]"
          />
          <p className="text-xs text-gray-500 mt-3 font-medium text-center">
            Enter the 6-digit code we sent to your phone
          </p>
          <p className="text-xs text-gray-400 mt-2 font-medium text-center">
            (For testing, use: 123456)
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
          <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg animate-pulse">
            <p className="text-xs text-green-700 font-bold">✅ {success}</p>
          </div>
        )}

        {/* Verify OTP Button */}
        <button
          onClick={handleVerifyOTP}
          disabled={loading || otp.length !== 6}
          className="w-full py-4 bg-[#004AAD] hover:bg-[#003399] text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verifying...</span>
            </div>
          ) : (
            'Verify OTP'
          )}
        </button>

        {/* Resend OTP Button */}
        <button
          onClick={handleResendOTP}
          disabled={resendTimer > 0 || resendLoading}
          className="w-full py-3 bg-gray-50 text-[#004AAD] rounded-2xl font-bold text-xs border-2 border-gray-100 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest hover:bg-gray-100"
        >
          {resendLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 border-2 border-[#004AAD] border-t-transparent rounded-full animate-spin" />
              <span>Sending...</span>
            </div>
          ) : resendTimer > 0 ? (
            `Resend OTP in ${resendTimer}s`
          ) : (
            "Didn't receive OTP? Resend"
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="text-center mt-12">
        <p className="text-xs text-gray-500">
          Having trouble? Contact{' '}
          <a
            href="mailto:support@prochem.in"
            className="text-[#004AAD] font-bold cursor-pointer hover:underline"
          >
            support@prochem.in
          </a>
        </p>
      </div>
    </div>
  );
};

export default OTPVerificationScreen;
