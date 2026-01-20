
import React, { useState } from 'react';

interface Props {
  onSendOtp: (mobile: string) => void;
}

const LoginScreen: React.FC<Props> = ({ onSendOtp }) => {
  const [phone, setPhone] = useState('');

  return (
    <div className="flex-1 bg-white p-6 flex flex-col pt-24">
      <div className="mb-12">
         <div className="w-16 h-16 bg-[#004AAD] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <span className="text-white text-3xl font-bold">P</span>
         </div>
         <h1 className="text-3xl font-bold text-gray-900">Get Started</h1>
         <p className="text-gray-500 mt-2 font-medium">India's leading B2B chemical platform</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Mobile Number</label>
          <div className="flex">
            <span className="inline-flex items-center px-4 rounded-l-2xl border-2 border-r-0 border-gray-100 bg-gray-50 text-gray-500 font-bold">
              +91
            </span>
            <input 
              type="tel" 
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="99999 00000"
              className="flex-1 p-4 border-2 border-gray-100 rounded-r-2xl focus:border-[#004AAD] focus:outline-none transition-all font-bold text-lg"
            />
          </div>
        </div>

        <button 
          onClick={() => onSendOtp(phone)}
          disabled={phone.length < 10}
          className={`w-full py-5 rounded-2xl font-bold text-white shadow-xl transition-all ${
            phone.length === 10 ? 'bg-[#004AAD] hover:bg-blue-800' : 'bg-gray-200 text-gray-400'
          }`}
        >
          Send Verification Code
        </button>
      </div>

      <div className="mt-auto py-8 text-center text-xs text-gray-400 leading-relaxed">
        By logging in, you agree to Prochem's <br/>
        <span className="font-bold text-gray-600 underline">Terms of Use</span> and <span className="font-bold text-gray-600 underline">Privacy Policy</span>
      </div>
    </div>
  );
};

export default LoginScreen;
