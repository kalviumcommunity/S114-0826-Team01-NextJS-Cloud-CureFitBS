import React from 'react';
import { Dumbbell, Shield, Sparkles, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="w-full bg-[#060907] border-t border-[#1C271F] mt-auto py-10 text-[#8A9A90]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left Brand info */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-1.5">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-[#00F076] flex items-center justify-center text-black font-serif font-extrabold text-xs shadow-[0_0_8px_rgba(0,240,118,0.4)]">
                c
              </div>
              <span className="text-base font-bold tracking-tight text-white font-editorial">
                cure<span className="text-[#00F076] italic font-serif ml-0.5">.fit</span>
              </span>
            </div>
            <p className="text-xs text-[#8A9A90] max-w-sm">
              Making group fitness fun, accessible, and trackable.
            </p>
          </div>

          {/* Center Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#D1DDD5]">
            <span className="inline-flex items-center space-x-1.5 bg-[#121814] px-3.5 py-1.5 rounded-xl border border-[#1F2B22]">
              <Shield className="w-3.5 h-3.5 text-[#00F076]" />
              <span>100% Verified Coaches</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 bg-[#121814] px-3.5 py-1.5 rounded-xl border border-[#1F2B22]">
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>AI Workout Matching</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 bg-[#121814] px-3.5 py-1.5 rounded-xl border border-[#1F2B22]">
              <Heart className="w-3.5 h-3.5 text-red-400" />
              <span>50,000+ Community</span>
            </span>
          </div>

          {/* Right Copyright */}
          <div className="text-xs text-[#6B7C72] text-center md:text-right font-medium">
            © 2026 cure.fit. Editorial Fitness & Wellness.
          </div>
        </div>
      </div>
    </footer>
  );
};
