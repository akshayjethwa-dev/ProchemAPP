import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { authService } from '../services/authService';

interface Props {
  mobile: string;
  role: UserRole;
  onRegister: (user: UserProfile) => void;
  onBack: () => void;
}

const RegistrationScreen: React.FC<Props> = ({
  mobile,
  role,
  onRegister,
  onBack,
}) => {
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    gstNumber: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email address is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Enter a valid email address');
      return false;
    }

    if (role === UserRole.SELLER || role === UserRole.BUSINESS) {
      if (!formData.gstNumber.trim()) {
        setError('GST number is required');
        return false;
      }
      if (formData.gstNumber.length !== 15) {
        setError('GST number must be 15 characters');
        return false;
      }
    }

    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    // Create profile object
    const profile: UserProfile = {
      uid: `user_${Date.now()}`,
      phone: mobile,
      email: formData.email,
      role,
      companyName: formData.companyName,
      gstNumber: formData.gstNumber || undefined,
      address: formData.address,
      verified: false,
      createdAt: new Date(),
      verificationStatus: 'PENDING',
    };

    // ✅ STEP 3: Call authService.createUserProfile()
    const result = await authService.createUserProfile(profile);

    setLoading(false);

    if (result.success && result.user) {
      setSuccess('Registration successful! Redirecting...');
      console.log('✅ User profile created:', result.user);

      // Move to dashboard after 1.5 seconds
      setTimeout(() => onRegister(result.user as UserProfile), 1500);
    } else {
      setError(result.message || 'Registration failed. Please try again.');
      console.log('❌ Registration failed:', result.message);
    }
  };

  // Role display text
  const getRoleText = (): string => {
    switch (role) {
      case UserRole.BUYER:
        return 'Set up your buyer account';
      case UserRole.SELLER:
        return 'Set up your seller account';
      case UserRole.BUSINESS:
        return 'Set up your business account';
      case UserRole.TRANSPORTER:
        return 'Set up your transporter account';
      default:
        return 'Complete your profile';
    }
  };

  // Check if GST is required
  const isGSTRequired = role === UserRole.SELLER || role === UserRole.BUSINESS;

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
        <h1 className="text-4xl font-black text-gray-900 mb-2">Complete Profile</h1>
        <p className="text-gray-600 font-semibold text-base">
          {getRoleText()}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 flex-1">
        {/* Company Name */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Company Name *
          </label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            placeholder="Your company name"
            disabled={loading}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your@email.com"
            disabled={loading}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
          />
        </div>

        {/* GST Number (for sellers/business) */}
        {isGSTRequired && (
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              GST Number *
            </label>
            <input
              type="text"
              value={formData.gstNumber.toUpperCase()}
              onChange={(e) =>
                handleInputChange('gstNumber', e.target.value.toUpperCase())
              }
              placeholder="27AABCU9603R1Z0"
              disabled={loading}
              maxLength={15}
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50 uppercase"
            />
            <p className="text-xs text-gray-500 mt-2">
              15-character GST number (e.g., 27AABCU9603R1Z0)
            </p>
          </div>
        )}

        {/* Address */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Business Address *
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Street address, city, state, PIN"
            disabled={loading}
            rows={3}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50 resize-none"
          />
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
          className="w-full py-4 bg-[#004AAD] text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating Profile...</span>
            </div>
          ) : (
            'Complete Registration'
          )}
        </button>

        {/* Terms Agreement */}
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          By registering, you agree to our{' '}
          <span className="text-[#004AAD] font-bold cursor-pointer hover:underline">
            Terms
          </span>{' '}
          and{' '}
          <span className="text-[#004AAD] font-bold cursor-pointer hover:underline">
            Privacy Policy
          </span>
        </p>
      </form>
    </div>
  );
};

export default RegistrationScreen;