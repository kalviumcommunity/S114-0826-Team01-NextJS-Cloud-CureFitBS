import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  User,
  Calendar,
  Clock,
  QrCode,
  Download,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Zap,
  Flame,
  Dumbbell,
  Shield,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trash2
} from 'lucide-react';

export const HistoryPage = ({ onNavigate, onOpenAuthModal }) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  const [selectedPass, setSelectedPass] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchHistory = async (page = 1) => {
    const token = localStorage.getItem('curefit_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/history?page=${page}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setActivities(data.activities || []);
        setTotalPages(data.totalPages || 1);
        setTotalBookings(data.totalBookings || 0);
        setCurrentPage(data.page || 1);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(currentPage);
  }, [user, currentPage]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? A 100% refund will be credited back.')) {
      return;
    }

    const token = localStorage.getItem('curefit_token');
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Booking #${bookingId} cancelled and refund initiated.` });
        fetchHistory(currentPage);
        refreshUser();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to cancel booking.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Error cancelling booking.' });
    }
  };

  const handleClearActivities = async () => {
    const token = localStorage.getItem('curefit_token');
    try {
      const res = await fetch('/api/history/clear-activities', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setActivities([]);
        setStatusMessage({ type: 'success', text: 'Activity log cleared successfully.' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadInvoice = (booking) => {
    const invoiceText = `
========================================
CUREFIT STUDIO BOOKING RECEIPT & TAX INVOICE
========================================
Booking ID:      ${booking.id}
Transaction ID:  ${booking.paymentId}
Date Booked:     ${new Date(booking.createdAt).toLocaleString()}

CUSTOMER DETAILS:
Name:            ${booking.userName}
Email:           ${booking.userEmail}

SESSION DETAILS:
Class:           ${booking.classTitle}
Trainer:         ${booking.coach}
Date:            ${booking.date}
Time Slot:       ${booking.timeSlot}
Pass Code:       ${booking.qrPassCode}

PAYMENT BREAKDOWN:
Subtotal:        INR ${booking.price}.00
GST (18%):       INR 0.00 (Included)
Total Paid:      INR ${booking.price}.00
Payment Status:  ${booking.paymentStatus}

Thank you for training with CureFit!
========================================
    `;

    const blob = new Blob([invoiceText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CureFit-Receipt-${booking.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4 bg-[#090D0A]">
        <h2 className="text-2xl font-serif font-bold text-white">Sign In Required</h2>
        <p className="text-sm text-[#8A9A90]">Please sign in to view your workout ledger and booking history.</p>
        <button
          onClick={onOpenAuthModal}
          className="bg-[#00F076] hover:bg-[#00E06D] text-black font-extrabold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,118,0.25)]"
        >
          Sign In / Demo Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#090D0A]">

      {/* 1. TOP USER CARD */}
      <div className="bg-[#121814] border border-[#1F2B22] rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-[#1A241F] border-2 border-[#00F076]/40 overflow-hidden shrink-0 flex items-center justify-center">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7 text-[#00F076]" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">{user.name}</h1>
              <span className="bg-[#00F076]/20 text-[#00F076] border border-[#00F076]/40 text-[11px] font-bold px-3 py-0.5 rounded-full">
                {user.membership || 'Pro Member'}
              </span>
            </div>
            <p className="text-xs text-[#8A9A90] font-mono">
              {user.email} {user.phone && `• ${user.phone}`}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/settings')}
          className="text-xs bg-[#161F1A] hover:bg-[#1D2922] text-white border border-[#223227] px-4 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer"
        >
          Manage Profile
        </button>
      </div>

      {/* 2. 4 METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CLASSES */}
        <div className="bg-[#121814] border border-[#1F2B22] rounded-2xl p-5 hover:border-[#00F076]/40 transition-all shadow-lg">
          <div className="text-[11px] font-bold text-[#8A9A90] tracking-wider uppercase mb-1">
            CLASSES
          </div>
          <div className="text-3xl font-serif font-extrabold text-[#00F076]">
            {user.stats?.classesCount || bookings.length || 84}
          </div>
        </div>

        {/* STREAK */}
        <div className="bg-[#121814] border border-[#1F2B22] rounded-2xl p-5 hover:border-[#00F076]/40 transition-all shadow-lg">
          <div className="text-[11px] font-bold text-[#8A9A90] tracking-wider uppercase mb-1">
            STREAK
          </div>
          <div className="text-3xl font-serif font-extrabold text-[#00F076]">
            {user.stats?.streakDays || 12}d
          </div>
        </div>

        {/* CALORIES */}
        <div className="bg-[#121814] border border-[#1F2B22] rounded-2xl p-5 hover:border-[#00F076]/40 transition-all shadow-lg">
          <div className="text-[11px] font-bold text-[#8A9A90] tracking-wider uppercase mb-1">
            CALORIES
          </div>
          <div className="text-3xl font-serif font-extrabold text-[#00F076]">
            {user.stats?.caloriesBurned ? `${Math.round(user.stats.caloriesBurned / 1000)}k` : '24k'}
          </div>
        </div>

        {/* FAVORITE */}
        <div className="bg-[#121814] border border-[#1F2B22] rounded-2xl p-5 hover:border-[#00F076]/40 transition-all shadow-lg">
          <div className="text-[11px] font-bold text-[#8A9A90] tracking-wider uppercase mb-1">
            FAVORITE
          </div>
          <div className="text-3xl font-serif font-extrabold text-[#00F076]">
            {user.stats?.favoriteWorkout || 'HRX'}
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-[#00F076]/15 border border-[#00F076]/30 text-[#00F076]'
              : 'bg-red-950/40 border border-red-900/60 text-red-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* 3. DUAL TABBED LEDGER */}
      <div className="bg-[#121814] border border-[#1F2B22] rounded-3xl overflow-hidden shadow-2xl">

        {/* Tabs Bar */}
        <div className="flex items-center justify-between border-b border-[#1F2B22] px-6 pt-4">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`pb-4 text-sm font-semibold transition-colors relative cursor-pointer ${
                activeTab === 'bookings' ? 'text-[#00F076] font-bold font-serif' : 'text-[#8A9A90] hover:text-white'
              }`}
            >
              My Session Ledger (Paginated)
              {activeTab === 'bookings' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00F076] rounded-full shadow-[0_0_8px_rgba(0,240,118,0.6)]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-4 text-sm font-semibold transition-colors relative cursor-pointer ${
                activeTab === 'activity' ? 'text-[#00F076] font-bold font-serif' : 'text-[#8A9A90] hover:text-white'
              }`}
            >
              User Activity & Security Logs ({activities.length})
              {activeTab === 'activity' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00F076] rounded-full shadow-[0_0_8px_rgba(0,240,118,0.6)]" />
              )}
            </button>
          </div>

          {activeTab === 'activity' && activities.length > 0 && (
            <button
              onClick={handleClearActivities}
              className="text-xs text-[#8A9A90] hover:text-red-400 flex items-center space-x-1 pb-4 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Logs</span>
            </button>
          )}
        </div>

        {/* Tab 1: Bookings List */}
        {activeTab === 'bookings' && (
          <div className="p-6">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8A9A90]">Loading session bookings...</div>
            ) : bookings.length === 0 ? (
              <div className="py-12 text-center text-[#8A9A90] space-y-3">
                <p className="text-sm">No session bookings found.</p>
                <button
                  onClick={() => onNavigate('/')}
                  className="px-5 py-2.5 bg-[#00F076] hover:bg-[#00E06D] text-black font-extrabold rounded-xl text-xs transition-colors cursor-pointer shadow-[0_0_15px_rgba(0,240,118,0.2)]"
                >
                  Book Your First Class
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-[#161F1A] border border-[#223227] hover:border-[#00F076]/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-md"
                  >
                    {/* Left Details */}
                    <div className="flex items-start space-x-4">
                      <img
                        src={booking.image || 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=150'}
                        alt={booking.classTitle}
                        className="w-14 h-14 rounded-xl object-cover border border-[#223227] shrink-0"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-serif font-bold text-base text-white">{booking.classTitle}</h3>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              booking.status === 'Confirmed'
                                ? 'bg-[#00F076]/20 text-[#00F076] border border-[#00F076]/40'
                                : booking.status === 'Completed'
                                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                                : 'bg-red-950/60 text-red-300 border border-red-800/60'
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <div className="text-xs text-[#8A9A90] flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Coach: <strong className="text-white">{booking.coach}</strong></span>
                          <span>•</span>
                          <span className="flex items-center"><Calendar className="w-3 h-3 mr-1 text-[#00F076]" /> {booking.date}</span>
                          <span>•</span>
                          <span className="flex items-center"><Clock className="w-3 h-3 mr-1 text-[#00F076]" /> {booking.timeSlot}</span>
                        </div>
                        <div className="text-[11px] font-mono text-[#6B7C72]">
                          Pass ID: {booking.id} • Paid: ₹{booking.price} ({booking.paymentStatus})
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                      <button
                        onClick={() => setSelectedPass(booking)}
                        className="px-3.5 py-2 bg-[#1A241F] hover:bg-[#223028] text-[#00F076] border border-[#00F076]/30 text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>View Pass</span>
                      </button>

                      <button
                        onClick={() => handleDownloadInvoice(booking)}
                        className="px-3.5 py-2 bg-[#1A241F] hover:bg-[#223028] text-[#D1DDD5] border border-[#223227] text-xs font-medium rounded-xl flex items-center space-x-1.5 cursor-pointer"
                        title="Download Tax Invoice"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Invoice</span>
                      </button>

                      {booking.status === 'Confirmed' && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/60 text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="pt-4 border-t border-[#1F2B22] flex items-center justify-between text-xs text-[#8A9A90]">
                    <div>Showing Page {currentPage} of {totalPages} ({totalBookings} total sessions)</div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-[#161F1A] border border-[#223227] disabled:opacity-40 cursor-pointer hover:bg-[#1D2922] text-white"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="font-mono text-white px-2">{currentPage}</span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-[#161F1A] border border-[#223227] disabled:opacity-40 cursor-pointer hover:bg-[#1D2922] text-white"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: User Activity Feed */}
        {activeTab === 'activity' && (
          <div className="p-6">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8A9A90]">No activity recorded yet.</div>
            ) : (
              <div className="relative border-l border-[#223227] ml-4 space-y-6">
                {activities.map((act) => (
                  <div key={act.id} className="relative pl-6">
                    <div className="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-[#00F076]/20 border-2 border-[#00F076] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00F076]" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-sm text-white">{act.title}</span>
                        <span className="text-[11px] font-mono text-[#6B7C72]">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-[#8A9A90]">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR PASS MODAL */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121814] border border-[#223227] rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 relative">
            <button
              onClick={() => setSelectedPass(null)}
              className="absolute top-4 right-4 text-[#8A9A90] hover:text-white p-1.5 bg-[#161F1A] border border-[#223227] rounded-lg cursor-pointer"
            >
              ✕
            </button>

            <div>
              <span className="text-[11px] font-bold text-[#00F076] uppercase tracking-widest">CureFit Digital Entry Pass</span>
              <h3 className="text-xl font-serif font-bold text-white mt-1">{selectedPass.classTitle}</h3>
              <p className="text-xs text-[#8A9A90]">Scan at studio turnstile • Trainer: {selectedPass.coach}</p>
            </div>

            <div className="bg-[#161F1A] border border-[#223227] rounded-2xl p-6 space-y-4 shadow-md">
              <div className="text-[11px] text-[#8A9A90] uppercase tracking-wide">QR Pass Code</div>
              <div className="font-mono font-extrabold text-2xl text-[#00F076] tracking-wider">{selectedPass.qrPassCode}</div>
              <div className="text-xs text-[#8A9A90]">Present this code at the studio entrance</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#161F1A] border border-[#223227] rounded-xl p-3">
                <div className="text-[#8A9A90]">Date</div>
                <div className="font-semibold text-white">{selectedPass.date}</div>
              </div>
              <div className="bg-[#161F1A] border border-[#223227] rounded-xl p-3">
                <div className="text-[#8A9A90]">Time</div>
                <div className="font-semibold text-[#00F076]">{selectedPass.timeSlot}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
