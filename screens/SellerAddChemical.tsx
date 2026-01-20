
import React, { useState } from 'react';
import { Product, UserProfile } from '../types';

interface Props {
  profile: UserProfile;
  onBack: () => void;
  onSave: (product: Partial<Product>) => Promise<void>;
  onSaveFinished: () => void;
}

const SellerAddChemical: React.FC<Props> = ({ profile, onBack, onSave, onSaveFinished }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Industrial Chemicals',
    casNumber: '',
    grade: 'Industrial',
    purity: 99.5,
    pricePerUnit: 0,
    moq: 100,
    inventory: 1000,
    packagingType: 'Drum',
    gstPercent: 18,
    description: '',
    unit: 'kg',
    msdsUrl: ''
  });

  const isApproved = profile.verificationStatus === 'APPROVED';

  const handleSubmit = async () => {
    if (!formData.name || !formData.casNumber || !formData.pricePerUnit) {
      alert('Please fill all required fields including CAS Number.');
      return;
    }
    setLoading(true);
    await onSave({ ...formData, sellerName: profile.companyName, sellerRating: 4.5, image: 'https://picsum.photos/seed/new/400/300' } as any);
    setLoading(false);
    onSaveFinished();
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto hide-scrollbar">
      <div className="p-6 pt-12 sticky top-0 bg-white z-20 border-b border-gray-100 flex items-center space-x-4">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Publish Chemical</h1>
      </div>

      {!isApproved && (
        <div className="mx-6 mt-6 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center space-x-3">
           <span className="text-2xl">⚠️</span>
           <p className="text-xs text-orange-800 font-bold leading-tight">Your account is under verification. Listing creation is restricted until approved.</p>
        </div>
      )}

      <div className="p-6 space-y-6 pb-24">
        <div className={`space-y-4 ${!isApproved ? 'opacity-50 pointer-events-none' : ''}`}>
           <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Chemical Name *</label>
              <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#004AAD] outline-none font-medium" placeholder="e.g. Sodium Nitrate" />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium">
                  <option>Pharma Chemicals</option>
                  <option>Industrial Chemicals</option>
                  <option>Agriculture / Fertilizers</option>
                  <option>Food & Beverage Chemicals</option>
                  <option>Lab & Research Chemicals</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">CAS Number *</label>
                <input value={formData.casNumber} onChange={e => setFormData({...formData, casNumber: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium" placeholder="e.g. 7631-99-4" />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Purity (%)</label>
                <input type="number" value={formData.purity} onChange={e => setFormData({...formData, purity: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Grade</label>
                <select value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value as any})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium">
                  <option>Industrial</option>
                  <option>Lab</option>
                  <option>Pharma</option>
                  <option>Food</option>
                </select>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Price (₹ / Unit)</label>
                <input type="number" value={formData.pricePerUnit} onChange={e => setFormData({...formData, pricePerUnit: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-green-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">GST (%)</label>
                <select value={formData.gstPercent} onChange={e => setFormData({...formData, gstPercent: parseInt(e.target.value)})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium">
                  <option value="18">18%</option>
                  <option value="12">12%</option>
                  <option value="5">5%</option>
                </select>
              </div>
           </div>

           <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <label className="block text-[10px] font-bold text-[#004AAD] uppercase tracking-widest mb-2">Safety Documents (MSDS) *</label>
              <div className="flex items-center space-x-3">
                 <svg className="w-6 h-6 text-[#004AAD]" fill="currentColor" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>
                 <span onClick={() => setFormData({...formData, msdsUrl: 'file_attached'})} className={`text-xs font-bold underline cursor-pointer ${formData.msdsUrl ? 'text-green-600' : 'text-[#004AAD]'}`}>
                   {formData.msdsUrl ? 'MSDS Attached ✅' : 'Upload Safety Data Sheet (PDF)'}
                 </span>
              </div>
           </div>

           <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Chemical Description</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl h-24 outline-none font-medium" placeholder="Handling precautions, industrial use cases..." />
           </div>
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={loading || !isApproved}
          className="w-full py-5 bg-[#004AAD] text-white rounded-2xl font-black shadow-2xl flex items-center justify-center space-x-3 active:scale-95 transition-all disabled:opacity-50"
        >
           {loading ? <span>Publishing...</span> : (
             <>
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
               <span>Publish to Marketplace</span>
             </>
           )}
        </button>
      </div>
    </div>
  );
};

export default SellerAddChemical;
