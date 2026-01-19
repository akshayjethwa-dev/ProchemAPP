
import React, { useState } from 'react';
import { getChemicalAssistance } from '../services/geminiService';

interface Props {
  onBack: () => void;
}

const HelpScreen: React.FC<Props> = ({ onBack }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const result = await getChemicalAssistance(query);
    setResponse(result);
    setLoading(false);
  };

  return (
    <div className="flex-1 bg-white flex flex-col pt-12">
      <div className="px-6 flex items-center space-x-4 mb-8">
        <button onClick={onBack}><svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></button>
        <h1 className="text-xl font-bold">Prochem AI Help</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 hide-scrollbar">
        {!response && (
          <div className="bg-[#004AAD]/5 p-6 rounded-3xl border border-[#004AAD]/10 text-center">
             <div className="w-16 h-16 bg-[#004AAD] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-3xl">🤖</span>
             </div>
             <h2 className="text-[#004AAD] font-bold text-lg mb-2">Hello! I'm your Expert Assistant</h2>
             <p className="text-gray-500 text-sm leading-relaxed">Ask me about chemical properties, safety guidelines, or logistics requirements.</p>
             <div className="mt-8 flex flex-wrap justify-center gap-2">
                {['Sulfuric acid handling', 'GST on Solvents', 'Safety Data Sheet', 'Logistics zones'].map(t => (
                  <button 
                    key={t}
                    onClick={() => { setQuery(t); }}
                    className="bg-white px-4 py-2 rounded-full text-xs font-bold text-gray-700 border border-gray-100 shadow-sm"
                  >{t}</button>
                ))}
             </div>
          </div>
        )}

        {response && (
          <div className="space-y-6">
             <div className="flex justify-end">
                <div className="bg-[#004AAD] text-white p-4 rounded-3xl rounded-tr-none text-sm max-w-[85%] shadow-md">
                   {query}
                </div>
             </div>
             <div className="flex justify-start">
                <div className="bg-gray-50 text-gray-800 p-5 rounded-3xl rounded-tl-none text-sm max-w-[85%] border border-gray-100 leading-relaxed shadow-sm">
                   <p className="text-[10px] font-bold text-[#004AAD] mb-3 uppercase tracking-widest">AI Expert View</p>
                   <div className="prose prose-sm whitespace-pre-wrap">{response}</div>
                </div>
             </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12 space-x-2">
             <div className="w-2 h-2 bg-[#004AAD] rounded-full animate-bounce"></div>
             <div className="w-2 h-2 bg-[#004AAD] rounded-full animate-bounce [animation-delay:0.2s]"></div>
             <div className="w-2 h-2 bg-[#004AAD] rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-gray-100">
         <div className="relative">
            <input 
              type="text" 
              placeholder="Type your question here..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
              className="w-full bg-gray-50 p-4 pr-20 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004AAD] transition-all"
            />
            <button 
              onClick={handleAsk}
              disabled={loading || !query.trim()}
              className="absolute right-2 top-2 bottom-2 bg-[#004AAD] text-white px-5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
            >Send</button>
         </div>
      </div>
    </div>
  );
};

export default HelpScreen;