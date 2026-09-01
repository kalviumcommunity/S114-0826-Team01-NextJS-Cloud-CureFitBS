import React, { useEffect, useState, useCallback } from 'react';

export default function App() {
  // Navigation & User State
  const [activeTab, setActiveTab] = useState('classes'); // 'classes', 'history', 'auth'
  const [authMode, setAuthMode] = useState('login'); // 'login', 'signup'
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('curefit_user')) || null);
  const [token, setToken] = useState(localStorage.getItem('curefit_token') || '');

  // Auth Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Customer');

  // Data States
  const [classes, setClasses] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Read backend & websocket URLs from Netlify env or fallback to local
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

  // Show Toast Notifications
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 4000);
  };

  // 1. FETCH CLASSES
  const fetchClasses = useCallback(() => {
    fetch(`${API_BASE}/api/classes`)
      .then((res) => res.json())
      .then((data) => {
        setClasses(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch classes error:', err);
        setLoading(false);
      });
  }, [API_BASE]);

  // 2. FETCH PAGINATED HISTORY
  const fetchHistory = useCallback(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/bookings/my-history?page=${page}&limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.history || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => console.error('Fetch history error:', err));
  }, [API_BASE, token, page]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory]);

  // 3. REAL-TIME WEBSOCKET LISTENER (PRD Section 10.1)
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(WS_URL);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'SEAT_UPDATED') {
          // Instantly update seat count in local React state
          setClasses((prev) =>
            prev.map((c) =>
              c.id === data.class_id ? { ...c, available_seats: data.available_seats } : c
            )
          );
        }
      };
    } catch (err) {
      console.warn('WebSocket connection failed:', err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [WS_URL]);

  // AUTHENTICATION HANDLER
  const handleAuth = (e) => {
    e.preventDefault();
    const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
    
    fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        
        localStorage.setItem('curefit_token', data.token);
        localStorage.setItem('curefit_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        showToast(`Welcome ${data.user.email}!`, 'success');
        setActiveTab('classes');
        setEmail('');
        setPassword('');
      })
      .catch((err) => showToast(err.message, 'error'));
  };

  const handleLogout = () => {
    localStorage.removeItem('curefit_token');
    localStorage.removeItem('curefit_user');
    setToken('');
    setUser(null);
    showToast('Logged out successfully', 'info');
    setActiveTab('classes');
  };

  // BOOK CLASS HANDLER (PRD Section 7.3)
  const handleBookClass = (classId) => {
    if (!token) {
      showToast('Please login to book a class', 'error');
      setActiveTab('auth');
      return;
    }

    fetch(`${API_BASE}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ class_id: classId })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        showToast('🎉 Booking Confirmed! Seat locked.', 'success');
        fetchClasses();
      })
      .catch((err) => showToast(err.message, 'error'));
  };

  // CANCEL BOOKING HANDLER
  const handleCancelBooking = (bookingId) => {
    fetch(`${API_BASE}/api/bookings/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ booking_id: bookingId })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        showToast('Booking cancelled. Seat reopened.', 'info');
        fetchHistory();
        fetchClasses();
      })
      .catch((err) => showToast(err.message, 'error'));
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* TOAST NOTIFICATION */}
      {toast.message && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', padding: '14px 24px', borderRadius: '8px',
          background: toast.type === 'error' ? '#f44336' : toast.type === 'info' ? '#2196F3' : '#4CAF50',
          color: '#fff', fontWeight: 'bold', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {toast.message}
        </div>
      )}

      {/* HEADER NAVBAR */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2c3840', paddingBottom: '20px', marginBottom: '30px' }}>
        <h2 style={{ margin: 0, color: '#4CAF50', cursor: 'pointer' }} onClick={() => setActiveTab('classes')}>CURE.FIT</h2>
        <nav style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => setActiveTab('classes')} style={{ background: activeTab === 'classes' ? '#2c3840' : 'transparent', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Classes</button>
          {user && <button onClick={() => setActiveTab('history')} style={{ background: activeTab === 'history' ? '#2c3840' : 'transparent', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>My History</button>}
          {user ? (
            <button onClick={handleLogout} style={{ background: '#f44336', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Logout ({user.email.split('@')[0]})</button>
          ) : (
            <button onClick={() => setActiveTab('auth')} style={{ background: '#4CAF50', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Login / Signup</button>
          )}
        </nav>
      </header>

      {/* SECTION 1: CLASSES CATALOG */}
      {activeTab === 'classes' && (
        <div>
          <h2 style={{ marginBottom: '8px' }}>Book Your Workout Session</h2>
          <p style={{ color: '#888', marginBottom: '30px' }}>⚡ Live seat counts update automatically across all screens in real-time.</p>

          {loading ? (
            <p>Loading classes...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {classes.map((c) => (
                <div key={c.id} style={{ background: '#1e272c', borderRadius: '12px', padding: '24px', border: '1px solid #2c3840' }}>
                  <h3 style={{ marginTop: 0, color: '#fff' }}>{c.name}</h3>
                  <p style={{ color: '#aaa', margin: '6px 0' }}>🏋️ Trainer: {c.trainer}</p>
                  <p style={{ color: '#888', fontSize: '0.85rem' }}>⏰ {new Date(c.scheduled_time).toLocaleString()}</p>

                  <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', margin: '16px 0', background: c.available_seats > 0 ? '#1b382b' : '#3d1b1b', color: c.available_seats > 0 ? '#4CAF50' : '#f44336' }}>
                    {c.available_seats > 0 ? `🟢 ${c.available_seats} Seats Left` : '🔴 Class Full'}
                  </div>

                  <button
                    onClick={() => handleBookClass(c.id)}
                    disabled={c.available_seats <= 0}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: c.available_seats > 0 ? '#4CAF50' : '#444', color: '#fff', fontWeight: 'bold', cursor: c.available_seats > 0 ? 'pointer' : 'not-allowed' }}
                  >
                    {c.available_seats > 0 ? 'Book Class' : 'Full'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: PAGINATED ATTENDANCE HISTORY */}
      {activeTab === 'history' && (
        <div>
          <h2>My Attendance History</h2>
          <p style={{ color: '#888', marginBottom: '20px' }}>Paginated ledger of your workout bookings.</p>

          {history.length === 0 ? (
            <p style={{ color: '#aaa' }}>No booking history found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((h) => (
                <div key={h.booking_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e272c', padding: '16px 20px', borderRadius: '8px', border: '1px solid #2c3840' }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#fff' }}>{h.class_name}</h4>
                    <p style={{ color: '#aaa', margin: '4px 0 0 0', fontSize: '0.85rem' }}>Coach: {h.trainer} • {new Date(h.booked_at).toLocaleDateString()}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', background: h.status === 'booked' ? '#1b382b' : '#3d1b1b', color: h.status === 'booked' ? '#4CAF50' : '#f44336' }}>
                      {h.status.toUpperCase()}
                    </span>

                    {h.status === 'booked' && (
                      <button onClick={() => handleCancelBooking(h.booking_id)} style={{ background: '#f44336', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* PAGINATION CONTROLS */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: page <= 1 ? '#333' : '#2c3840', color: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
                <span style={{ display: 'flex', alignItems: 'center', color: '#aaa' }}>Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: page >= totalPages ? '#333' : '#2c3840', color: '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: AUTHENTICATION MODAL */}
      {activeTab === 'auth' && (
        <div style={{ maxWidth: '400px', margin: '40px auto', background: '#1e272c', padding: '30px', borderRadius: '12px', border: '1px solid #2c3840' }}>
          <h2 style={{ textAlign: 'center', marginTop: 0 }}>{authMode === 'login' ? 'Login to CureFit' : 'Create Account'}</h2>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #3c4850', background: '#12181b', color: '#fff' }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #3c4850', background: '#12181b', color: '#fff' }} />

            {authMode === 'signup' && (
              <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #3c4850', background: '#12181b', color: '#fff' }}>
                <option value="Customer">Customer Role</option>
                <option value="Owner">Studio Owner Role</option>
              </select>
            )}

            <button type="submit" style={{ padding: '12px', borderRadius: '6px', border: 'none', background: '#4CAF50', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
              {authMode === 'login' ? 'Sign In' : 'Register Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#aaa', marginTop: '20px', fontSize: '0.9rem' }}>
            {authMode === 'login' ? "Don't have an account?" : 'Already registered?'}
            <span onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ color: '#4CAF50', cursor: 'pointer', marginLeft: '6px', fontWeight: 'bold' }}>
              {authMode === 'login' ? 'Sign Up' : 'Log In'}
            </span>
          </p>
        </div>
      )}

    </div>
  );
}