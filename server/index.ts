import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-curefit-key-2026';

// 1. HTTP & WebSocket Server Setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const connectedClients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  connectedClients.add(ws);
  console.log('🔌 Client connected to Real-Time WebSockets stream (Total active:', connectedClients.size, ')');

  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log('❌ Client disconnected (Total active:', connectedClients.size, ')');
  });
});

// Broadcast real-time seat inventory updates to all active clients (< 150ms latency)
function broadcastSeatUpdate(class_id: string, available_seats: number) {
  const message = JSON.stringify({
    type: 'SEAT_UPDATED',
    class_id,
    available_seats,
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
app.post('/api/admin/reset', async (req: Request, res: Response) => {
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
function authenticateToken(req: any, res: Response, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Authentication Routes
app.post('/api/auth/signup', async (req: Request, res: Response) => {
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
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
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

// Catalog Route
app.get('/api/classes', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM classes ORDER BY scheduled_time ASC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Atomic Booking Route with Real-Time WebSocket Broadcast
app.post('/api/bookings', authenticateToken, async (req: any, res: Response) => {
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

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Booking transaction error:', err);
    res.status(500).json({ error: 'Transaction failed, booking rolled back' });
  } finally {
    client.release();
  }
});

// History Route
app.get('/api/bookings/my-history', authenticateToken, async (req: any, res: Response) => {
  const user_id = req.user.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
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

// Cancellation Route with Real-Time WebSocket Broadcast
app.post('/api/bookings/cancel', authenticateToken, async (req: any, res: Response) => {
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

// ===================================================
// 7. ADMIN ROSTER & AUDIT LOGGING (PRD Section 7.4 & US-401)
// ===================================================

// Middleware: Verify Owner/Admin Role
function requireOwnerRole(req: any, res: Response, next: any) {
  if (req.user?.role !== 'Owner') {
    return res.status(403).json({ error: 'Forbidden: Owner role required' });
  }
  next();
}

// Get Class Roster (Owner Only)
app.get('/api/classes/:id/roster', authenticateToken, requireOwnerRole, async (req: Request, res: Response) => {
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
app.patch('/api/bookings/:id/status', authenticateToken, requireOwnerRole, async (req: any, res: Response) => {
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
app.get('/api/users', authenticateToken, requireOwnerRole, async (req: Request, res: Response) => {
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

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'CureFit Backend & Real-time WebSocket Engine is Live!' });
});

// Start HTTP + WebSockets Server
server.listen(PORT, async () => {
  console.log(`🚀 Server & WebSockets running on http://localhost:${PORT}`);
  await initDB();
});