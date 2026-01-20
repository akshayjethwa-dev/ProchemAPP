
import React, { useState } from 'react';

interface Props {
  mobile: string;
  onBack: () => void;
  onVerify: () => void;
  onVerifyWithCode: (code: string) => Promise<void>;
}

const OTPVerificationScreen: React.FC<Props> = ({ mobile, onBack, onVerifyWithCode }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    await onVerifyWithCode(otp);
    setLoading(false);
  };

  return (
    <div className="flex-1 bg-white p-6 flex flex-col pt-12">
      <button onClick={onBack} className="mb-8 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50">
        <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
      </button>
      
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Verify OTP</h1>
        <p className="text-gray-500 mt-2 font-medium">Code sent to <span className="text-gray-900">+91 {mobile}</span></p>
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">6-Digit SMS Code</label>
          <div className="flex justify-between space-x-2">
            {[...Array(6)].map((_, i) => (
              <input 
                key={i}
                type="text" 
                maxLength={1}
                className="w-12 h-14 border-2 border-gray-100 rounded-xl text-center text-xl font-bold focus:border-[#004AAD] focus:outline-none transition-all"
                value={otp[i] || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val) setOtp(prev => (prev + val).slice(0, 6));
                }}
              />
            ))}
          </div>
          <button className="text-[#004AAD] text-sm font-bold mt-8 flex items-center">
            <span>Resend OTP</span>
            <span className="ml-2 text-gray-300 font-medium">in 00:45</span>
          </button>
        </div>

        <button 
          onClick={handleVerify}
          disabled={otp.length < 6 || loading}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all active:scale-95 ${
            otp.length === 6 && !loading ? 'bg-[#004AAD] hover:bg-blue-800' : 'bg-gray-200 text-gray-400'
          }`}
        >
          {loading ? 'Verifying...' : 'Verify & Log In'}
        </button>
      </div>
    </div>
  );
};

export default OTPVerificationScreen;
