import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  QrCode,
  Building,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Zap,
  Calendar,
  Clock,
  MapPin,
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const PaymentPage = ({
  bookingIntent,
  onNavigate,
  onSuccess
}) => {
  const { user } = useAuth();
  const { addLocalEvent } = useRealtime();

  // Payment Method Tab
  const [selectedMethod, setSelectedMethod] = useState('Card');

  // Card details
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('888');
  const [cardHolder, setCardHolder] = useState(user?.name || 'Rahul Sharma');

  // UPI details
  const [upiId, setUpiId] = useState('rahul@okhdfcbank');

  // Netbanking bank
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Sandbox simulation test controls
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // If no intent, fallback info
  const intent = bookingIntent || {
    bookingId: 'CURE-9142',
    classId: 'class-cult-dance',
    classTitle: 'Cult Dance Fitness',
    coach: 'Coach Rahul',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '10:00 AM',
    location: 'CureFit Studio, Indiranagar',
    subtotal: 599,
    convenienceFee: 0,
    gstAmount: 0,
    totalAmount: 599,
    currency: 'INR'
  };

  const handlePayNow = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsProcessing(true);
    setPaymentStatus('processing');

    const token = localStorage.getItem('curefit_token');

    try {
      // Simulate realistic payment gateway processing latency
      await new Promise(r => setTimeout(r, 1200));

      const res = await fetch('/api/bookings/confirm-and-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: intent.bookingId,
          classId: intent.classId,
          date: intent.date,
          timeSlot: intent.timeSlot,
          paymentMethod: selectedMethod,
          paymentDetails: {
            method: selectedMethod,
            cardLast4: cardNumber.slice(-4),
            upiId: selectedMethod === 'UPI' ? upiId : undefined
          },
          simulateFailure
        })
      });

      const data = await res.json();
      setIsProcessing(false);

      if (!res.ok) {
        setPaymentStatus('failed');
        setErrorMessage(data.error || 'Payment gateway returned a decline response.');
        return;
      }

      // Success
      setPaymentStatus('success');
      setConfirmedBooking(data.booking);

      // Trigger Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      if (onSuccess) {
        onSuccess(data.booking);
      }
    } catch (err) {
      setIsProcessing(false);
      setPaymentStatus('failed');
      setErrorMessage(err.message || 'Payment network failure. Transaction could not be completed.');
    }
  };

  // SUCCESS STATE SCREEN
  if (paymentStatus === 'success' && confirmedBooking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 bg-[#090D0A]">
        <div className="bg-[#121814] border border-[#1F2B22] rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6 animate-fadeIn">

          <div className="w-16 h-16 bg-[#00F076]/15 border-2 border-[#00F076] text-[#00F076] rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,240,118,0.3)]">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00F076]">Payment Verified & Confirmed</span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">Booking Confirmed!</h1>
            <p className="text-sm text-[#8A9A90]">
              Your pass has been activated. Present this QR Pass at the CureFit center reception.
            </p>
          </div>

          {/* Pass Card */}
          <div className="bg-[#161F1A] border border-[#223227] rounded-2xl p-6 max-w-lg mx-auto text-left space-y-4 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-[#223227]">
              <div>
                <div className="text-[11px] text-[#8A9A90] uppercase tracking-wide">Booking Pass ID</div>
                <div className="font-mono font-bold text-[#00F076]">{confirmedBooking.id}</div>
              </div>
              <span className="bg-[#00F076]/20 text-[#00F076] text-xs px-3 py-1 rounded-full font-bold border border-[#00F076]/40">
                PASS READY
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#8A9A90]">Class Format</span>
                <div className="font-serif font-bold text-white text-sm">{confirmedBooking.classTitle}</div>
              </div>
              <div>
                <span className="text-[#8A9A90]">Coach</span>
                <div className="font-serif font-bold text-white text-sm">{confirmedBooking.coach}</div>
              </div>
              <div>
                <span className="text-[#8A9A90]">Scheduled Date</span>
                <div className="font-semibold text-white text-sm">{confirmedBooking.date}</div>
              </div>
              <div>
                <span className="text-[#8A9A90]">Time Slot</span>
                <div className="font-bold text-[#00F076] text-sm">{confirmedBooking.timeSlot}</div>
              </div>
            </div>

            {/* QR Pass Code visual */}
            <div className="pt-3 border-t border-[#223227] flex items-center justify-between">
              <div className="text-xs space-y-0.5">
                <div className="text-[#8A9A90]">Digital Gate Pass</div>
                <div className="font-mono text-[11px] text-[#6B7C72]">{confirmedBooking.qrPassCode}</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-white/20 shadow-md">
                <QrCode className="w-10 h-10 text-black" />
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => onNavigate('/history')}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#00F076] hover:bg-[#00E06D] text-black font-extrabold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(0,240,118,0.25)] cursor-pointer"
            >
              View in My History Ledger
            </button>
            <button
              onClick={() => onNavigate('/')}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#161F1A] hover:bg-[#1D2922] text-white border border-[#223227] font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Book Another Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-[#090D0A]">

      {/* Back Button */}
      <button
        onClick={() => onNavigate('/booking')}
        className="inline-flex items-center space-x-2 text-xs text-[#8A9A90] hover:text-white mb-6 bg-[#121814] border border-[#1F2B22] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Session Slot Selection</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left: Payment Gateway Form */}
        <div className="lg:col-span-7 bg-[#121814] border border-[#1F2B22] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">

          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
                Secure Checkout
              </h1>
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#00F076] bg-[#00F076]/15 px-2.5 py-1 rounded-full border border-[#00F076]/30">
                <Lock className="w-3 h-3 mr-1" />
                256-Bit SSL Sandbox
              </span>
            </div>
            <p className="text-xs text-[#8A9A90] mt-1">
              Select your payment method. Real-time bank authentication verified server-side.
            </p>
          </div>

          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'Card', label: 'Card', icon: CreditCard },
              { id: 'UPI', label: 'UPI / QR', icon: QrCode },
              { id: 'NetBanking', label: 'NetBanking', icon: Building },
              { id: 'Wallet', label: 'Wallet', icon: Wallet }
            ].map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => { setSelectedMethod(method.id); setErrorMessage(null); }}
                  className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#00F076]/15 border-[#00F076] text-[#00F076] font-bold shadow-[0_0_12px_rgba(0,240,118,0.2)]'
                      : 'bg-[#161F1A] border-[#223227] text-[#8A9A90] hover:text-white hover:border-[#3A4B40]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-[#00F076]' : 'text-[#8A9A90]'}`} />
                  <span className="text-xs">{method.label}</span>
                </button>
              );
            })}
          </div>

          {/* Payment Form Fields */}
          <form onSubmit={handlePayNow} className="space-y-4">

            {/* 1. CREDIT/DEBIT CARD */}
            {selectedMethod === 'Card' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#8A9A90]">Card Number</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCardNumber('4242 4242 4242 4242');
                        setCardExpiry('12/28');
                        setCardCvv('888');
                      }}
                      className="text-[11px] text-[#00F076] font-bold hover:underline cursor-pointer"
                    >
                      ⚡ Auto-fill Test Card
                    </button>
                  </div>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-[#8A9A90] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 •••• •••• 4242"
                      className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl pl-9 pr-3 py-2.5 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#8A9A90] mb-1">Expiry Date</label>
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl px-3 py-2.5 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#8A9A90] mb-1">CVV / CVC</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="•••"
                      className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl px-3 py-2.5 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8A9A90] mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Full Name as on card"
                    className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                </div>
              </div>
            )}

            {/* 2. UPI / QR */}
            {selectedMethod === 'UPI' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 bg-[#161F1A] border border-[#223227] rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-serif font-bold text-white">Instant UPI Dynamic QR</div>
                    <div className="text-[11px] text-[#8A9A90]">Scan with Google Pay, PhonePe, Paytm or BHIM</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-white/20">
                    <QrCode className="w-12 h-12 text-black" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8A9A90] mb-1">Or Enter UPI ID / VPA</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="username@bank"
                    className="w-full bg-[#161F1A] border border-[#223227] focus:border-[#00F076] focus:outline-none rounded-xl px-3 py-2.5 text-sm text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* 3. NETBANKING */}
            {selectedMethod === 'NetBanking' && (
              <div className="space-y-3 animate-fadeIn">
                <label className="block text-xs font-semibold text-[#8A9A90]">Select Banking Partner</label>
                <div className="grid grid-cols-2 gap-2">
                  {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBank(b)}
                      className={`p-3 text-xs text-left rounded-xl border transition-all cursor-pointer ${
                        selectedBank === b
                          ? 'bg-[#00F076]/15 text-[#00F076] border-[#00F076] font-bold'
                          : 'bg-[#161F1A] text-[#D1DDD5] border-[#223227] hover:border-[#3A4B40]'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. WALLET */}
            {selectedMethod === 'Wallet' && (
              <div className="p-4 bg-[#161F1A] border border-[#223227] rounded-2xl space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8A9A90]">CureFit Credits Balance</span>
                  <span className="text-base font-serif font-bold text-[#00F076]">₹ 2,500.00</span>
                </div>
                <p className="text-xs text-[#8A9A90]">
                  Your session payment of ₹{intent.totalAmount} will be deducted instantly from your CureFit wallet.
                </p>
              </div>
            )}

            {/* Sandbox Simulation Failure Toggle */}
            <div className="p-3.5 bg-[#161F1A] border border-[#223227] rounded-2xl flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-white flex items-center space-x-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Test Error Recovery Flow</span>
                </div>
                <div className="text-[10px] text-[#8A9A90]">Simulate bank decline to verify error handling & retry</div>
              </div>
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="w-4 h-4 accent-[#00F076] rounded cursor-pointer"
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-2xl text-xs text-red-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-red-200">Transaction Failed</div>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}

            {/* Submit Pay CTA */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-[#00F076] hover:bg-[#00E06D] disabled:opacity-50 text-black font-extrabold py-4 rounded-xl text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(0,240,118,0.25)] hover:shadow-[0_0_25px_rgba(0,240,118,0.4)] flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Transaction with Bank...</span>
                </>
              ) : (
                <span>Pay ₹ {intent.totalAmount} Securely</span>
              )}
            </button>
          </form>

        </div>

        {/* Right: Booking Order Summary */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121814] border border-[#1F2B22] rounded-3xl p-6 shadow-2xl space-y-5">
            <h2 className="text-base font-serif font-bold text-white border-b border-[#1F2B22] pb-3">
              Order Summary
            </h2>

            {/* Class Info */}
            <div className="flex space-x-3.5">
              <img
                src={intent.image}
                alt={intent.classTitle}
                className="w-16 h-16 rounded-xl object-cover border border-[#1F2B22] shrink-0"
              />
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-sm text-white">{intent.classTitle}</h3>
                <p className="text-xs text-[#8A9A90]">Trainer: {intent.coach}</p>
                <div className="inline-flex items-center text-[10px] font-semibold text-[#00F076] bg-[#00F076]/15 px-2 py-0.5 rounded border border-[#00F076]/30">
                  {intent.category || 'Group Fitness'}
                </div>
              </div>
            </div>

            {/* Session details */}
            <div className="bg-[#161F1A] border border-[#223227] rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#8A9A90]">
                <span className="flex items-center text-[#8A9A90]"><Calendar className="w-3.5 h-3.5 mr-1.5 text-[#00F076]" /> Date</span>
                <span className="font-semibold text-white">{intent.date}</span>
              </div>
              <div className="flex items-center justify-between text-[#8A9A90]">
                <span className="flex items-center text-[#8A9A90]"><Clock className="w-3.5 h-3.5 mr-1.5 text-[#00F076]" /> Time Slot</span>
                <span className="font-semibold text-[#00F076]">{intent.timeSlot}</span>
              </div>
              <div className="flex items-center justify-between text-[#8A9A90]">
                <span className="flex items-center text-[#8A9A90]"><MapPin className="w-3.5 h-3.5 mr-1.5 text-[#00F076]" /> Center</span>
                <span className="font-semibold truncate max-w-[150px] text-white">{intent.location || 'Indiranagar'}</span>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-2 pt-2 border-t border-[#1F2B22] text-xs">
              <div className="flex justify-between text-[#8A9A90]">
                <span>Session Fee</span>
                <span className="text-white font-mono">₹ {intent.subtotal}</span>
              </div>
              <div className="flex justify-between text-[#8A9A90]">
                <span>Studio Taxes & GST (18%)</span>
                <span className="text-[#00F076] font-semibold">₹ 0 (Waived)</span>
              </div>
              <div className="flex justify-between text-[#8A9A90]">
                <span>Convenience Fee</span>
                <span className="text-[#00F076] font-semibold">FREE</span>
              </div>
              <div className="flex justify-between text-base font-serif font-bold text-white pt-2 border-t border-[#1F2B22]">
                <span>Total Payable</span>
                <span className="text-[#00F076]">₹ {intent.totalAmount}</span>
              </div>
            </div>

            {/* Security banner */}
            <div className="flex items-center space-x-2 text-[11px] text-[#8A9A90] pt-2">
              <ShieldCheck className="w-4 h-4 text-[#00F076] shrink-0" />
              <span>Full refund guaranteed if cancelled up to 2 hours before the session.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
