import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  User,
  Shield,
  Bell,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Mail,
  Download,
  Trash2,
  LogOut
} from 'lucide-react';

export const SettingsPage = ({ onNavigate, onOpenAuthModal }) => {
  const { user, updateProfile, changePassword, updatePreferences, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('profile');

  // Profile fields
  const [fullName, setFullName] = useState(user?.name || 'Rahul Sharma');
  const [emailAddress, setEmailAddress] = useState(user?.email || 'usethinkpad27@gmail.com');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '+91 98765 43210');
  const [fitnessGoal, setFitnessGoal] = useState(user?.fitnessGoal || 'Hypertrophy & Endurance');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preference toggles
  const [emailNotifs, setEmailNotifs] = useState(user?.preferences?.emailNotifications ?? true);
  const [smsNotifs, setSmsNotifs] = useState(user?.preferences?.smsReminders ?? true);
  const [reminderHours, setReminderHours] = useState(user?.preferences?.reminderHoursBefore ?? 2);
  const [soundEffects, setSoundEffects] = useState(user?.preferences?.soundEffects ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4 bg-[#090D0A]">
        <h2 className="text-2xl font-serif font-bold text-white">Sign In Required</h2>
        <p className="text-sm text-[#8A9A90]">Please sign in to access and manage your account settings.</p>
        <button
          onClick={onOpenAuthModal}
          className="bg-[#00F076] hover:bg-[#00E06D] text-black font-extrabold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,118,0.25)]"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setToastMessage(null);

    const res = await updateProfile({
      name: fullName,
      phone: phoneNumber,
      fitnessGoal
    });

    setIsSaving(false);
    if (res.success) {
      setToastMessage({ type: 'success', text: 'Profile changes saved successfully!' });
    } else {
      setToastMessage({ type: 'error', text: res.error || 'Failed to save changes.' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToastMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsSaving(true);
    setToastMessage(null);

    const res = await changePassword(currentPassword, newPassword);
    setIsSaving(false);

    if (res.success) {
      setToastMessage({ type: 'success', text: 'Security credentials updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setToastMessage({ type: 'error', text: res.error || 'Failed to update password.' });
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    const res = await updatePreferences({
      emailNotifications: emailNotifs,
      smsReminders: smsNotifs,
      reminderHoursBefore: reminderHours,
      soundEffects
    });
    setIsSaving(false);
    if (res.success) {
      setToastMessage({ type: 'success', text: 'Notification preferences updated.' });
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify({ user, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CureFit-Account-Data-${user.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-[#090D0A]">

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs flex items-center justify-between shadow-md ${
            toastMessage.type === 'success'
              ? 'bg-[#00F076]/15 border border-[#00F076]/30 text-[#00F076]'
              : 'bg-red-950/40 border border-red-900/60 text-red-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#00F076]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-[#8A9A90] hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex items-center space-x-2 border-b border-[#1F2B22] pb-3 mb-8 overflow-x-auto scrollbar-none">
        {[
          { id: 'profile', label: 'Profile Details', icon: User },
          { id: 'security', label: 'Security & Auth', icon: Shield },
          { id: 'preferences', label: 'Preferences', icon: Bell },
          { id: 'account', label: 'Data & Privacy', icon: Lock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setToastMessage(null); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#00F076]/15 text-[#00F076] border border-[#00F076]/30 font-bold shadow-2xs'
                  : 'text-[#8A9A90] hover:text-white hover:bg-[#131A15]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. PROFILE SECTION */}
      {activeTab === 'profile' && (
        <div className="bg-[#121814] border border-[#1F2B22] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
              Account Settings
            </h1>
            <p className="text-xs text-[#8A9A90] mt-1">
              Update your personal credentials and membership preferences.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Full Name Input */}
            <div>
              <label className="block text-xs font-semibold text-[#8A9A90] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl px-4 py-3 text-sm text-white placeholder-[#6B7C72] transition-colors"
              />
            </div>

            {/* Email Address Input */}
            <div>
              <label className="block text-xs font-semibold text-[#8A9A90] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={emailAddress}
                className="w-full bg-[#1A241F] border border-[#223227] rounded-xl px-4 py-3 text-sm text-[#8A9A90] cursor-not-allowed font-mono"
              />
              <p className="text-[11px] text-[#6B7C72] mt-1">
                Email is linked to your Pro membership and authentication token.
              </p>
            </div>

            {/* Phone Number Input */}
            <div>
              <label className="block text-xs font-semibold text-[#8A9A90] mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl px-4 py-3 text-sm text-white placeholder-[#6B7C72] transition-colors"
              />
            </div>

            {/* Fitness Goal */}
            <div>
              <label className="block text-xs font-semibold text-[#8A9A90] mb-1.5">
                Target Fitness Goal (Guides AI Recommendations)
              </label>
              <select
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value)}
                className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl px-4 py-3 text-sm text-white transition-colors"
              >
                <option value="Hypertrophy & Endurance">Hypertrophy & Endurance Conditioning</option>
                <option value="Fat Loss & Cardio Fitness">Fat Loss & Cardio Dance</option>
                <option value="Flexibility & Mind Body">Flexibility & Mind-Body Recovery</option>
                <option value="Boxing & Power Reflexes">Boxing & Power Reflexes</option>
              </select>
            </div>

            {/* Save Changes Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-[#00F076] hover:bg-[#00E06D] disabled:opacity-50 text-black font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(0,240,118,0.25)] hover:shadow-[0_0_20px_rgba(0,240,118,0.4)] flex items-center justify-center space-x-2 cursor-pointer mt-4"
            >
              {isSaving ? (
                <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* 2. SECURITY TAB */}
      {activeTab === 'security' && (
        <div className="bg-[#121814] border border-[#1F2B22] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-white">Security & Credentials</h2>
            <p className="text-xs text-[#8A9A90] mt-1">Manage password authentication and active JWT sessions.</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8A9A90] mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8A9A90] mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8A9A90] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#00F076] hover:bg-[#00E06D] text-black font-extrabold rounded-xl text-xs transition-colors shadow-md cursor-pointer"
            >
              Update Password
            </button>
          </form>

          {/* Active Sessions */}
          <div className="pt-6 border-t border-[#1F2B22] space-y-3">
            <h3 className="text-sm font-serif font-bold text-white">Active Sessions</h3>
            <div className="p-4 bg-[#161F1A] border border-[#223227] rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5 text-xs">
                <div className="text-white font-semibold">Current Web Browser Session</div>
                <div className="text-[#8A9A90] font-mono">JWT Bearer • Expires in 7 days</div>
              </div>
              <span className="text-[#00F076] text-xs font-bold bg-[#00F076]/15 px-3 py-1 rounded-full border border-[#00F076]/30">Active Now</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. PREFERENCES TAB */}
      {activeTab === 'preferences' && (
        <div className="bg-[#121814] border border-[#1F2B22] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-white">Workout & Reminder Preferences</h2>
            <p className="text-xs text-[#8A9A90] mt-1">Configure automated notifications and class timing alerts.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 bg-[#161F1A] border border-[#223227] rounded-2xl">
              <div>
                <div className="font-semibold text-white">Email Session Confirmations</div>
                <div className="text-[#8A9A90]">Receive tax invoice and QR gate pass via email immediately after booking.</div>
              </div>
              <input
                type="checkbox"
                checked={emailNotifs}
                onChange={(e) => setEmailNotifs(e.target.checked)}
                className="w-4 h-4 accent-[#00F076] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#161F1A] border border-[#223227] rounded-2xl">
              <div>
                <div className="font-semibold text-white">SMS & WhatsApp Slot Reminders</div>
                <div className="text-[#8A9A90]">Get warm-up alerts and trainer location notes before your class.</div>
              </div>
              <input
                type="checkbox"
                checked={smsNotifs}
                onChange={(e) => setSmsNotifs(e.target.checked)}
                className="w-4 h-4 accent-[#00F076] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#161F1A] border border-[#223227] rounded-2xl">
              <div>
                <div className="font-semibold text-white">Class Reminder Timing</div>
                <div className="text-[#8A9A90]">How early to trigger your countdown alert.</div>
              </div>
              <select
                value={reminderHours}
                onChange={(e) => setReminderHours(Number(e.target.value))}
                className="bg-[#121814] border border-[#223227] rounded-xl px-3 py-1.5 text-white font-semibold text-xs"
              >
                <option value={1}>1 hour prior</option>
                <option value={2}>2 hours prior</option>
                <option value={4}>4 hours prior</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSavePreferences}
            className="px-6 py-2.5 bg-[#00F076] hover:bg-[#00E06D] text-black font-extrabold rounded-xl text-xs transition-colors shadow-md cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      )}

      {/* 4. DATA & PRIVACY TAB */}
      {activeTab === 'account' && (
        <div className="bg-[#121814] border border-[#1F2B22] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-white">Data Management & Privacy</h2>
            <p className="text-xs text-[#8A9A90] mt-1">Export your fitness telemetry or terminate your session.</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-[#161F1A] border border-[#223227] rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-sm font-serif font-bold text-white">Export Personal Data</div>
                <div className="text-xs text-[#8A9A90]">Download complete workout logs, calories, and booking history as JSON.</div>
              </div>
              <button
                onClick={handleExportData}
                className="px-4 py-2 bg-[#1A241F] hover:bg-[#223028] text-[#00F076] border border-[#00F076]/30 text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>

            <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-sm font-serif font-bold text-red-300">Sign Out of All Devices</div>
                <div className="text-xs text-red-400/80">Invalidate current JWT authentication tokens.</div>
              </div>
              <button
                onClick={() => { logout(); onNavigate('/login'); }}
                className="px-4 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 text-xs font-semibold rounded-xl flex items-center space-x-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
