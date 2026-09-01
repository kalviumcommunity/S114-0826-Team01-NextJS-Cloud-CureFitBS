import React, { useEffect, useState } from 'react';

export default function App() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Read backend URL from environment or default to local/vercel
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API_BASE}/api/classes`)
      .then((res) => res.json())
      .then((data) => {
        setClasses(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch classes:', err);
        setLoading(false);
      });
  }, [API_BASE]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#4CAF50', fontSize: '2.5rem' }}>CureFit Class Booking</h1>
        <p style={{ color: '#888' }}>Real-Time Live Seat Availability Engine</p>
      </header>

      {loading ? (
        <p style={{ textAlign: 'center' }}>Loading fitness classes...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {classes.map((c) => (
            <div
              key={c.id}
              style={{
                background: '#1e272c',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #2c3840'
              }}
            >
              <h3 style={{ marginTop: 0 }}>{c.name}</h3>
              <p style={{ color: '#aaa' }}>🏋️ Trainer: {c.trainer}</p>
              
              <div
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  marginBottom: '16px',
                  background: c.available_seats > 0 ? '#1b382b' : '#3d1b1b',
                  color: c.available_seats > 0 ? '#4CAF50' : '#f44336'
                }}
              >
                {c.available_seats > 0 ? `🟢 ${c.available_seats} Seats Left` : '🔴 Class Full'}
              </div>

              <button
                disabled={c.available_seats <= 0}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: c.available_seats > 0 ? '#4CAF50' : '#444',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: c.available_seats > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                {c.available_seats > 0 ? 'Book Class' : 'Full'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}