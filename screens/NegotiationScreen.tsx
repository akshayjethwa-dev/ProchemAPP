
import React, { useState } from 'react';
import { Negotiation } from '../types';

interface Props {
  negotiation: Negotiation;
  onBack: () => void;
  onSendMessage: (text: string) => void;
}

const NegotiationScreen: React.FC<Props> = ({ negotiation, onBack, onSendMessage }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full">
      <div className="p-6 pt-12 flex items-center space-x-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-black text-gray-900 leading-tight">{negotiation.productName}</h1>
          <p className="text-[10px] text-[#004AAD] font-bold uppercase tracking-widest">{negotiation.sellerName}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 hide-scrollbar">
        <div className="p-4 bg-blue-100 rounded-2xl border border-blue-200 text-center mb-6">
           <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">B2B Negotiation Channel</p>
           <p className="text-[10px] text-blue-600 mt-1 italic">Negotiate bulk prices directly with the verified supplier desk.</p>
        </div>

        {negotiation.messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === 'BUYER' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-3xl ${
              m.senderId === 'BUYER' 
                ? 'bg-[#004AAD] text-white rounded-tr-none shadow-lg' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'
            }`}>
              <p className="text-sm">{m.text}</p>
              <p className={`text-[8px] mt-2 opacity-60 font-bold uppercase ${m.senderId === 'BUYER' ? 'text-blue-100' : 'text-gray-400'}`}>
                {m.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-white border-t border-gray-100">
        <div className="flex space-x-2 mb-4">
           {['What is the best price?', 'Is COA available?', 'Lead time?'].map(chip => (
             <button key={chip} onClick={() => setText(chip)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[9px] font-bold text-gray-500 hover:bg-gray-100 transition-colors">
               {chip}
             </button>
           ))}
        </div>
        <div className="flex items-center space-x-3">
          <input 
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#004AAD] transition-all"
            placeholder="Type your offer or query..."
          />
          <button 
            onClick={handleSend}
            className="w-12 h-12 bg-[#004AAD] text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <svg className="w-6 h-6 transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NegotiationScreen;
