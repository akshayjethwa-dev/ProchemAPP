import React, { useState } from 'react';
import { loginUser } from '../services/authService';

interface Props {
  onOTPSent?: (phone: string) => void;
  onLoginSuccess?: (user: any) => void;
  onNavigateToRegister?: () => void;
}

const LoginScreen: React.FC<Props> = ({ onLoginSuccess, onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setError('');
      
      // Validation
      if (!email || !password) {
        setError('Email and password required');
        return;
      }

      setLoading(true);
      const user = await loginUser(email, password);
      
      if (user) {
        onLoginSuccess?.(user);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-blue-900 mb-2">Prochem</h1>
        <p className="text-gray-600">Chemical Marketplace for Professionals</p>
      </div>

      {/* Form */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Email Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={loading}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
          />
        </div>

        {/* Password Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
            ⚠️ {error}
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors disabled:opacity-50 mb-4"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={onNavigateToRegister}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Register here
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          By logging in, you agree to our{' '}
          <a href="#" className="text-blue-600 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-blue-600 hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
