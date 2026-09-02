import React from 'react';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { Sparkles, Zap, Flame, Bell } from 'lucide-react';

export const LiveTicker = () => {
  const { liveEvents } = useRealtime();

  return (
    <div className="bg-[#0D130F] border-b border-[#1B271F] text-xs py-2 px-4 overflow-hidden relative select-none">
      <div className="flex items-center space-x-6 animate-marquee whitespace-nowrap">
        {liveEvents.map((evt, idx) => (
          <div key={evt.id || idx} className="inline-flex items-center space-x-2 text-[#8A9A90]">
            {evt.type === 'booking' && (
              <span className="flex items-center text-[#00F076] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F076] mr-1.5 animate-pulse" />
                <Zap className="w-3 h-3 mr-1 inline text-[#00F076]" />
              </span>
            )}
            {evt.type === 'seat_alert' && (
              <span className="flex items-center text-[#F59E0B] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mr-1.5 animate-ping" />
                <Flame className="w-3 h-3 mr-1 inline text-[#F59E0B]" />
              </span>
            )}
            {evt.type === 'completion' && (
              <span className="flex items-center text-[#00F076] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F076] mr-1.5" />
                <Sparkles className="w-3 h-3 mr-1 inline text-[#00F076]" />
              </span>
            )}
            {evt.type === 'announcement' && (
              <span className="flex items-center text-[#10B981] font-semibold">
                <Bell className="w-3 h-3 mr-1 inline text-[#10B981]" />
              </span>
            )}
            <span className="text-[#E2E8E4] tracking-tight font-medium">{evt.text}</span>
            <span className="text-[#2D3F33] font-bold">•</span>
          </div>
        ))}
      </div>
    </div>
  );
};
