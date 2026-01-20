import React, { useState } from 'react';
import productService from '../services/productService';
import { useAppStore } from '../store/appStore';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

const SellerAddChemical: React.FC<Props> = ({ onBack, onSuccess }) => {
  const user = useAppStore((state: any) => state.user);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    casNumber: '',
    grade: 'Industrial',
    purity: 95,
    unit: 'litre' as 'kg' | 'litre' | 'tonne',
    pricePerUnit: '',
    moq: '10',
    packagingType: 'Drum',
    gstPercent: 18,
    certifications: ['ISO 9001'],
    inStock: true,
    description: '',
    quantity: 100,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  // ✅ VALIDATE AND SUBMIT
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!formData.category) {
      setError('Category is required');
      return;
    }
    if (!formData.casNumber.trim()) {
      setError('CAS Number is required');
      return;
    }
    if (!formData.pricePerUnit || parseFloat(formData.pricePerUnit) < 1000) {
      setError('Price must be at least ₹1,000');
      return;
    }
    if (!formData.moq || parseFloat(formData.moq) < 10) {
      setError('MOQ (Minimum Order Quantity) must be at least 10');
      return;
    }
    if (formData.purity < 0 || formData.purity > 100) {
      setError('Purity must be between 0 and 100');
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);

    try {
      // Create product object matching productService.Product interface
      const newProduct = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.pricePerUnit),
        description: formData.description || `${formData.name} - Grade: ${formData.grade}, Purity: ${formData.purity}%`,
        quantity: parseInt(formData.moq),
        sellerId: user.uid,
        verified: false,
      };

      // ✅ CALL PRODUCT SERVICE - addProduct from the service
      const productId = await productService.addProduct(newProduct);

      if (productId) {
        setSuccess('Product added successfully! 🎉');
        console.log('✅ Product created with ID:', productId);

        // Reset form
        setFormData({
          name: '',
          category: '',
          casNumber: '',
          grade: 'Industrial',
          purity: 95,
          unit: 'litre',
          pricePerUnit: '',
          moq: '10',
          packagingType: 'Drum',
          gstPercent: 18,
          certifications: ['ISO 9001'],
          inStock: true,
          description: '',
          quantity: 100,
        });

        // Navigate after 1.5 seconds
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while adding the product');
      console.error('❌ Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto hide-scrollbar pt-20 px-6 pb-12">
      {/* Back Button */}
      <button
        onClick={onBack}
        disabled={loading}
        className="mb-10 w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        <svg
          className="w-6 h-6 text-gray-800"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-2">Add Chemical</h1>
        <p className="text-gray-600 font-semibold text-base">
          Add a new product to the marketplace
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleAddProduct} className="space-y-6 flex-1">
        {/* Product Name */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Product Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., Sulfuric Acid 98%"
            disabled={loading}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            disabled={loading}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
          >
            <option value="">Select Category</option>
            <option value="Industrial Acids">Industrial Acids</option>
            <option value="Alkalis">Alkalis</option>
            <option value="Oxidizers">Oxidizers</option>
            <option value="Salts">Salts</option>
            <option value="Solvents">Solvents</option>
          </select>
        </div>

        {/* CAS Number */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            CAS Number *
          </label>
          <input
            type="text"
            value={formData.casNumber}
            onChange={(e) => handleInputChange('casNumber', e.target.value)}
            placeholder="e.g., 7664-93-9"
            disabled={loading}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
          />
        </div>

        {/* Grade */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Grade
          </label>
          <select
            value={formData.grade}
            onChange={(e) => handleInputChange('grade', e.target.value)}
            disabled={loading}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
          >
            <option value="Industrial">Industrial</option>
            <option value="Pharmaceutical">Pharmaceutical</option>
            <option value="Laboratory">Laboratory</option>
            <option value="Food Grade">Food Grade</option>
          </select>
        </div>

        {/* Purity */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Purity (%) *
          </label>
          <input
            type="number"
            value={formData.purity}
            onChange={(e) => handleInputChange('purity', parseFloat(e.target.value))}
            placeholder="e.g., 99.5"
            disabled={loading}
            min="0"
            max="100"
            step="0.1"
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Price per Unit (₹) *
          </label>
          <input
            type="number"
            value={formData.pricePerUnit}
            onChange={(e) => handleInputChange('pricePerUnit', e.target.value)}
            placeholder="Minimum ₹1,000"
            disabled={loading}
            min="1000"
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
          />
        </div>

        {/* Quantity (MOQ) & Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              MOQ (Min Order Qty) *
            </label>
            <input
              type="number"
              value={formData.moq}
              onChange={(e) => handleInputChange('moq', e.target.value)}
              placeholder="Minimum 10"
              disabled={loading}
              min="10"
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Unit *
            </label>
            <select
              value={formData.unit}
              onChange={(e) => handleInputChange('unit', e.target.value)}
              disabled={loading}
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
            >
              <option value="kg">Kilogram (kg)</option>
              <option value="litre">Litre (L)</option>
              <option value="tonne">Metric Tons (MT)</option>
            </select>
          </div>
        </div>

        {/* Packaging Type */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Packaging Type
          </label>
          <select
            value={formData.packagingType}
            onChange={(e) => handleInputChange('packagingType', e.target.value)}
            disabled={loading}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
          >
            <option value="Drum">Drum</option>
            <option value="Bottle">Bottle</option>
            <option value="Carboy">Carboy</option>
            <option value="Bulk Tanker">Bulk Tanker</option>
            <option value="Bag">Bag</option>
          </select>
        </div>

        {/* GST Percent */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            GST Percent (%)
          </label>
          <input
            type="number"
            value={formData.gstPercent}
            onChange={(e) => handleInputChange('gstPercent', parseFloat(e.target.value))}
            placeholder="e.g., 18"
            disabled={loading}
            min="0"
            max="100"
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Add product details, specifications, etc."
            disabled={loading}
            rows={4}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50 resize-none"
          />
        </div>

        {/* Stock Status */}
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.inStock}
              onChange={(e) => handleInputChange('inStock', e.target.checked)}
              disabled={loading}
              className="w-5 h-5 text-[#004AAD] rounded focus:ring-2 focus:ring-[#004AAD]"
            />
            <span className="text-sm font-semibold text-gray-700">In Stock</span>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <p className="text-xs text-red-700 font-bold">⚠️ {error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg animate-pulse">
            <p className="text-xs text-green-700 font-bold">✅ {success}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[#004AAD] hover:bg-[#003399] text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest mt-8"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Adding Product...</span>
            </div>
          ) : (
            'Add Product to Marketplace'
          )}
        </button>

        {/* Info Text */}
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          Products will appear in the marketplace immediately after adding.
          You can manage them from your seller dashboard.
        </p>
      </form>
    </div>
  );
};

export default SellerAddChemical;