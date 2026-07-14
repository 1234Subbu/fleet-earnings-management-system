import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import { Car, Lock, User as UserIcon, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter your credentials');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const data = await api.login(username, password);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
      toast.error(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCredentials = (role: 'Owner' | 'Driver') => {
    if (role === 'Owner') {
      setUsername('owner');
      setPassword('owner123');
    } else {
      setUsername('driver1');
      setPassword('driver123');
    }
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-transparent transition-colors duration-200">
      
      <div className="relative w-full max-w-md glass-card rounded-3xl p-6 md:p-8 shadow-xl">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/25 animate-pulse">
            <Car className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
              Balaji Travels Hub
            </h1>
            <p className="text-sm font-semibold text-slate-400 mt-1">
              Fleet Earnings & Driver Settlements
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start space-x-2.5">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-800 dark:text-red-300 font-semibold leading-relaxed">
              {errorMsg}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <UserIcon className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-9.5 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Security Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900 dark:text-white font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 mt-2"
          >
            {submitting ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        {/* Demo Fast Logins Section */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest">
            Fast Demo Login Accounts
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fillDemoCredentials('Owner')}
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all text-center"
            >
              Owner Demo
            </button>
            <button
              onClick={() => fillDemoCredentials('Driver')}
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all text-center"
            >
              Driver Demo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
