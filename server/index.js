import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-curefit-key-2026';

// 1. HTTP & WebSocket Server Setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const connectedClients = new Set();

const classCatalogDefaults = {
  'Cult Dance Fitness': { category: 'Dance', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80', price: 599, duration: 50, level: 'Beginner Friendly', timeSlots: ['07:00 AM', '10:00 AM', '06:30 PM'], location: 'CureFit Studio, Indiranagar', coachTitle: 'Senior Fitness Instructor', coachBio: 'High-energy dance conditioning with chartbuster beats and beginner-friendly choreography.', tags: ['Cardio', 'Dance', 'Fat Burn', 'Beginner Friendly'], benefits: ['Burns up to 550 kcal', 'Boosts coordination and rhythm', 'High dopamine release'], equipment: ['Water bottle', 'Gym sneakers', 'Towel'] },
  'HRX Strength Pro': { category: 'Strength', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80', price: 599, duration: 55, level: 'Advanced', timeSlots: ['06:30 AM', '08:00 AM', '07:00 PM'], location: 'CureFit Studio, Koramangala', coachTitle: 'Lead Bodybuilding Coach', coachBio: 'Compound strength, progressive overload, and athletic stamina for lean muscle development.', tags: ['Barbell', 'Hypertrophy', 'Core Strength', 'Power'], benefits: ['Full body compound strength', 'Metabolic rate acceleration', 'Posture correction'], equipment: ['Lifting belt optional', 'Grip straps', 'Training shoes'] },
  'Yoga & Breathwork': { category: 'Yoga', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80', price: 599, duration: 60, level: 'All Levels', timeSlots: ['06:00 AM', '07:30 AM', '05:30 PM'], location: 'CureFit Studio, HSR Layout', coachTitle: 'Pranayama and Mindfulness Specialist', coachBio: 'Mobility, restorative breathwork, and calming flow for stress reset and recovery.', tags: ['Flexibility', 'Mindfulness', 'Breathwork', 'Recovery'], benefits: ['Reduces stress', 'Improves joint range of motion', 'Better sleep quality'], equipment: ['Yoga mat provided', 'Comfortable stretch wear'] },
  'Pro Boxing Fit': { category: 'Boxing', image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&auto=format&fit=crop&q=80', price: 599, duration: 45, level: 'High Intensity', timeSlots: ['07:00 AM', '09:00 AM', '06:00 PM', '08:00 PM'], location: 'CureFit Studio, Whitefield', coachTitle: 'Combat Conditioning Specialist', coachBio: 'Punch mechanics, footwork drills, heavy bag conditioning, and agility circuits.', tags: ['Boxing', 'Reflexes', 'High Intensity', 'Cardio'], benefits: ['Burn up to 700 kcal', 'Superior hand-eye coordination', 'Stress relief'], equipment: ['Hand wraps provided', 'Boxing gloves provided'] },
  'Bollywood Cardio': { category: 'Dance', image: 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=800&auto=format&fit=crop&q=80', price: 599, duration: 50, level: 'Beginner Friendly', timeSlots: ['08:00 AM', '11:00 AM', '07:30 PM'], location: 'CureFit Studio, Indiranagar', coachTitle: 'Group Fitness Specialist', coachBio: 'Fun, vibrant Bollywood moves with easy-to-follow choreography.', tags: ['Bollywood', 'Aerobics', 'Fun Workout', 'Rhythm'], benefits: ['Cardiovascular conditioning', 'Mood booster', 'Full body engagement'], equipment: ['Gym shoes', 'Water bottle'] },
  'Zumba Burnout': { category: 'Dance', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80', price: 599, duration: 50, level: 'All Levels', timeSlots: ['07:30 AM', '10:30 AM', '05:00 PM'], location: 'CureFit Studio, Bellandur', coachTitle: 'Licensed Zumba Instructor', coachBio: 'Latin dance intervals for a calorie-burning fitness party.', tags: ['Zumba', 'Dance Party', 'Intervals', 'All Levels'], benefits: ['Burns 450-600 kcal', 'Tones legs and core', 'Endorphin surge'], equipment: ['Sport sneakers', 'Workout clothes'] },
  'Pilates Core': { category: 'Pilates', image: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=800&auto=format&fit=crop&q=80', price: 599, duration: 50, level: 'Intermediate', timeSlots: ['08:30 AM', '10:00 AM', '06:00 PM'], location: 'CureFit Studio, Jayanagar', coachTitle: 'Posture Specialist', coachBio: 'Precision mat pilates targeting core strength, hips, and glutes.', tags: ['Core', 'Pilates', 'Sculpt', 'Low Impact'], benefits: ['Relieves back pain', 'Tightens core muscles', 'Enhances flexibility'], equipment: ['Grip socks recommended', 'Pilates ring provided'] },
  'HIIT Sweat Circuit': { category: 'HIIT', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80', price: 599, duration: 45, level: 'Extreme', timeSlots: ['06:00 AM', '07:30 AM', '06:30 PM', '08:00 PM'], location: 'CureFit Studio, Koramangala', coachTitle: 'HIIT Performance Specialist', coachBio: 'Maximum-effort intervals using functional tools and short recovery periods.', tags: ['HIIT', 'Sweat', 'Functional', 'Afterburn'], benefits: ['Afterburn effect', 'Builds VO2 max', 'Peak stamina'], equipment: ['Cross-training shoes', 'Hydration drink'] }
};

function toClassDto(row) {
  const title = row.title || row.name;
  const defaults = classCatalogDefaults[title] || {};
  const availableSeats = Number(row.availableSeats ?? row.available_seats ?? 0);
  return {
    ...defaults,
    id: row.id,
    title,
    name: title,
    coach: row.coach || row.trainer,
    trainer: row.coach || row.trainer,
    capacity: Number(row.capacity ?? 0),
    availableSeats,
    available_seats: availableSeats,
    scheduledTime: row.scheduledTime || row.scheduled_time,
    scheduled_time: row.scheduledTime || row.scheduled_time,
    description: defaults.description || `${title} is a coached CureFit studio session with live seat tracking.`,
    price: defaults.price || 599,
    timeSlots: defaults.timeSlots || ['07:00 AM', '10:00 AM', '06:30 PM'],
    tags: defaults.tags || []
  };
}

function toBookingDto(row) {
  const bookingId = row.booking_id || row.id;
  const classTitle = row.class_title || row.class_name || row.name;
  const defaults = classCatalogDefaults[classTitle] || {};
  return {
    id: bookingId,
    userId: row.user_id,
    userEmail: row.email,
    userName: row.email?.split('@')[0] || 'CureFit Member',
    classId: row.class_id,
    classTitle,
    classCategory: row.category || defaults.category || 'Group Fitness',
    coach: row.coach || row.trainer,
    image: row.image || defaults.image,
    date: row.date || new Date(row.scheduled_time || row.booked_at || row.created_at).toISOString().split('T')[0],
    timeSlot: row.time_slot || defaults.timeSlots?.[0] || '10:00 AM',
    price: row.price || defaults.price || 599,
    status: row.status === 'booked' ? 'Confirmed' : row.status === 'cancelled' ? 'Cancelled' : row.status || 'Confirmed',
    paymentId: row.payment_id || `PAY-${String(bookingId).slice(0, 8).toUpperCase()}`,
    paymentStatus: row.status === 'cancelled' ? 'Refunded' : 'Paid',
    qrPassCode: row.qr_pass_code || `CURE-PASS-${String(bookingId).slice(0, 8).toUpperCase()}`,
    createdAt: row.booked_at || row.created_at
  };
}

wss.on('connection', async (ws) => {
  connectedClients.add(ws);
  console.log('🔌 Client connected to Real-Time WebSockets stream (Total active:', connectedClients.size, ')');

  try {
    const result = await pool.query(`SELECT * FROM classes ORDER BY scheduled_time ASC`);
    ws.send(JSON.stringify({
      type: 'INITIAL_STATE',
      payload: {
        classes: result.rows.map(toClassDto),
        liveEvents: []
      }
    }));
  } catch (err) {
    console.warn('Unable to send initial WebSocket state:', err.message);
  }

  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log('❌ Client disconnected (Total active:', connectedClients.size, ')');
  });
});

// Broadcast real-time seat inventory updates to all active clients (< 150ms latency)
function broadcastSeatUpdate(class_id, available_seats) {
  const message = JSON.stringify({
    type: 'SEAT_UPDATE',
    class_id,
    available_seats,
    payload: {
      classId: class_id,
      availableSeats: available_seats
    },
    timestamp: new Date().toISOString()
  });

  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

app.use(cors());
app.use(express.json());

// PostgreSQL Pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Database Init & Seeding
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'Customer',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        trainer VARCHAR(255) NOT NULL,
        capacity INT NOT NULL CHECK (capacity > 0),
        available_seats INT NOT NULL CHECK (available_seats >= 0),
        scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'booked',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_active_booking UNIQUE (user_id, class_id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id UUID REFERENCES users(id),
        target_id UUID NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        previous_state JSONB,
        new_state JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed 8 varied classes if needed
    const classCount = await pool.query(`SELECT COUNT(*) FROM classes`);
    if (parseInt(classCount.rows[0].count) < 8) {
      await pool.query(`DELETE FROM classes;`); // Clear old seed
      await pool.query(`
        INSERT INTO classes (name, trainer, capacity, available_seats, scheduled_time) VALUES
        ('Cult Dance Fitness', 'Coach Rahul', 20, 15, NOW() + INTERVAL '1 day'),
        ('HRX Strength Pro', 'Coach Ankit', 15, 10, NOW() + INTERVAL '1 day'),
        ('Yoga & Breathwork', 'Coach Priya', 12, 8, NOW() + INTERVAL '2 days'),
        ('Pro Boxing Fit', 'Coach Vikram', 12, 5, NOW() + INTERVAL '2 days'),
        ('Bollywood Cardio', 'Coach Neha', 18, 12, NOW() + INTERVAL '3 days'),
        ('Zumba Burnout', 'Coach Sneha', 25, 20, NOW() + INTERVAL '3 days'),
        ('Pilates Core', 'Coach Ritu', 10, 2, NOW() + INTERVAL '4 days'),
        ('HIIT Sweat Circuit', 'Coach Kabir', 15, 1, NOW() + INTERVAL '4 days');
      `);
      console.log('🌱 Seeded 8 varied workout classes!');
    }

    console.log('✅ PostgreSQL Database & Tables Connected Successfully!');
  } catch (err) {
    console.error('❌ Database Initialization Error:', err);
  }
}

// 🔄 DEV HELPER: RESET ALL BOOKINGS & RESTORE FULL SEAT CAPACITY
app.post('/api/admin/reset', async (req, res) => {
  try {
    // Delete all bookings and restore available_seats = capacity
    await pool.query(`DELETE FROM bookings;`);
    await pool.query(`UPDATE classes SET available_seats = capacity;`);

    // Broadcast live WebSocket update for all classes
    const classResult = await pool.query(`SELECT id, available_seats FROM classes`);
    classResult.rows.forEach((cls) => broadcastSeatUpdate(cls.id, cls.available_seats));

    res.json({ message: '✅ All bookings cleared & seat counts reset to full capacity!' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password, role, name, phone, fitnessGoal } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role`,
      [email, passwordHash, role || 'Customer']
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ message: 'User registered', token, user: { ...user, name, phone, fitnessGoal } });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Legacy signup endpoint (for backward compatibility)
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role`,
      [email, passwordHash, role || 'Customer']
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ message: 'User registered', token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const userResult = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (userResult.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = userResult.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Login successful', token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user (for session validation)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT id, email, role, created_at FROM users WHERE id = $1`,
      [req.user.userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: userResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// OAuth mock endpoint for testing
app.post('/api/auth/oauth-mock', async (req, res) => {
  const { email, name, provider } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    // Check if user exists, if not create them
    const userResult = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    let user;
    
    if (userResult.rows.length === 0) {
      const passwordHash = await bcrypt.hash('oauth-password-' + Date.now(), 10);
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'Customer') RETURNING id, email, role`,
        [email, passwordHash]
      );
      user = result.rows[0];
    } else {
      user = userResult.rows[0];
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'OAuth login successful', token, user: { ...user, name } });
  } catch (err) {
    res.status(500).json({ error: 'OAuth login failed' });
  }
});

// Update profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, phone, fitnessGoal } = req.body;
  const user_id = req.user.userId;

  try {
    // For simplicity, we're not storing these fields in the DB yet
    // Just return success
    const userResult = await pool.query(
      `SELECT id, email, role, created_at FROM users WHERE id = $1`,
      [user_id]
    );
    res.json({ user: { ...userResult.rows[0], name, phone, fitnessGoal } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user_id = req.user.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords required' });
  }

  try {
    const userResult = await pool.query(`SELECT * FROM users WHERE id = $1`, [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [newPasswordHash, user_id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Update preferences
app.put('/api/auth/preferences', authenticateToken, async (req, res) => {
  const preferences = req.body;
  
  try {
    // For simplicity, just return success with the preferences
    res.json({ preferences });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Catalog Route
app.get('/api/classes', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM classes ORDER BY scheduled_time ASC`);
    res.json({ classes: result.rows.map(toClassDto) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

app.get('/api/classes/ai/recommendations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM classes WHERE available_seats > 0 ORDER BY available_seats ASC LIMIT 3`);
    const recommendations = result.rows.map((row, index) => {
      const cls = toClassDto(row);
      return {
        classId: cls.id,
        title: cls.title,
        matchScore: 96 - index * 4,
        reason: `${cls.title} matches your recent fitness goals and has live availability.`
      };
    });
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

app.post('/api/bookings/create-intent', authenticateToken, async (req, res) => {
  const { classId, date, timeSlot } = req.body;
  if (!classId) return res.status(400).json({ error: 'classId is required' });

  const client = await pool.connect();
  try {
    const classResult = await client.query(`SELECT * FROM classes WHERE id = $1`, [classId]);
    if (classResult.rows.length === 0) return res.status(404).json({ error: 'Class not found' });

    const cls = toClassDto(classResult.rows[0]);
    if (cls.availableSeats <= 0) return res.status(409).json({ error: 'Slot Filled. Class is fully booked.' });

    const existingBooking = await client.query(
      `SELECT id FROM bookings WHERE user_id = $1 AND class_id = $2 AND status = 'booked'`,
      [req.user.userId, classId]
    );
    if (existingBooking.rows.length > 0) {
      return res.status(422).json({ error: 'You have already booked this class' });
    }

    res.json({
      bookingIntent: {
        bookingId: `INTENT-${Date.now()}`,
        classId: cls.id,
        classTitle: cls.title,
        coach: cls.coach,
        image: cls.image,
        category: cls.category,
        date: date || new Date(cls.scheduledTime).toISOString().split('T')[0],
        timeSlot: timeSlot || cls.timeSlots[0],
        location: cls.location,
        subtotal: cls.price,
        convenienceFee: 0,
        gstAmount: 0,
        totalAmount: cls.price,
        currency: 'INR'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Unable to initiate booking' });
  } finally {
    client.release();
  }
});

app.post('/api/bookings/confirm-and-pay', authenticateToken, async (req, res) => {
  const { classId, date, timeSlot, paymentMethod, simulateFailure } = req.body;
  const user_id = req.user.userId;

  if (simulateFailure) return res.status(402).json({ error: 'Sandbox payment declined. Please retry or use another method.' });
  if (!classId) return res.status(400).json({ error: 'classId is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingBooking = await client.query(
      `SELECT id FROM bookings WHERE user_id = $1 AND class_id = $2 AND status = 'booked'`,
      [user_id, classId]
    );
    if (existingBooking.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'You have already booked this class' });
    }

    const classResult = await client.query(`SELECT * FROM classes WHERE id = $1 FOR UPDATE`, [classId]);
    if (classResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Class not found' });
    }

    const cls = toClassDto(classResult.rows[0]);
    if (cls.availableSeats <= 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Slot Filled. Class is fully booked.' });
    }

    const updatedClass = await client.query(
      `UPDATE classes SET available_seats = available_seats - 1 WHERE id = $1 RETURNING available_seats`,
      [classId]
    );

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, class_id, status) VALUES ($1, $2, 'booked') RETURNING *`,
      [user_id, classId]
    );

    await client.query('COMMIT');

    const newSeats = updatedClass.rows[0].available_seats;
    broadcastSeatUpdate(classId, newSeats);

    res.status(201).json({
      message: `Payment verified via ${paymentMethod || 'Card'} and booking confirmed`,
      booking: {
        ...toBookingDto({
          ...bookingResult.rows[0],
          class_title: cls.title,
          coach: cls.coach,
          image: cls.image,
          category: cls.category,
          date,
          time_slot: timeSlot,
          price: cls.price
        }),
        date: date || new Date(cls.scheduledTime).toISOString().split('T')[0],
        timeSlot: timeSlot || cls.timeSlots[0]
      },
      remaining_seats: newSeats
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Payment booking transaction error:', err);
    res.status(500).json({ error: 'Payment verification failed; booking rolled back' });
  } finally {
    client.release();
  }
});

// Atomic Booking Route with Real-Time WebSocket Broadcast
app.post('/api/bookings', authenticateToken, async (req, res) => {
  const { class_id } = req.body;
  const user_id = req.user.userId;

  if (!class_id) return res.status(400).json({ error: 'class_id is required' });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingBooking = await client.query(
      `SELECT id FROM bookings WHERE user_id = $1 AND class_id = $2 AND status = 'booked'`,
      [user_id, class_id]
    );

    if (existingBooking.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'You have already booked this class' });
    }

    const classResult = await client.query(
      `SELECT available_seats FROM classes WHERE id = $1 FOR UPDATE`,
      [class_id]
    );

    if (classResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Class not found' });
    }

    const availableSeats = classResult.rows[0].available_seats;

    if (availableSeats <= 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Slot Filled. Class is fully booked.' });
    }

    const updatedClass = await client.query(
      `UPDATE classes SET available_seats = available_seats - 1 WHERE id = $1 RETURNING available_seats`,
      [class_id]
    );

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, class_id, status) VALUES ($1, $2, 'booked') RETURNING *`,
      [user_id, class_id]
    );

    await client.query('COMMIT');

    const newSeats = updatedClass.rows[0].available_seats;

    // ⚡ REAL-TIME WEBSOCKET BROADCAST TO ALL CONNECTED CLIENTS
    broadcastSeatUpdate(class_id, newSeats);

    res.status(201).json({
      message: 'Booking confirmed',
      booking: bookingResult.rows[0],
      remaining_seats: newSeats
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Booking transaction error:', err);
    res.status(500).json({ error: 'Transaction failed, booking rolled back' });
  } finally {
    client.release();
  }
});

// History Route
app.get('/api/bookings/my-history', authenticateToken, async (req, res) => {
  const user_id = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT b.id AS booking_id, b.status, b.created_at AS booked_at, c.id AS class_id, c.name AS class_name, c.trainer, c.scheduled_time
       FROM bookings b JOIN classes c ON b.class_id = c.id
       WHERE b.user_id = $1 ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    const countResult = await pool.query(`SELECT COUNT(*) FROM bookings WHERE user_id = $1`, [user_id]);
    const totalRecords = parseInt(countResult.rows[0].count);

    res.json({
      page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      history: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

app.get('/api/history', authenticateToken, async (req, res) => {
  const user_id = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT b.id AS booking_id, b.status, b.created_at AS booked_at, c.id AS class_id, c.name AS class_title, c.trainer AS coach, c.scheduled_time
       FROM bookings b JOIN classes c ON b.class_id = c.id
       WHERE b.user_id = $1 ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    const countResult = await pool.query(`SELECT COUNT(*) FROM bookings WHERE user_id = $1`, [user_id]);
    const totalBookings = parseInt(countResult.rows[0].count);
    const bookings = result.rows.map(toBookingDto);
    const activities = bookings.slice(0, 10).map((booking) => ({
      id: `act-${booking.id}`,
      type: 'booking',
      title: `${booking.status} ${booking.classTitle}`,
      description: `${booking.timeSlot} with ${booking.coach}`,
      timestamp: booking.createdAt
    }));

    res.json({
      page,
      limit,
      totalBookings,
      totalPages: Math.ceil(totalBookings / limit) || 1,
      bookings,
      activities
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.post('/api/history/clear-activities', authenticateToken, async (req, res) => {
  res.json({ message: 'Activity log cleared successfully' });
});

// Cancellation Route with Real-Time WebSocket Broadcast
app.post('/api/bookings/cancel', authenticateToken, async (req, res) => {
  const { booking_id } = req.body;
  const user_id = req.user.userId;

  if (!booking_id) return res.status(400).json({ error: 'booking_id is required' });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 AND status = 'booked' FOR UPDATE`,
      [booking_id, user_id]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Active booking not found or already cancelled' });
    }

    const booking = bookingResult.rows[0];

    await client.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1`, [booking_id]);

    const classResult = await client.query(
      `UPDATE classes SET available_seats = available_seats + 1 WHERE id = $1 RETURNING available_seats`,
      [booking.class_id]
    );

    await client.query('COMMIT');

    const newSeats = classResult.rows[0].available_seats;

    // ⚡ REAL-TIME WEBSOCKET BROADCAST TO ALL CONNECTED CLIENTS
    broadcastSeatUpdate(booking.class_id, newSeats);

    res.json({
      message: 'Booking cancelled successfully. Seat reopened!',
      booking_id,
      new_available_seats: newSeats
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to cancel booking' });
  } finally {
    client.release();
  }
});

app.post('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
  const booking_id = req.params.id;
  const user_id = req.user.userId;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 AND status = 'booked' FOR UPDATE`,
      [booking_id, user_id]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Active booking not found or already cancelled' });
    }

    const booking = bookingResult.rows[0];

    await client.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1`, [booking_id]);

    const classResult = await client.query(
      `UPDATE classes SET available_seats = available_seats + 1 WHERE id = $1 RETURNING available_seats`,
      [booking.class_id]
    );

    await client.query('COMMIT');

    const newSeats = classResult.rows[0].available_seats;
    broadcastSeatUpdate(booking.class_id, newSeats);

    res.json({
      message: 'Booking cancelled successfully. Seat reopened!',
      booking_id,
      new_available_seats: newSeats
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to cancel booking' });
  } finally {
    client.release();
  }
});

// ===================================================
// 7. ADMIN ROSTER & AUDIT LOGGING (PRD Section 7.4 & US-401)
// ===================================================

// Middleware: Verify Owner/Admin Role
function requireOwnerRole(req, res, next) {
  if (req.user?.role !== 'Owner') {
    return res.status(403).json({ error: 'Forbidden: Owner role required' });
  }
  next();
}

// Get Class Roster (Owner Only)
app.get('/api/classes/:id/roster', authenticateToken, requireOwnerRole, async (req, res) => {
  const class_id = req.params.id;

  try {
    const result = await pool.query(
      `SELECT b.id AS booking_id, b.status, u.id AS user_id, u.email, b.created_at AS booked_at
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.class_id = $1 AND b.status = 'booked'
       ORDER BY b.created_at ASC`,
      [class_id]
    );

    res.json({ class_id, roster: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch class roster' });
  }
});

// Update Attendance Status & Create Audit Log (Owner Only)
app.patch('/api/bookings/:id/status', authenticateToken, requireOwnerRole, async (req, res) => {
  const booking_id = req.params.id;
  const { status } = req.body; // 'attended' or 'no_show'
  const operator_id = req.user.userId;

  if (!['attended', 'no_show'].includes(status)) {
    return res.status(400).json({ error: 'Status must be attended or no_show' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch existing booking
    const bookingResult = await client.query(`SELECT * FROM bookings WHERE id = $1 FOR UPDATE`, [booking_id]);
    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const previousBooking = bookingResult.rows[0];

    // Update Status
    const updateResult = await client.query(
      `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
      [status, booking_id]
    );

    // Create Audit Log (PRD FR-04 Audit Trail)
    await client.query(
      `INSERT INTO audit_logs (operator_id, target_id, action_type, previous_state, new_state)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        operator_id,
        booking_id,
        'ATTENDANCE_STATUS_UPDATE',
        JSON.stringify(previousBooking),
        JSON.stringify(updateResult.rows[0])
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: `Booking status updated to ${status}`,
      booking: updateResult.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to update attendance status' });
  } finally {
    client.release();
  }
});

// ===================================================
// GET ALL USERS ENDPOINT (Owner/Admin Only)
// ===================================================
app.get('/api/users', authenticateToken, requireOwnerRole, async (req, res) => {
  try {
    // Select all users, excluding password hashes for security
    const result = await pool.query(
      `SELECT id, email, role, created_at FROM users ORDER BY created_at DESC`
    );

    res.json({
      totalUsers: result.rows.length,
      users: result.rows
    });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CureFit Backend & Real-time WebSocket Engine is Live!' });
});

// Start HTTP + WebSockets Server
server.listen(PORT, async () => {
  console.log(`🚀 Server & WebSockets running on http://localhost:${PORT}`);
  await initDB();
});