import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Mail, Lock, User, Phone, Sparkles, CheckCircle2, AlertCircle, ArrowRight, Shield } from 'lucide-react';

export const AuthModal = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess
}) => {
  const { login, register, oauthLogin } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('Strength & Hypertrophy');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    if (mode === 'login') {
      const res = await login(email, password);
      setIsLoading(false);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to sign in. Please verify your credentials.');
      }
    } else {
      if (!name) {
        setIsLoading(false);
        setErrorMessage('Please enter your full name');
        return;
      }
      const res = await register({ name, email, password, phone, fitnessGoal });
      setIsLoading(false);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || 'Registration failed');
      }
    }
  };

  const handleDemoLogin = async (demoEmail, demoName) => {
    setIsLoading(true);
    setErrorMessage('');
    const res = await login(demoEmail, 'curefit123');
    setIsLoading(false);
    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      // Fallback to oauth simulation if demo user password changed
      const oauthRes = await oauthLogin('Demo Account', demoEmail, demoName);
      if (oauthRes.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(oauthRes.error || 'Demo login failed');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-md bg-[#121814] border border-[#223227] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8A9A90] hover:text-white p-1.5 rounded-xl bg-[#161F1A] border border-[#223227] transition-colors"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#00F076] flex items-center justify-center text-black font-serif font-extrabold text-sm shadow-[0_0_10px_rgba(0,240,118,0.4)]">
              c
            </div>
            <span className="text-xl font-bold text-white font-editorial tracking-tight">
              cure<span className="text-[#00F076] italic font-serif ml-0.5">.fit</span>
            </span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-white">
            {mode === 'login' ? 'Sign In to CureFit' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-[#8A9A90] mt-1 leading-relaxed">
            {mode === 'login'
              ? 'Access your booked classes, workouts, and member fitness benefits.'
              : 'Join 50,000+ fitness enthusiasts and start booking live classes.'}
          </p>
        </div>

        {/* Quick Demo Login Preset Buttons */}
        <div className="mb-5 p-3.5 rounded-2xl bg-[#161F1A] border border-[#223227] space-y-2">
          <div className="text-[11px] font-semibold text-[#8A9A90] flex items-center justify-between">
            <span className="flex items-center gap-1 font-medium text-white">⚡ One-Click Demo Access</span>
            <span className="text-[#00F076] text-[10px] font-bold uppercase tracking-wider">Instant Login</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('usethinkpad27@gmail.com', 'Rahul Sharma')}
              disabled={isLoading}
              className="px-3 py-2 text-left rounded-xl bg-[#121814] hover:bg-[#1A241F] border border-[#223227] text-xs transition-colors cursor-pointer"
            >
              <div className="font-semibold text-white truncate">Rahul Sharma</div>
              <div className="text-[10px] text-[#8A9A90] truncate">usethinkpad27@...</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('ananya@curefit.com', 'Ananya Verma')}
              disabled={isLoading}
              className="px-3 py-2 text-left rounded-xl bg-[#121814] hover:bg-[#1A241F] border border-[#223227] text-xs transition-colors cursor-pointer"
            >
              <div className="font-semibold text-[#00F076] truncate">Ananya Verma</div>
              <div className="text-[10px] text-[#8A9A90] truncate">Elite Member</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Auth Form */}
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
                    className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#6B7C72] transition-colors"
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
                    className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#6B7C72] transition-colors"
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
                className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#6B7C72] transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#8A9A90]">
                Password
              </label>
              {mode === 'login' && (
                <span className="text-[11px] text-[#00F076] hover:underline cursor-pointer font-medium">
                  Forgot password?
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8A9A90] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#6B7C72] transition-colors"
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
                className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl px-3 py-2.5 text-sm text-white transition-colors"
              >
                <option value="Strength & Hypertrophy">Strength & Muscle Building (HRX)</option>
                <option value="Cardio & Fat Burn">Cardio & Dance Fitness</option>
                <option value="Flexibility & Mind">Yoga & Mobility Recovery</option>
                <option value="Boxing & Combat">Boxing & High Intensity</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00F076] hover:bg-[#00E06D] text-black font-extrabold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(0,240,118,0.25)] hover:shadow-[0_0_20px_rgba(0,240,118,0.4)] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
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

        {/* Switch mode */}
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
