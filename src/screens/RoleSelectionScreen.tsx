
import React from 'react';
import { UserRole } from '../types';

interface Props {
  onBack: () => void;
  onSelect: (role: UserRole) => void;
}

const RoleSelectionScreen: React.FC<Props> = ({ onBack, onSelect }) => {
  const roles = [
    { 
      type: UserRole.BUSINESS, 
      title: 'Business Account', 
      desc: 'Buy and Sell industrial chemicals in a single unified platform.', 
      icon: '🏢',
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    { 
      type: UserRole.TRANSPORTER, 
      title: 'Transporter Account', 
      desc: 'Logistics company or driver providing professional chemical transport services.', 
      icon: '🚛',
      color: 'bg-green-50 border-green-200 text-green-800'
    },
  ];

  return (
    <div className="flex-1 bg-white p-6 flex flex-col pt-12">
      <button onClick={onBack} className="mb-8 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50">
        <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Select Account Type</h1>
      <p className="text-gray-500 mb-10">Choose how you want to interact with Prochem.</p>

      <div className="space-y-4">
        {roles.map((r) => (
          <button 
            key={r.type}
            onClick={() => onSelect(r.type)}
            className={`w-full p-6 border-2 rounded-3xl text-left flex items-start space-x-5 transition-all active:scale-98 ${r.color}`}
          >
            <span className="text-4xl mt-1">{r.icon}</span>
            <div>
              <h3 className="font-bold text-lg mb-1">{r.title}</h3>
              <p className="text-xs opacity-80 leading-relaxed font-medium">{r.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoleSelectionScreen;