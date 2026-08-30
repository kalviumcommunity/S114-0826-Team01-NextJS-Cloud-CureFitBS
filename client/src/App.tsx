import React, { useState, useEffect } from 'react';

// Environment Resolution
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

// Global Typography Styles (Bricolage Grotesque, Inter, IBM Plex Mono)
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', system-ui, sans-serif; background: #0A0F0C; color: #EDF2EF; }
  
  @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
  @keyframes lift-on-hover { 0% { transform: translateY(0); } 100% { transform: translateY(-3px); } }
`;

if (!document.head.querySelector('style[data-global]')) {
  const style = document.createElement('style');
  style.setAttribute('data-global', 'true');
  style.textContent = globalStyles;
  document.head.appendChild(style);
}

interface FitnessClass {
  id: string;
  name: string;
  trainer: string;
  capacity: number;
  available_seats: number;
  scheduled_time: string;
}

interface BookingHistory {
  booking_id: string;
  status: string;
  booked_at: string;
  class_id: string;
  class_name: string;
  trainer: string;
  scheduled_time: string;
}

// Helper: Real Unsplash Images for Workout Classes
const getClassImage = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('dance')) return 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop';
  if (lower.includes('hrx') || lower.includes('strength')) return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop';
  if (lower.includes('yoga') || lower.includes('mobility')) return 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&auto=format&fit=crop';
  return 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600&auto=format&fit=crop';
};

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'class_detail' | 'checkout' | 'profile' | 'settings'>('home');
  const [classes, setClasses] = useState<FitnessClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<FitnessClass | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('07:00 AM');
  
  // Auth State
  const [token, setToken] = useState<string | null>(localStorage.getItem('curefit_token'));
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('curefit_email'));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // History & Pagination State
  const [history, setHistory] = useState<BookingHistory[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Class Catalog
  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_BASE}/classes`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setClasses(data);
        if (!selectedClass && data.length > 0) setSelectedClass(data[0]);
      }
    } catch (err) {
      showToast('Failed to load class catalog', 'error');
    }
  };

  // Fetch Member Attendance History
  const fetchHistory = async (page = 1) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/bookings/my-history?page=${page}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setHistory(data.history || []);
        setHistoryPage(data.page);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      showToast('Failed to load history', 'error');
    }
  };

  // Real-Time WebSockets Synchronization Stream
  useEffect(() => {
    fetchClasses();

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => console.log('⚡ Connected to CureFit WebSocket Stream');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'SEAT_UPDATED') {
          setClasses((prev) =>
            prev.map((cls) =>
              cls.id === data.class_id ? { ...cls, available_seats: data.available_seats } : cls
            )
          );
          setSelectedClass((prev) =>
            prev && prev.id === data.class_id ? { ...prev, available_seats: data.available_seats } : prev
          );
        }
      } catch (e) {
        console.error('WS Parse Error', e);
      }
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (currentView === 'profile') fetchHistory(historyPage);
  }, [currentView, historyPage, token]);

  // Auth Handler
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'signup' ? '/auth/signup' : '/auth/login';

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Authentication failed', 'error');
        return;
      }

      localStorage.setItem('curefit_token', data.token);
      localStorage.setItem('curefit_email', data.user.email);
      setToken(data.token);
      setUserEmail(data.user.email);
      setShowAuthModal(false);
      showToast(`Welcome ${data.user.email}!`, 'success');
    } catch (err) {
      showToast('Authentication network error', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('curefit_token');
    localStorage.removeItem('curefit_email');
    setToken(null);
    setUserEmail(null);
    setCurrentView('home');
    showToast('Logged out', 'success');
  };

  // Atomic Booking Execution (Triggers Backend Transaction)
  const executeBooking = async () => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    if (!selectedClass) return;

    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ class_id: selectedClass.id })
      });

      const data = await res.json();

      if (res.status === 201) {
        showToast('🎉 Booking Confirmed! Seat locked.', 'success');
        setCurrentView('profile');
      } else if (res.status === 409) {
        showToast('🔴 Class Just Filled Up! Slot full.', 'error');
      } else if (res.status === 422) {
        showToast('ℹ️ You have already booked this session.', 'error');
      } else {
        showToast(data.error || 'Booking failed', 'error');
      }
    } catch (err) {
      showToast('Network error while booking', 'error');
    }
  };

  // Cancellation Handler
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const res = await fetch(`${API_BASE}/bookings/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ booking_id: bookingId })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Booking cancelled. Seat reopened!', 'success');
        fetchHistory(historyPage);
      } else {
        showToast(data.error || 'Cancellation failed', 'error');
      }
    } catch (err) {
      showToast('Cancellation error', 'error');
    }
  };

  // Live Activity Ticker Data (Real-Time Events)
  const tickerEvents = [
    'Priya just booked HRX Strength • 07:00 AM',
    '⚡ 2 seats left in Yoga Flow • 10:00 AM',
    'Arjun completed Dance Cardio • 3,200 kcal burned',
    'NEW: Pilates Plus class added • This Friday 5 PM',
    '🔴 URGENT: Only 1 seat left in boxing class!'
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0F0C', color: '#EDF2EF', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, padding: '12px 24px', borderRadius: 8, backgroundColor: toast.type === 'success' ? '#3DDC84' : '#EF4444', color: '#000', fontWeight: 'bold', fontFamily: 'IBM Plex Mono, monospace' }}>
          {toast.message}
        </div>
      )}

      {/* Top Navbar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 40px', backgroundColor: '#0A0F0C', borderBottom: '1px solid rgba(237,242,239,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setCurrentView('home')}>
          <div style={{ backgroundColor: '#3DDC84', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000' }}>c</div>
          <span style={{ fontSize: 20, fontWeight: 'bold', color: '#EDF2EF' }}>cure.fit</span>
        </div>

        <nav style={{ display: 'flex', gap: 32 }}>
          <button onClick={() => setCurrentView('home')} style={{ background: 'none', border: 'none', color: currentView === 'home' ? '#3DDC84' : '#8FA097', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>Explore</button>
          <button onClick={() => { if (selectedClass) setCurrentView('class_detail'); else setCurrentView('home'); }} style={{ background: 'none', border: 'none', color: currentView === 'class_detail' ? '#3DDC84' : '#8FA097', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>Bookings</button>
          <button onClick={() => setCurrentView('profile')} style={{ background: 'none', border: 'none', color: currentView === 'profile' ? '#3DDC84' : '#8FA097', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>My History</button>
          <button onClick={() => setCurrentView('settings')} style={{ background: 'none', border: 'none', color: currentView === 'settings' ? '#3DDC84' : '#8FA097', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>Settings</button>
        </nav>

        <div>
          {token ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, color: '#8FA097' }}>{userEmail}</span>
              <button onClick={handleLogout} style={{ backgroundColor: '#131A16', color: '#EDF2EF', border: '1px solid rgba(237,242,239,0.08)', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Logout</button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} style={{ backgroundColor: '#3DDC84', color: '#000', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}>BOOK CLASS</button>
          )}
        </div>
      </header>

      {/* Live Activity Ticker */}
      <div style={{ backgroundColor: '#131A16', borderBottom: '1px solid rgba(237,242,239,0.08)', padding: '8px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 40px', animation: 'scroll-left 15s linear infinite' }}>
          <span style={{ color: '#3DDC84', fontWeight: 'bold', fontSize: 12, flexShrink: 0 }}>⚡ LIVE</span>
          {tickerEvents.map((event, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingRight: 40 }}>
              <span style={{ width: 6, height: 6, backgroundColor: '#3DDC84', borderRadius: '50%', animation: 'pulse-dot 1.4s infinite' }}></span>
              <span style={{ fontSize: 12, color: '#8FA097', fontFamily: 'IBM Plex Mono, monospace' }}>{event}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main View Router */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        
        {/* ===================================================
            SCREEN 1: LANDING & DISCOVERY PAGE (FIGMA SCREEN 1)
           =================================================== */}
        {currentView === 'home' && (
          <div>
            {/* Hero Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center', marginBottom: 60 }}>
              <div>
                <span style={{ fontSize: 11, backgroundColor: 'rgba(61,220,132,0.12)', color: '#3DDC84', padding: '6px 12px', borderRadius: 20, fontWeight: 'bold', letterSpacing: 1, fontFamily: 'IBM Plex Mono, monospace' }}>⚡ LIVE & ON-DEMAND</span>
                <h1 style={{ fontSize: 48, fontWeight: 800, margin: '20px 0', lineHeight: 1.1, fontFamily: 'Bricolage Grotesque, sans-serif', letterSpacing: '-0.025em' }}>
                  Transform Your <span style={{ fontStyle: 'italic', color: '#3DDC84' }}>Fitness</span> Journey
                </h1>
                <p style={{ color: '#8FA097', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>Book live classes, track progress, and join a community of 50,000+ members. Choose from dance, yoga, boxing, and high-intensity strength programs coached by experts.</p>
                <div style={{ display: 'flex', gap: 16 }}>
                  <button 
                    onClick={() => { if (classes.length > 0) setSelectedClass(classes[0]); setCurrentView('class_detail'); }} 
                    style={{ backgroundColor: '#3DDC84', color: '#000', border: 'none', padding: '14px 28px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 14, transition: 'all 0.2s', boxShadow: '0 8px 24px -8px rgba(61,220,132,0.3)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 32px -8px rgba(61,220,132,0.5)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(61,220,132,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    EXPLORE CLASSES
                  </button>
                  <button 
                    style={{ backgroundColor: 'transparent', color: '#EDF2EF', border: '1px solid rgba(237,242,239,0.16)', padding: '14px 28px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 14, transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3DDC84'; e.currentTarget.style.color = '#3DDC84'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(237,242,239,0.16)'; e.currentTarget.style.color = '#EDF2EF'; }}
                  >
                    VIEW MEMBERSHIPS
                  </button>
                </div>
              </div>
              {/* Real Hero Banner Image */}
              <div style={{ borderRadius: 12, overflow: 'hidden', height: 280, border: '1px solid #20302A' }}>
                <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop" alt="Fitness Journey" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>

            {/* Stats Bar with Accent Line */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 60 }}>
              <div style={{ backgroundColor: '#131A16', padding: 28, borderRadius: 14, border: '1px solid rgba(237,242,239,0.08)', borderTop: '2px solid #3DDC84' }}>
                <h2 style={{ fontSize: 36, margin: 0, color: '#3DDC84', fontFamily: 'IBM Plex Mono, monospace' }}>50K+</h2>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#8FA097' }}>Active Members across 12 major centers</p>
              </div>
              <div style={{ backgroundColor: '#131A16', padding: 28, borderRadius: 14, border: '1px solid rgba(237,242,239,0.08)', borderTop: '2px solid #3DDC84' }}>
                <h2 style={{ fontSize: 36, margin: 0, color: '#3DDC84', fontFamily: 'IBM Plex Mono, monospace' }}>200+</h2>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#8FA097' }}>Classes weekly, live-streamed & on-demand</p>
              </div>
              <div style={{ backgroundColor: '#131A16', padding: 28, borderRadius: 14, border: '1px solid rgba(237,242,239,0.08)', borderTop: '2px solid #3DDC84' }}>
                <h2 style={{ fontSize: 36, margin: 0, color: '#3DDC84', fontFamily: 'IBM Plex Mono, monospace' }}>4.8 ★</h2>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#8FA097' }}>Average rating from 120,000+ reviews</p>
              </div>
            </div>

            {/* Popular Classes Section with Real Images */}
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 28, marginBottom: 24, fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}>Popular This Week</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    onClick={() => { setSelectedClass(cls); setCurrentView('class_detail'); }}
                    style={{ backgroundColor: '#131A16', borderRadius: 12, padding: 0, border: '1px solid rgba(237,242,239,0.08)', cursor: 'pointer', transition: 'all 0.3s', overflow: 'hidden' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(237,242,239,0.16)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(237,242,239,0.08)'; }}
                  >
                    <div style={{ height: 140, borderRadius: 0, overflow: 'hidden', marginBottom: 0, position: 'relative' }}>
                      <img src={getClassImage(cls.name)} alt={cls.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {/* Urgency Badge */}
                      <div style={{ position: 'absolute', top: 12, right: 12, padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 'bold', fontFamily: 'IBM Plex Mono, monospace', backgroundColor: cls.available_seats > 5 ? 'rgba(61,220,132,0.9)' : 'rgba(255,176,32,0.9)', color: '#000' }}>
                        {cls.available_seats > 5 ? '🟢 Plenty' : cls.available_seats > 0 ? '🟡 ' + cls.available_seats : '🔴 Full'}
                      </div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <h3 style={{ fontSize: 16, margin: '0 0 6px', fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 600 }}>{cls.name}</h3>
                      <p style={{ color: '#8FA097', fontSize: 12, margin: '0 0 12px' }}>{cls.trainer}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: '#3DDC84' }}>₹599</span>
                        <span style={{ fontSize: 11, color: '#576059' }}>{cls.capacity} capacity</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            SCREEN 2: CLASS DETAIL & SLOT SELECTOR (FIGMA SCREEN 2)
           =================================================== */}
        {currentView === 'class_detail' && selectedClass && (
          <div>
            <div style={{ fontSize: 12, color: '#8FA097', marginBottom: 20 }}>
              Home &gt; Classes &gt; <span style={{ color: '#3DDC84' }}>{selectedClass.name}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
              {/* Left Column: Details */}
              <div>
                <div style={{ height: 260, borderRadius: 12, overflow: 'hidden', marginBottom: 24, border: '1px solid rgba(237,242,239,0.08)' }}>
                  <img src={getClassImage(selectedClass.name)} alt={selectedClass.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <h2 style={{ fontSize: 28, margin: '0 0 16px', fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>About the Class</h2>
                <p style={{ color: '#8FA097', lineHeight: 1.7, fontSize: 14, marginBottom: 28 }}>
                  {selectedClass.name} is a high-energy group session designed to burn calories and release endorphins. Coached by expert trainers at premier studio locations.
                </p>

                <h3 style={{ fontSize: 14, marginBottom: 14, fontFamily: 'IBM Plex Mono, monospace', color: '#3DDC84', fontWeight: 600, letterSpacing: 0.5 }}>YOUR COACH</h3>
                <div style={{ backgroundColor: '#131A16', padding: 18, borderRadius: 10, border: '1px solid rgba(237,242,239,0.08)', display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ backgroundColor: '#1A2320', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👤</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, color: '#EDF2EF', fontFamily: 'Bricolage Grotesque, sans-serif' }}>{selectedClass.trainer}</h4>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#809790' }}>Senior Fitness Instructor • Certified Strength & Conditioning Specialist</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Floating Secure Slot Panel */}
              <div style={{ backgroundColor: '#131A16', padding: 28, borderRadius: 12, border: '1px solid rgba(237,242,239,0.08)', height: 'fit-content', position: 'sticky', top: 100 }}>
                <span style={{ fontSize: 11, color: '#3DDC84', fontWeight: 'bold', letterSpacing: 1, fontFamily: 'IBM Plex Mono, monospace' }}>⚡ SECURE YOUR SLOT</span>
                <h2 style={{ fontSize: 20, margin: '12px 0 8px', fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>{selectedClass.name}</h2>
                <p style={{ color: '#8FA097', fontSize: 12, marginBottom: 24 }}>Trainer: {selectedClass.trainer}</p>

                <label style={{ fontSize: 11, color: '#576059', display: 'block', marginBottom: 10, fontWeight: 600, letterSpacing: 0.5 }}>SELECT SESSION TIME</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {['07:00 AM', '10:00 AM', '06:30 PM'].map((slot) => (
                    <div
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: '12px 14px', borderRadius: 8, border: selectedSlot === slot ? '1px solid #3DDC84' : '1px solid rgba(237,242,239,0.08)',
                        backgroundColor: selectedSlot === slot ? 'rgba(61,220,132,0.12)' : '#0A0F0C', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { if (selectedSlot !== slot) e.currentTarget.style.borderColor = 'rgba(237,242,239,0.16)'; }}
                      onMouseLeave={(e) => { if (selectedSlot !== slot) e.currentTarget.style.borderColor = 'rgba(237,242,239,0.08)'; }}
                    >
                      <span style={{ fontSize: 13, fontWeight: selectedSlot === slot ? 600 : 400 }}>{slot}</span>
                      {selectedSlot === slot && <span style={{ fontSize: 11, color: '#3DDC84', fontFamily: 'IBM Plex Mono, monospace' }}>✓ Selected</span>}
                    </div>
                  ))}
                </div>

                {/* Real-Time WebSockets Seat Indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '12px 0', borderTop: '1px solid rgba(237,242,239,0.08)', borderBottom: '1px solid rgba(237,242,239,0.08)' }}>
                  <span style={{ fontSize: 13, fontWeight: selectedClass.available_seats > 0 ? 600 : 500, color: selectedClass.available_seats > 0 ? '#3DDC84' : '#FFB020' }}>
                    {selectedClass.available_seats > 0 ? `⚡ ${selectedClass.available_seats} left` : `🔴 URGENT: ${selectedClass.available_seats} left`}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>₹ 599</span>
                </div>

                <button
                  onClick={() => setCurrentView('checkout')}
                  disabled={selectedClass.available_seats === 0}
                  style={{
                    width: '100%', padding: 14, borderRadius: 8, border: 'none', fontWeight: 'bold', fontSize: 15, cursor: selectedClass.available_seats === 0 ? 'not-allowed' : 'pointer',
                    backgroundColor: selectedClass.available_seats === 0 ? '#1A2320' : '#3DDC84', color: selectedClass.available_seats === 0 ? '#576059' : '#000', transition: 'all 0.2s',
                    boxShadow: selectedClass.available_seats === 0 ? 'none' : '0 8px 24px -8px rgba(61,220,132,0.5)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedClass.available_seats > 0) {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 12px 32px -8px rgba(61,220,132,0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedClass.available_seats > 0) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(61,220,132,0.5)';
                    }
                  }}
                >
                  {selectedClass.available_seats === 0 ? 'FULLY BOOKED' : 'PROCEED TO CHECKOUT'}
                </button>
                <p style={{ fontSize: 11, color: '#576059', marginTop: 12, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace' }}>✓ 100% Secure Booking • No hidden charges</p>\n              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            SCREEN 3: CHECKOUT PAGE (FIGMA SCREEN 4)
           =================================================== */}
        {currentView === 'checkout' && selectedClass && (
          <div>
            <h1 style={{ fontSize: 32, marginBottom: 28, fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}>Checkout</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }}>
              
              {/* Summary */}
              <div style={{ backgroundColor: '#131A16', padding: 28, borderRadius: 12, border: '1px solid rgba(237,242,239,0.08)' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 18, fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>Booking Summary</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, borderBottom: '1px solid rgba(237,242,239,0.08)', paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8FA097' }}>Class</span><span>{selectedClass.name}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8FA097' }}>Slot</span><span>{selectedSlot}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8FA097' }}>Trainer</span><span>{selectedClass.trainer}</span></div>
                </div>

                <h4 style={{ margin: '16px 0 12px', fontSize: 12, color: '#576059', fontWeight: 600, letterSpacing: 0.5, fontFamily: 'IBM Plex Mono, monospace' }}>PRICE DETAILS</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Session Fee</span><span>₹599</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>GST (18%)</span><span>₹108</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3DDC84' }}><span>Discount Applied</span><span>-₹100</span></div>
                  <hr style={{ borderColor: 'rgba(237,242,239,0.08)', margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 16 }}><span>Total Amount</span><span style={{ color: '#3DDC84' }}>₹607</span></div>
                </div>
              </div>

              {/* Payment Action */}
              <div style={{ backgroundColor: '#131A16', padding: 28, borderRadius: 12, border: '1px solid rgba(237,242,239,0.08)', height: 'fit-content' }}>
                <h3 style={{ margin: '0 0 18px', fontSize: 18, fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>Payment Method</h3>
                <div style={{ padding: 14, borderRadius: 8, border: '1px solid #3DDC84', backgroundColor: 'rgba(61,220,132,0.12)', marginBottom: 20, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>
                  💳 Credit / Debit Card (100% Secure SSL)
                </div>

                <button
                  onClick={executeBooking}
                  style={{ width: '100%', padding: 14, backgroundColor: '#3DDC84', color: '#000', border: 'none', borderRadius: 8, fontWeight: 'bold', fontSize: 15, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 8px 24px -8px rgba(61,220,132,0.5)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px -8px rgba(61,220,132,0.6)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(61,220,132,0.5)'; }}
                >
                  Pay ₹607 & Confirm Booking
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ===================================================
            SCREEN 4: PROFILE & HISTORY (FIGMA SCREEN 3)
           =================================================== */}
        {currentView === 'profile' && (
          <div>
            {/* Header User Card */}
            <div style={{ backgroundColor: '#131A16', padding: 28, borderRadius: 12, border: '1px solid rgba(237,242,239,0.08)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid #3DDC84', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, backgroundColor: '#1A2320' }}>👤</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>Rahul Sharma <span style={{ fontSize: 11, backgroundColor: 'rgba(61,220,132,0.12)', color: '#3DDC84', padding: '4px 10px', borderRadius: 12, fontFamily: 'IBM Plex Mono, monospace' }}>Pro Member</span></h2>
                <p style={{ margin: '6px 0 0', color: '#8FA097', fontSize: 12 }}>{userEmail || 'rahul.sharma@example.com'} • +91 98765 43210</p>
              </div>
            </div>

            {/* Lifetime Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              <div style={{ backgroundColor: '#131A16', padding: 24, borderRadius: 10, border: '1px solid rgba(237,242,239,0.08)', borderTop: '2px solid #3DDC84' }}>
                <span style={{ fontSize: 11, color: '#576059', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>CLASSES</span>
                <h3 style={{ fontSize: 32, margin: '6px 0 0', color: '#3DDC84', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>84</h3>
              </div>
              <div style={{ backgroundColor: '#131A16', padding: 24, borderRadius: 10, border: '1px solid rgba(237,242,239,0.08)', borderTop: '2px solid #3DDC84' }}>
                <span style={{ fontSize: 11, color: '#576059', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>STREAK</span>
                <h3 style={{ fontSize: 32, margin: '6px 0 0', color: '#3DDC84', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>12d</h3>
              </div>
              <div style={{ backgroundColor: '#131A16', padding: 24, borderRadius: 10, border: '1px solid rgba(237,242,239,0.08)', borderTop: '2px solid #3DDC84' }}>
                <span style={{ fontSize: 11, color: '#576059', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>CALORIES</span>
                <h3 style={{ fontSize: 32, margin: '6px 0 0', color: '#3DDC84', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>24k</h3>
              </div>
              <div style={{ backgroundColor: '#131A16', padding: 24, borderRadius: 10, border: '1px solid rgba(237,242,239,0.08)', borderTop: '2px solid #3DDC84' }}>
                <span style={{ fontSize: 11, color: '#576059', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>FAVORITE</span>
                <h3 style={{ fontSize: 18, margin: '6px 0 0', color: '#3DDC84', fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 600 }}>HRX</h3>
              </div>
            </div>

            {/* Upcoming & History Bookings Ledger */}
            <div style={{ backgroundColor: '#131F1B', borderRadius: 12, padding: 24, border: '1px solid #20302A' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 20 }}>My Session Ledger (Paginated)</h3>
              
              {history.length === 0 ? (
                <p style={{ color: '#809790' }}>No session bookings found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {history.map((item) => (
                    <div key={item.booking_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#0B1310', borderRadius: 8, border: '1px solid #20302A' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>{item.class_name}</h4>
                        <p style={{ margin: 0, color: '#809790', fontSize: 13 }}>{item.trainer} • Booked: {new Date(item.booked_at).toLocaleDateString()}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 'bold',
                          backgroundColor: item.status === 'booked' ? 'rgba(0,230,118,0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: item.status === 'booked' ? '#00E676' : '#EF4444'
                        }}>
                          {item.status.toUpperCase()}
                        </span>
                        {item.status === 'booked' && (
                          <button onClick={() => handleCancelBooking(item.booking_id)} style={{ backgroundColor: '#EF4444', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Pagination Controls */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 }}>
                    <button disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => p - 1)} style={{ padding: '6px 16px', backgroundColor: '#20302A', border: 'none', color: '#FFF', borderRadius: 6, cursor: 'pointer' }}>Previous</button>
                    <span style={{ fontSize: 13, color: '#809790' }}>Page {historyPage} of {totalPages}</span>
                    <button disabled={historyPage >= totalPages} onClick={() => setHistoryPage((p) => p + 1)} style={{ padding: '6px 16px', backgroundColor: '#20302A', border: 'none', color: '#FFF', borderRadius: 6, cursor: 'pointer' }}>Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================
            SCREEN 5: ACCOUNT SETTINGS (FIGMA SCREEN 5)
           =================================================== */}
        {currentView === 'settings' && (
          <div style={{ backgroundColor: '#131F1B', padding: 32, borderRadius: 12, border: '1px solid #20302A', maxWidth: 600, margin: '0 auto' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 24 }}>Account Settings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: '#809790', display: 'block', marginBottom: 6 }}>Full Name</label>
                <input type="text" defaultValue="Rahul Sharma" style={{ width: '100%', padding: 10, borderRadius: 6, backgroundColor: '#0B1310', border: '1px solid #20302A', color: '#FFF' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#809790', display: 'block', marginBottom: 6 }}>Email Address</label>
                <input type="email" defaultValue={userEmail || 'rahul.sharma@example.com'} style={{ width: '100%', padding: 10, borderRadius: 6, backgroundColor: '#0B1310', border: '1px solid #20302A', color: '#FFF' }} />
              </div>
              <button style={{ backgroundColor: '#00E676', color: '#000', border: 'none', padding: 12, borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', marginTop: 12 }}>Save Changes</button>
            </div>
          </div>
        )}

      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#131F1B', padding: 32, borderRadius: 12, width: 360, border: '1px solid #20302A' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 20 }}>{authMode === 'login' ? 'Sign In to CureFit' : 'Create Account'}</h3>
            <form onSubmit={handleAuth}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#809790' }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #20302A', backgroundColor: '#0B1310', color: '#FFF' }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#809790' }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #20302A', backgroundColor: '#0B1310', color: '#FFF' }} />
              </div>
              <button type="submit" style={{ width: '100%', padding: 12, backgroundColor: '#00E676', color: '#000', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', marginBottom: 12 }}>
                {authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: '#809790', fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'center' }}>
              {authMode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: 80, borderTop: '1px solid #1A2E26', padding: '40px', backgroundColor: '#0A110D', color: '#809790', fontSize: 13 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 'bold', color: '#FFF' }}>cure.fit</span>
            <p style={{ margin: '4px 0 0' }}>Making group fitness fun, accessible, and trackable.</p>
          </div>
          <p style={{ margin: 0 }}>© 2026 cure.fit. Built for fitness goals.</p>
        </div>
      </footer>

    </div>
  );
}