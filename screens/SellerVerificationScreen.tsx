
import React, { useState } from 'react';
import { UserProfile, VerificationStatus } from '../types';

interface Props {
  profile: UserProfile;
  onBack: () => void;
  onStatusUpdate: (status: VerificationStatus) => void;
}

const SellerVerificationScreen: React.FC<Props> = ({ profile, onBack, onStatusUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);

  const docs = [
    { name: 'GST Certificate', status: profile.verificationStatus === 'APPROVED' ? 'Uploaded' : 'Required', type: 'PDF/JPG' },
    { name: 'PAN Card', status: profile.verificationStatus === 'APPROVED' ? 'Uploaded' : 'Required', type: 'PDF/JPG' },
    { name: 'Address Proof', status: profile.verificationStatus === 'APPROVED' ? 'Uploaded' : 'Required', type: 'PDF/JPG' },
  ];

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      onStatusUpdate('PENDING');
      alert('Documents submitted successfully. Verification takes 24-48 hours.');
    }, 1500);
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto hide-scrollbar">
      <div className="p-6 pt-12 sticky top-0 bg-white z-10 border-b border-gray-100 flex items-center space-x-4">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Account Verification</h1>
      </div>

      <div className="p-6 space-y-6">
        <div className={`p-6 rounded-3xl border flex flex-col items-center text-center ${
          profile.verificationStatus === 'APPROVED' ? 'bg-green-50 border-green-100' :
          profile.verificationStatus === 'REJECTED' ? 'bg-red-50 border-red-100' :
          'bg-orange-50 border-orange-100'
        }`}>
           <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm ${
             profile.verificationStatus === 'APPROVED' ? 'bg-green-500 text-white' :
             profile.verificationStatus === 'REJECTED' ? 'bg-red-500 text-white' :
             'bg-orange-500 text-white'
           }`}>
             {profile.verificationStatus === 'APPROVED' ? '✅' : profile.verificationStatus === 'REJECTED' ? '❌' : '⏳'}
           </div>
           <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs mb-1">Verification Status</h2>
           <p className={`text-lg font-black ${
             profile.verificationStatus === 'APPROVED' ? 'text-green-700' :
             profile.verificationStatus === 'REJECTED' ? 'text-red-700' :
             'text-orange-700'
           }`}>{profile.verificationStatus}</p>
           {profile.verificationStatus === 'PENDING' && (
             <p className="text-[10px] text-orange-600 mt-2 font-medium">Documents under review by compliance team.</p>
           )}
        </div>

        <div className="space-y-4">
           <h3 className="font-bold text-gray-800 text-sm ml-2">Required Documents</h3>
           {docs.map((doc, i) => (
             <div key={i} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div>
                   <p className="font-bold text-gray-900 text-sm">{doc.name}</p>
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{doc.type}</p>
                </div>
                <button className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                   doc.status === 'Uploaded' ? 'bg-green-100 border-green-200 text-green-700' : 'bg-white border-gray-200 text-[#004AAD]'
                }`}>
                   {doc.status}
                </button>
             </div>
           ))}
        </div>

        {profile.verificationStatus !== 'APPROVED' && (
          <button 
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full py-5 bg-[#004AAD] text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all mt-4"
          >
            {isUploading ? 'Submitting...' : 'UPLOAD & VERIFY'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SellerVerificationScreen;
