import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-curefit-key-2026';

app.use(cors());
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===================================================
// 1. DATABASE INITIALIZATION & SEEDING
// ===================================================
async function initDB() {
  try {
    // Create Tables
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

    // Seed Sample Classes if empty
    const classCount = await pool.query(`SELECT COUNT(*) FROM classes`);
    if (parseInt(classCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO classes (name, trainer, capacity, available_seats, scheduled_time) VALUES
        ('Cult Dance Fitness', 'Coach Rahul', 20, 3, NOW() + INTERVAL '1 day'),
        ('HRX Workout', 'Coach Ankit', 15, 1, NOW() + INTERVAL '2 days'),
        ('Yoga & Mobility', 'Coach Priya', 10, 0, NOW() + INTERVAL '3 days');
      `);
      console.log('🌱 Seeded initial workout classes!');
    }

    console.log('✅ PostgreSQL Database & Tables Connected Successfully!');
  } catch (err) {
    console.error('❌ Database Initialization Error:', err);
  }
}

// Middleware: Authenticate JWT Token
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

// ===================================================
// 2. AUTHENTICATION ROUTES
// ===================================================
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

// ===================================================
// 3. CLASS CATALOG ROUTE
// ===================================================
app.get('/api/classes', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM classes ORDER BY scheduled_time ASC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// ===================================================
// 4. ATOMIC CLASS BOOKING ROUTE (PRD Section 7.3 & US-201)
// PostgreSQL Row-Level Lock (SELECT FOR UPDATE)
// ===================================================
app.post('/api/bookings', authenticateToken, async (req: any, res: Response) => {
  const { class_id } = req.body;
  const user_id = req.user.userId;

  if (!class_id) return res.status(400).json({ error: 'class_id is required' });

  const client = await pool.connect();

  try {
    // 1. Begin ACID Transaction
    await client.query('BEGIN');

    // 2. Check for Duplicate Active Booking (PRD Scenario: Double-Booking Check)
    const existingBooking = await client.query(
      `SELECT id FROM bookings WHERE user_id = $1 AND class_id = $2 AND status = 'booked'`,
      [user_id, class_id]
    );

    if (existingBooking.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'You have already booked this class' });
    }

    // 3. Acquire Row-Level Lock on Class Record (SELECT ... FOR UPDATE)
    const classResult = await client.query(
      `SELECT available_seats FROM classes WHERE id = $1 FOR UPDATE`,
      [class_id]
    );

    if (classResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(444).json({ error: 'Class not found' });
    }

    const availableSeats = classResult.rows[0].available_seats;

    // 4. Validate Inventory
    if (availableSeats <= 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Slot Filled. Class is fully booked.' });
    }

    // 5. Atomic Update: Decrement Seat Count
    await client.query(
      `UPDATE classes SET available_seats = available_seats - 1 WHERE id = $1`,
      [class_id]
    );

    // 6. Insert Booking Record
    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, class_id, status) VALUES ($1, $2, 'booked') RETURNING *`,
      [user_id, class_id]
    );

    // 7. Commit Transaction
    await client.query('COMMIT');

    const booking = bookingResult.rows[0];

    res.status(201).json({
      message: 'Booking confirmed',
      booking,
      remaining_seats: availableSeats - 1
    });

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Booking transaction error:', err);
    res.status(500).json({ error: 'Transaction failed, booking rolled back' });
  } finally {
    client.release();
  }
});

// ===================================================
// 5. PAGINATED ATTENDANCE HISTORY (PRD Section 10.3 FR-08/FR-09 & US-301)
// ===================================================
app.get('/api/bookings/my-history', authenticateToken, async (req: any, res: Response) => {
  const user_id = req.user.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  const statusFilter = req.query.status as string; // Optional: 'booked', 'attended', 'cancelled'

  try {
    let queryText = `
      SELECT 
        b.id AS booking_id,
        b.status,
        b.created_at AS booked_at,
        c.id AS class_id,
        c.name AS class_name,
        c.trainer,
        c.scheduled_time
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      WHERE b.user_id = $1
    `;

    const queryParams: any[] = [user_id];

    if (statusFilter) {
      queryParams.push(statusFilter);
      queryText += ` AND b.status = $${queryParams.length}`;
    }

    queryText += ` ORDER BY b.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    // Fetch paginated rows
    const result = await pool.query(queryText, queryParams);

    // Fetch total count for pagination metadata
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
    console.error('Attendance history error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

// ===================================================
// 6. ATOMIC CANCELLATION & SEAT RE-OPENING ENGINE
// ===================================================
app.post('/api/bookings/cancel', authenticateToken, async (req: any, res: Response) => {
  const { booking_id } = req.body;
  const user_id = req.user.userId;

  if (!booking_id) return res.status(400).json({ error: 'booking_id is required' });

  const client = await pool.connect();

  try {
    // 1. Begin ACID Transaction
    await client.query('BEGIN');

    // 2. Fetch booking with Row Lock
    const bookingResult = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 AND status = 'booked' FOR UPDATE`,
      [booking_id, user_id]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Active booking not found or already cancelled' });
    }

    const booking = bookingResult.rows[0];

    // 3. Update booking status to 'cancelled'
    await client.query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1`,
      [booking_id]
    );

    // 4. Atomically Reopen Seat (Increment available_seats)
    const classResult = await client.query(
      `UPDATE classes SET available_seats = available_seats + 1 WHERE id = $1 RETURNING available_seats`,
      [booking.class_id]
    );

    // 5. Commit Transaction
    await client.query('COMMIT');

    res.json({
      message: 'Booking cancelled successfully. Seat reopened!',
      booking_id,
      new_available_seats: classResult.rows[0].available_seats
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancellation error:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  } finally {
    client.release();
  }
});

// Health Check Route
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'CureFit Backend Engine is Live!' });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await initDB();
});