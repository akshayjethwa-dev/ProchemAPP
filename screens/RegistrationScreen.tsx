
import React, { useState } from 'react';
import { UserRole, UserProfile } from '../types';

interface Props {
  role: UserRole;
  mobile: string;
  onBack: () => void;
  onRegister: (profile: UserProfile) => void;
}

const RegistrationScreen: React.FC<Props> = ({ role, mobile, onBack, onRegister }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    gstNumber: '',
    address: '',
    vehicleType: '',
    vehicleNumber: '',
    bankAccount: '',
    ifsc: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegister({
      ...formData,
      role,
      mobile
    });
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto hide-scrollbar">
      <div className="p-6 pt-12 sticky top-0 bg-white z-10 border-b border-gray-50 flex items-center space-x-4">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">{role === UserRole.BUSINESS ? 'Business Account' : 'Transporter'} Registration</h1>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-500 mb-8 font-medium">Please provide accurate business information for GST benefits and trade compliance.</p>

        <form onSubmit={handleSubmit} className="space-y-5 pb-12">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Business / Company Name</label>
            <input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#004AAD] outline-none font-medium" placeholder="Legal entity name" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact Person</label>
            <input required value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#004AAD] outline-none font-medium" placeholder="Authorized representative" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mobile Number</label>
            <input disabled value={mobile} className="w-full p-4 bg-gray-100 border border-gray-100 rounded-xl text-gray-500 font-bold" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email ID</label>
            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#004AAD] outline-none font-medium" placeholder="corporate@domain.com" />
          </div>

          {role === UserRole.BUSINESS && (
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GST Number (Mandatory)</label>
                <input required value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#004AAD] outline-none font-medium" placeholder="27AAAAA0000A1Z5" />
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <label className="text-[10px] font-bold text-blue-800 uppercase tracking-widest block mb-2">Chemical Trade License (Upload)</label>
                <div className="flex items-center space-x-3 text-blue-600">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>
                  <span className="text-xs font-bold underline cursor-pointer">Required for Selling</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank Account</label>
                  <input required value={formData.bankAccount} onChange={e => setFormData({...formData, bankAccount: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#004AAD] outline-none font-medium" placeholder="A/C No." />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">IFSC Code</label>
                  <input required value={formData.ifsc} onChange={e => setFormData({...formData, ifsc: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#004AAD] outline-none font-medium" placeholder="IFSC" />
                </div>
              </div>
            </div>
          )}

          {role === UserRole.TRANSPORTER && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vehicle Type</label>
                  <select value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium">
                    <option>Mini Truck</option>
                    <option>14 Ft Truck</option>
                    <option>Tanker (Hazmat)</option>
                    <option>Open Trailer</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vehicle No.</label>
                  <input required value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#004AAD] outline-none font-medium" placeholder="MH 01 AB 1234" />
                </div>
              </div>
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                <label className="text-[10px] font-bold text-orange-800 uppercase tracking-widest block mb-2">Driving License (Upload)</label>
                <div className="flex items-center space-x-3 text-orange-600">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5Z" /></svg>
                  <span className="text-xs font-bold underline cursor-pointer">Click to Upload</span>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Business Address</label>
            <textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#004AAD] outline-none font-medium h-24" placeholder="Full address including GIDC/Industrial area" />
          </div>

          <button type="submit" className="w-full py-5 bg-[#004AAD] text-white rounded-2xl font-bold shadow-2xl mt-6 active:scale-95 transition-all">Register Business Account</button>
        </form>
      </div>
    </div>
  );
};

export default RegistrationScreen;
