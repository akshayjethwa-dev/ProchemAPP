
import React from 'react';

interface Props {
  onBack: () => void;
}

const LegalPagesScreen: React.FC<Props> = ({ onBack }) => {
  const sections = [
    {
      title: 'Technology Intermediary Disclaimer',
      content: 'This platform acts only as a technology intermediary. Prochem Pvt Ltd does not manufacture, store, or transport chemicals. Buyers and sellers are responsible for regulatory compliance.',
      highlight: true
    },
    {
      title: 'Terms of Use',
      content: 'By using this application, you agree to comply with all local industrial and environmental regulations. Sellers must provide valid MSDS for all hazardous substances. All transactions are subject to GST compliance under Indian Law.'
    },
    {
      title: 'Privacy Policy',
      content: 'We collect business registration data (GST, PAN, Trade Licenses) to ensure marketplace integrity. Your data is processed over secure SSL connections and is only shared with verified trade partners for logistics and billing purposes.'
    }
  ];

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto hide-scrollbar">
      <div className="p-6 pt-12 sticky top-0 bg-white z-10 border-b border-gray-100 flex items-center space-x-4">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Legal & Compliance</h1>
      </div>

      <div className="p-6 space-y-8 pb-12">
        <div className="flex flex-col items-center mb-4">
           <div className="w-16 h-16 bg-[#004AAD] rounded-2xl flex items-center justify-center text-white text-3xl mb-4 font-bold">P</div>
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prochem Pvt Ltd • v1.0.4</p>
        </div>

        {sections.map((s, i) => (
          <div key={i} className={`p-6 rounded-3xl border ${s.highlight ? 'bg-blue-50 border-blue-100 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
             <h3 className={`font-bold text-sm mb-3 uppercase tracking-widest ${s.highlight ? 'text-[#004AAD]' : 'text-gray-900'}`}>{s.title}</h3>
             <p className={`text-xs leading-relaxed ${s.highlight ? 'text-blue-900 font-medium' : 'text-gray-500'}`}>{s.content}</p>
          </div>
        ))}

        <div className="text-center px-4">
           <p className="text-[10px] text-gray-400 font-medium italic">Last updated: October 2023. Prochem Pvt Ltd, Registered in Mumbai, India.</p>
        </div>
      </div>
    </div>
  );
};

export default LegalPagesScreen;
