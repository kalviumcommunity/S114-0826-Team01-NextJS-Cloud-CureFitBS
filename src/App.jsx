import React, { useEffect, useState, useCallback } from 'react';

export default function App() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('curefit_user') || 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('curefit_token') || '');
  
  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Toast Alert State
  const [toast, setToast] = useState(null);

  // Read environment variables
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Classes
  const fetchClasses = useCallback(() => {
    fetch(`${API_BASE}/api/classes`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setClasses(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setLoading(false);
      });
  }, [API_BASE]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // 2. Real-Time WebSockets Listener
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'SEAT_UPDATED') {
          setClasses((prev) =>
            prev.map((c) =>
              c.id === data.class_id ? { ...c, available_seats: data.available_seats } : c
            )
          );
        }
      };
    } catch (e) {
      console.warn('WS error:', e);
    }
    return () => ws && ws.close();
  }, [WS_URL]);

  // 3. Login / Signup Handler
  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');

      localStorage.setItem('curefit_token', data.token);
      localStorage.setItem('curefit_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
      notify(`Welcome ${data.user.email}!`, 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('curefit_token');
    localStorage.removeItem('curefit_user');
    setToken('');
    setUser(null);
    notify('Logged out successfully', 'info');
  };

  // 4. Book Class Handler
  const handleBookClass = async (classId) => {
    if (!token) {
      notify('Please login to book a class!', 'error');
      setShowAuthModal(true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ class_id: classId })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Booking failed');

      notify('🎉 Booking confirmed! Seat locked.', 'success');
      fetchClasses();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* TOAST ALERT */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', padding: '14px 24px', borderRadius: '8px',
          background: toast.type === 'error' ? '#f44336' : toast.type === 'info' ? '#2196F3' : '#4CAF50',
          color: '#fff', fontWeight: 'bold', zIndex: 9999, boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER / NAVBAR */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid #2c3840', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ color: '#4CAF50', margin: 0, fontSize: '2rem' }}>CureFit Class Booking</h1>
          <p style={{ color: '#888', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Real-Time Live Seat Availability Engine</p>
        </div>
        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ color: '#aaa', fontSize: '0.9rem' }}>👤 {user.email.split('@')[0]}</span>
              <button onClick={handleLogout} style={{ background: '#f44336', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Logout
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} style={{ background: '#4CAF50', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Login / Sign Up
            </button>
          )}
        </div>
      </header>

      {/* CLASS GRID */}
      {loading ? (
        <p style={{ textAlign: 'center' }}>Loading classes from server...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {classes.map((c) => (
            <div key={c.id} style={{ background: '#1e272c', borderRadius: '12px', padding: '24px', border: '1px solid #2c3840', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0, fontSize: '1.3rem' }}>{c.name}</h3>
              <p style={{ color: '#aaa', margin: '8px 0' }}>🏋️ Trainer: {c.trainer}</p>

              <div style={{
                display: 'inline-block', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', margin: '12px 0 20px 0',
                background: c.available_seats > 0 ? '#1b382b' : '#3d1b1b', color: c.available_seats > 0 ? '#4CAF50' : '#f44336'
              }}>
                {c.available_seats > 0 ? `🟢 ${c.available_seats} Seats Left` : '🔴 Class Full'}
              </div>

              <button
                onClick={() => handleBookClass(c.id)}
                disabled={c.available_seats <= 0}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                  background: c.available_seats > 0 ? '#4CAF50' : '#444', color: '#fff', fontWeight: 'bold',
                  cursor: c.available_seats > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s'
                }}
              >
                {c.available_seats > 0 ? 'Book Class' : 'Full'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#1e272c', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '380px', border: '1px solid #2c3840' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{isSignup ? 'Create Account' : 'Login to Book'}</h3>
              <button onClick={() => setShowAuthModal(false)} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #3c4850', background: '#12181b', color: '#fff' }} />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #3c4850', background: '#12181b', color: '#fff' }} />

              <button type="submit" style={{ padding: '12px', borderRadius: '6px', border: 'none', background: '#4CAF50', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                {isSignup ? 'Register & Login' : 'Sign In'}
              </button>
            </form>

            <p style={{ textAlign: 'center', color: '#aaa', marginTop: '20px', fontSize: '0.85rem' }}>
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
              <span onClick={() => setIsSignup(!isSignup)} style={{ color: '#4CAF50', cursor: 'pointer', marginLeft: '6px', fontWeight: 'bold' }}>
                {isSignup ? 'Log In' : 'Sign Up'}
              </span>
            </p>
          </div>
        </div>
      )}

    </div>
  );
}