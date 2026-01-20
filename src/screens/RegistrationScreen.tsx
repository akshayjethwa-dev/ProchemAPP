import React, { useState } from 'react';
import authService from '../services/authService';
import { UserProfile, UserRole } from '../types';

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
    password: '',
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

    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    // ✅ FIXED: Use role type directly (it's a string type union)
    if (role === 'seller') {
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

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Call Firebase authService.registerUser()
      const user = await authService.registerUser(
        formData.email,
        formData.password,
        role  // Already 'buyer' or 'seller'
      );

      if (user) {
        setSuccess('Registration successful! Redirecting...');
        console.log('✅ User registered:', user);

        // ✅ FIXED: Create profile with correct field names
        const profile: UserProfile = {
          uid: user.uid,
          phone: mobile,
          email: formData.email,
          userType: role,  // ← Changed from 'role' to 'userType'
          companyName: formData.companyName,
          gstNumber: formData.gstNumber || undefined,
          address: formData.address,
          verified: false,
          verificationStatus: 'PENDING',
          createdAt: new Date(),
        };

        setTimeout(() => onRegister(profile), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      console.log('❌ Registration failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Role display text
  const getRoleText = (): string => {
    switch (role) {
      case 'buyer':
        return 'Set up your buyer account';
      case 'seller':
        return 'Set up your seller account';
      default:
        return 'Complete your profile';
    }
  };

  // Check if GST is required
  const isGSTRequired = role === 'seller';

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto hide-scrollbar pt-12 px-6 pb-12">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-2 mb-8 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="font-medium">Back</span>
      </button>

      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-black text-gray-900 mb-3">
          Complete Profile
        </h1>
        <p className="text-gray-600 font-semibold text-base">{getRoleText()}</p>
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
            onChange={(e) =>
              handleInputChange('companyName', e.target.value)
            }
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

        {/* Password */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Password *
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="At least 8 characters"
            disabled={loading}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50"
          />
        </div>

        {/* GST Number (for sellers) */}
        {isGSTRequired && (
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              GST Number *
            </label>
            <input
              type="text"
              value={formData.gstNumber}
              onChange={(e) =>
                handleInputChange('gstNumber', e.target.value.toUpperCase())
              }
              placeholder="27AABCU9603R1Z0"
              disabled={loading}
              maxLength={15}
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#004AAD] focus:border-transparent outline-none transition-all disabled:opacity-50 uppercase"
            />
            <p className="text-xs text-gray-500 mt-1">
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
          className="w-full py-4 bg-[#004AAD] hover:bg-[#003399] text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
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
      </form>

      {/* Terms Agreement */}
      <div className="text-center space-y-4 mt-12">
        <p className="text-xs text-gray-500 leading-relaxed">
          By registering, you agree to our{' '}
          <span className="text-[#004AAD] font-bold cursor-pointer hover:underline">
            Terms
          </span>{' '}
          and{' '}
          <span className="text-[#004AAD] font-bold cursor-pointer hover:underline">
            Privacy Policy
          </span>
        </p>
      </div>
    </div>
  );
};

export default RegistrationScreen;