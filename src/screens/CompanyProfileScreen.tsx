
import React from 'react';
import { UserProfile } from '../types';

interface Props {
  profile: UserProfile;
  onBack: () => void;
}

const CompanyProfileScreen: React.FC<Props> = ({ profile, onBack }) => {
  const details = [
    { label: 'Company Name', value: profile.companyName, icon: '🏢' },
    { label: 'GST Number', value: profile.gstNumber || 'Not Provided', icon: '📜' },
    { label: 'CIN (Corporate ID)', value: profile.cin || 'L24110GJ1995PLC026214', icon: '🆔' },
    { label: 'Registered Address', value: profile.address || 'N/A', icon: '📍' },
    { label: 'Support Email', value: 'support@prochem.in', icon: '✉️' },
    { label: 'Support Phone', value: '+91 22 4567 8900', icon: '📞' },
  ];

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto hide-scrollbar">
      <div className="p-6 pt-12 sticky top-0 bg-white z-10 border-b border-gray-100 flex items-center space-x-4">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Company Profile</h1>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center space-x-4">
           <div className="w-16 h-16 bg-[#004AAD] rounded-2xl flex items-center justify-center text-3xl shadow-lg text-white">🏢</div>
           <div>
              <h2 className="text-lg font-bold text-gray-900">{profile.companyName}</h2>
              <p className="text-[10px] font-bold text-[#004AAD] uppercase tracking-widest mt-1">Verified Partner</p>
           </div>
        </div>

        <div className="space-y-4">
           {details.map((d, i) => (
             <div key={i} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xl mt-0.5">{d.icon}</span>
                <div className="flex-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{d.label}</label>
                   <p className="text-sm font-bold text-gray-800 leading-tight">{d.value}</p>
                </div>
             </div>
           ))}
        </div>

        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
           <p className="text-[10px] font-bold text-orange-800 uppercase tracking-widest mb-1">Notice</p>
           <p className="text-[10px] text-orange-700 leading-relaxed">To update legal company information, please contact our administrative desk with supporting documents.</p>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfileScreen;
