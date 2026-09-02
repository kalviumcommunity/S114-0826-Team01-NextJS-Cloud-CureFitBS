import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Mail, Lock, User, Phone, Sparkles, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export const AuthPage = ({ initialMode = 'login', onNavigate }) => {
  const { login, register, oauthLogin } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('Strength & Hypertrophy');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    if (mode === 'login') {
      const res = await login(email, password);
      setIsLoading(false);
      if (res.success) {
        onNavigate('/');
      } else {
        setErrorMessage(res.error || 'Failed to sign in');
      }
    } else {
      if (!name) {
        setIsLoading(false);
        setErrorMessage('Full name is required');
        return;
      }
      const res = await register({ name, email, password, phone, fitnessGoal });
      setIsLoading(false);
      if (res.success) {
        onNavigate('/');
      } else {
        setErrorMessage(res.error || 'Registration failed');
      }
    }
  };

  const handleDemo = async (demoEmail, demoName) => {
    setIsLoading(true);
    setErrorMessage('');
    const res = await login(demoEmail, 'curefit123');
    setIsLoading(false);
    if (res.success) {
      onNavigate('/');
    } else {
      const oauthRes = await oauthLogin('Demo Account', demoEmail, demoName);
      if (oauthRes.success) {
        onNavigate('/');
      } else {
        setErrorMessage(oauthRes.error || 'Demo sign-in failed');
      }
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-[#090D0A]">
      <div className="w-full max-w-md bg-[#121814] border border-[#223227] rounded-3xl shadow-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#00F076] text-black font-serif font-extrabold text-2xl shadow-[0_0_15px_rgba(0,240,118,0.4)] mb-3">
            c
          </div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
            {mode === 'login' ? 'Sign In to CureFit' : 'Create Your Account'}
          </h1>
          <p className="text-xs text-[#8A9A90] mt-1">
            {mode === 'login'
              ? 'Access live class bookings, performance tracking, and pro benefits'
              : 'Join 50,000+ athletes across 12 premier studios nationwide'}
          </p>
        </div>

        {/* Demo Fast Login Presets */}
        <div className="mb-5 p-3.5 rounded-2xl bg-[#161F1A] border border-[#223227] space-y-2">
          <div className="text-[11px] font-semibold text-[#8A9A90] flex items-center justify-between">
            <span className="text-white font-medium">⚡ Instant Demo Profiles</span>
            <span className="text-[#00F076] font-bold text-[10px]">No Signup Needed</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemo('usethinkpad27@gmail.com', 'Rahul Sharma')}
              disabled={isLoading}
              className="p-2.5 text-left rounded-xl bg-[#121814] hover:bg-[#1A241F] border border-[#223227] text-xs transition-colors cursor-pointer"
            >
              <div className="font-serif font-bold text-[#00F076]">Rahul Sharma</div>
              <div className="text-[10px] text-[#8A9A90]">Pro Member</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemo('ananya@curefit.com', 'Ananya Verma')}
              disabled={isLoading}
              className="p-2.5 text-left rounded-xl bg-[#121814] hover:bg-[#1A241F] border border-[#223227] text-xs transition-colors cursor-pointer"
            >
              <div className="font-serif font-bold text-[#00F076]">Ananya Verma</div>
              <div className="text-[10px] text-[#8A9A90]">Elite Member</div>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#8A9A90] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8A9A90] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#6B7C72]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8A9A90] mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8A9A90] absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#6B7C72]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#8A9A90] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8A9A90] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#6B7C72]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8A9A90] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8A9A90] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#6B7C72]"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#8A9A90] mb-1">
                Primary Fitness Goal
              </label>
              <select
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value)}
                className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl px-3 py-2.5 text-sm text-white"
              >
                <option value="Strength & Hypertrophy">Strength & Progressive Lifting (HRX)</option>
                <option value="Cardio & Fat Burn">Cardio & Dance Fitness</option>
                <option value="Flexibility & Mind">Yoga & Mobility Recovery</option>
                <option value="Boxing & Combat">Boxing & High Intensity</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00F076] hover:bg-[#00E06D] text-black font-extrabold py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(0,240,118,0.25)] hover:shadow-[0_0_20px_rgba(0,240,118,0.4)] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#1F2B22] text-center text-xs text-[#8A9A90]">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage('');
                }}
                className="text-[#00F076] font-bold hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                }}
                className="text-[#00F076] font-bold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
