import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import {
  ChevronRight,
  Clock,
  MapPin,
  Flame,
  ShieldCheck,
  Check,
  Zap,
  AlertCircle,
  Calendar,
  Sparkles,
  Award,
  ArrowLeft
} from 'lucide-react';

export const BookingPage = ({
  classId,
  onNavigate,
  onProceedToPayment,
  onOpenAuthModal
}) => {
  const { user } = useAuth();
  const { seatUpdates } = useRealtime();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Load class catalog
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/classes');
        if (res.ok) {
          const data = await res.json();
          setClasses(data.classes || []);

          if (classId) {
            const found = (data.classes || []).find((c) => c.id === classId);
            if (found) {
              setSelectedClass(found);
              if (found.timeSlots && found.timeSlots.length > 0) {
                setSelectedSlot(found.timeSlots[1] || found.timeSlots[0]);
              }
            }
          } else if (data.classes && data.classes.length > 0) {
            setSelectedClass(data.classes[0]);
            setSelectedSlot(data.classes[0].timeSlots[0] || '10:00 AM');
          }
        }
      } catch (err) {
        console.error('Failed to load class:', err);
      } finally {
        setLoading(false);
      }
    };
    loadClasses();
  }, [classId]);

  // Handle class selection
  const handleSelectClass = (cls) => {
    setSelectedClass(cls);
    if (cls.timeSlots && cls.timeSlots.length > 0) {
      setSelectedSlot(cls.timeSlots[0]);
    }
  };

  // Real-time seat updates for selected class
  const liveSeats = selectedClass
    ? (seatUpdates[selectedClass.id] !== undefined ? seatUpdates[selectedClass.id] : selectedClass.availableSeats)
    : 0;

  // Generate 3 date options (Today, Tomorrow, Day After)
  const dateOptions = [0, 1, 2].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const iso = d.toISOString().split('T')[0];
    const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { iso, label, full: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  });

  const handleProceed = async () => {
    if (!user) {
      onOpenAuthModal();
      return;
    }

    if (!selectedClass) return;

    if (liveSeats <= 0) {
      setErrorMessage('This session is sold out. Please select another time slot or class.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const token = localStorage.getItem('curefit_token');
    try {
      const res = await fetch('/api/bookings/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          classId: selectedClass.id,
          date: selectedDate,
          timeSlot: selectedSlot
        })
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (!res.ok) {
        setErrorMessage(data.error || 'Unable to initiate booking');
        return;
      }

      // Proceed to checkout with verified booking intent
      onProceedToPayment(data.bookingIntent);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Network error initiating booking checkout');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-2 border-[#00F076] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-[#8A9A90]">Loading session booking details...</p>
      </div>
    );
  }

  if (!selectedClass) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-serif font-bold text-white">Class Not Found</h2>
        <p className="text-sm text-[#8A9A90]">Please choose a workout session from our catalog.</p>
        <button
          onClick={() => onNavigate('/')}
          className="bg-[#00F076] hover:bg-[#00E06D] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,118,0.2)]"
        >
          Explore Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-[#090D0A]">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-[#8A9A90] mb-6">
        <button onClick={() => onNavigate('/')} className="hover:text-[#00F076] transition-colors cursor-pointer">
          Home
        </button>
        <ChevronRight className="w-3 h-3 text-[#3A4B40]" />
        <button onClick={() => onNavigate('/')} className="hover:text-[#00F076] transition-colors cursor-pointer">
          Classes
        </button>
        <ChevronRight className="w-3 h-3 text-[#3A4B40]" />
        <span className="text-[#00F076] font-semibold">{selectedClass.title}</span>
      </div>

      {/* Class Selector Switcher */}
      {classes.length > 1 && (
        <div className="mb-6 flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs text-[#8A9A90] font-medium shrink-0 mr-1">Switch Class:</span>
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => handleSelectClass(cls)}
              className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer ${
                selectedClass.id === cls.id
                  ? 'bg-[#00F076]/15 text-[#00F076] border border-[#00F076]/40 font-bold shadow-2xs'
                  : 'bg-[#131A15] text-[#8A9A90] hover:text-white hover:bg-[#18221C] border border-[#1F2B22]'
              }`}
            >
              {cls.title}
            </button>
          ))}
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: Photo, About, Coach, Benefits */}
        <div className="lg:col-span-7 space-y-8">
          {/* Main Hero Photo */}
          <div className="rounded-2xl overflow-hidden border border-[#1F2B22] shadow-2xl bg-[#121814] aspect-[16/9]">
            <img
              src={selectedClass.image}
              alt={selectedClass.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          {/* About the Class */}
          <div className="space-y-3">
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              About the Class
            </h2>
            <p className="text-sm text-[#9AA8A0] leading-relaxed">
              {selectedClass.description}
            </p>
          </div>

          {/* YOUR COACH Card */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#00F076]">
              YOUR COACH
            </h3>
            <div className="bg-[#121814] border border-[#1F2B22] rounded-2xl p-5 sm:p-6 flex items-start space-x-4 shadow-lg">
              <div className="w-14 h-14 rounded-full bg-[#1A241F] border-2 border-[#00F076]/40 overflow-hidden shrink-0">
                <img
                  src={selectedClass.coachAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={selectedClass.coach}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <div className="font-serif font-bold text-lg text-white">{selectedClass.coach}</div>
                <div className="text-xs text-[#00F076] font-medium">
                  {selectedClass.coachTitle}
                </div>
                <p className="text-xs text-[#9AA8A0] leading-relaxed pt-1">
                  {selectedClass.coachBio}
                </p>
              </div>
            </div>
          </div>

          {/* What to Bring & Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#121814] border border-[#1F2B22] rounded-2xl p-5 space-y-3 shadow-md">
              <div className="text-xs font-bold text-[#00F076] uppercase tracking-wider">
                What to Bring
              </div>
              <ul className="text-xs text-[#9AA8A0] space-y-2">
                {selectedClass.equipment?.map((item, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F076]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#121814] border border-[#1F2B22] rounded-2xl p-5 space-y-3 shadow-md">
              <div className="text-xs font-bold text-[#00F076] uppercase tracking-wider">
                Key Benefits
              </div>
              <ul className="text-xs text-[#9AA8A0] space-y-2">
                {selectedClass.benefits?.map((item, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#00F076] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Booking Card "SECURE YOUR SLOT" */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="bg-[#121814] border border-[#1F2B22] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">

            {/* Header */}
            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#00F076] mb-2 bg-[#00F076]/15 px-3 py-1 rounded-full border border-[#00F076]/30">
                <Zap className="w-3.5 h-3.5 fill-[#00F076] text-[#00F076]" />
                <span className="tracking-wider text-[10px] uppercase font-extrabold">SECURE YOUR SLOT</span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
                {selectedClass.title}
              </h2>
              <p className="text-xs text-[#8A9A90] mt-1">
                Trainer: <span className="text-white font-semibold">{selectedClass.coach}</span> • <span className="text-[#00F076] font-semibold">{selectedClass.duration} mins</span>
              </p>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-xs font-bold text-[#8A9A90] uppercase tracking-wider mb-2">
                Select Date
              </label>
              <div className="grid grid-cols-3 gap-2">
                {dateOptions.map((opt) => (
                  <button
                    key={opt.iso}
                    onClick={() => setSelectedDate(opt.iso)}
                    className={`py-3 px-3 rounded-xl text-xs font-medium text-center border transition-all cursor-pointer ${
                      selectedDate === opt.iso
                        ? 'bg-[#00F076]/15 text-[#00F076] border-[#00F076] font-bold shadow-[0_0_12px_rgba(0,240,118,0.2)]'
                        : 'bg-[#161F1A] text-[#8A9A90] border-[#223227] hover:border-[#3A4B40] hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] text-[#6B7C72] uppercase">{opt.label}</div>
                    <div className="font-semibold text-sm mt-0.5">{opt.full}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* SELECT SESSION TIME */}
            <div>
              <label className="block text-xs font-bold text-[#8A9A90] uppercase tracking-wider mb-2">
                SELECT SESSION TIME
              </label>
              <div className="space-y-2">
                {selectedClass.timeSlots?.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full py-3.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00F076]/15 text-[#00F076] border-[#00F076] shadow-[0_0_12px_rgba(0,240,118,0.2)]'
                          : 'bg-[#161F1A] text-[#D1DDD5] border-[#223227] hover:border-[#3A4B40] hover:bg-[#1A251F]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Clock className={`w-4 h-4 ${isSelected ? 'text-[#00F076]' : 'text-[#8A9A90]'}`} />
                        <span>{slot}</span>
                      </div>
                      {isSelected && (
                        <div className="flex items-center space-x-1 text-xs font-bold text-[#00F076]">
                          <Check className="w-4 h-4" />
                          <span>Selected</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Availability & Price Display */}
            <div className="pt-3 border-t border-[#1F2B22] flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-[#00F076] bg-[#00F076]/15 px-3 py-1 rounded-lg border border-[#00F076]/30">
                <Zap className="w-3.5 h-3.5 fill-[#00F076] text-[#00F076]" />
                <span>{liveSeats} seats remaining</span>
              </div>
              <div className="text-2xl font-serif font-extrabold text-white">
                ₹ {selectedClass.price}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PROCEED TO CHECKOUT Button */}
            <button
              type="button"
              onClick={handleProceed}
              disabled={isSubmitting || liveSeats <= 0}
              className="w-full bg-[#00F076] hover:bg-[#00E06D] disabled:opacity-50 text-black font-extrabold py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,240,118,0.25)] hover:shadow-[0_0_25px_rgba(0,240,118,0.4)] flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>PROCEED TO CHECKOUT</span>
              )}
            </button>

            {/* Guarantee / Security badges */}
            <div className="text-center text-[11px] text-[#8A9A90] font-medium">
              ✓ 100% Secure Booking • No hidden charges
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
