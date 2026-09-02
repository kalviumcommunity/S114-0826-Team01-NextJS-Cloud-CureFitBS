import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const RealtimeContext = createContext(undefined);

export const RealtimeProvider = ({ children }) => {
  const [liveEvents, setLiveEvents] = useState([
    { id: 'evt-1', type: 'booking', text: '⚡ Riya just booked HRX Strength • 07:00 AM', timestamp: new Date().toISOString() },
    { id: 'evt-2', type: 'seat_alert', text: '🔥 2 seats left in Yoga & Breathwork • 10:00 AM', timestamp: new Date().toISOString() },
    { id: 'evt-3', type: 'completion', text: '✨ Arjun completed Dance Cardio • 520 kcal burned', timestamp: new Date().toISOString() },
    { id: 'evt-4', type: 'announcement', text: '🚀 NEW: Pilates Plus class added • This Friday 5:00 PM', timestamp: new Date().toISOString() },
    { id: 'evt-5', type: 'seat_alert', text: '⚡ Only 1 seat left in HIIT Sweat Circuit • 06:30 PM', timestamp: new Date().toISOString() }
  ]);
  const [seatUpdates, setSeatUpdates] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'INITIAL_STATE') {
              if (data.payload.liveEvents) {
                setLiveEvents(data.payload.liveEvents);
              }
              if (data.payload.classes) {
                const map = {};
                data.payload.classes.forEach((c) => {
                  map[c.id] = c.availableSeats;
                });
                setSeatUpdates(map);
              }
            } else if (data.type === 'LIVE_EVENT') {
              setLiveEvents(prev => [data.payload, ...prev.slice(0, 19)]);
            } else if (data.type === 'SEAT_UPDATE' || data.type === 'SEAT_UPDATED') {
              const classId = data.payload?.classId ?? data.class_id;
              const availableSeats = data.payload?.availableSeats ?? data.available_seats;
              if (!classId || availableSeats === undefined) return;
              setSeatUpdates(prev => ({
                ...prev,
                [classId]: availableSeats
              }));
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsConnected(false);
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };

        ws.onerror = (err) => {
          console.warn('WebSocket error, retrying...', err);
        };
      } catch (err) {
        console.warn('WebSocket initialization exception:', err);
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const addLocalEvent = (event) => {
    setLiveEvents(prev => [event, ...prev.slice(0, 19)]);
  };

  return (
    <RealtimeContext.Provider value={{ liveEvents, seatUpdates, isConnected, addLocalEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
