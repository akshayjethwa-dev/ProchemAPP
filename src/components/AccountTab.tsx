import React from 'react';

interface Props {
  profile: any;
  onSellerAdd: () => void;
  onSellerManage: () => void;
  onLogout: () => void;
  onHelp: () => void;
  onCompanyProfile: () => void;
  onSellerVerify: () => void;
  onLegal: () => void;
}

const AccountTab: React.FC<Props> = ({ profile, onSellerAdd, onSellerManage, onLogout, onHelp, onCompanyProfile, onSellerVerify, onLegal }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Account</h2>
      <p>{profile?.companyName}</p>
      <button onClick={onLogout} className="mt-4 p-2 bg-red-500 text-white rounded">Logout</button>
    </div>
  );
};

export default AccountTab;
