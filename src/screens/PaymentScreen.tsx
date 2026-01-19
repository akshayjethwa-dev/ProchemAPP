
import React, { useState } from 'react';

interface Props {
  onBack: () => void;
  onConfirm: () => void;
}

const PaymentScreen: React.FC<Props> = ({ onBack, onConfirm }) => {
  const [method, setMethod] = useState('UPI');

  return (
    <div className="flex-1 bg-gray-50 flex flex-col pt-12">
      <div className="px-6 flex items-center space-x-4 mb-8">
        <button onClick={onBack}><svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></button>
        <h1 className="text-xl font-bold">Secure Payment</h1>
      </div>

      <div className="px-6 space-y-4">
        <h2 className="font-bold text-gray-700">Select Payment Method</h2>
        
        <div className="space-y-3">
          <div 
            onClick={() => setMethod('UPI')}
            className={`p-5 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${method === 'UPI' ? 'border-[#004AAD] bg-blue-50' : 'border-gray-100 bg-white'}`}
          >
            <div className="flex items-center space-x-4">
               <span className="text-2xl">📱</span>
               <div>
                  <h3 className="font-bold text-gray-900">UPI Payments</h3>
                  <p className="text-xs text-gray-500">Google Pay, PhonePe, Paytm</p>
               </div>
            </div>
            {method === 'UPI' && <div className="w-5 h-5 bg-[#004AAD] rounded-full flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>}
          </div>

          <div 
            onClick={() => setMethod('CARD')}
            className={`p-5 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${method === 'CARD' ? 'border-[#004AAD] bg-blue-50' : 'border-gray-100 bg-white'}`}
          >
            <div className="flex items-center space-x-4">
               <span className="text-2xl">💳</span>
               <div>
                  <h3 className="font-bold text-gray-900">Credit / Debit Card</h3>
                  <p className="text-xs text-gray-500">Visa, Mastercard, RuPay</p>
               </div>
            </div>
            {method === 'CARD' && <div className="w-5 h-5 bg-[#004AAD] rounded-full flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>}
          </div>

          <div 
            onClick={() => setMethod('NB')}
            className={`p-5 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${method === 'NB' ? 'border-[#004AAD] bg-blue-50' : 'border-gray-100 bg-white'}`}
          >
            <div className="flex items-center space-x-4">
               <span className="text-2xl">🏦</span>
               <div>
                  <h3 className="font-bold text-gray-900">Corporate Net Banking</h3>
                  <p className="text-xs text-gray-500">Direct Bank Transfer</p>
               </div>
            </div>
            {method === 'NB' && <div className="w-5 h-5 bg-[#004AAD] rounded-full flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>}
          </div>
        </div>
      </div>

      <div className="mt-auto p-6 bg-white border-t border-gray-200">
        <div className="bg-gray-50 p-4 rounded-xl mb-6 flex items-start space-x-3">
           <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
           <p className="text-[10px] text-gray-500 leading-tight">Your payment is processed over a secure 256-bit SSL connection. We do not store your bank credentials.</p>
        </div>
        <button 
          onClick={onConfirm}
          className="w-full bg-[#004AAD] text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center space-x-2"
        >
          <span>Confirm & Pay</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;