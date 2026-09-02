import React from 'react';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { Clock, MapPin, Star, Flame, ChevronRight } from 'lucide-react';

export const ClassCard = ({ fitnessClass, onSelect }) => {
  const { seatUpdates } = useRealtime();

  // Real-time remaining seats override from WebSocket if available
  const availableSeats = seatUpdates[fitnessClass.id] !== undefined
    ? seatUpdates[fitnessClass.id]
    : fitnessClass.availableSeats;

  // Compute status badge
  const renderBadge = () => {
    if (availableSeats <= 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/90 text-red-300 border border-red-800/70 backdrop-blur-md shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
          Sold Out
        </span>
      );
    } else if (availableSeats < 10) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/90 text-amber-300 border border-amber-800/70 backdrop-blur-md shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
          {availableSeats} seats left
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#00F076]/15 text-[#00F076] border border-[#00F076]/30 backdrop-blur-md shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00F076] mr-1.5" />
          {availableSeats} seats
        </span>
      );
    }
  };

  return (
    <div
      onClick={() => onSelect(fitnessClass.id)}
      className="group bg-[#121814] hover:bg-[#161F1A] border border-[#1F2B22] hover:border-[#00F076]/40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-1 flex flex-col justify-between"
    >
      {/* Image container */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#18201B]">
        <img
          src={fitnessClass.image}
          alt={fitnessClass.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090D0A] via-transparent to-black/30" />

        {/* Top right status badge */}
        <div className="absolute top-3 right-3 z-10">
          {renderBadge()}
        </div>

        {/* Category tag */}
        <div className="absolute bottom-2.5 left-3 z-10">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-white bg-[#0A0E0B]/85 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/10">
            {fitnessClass.category}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 justify-between space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-serif font-bold text-base text-white group-hover:text-[#00F076] transition-colors line-clamp-1">
              {fitnessClass.title}
            </h3>
          </div>
          <p className="text-xs text-[#8A9A90] font-medium">
            {fitnessClass.coach} • <span className="text-[#00F076] font-semibold">{fitnessClass.level}</span>
          </p>
        </div>

        {/* Bottom stats row */}
        <div className="pt-2.5 border-t border-[#1F2B22] flex items-center justify-between">
          <div className="text-[#00F076] font-serif font-bold text-lg">
            ₹{fitnessClass.price}
          </div>
          <div className="text-xs text-[#8A9A90] font-medium flex items-center">
            <span>{fitnessClass.duration}</span>
            <span className="mx-1.5 text-[#2E3F33]">•</span>
            <span>{fitnessClass.capacity} cap</span>
          </div>
        </div>
      </div>
    </div>
  );
};
