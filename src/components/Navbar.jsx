import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { LiveTicker } from './LiveTicker.jsx';
import { Menu, X, Dumbbell, ShieldCheck } from 'lucide-react';

export const Navbar = ({ currentPath, onNavigate, onOpenAuthModal }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Explore', path: '/' },
    { label: 'Bookings', path: '/booking' },
    { label: 'My History', path: '/history' },
    { label: 'Settings', path: '/settings' }
  ];

  const handleNavClick = (path) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1C271F]">
      {/* Live top ticker */}
      <LiveTicker />

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => handleNavClick('/')}
          className="flex items-center space-x-2.5 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-[#00F076] flex items-center justify-center text-black font-serif font-extrabold text-lg shadow-[0_0_12px_rgba(0,240,118,0.4)] group-hover:scale-105 transition-transform">
            c
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-editorial flex items-center">
            cure<span className="text-[#00F076] italic font-serif ml-0.5">.fit</span>
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`text-sm font-medium transition-colors py-1 relative cursor-pointer ${
                  isActive
                    ? 'text-[#00F076] font-semibold'
                    : 'text-[#9AA8A0] hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00F076] rounded-full shadow-[0_0_8px_rgba(0,240,118,0.6)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Account & Actions */}
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleNavClick('/settings')}
                className="text-xs text-[#E2E8E4] hover:text-white bg-[#131A15] hover:bg-[#1A231C] border border-[#223227] px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
                title="Account Settings"
              >
                <span className="w-2 h-2 rounded-full bg-[#00F076] inline-block animate-pulse" />
                <span className="truncate max-w-[180px] font-mono text-[11px]">{user.email}</span>
                {user.membership === 'Pro Member' && (
                  <span className="bg-[#00F076]/15 text-[#00F076] text-[10px] px-1.5 py-0.5 rounded font-bold border border-[#00F076]/30 ml-1">
                    PRO
                  </span>
                )}
              </button>

              <button
                onClick={logout}
                className="text-xs font-semibold text-[#8A9A90] hover:text-red-400 bg-[#121814] hover:bg-red-950/30 border border-[#223227] hover:border-red-900/50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuthModal ? onOpenAuthModal() : onNavigate('/login')}
              className="bg-[#00F076] hover:bg-[#00E06D] text-black text-sm font-bold px-5 py-1.5 rounded-lg transition-all shadow-[0_0_15px_rgba(0,240,118,0.25)] hover:shadow-[0_0_20px_rgba(0,240,118,0.4)] cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center space-x-2">
          {user && (
            <span className="text-[11px] font-mono text-[#8A9A90] truncate max-w-[120px]">
              {user.email.split('@')[0]}
            </span>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#9AA8A0] hover:text-white bg-[#131A15] border border-[#223227]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0D120E] border-b border-[#1C271F] px-4 pt-2 pb-6 space-y-3 shadow-xl">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#00F076]/15 text-[#00F076] font-bold border border-[#00F076]/30'
                      : 'text-[#9AA8A0] hover:bg-[#131A15] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[#1C271F] flex items-center justify-between">
            {user ? (
              <>
                <div className="text-xs text-[#8A9A90]">
                  <div className="font-semibold text-white">{user.name}</div>
                  <div className="font-mono text-[11px] text-[#9AA8A0]">{user.email}</div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs bg-red-950/40 text-red-400 border border-red-900/50 px-3.5 py-1.5 rounded-lg hover:bg-red-900/60"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  onNavigate('/login');
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-[#00F076] text-black font-bold py-2.5 rounded-lg text-sm text-center shadow-[0_0_15px_rgba(0,240,118,0.25)]"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};