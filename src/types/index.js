// Type definitions for JavaScript (removed TypeScript interfaces)
// These are kept as documentation for the expected data structures

/*
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  membership: 'Pro Member' | 'Elite Member' | 'Basic Member';
  fitnessGoal?: string;
  stats: {
    classesCount: number;
    streakDays: number;
    caloriesBurned: number;
    favoriteWorkout: string;
  };
  preferences?: {
    emailNotifications: boolean;
    smsReminders: boolean;
    reminderHoursBefore: number;
    soundEffects: boolean;
    theme: string;
  };
  createdAt: string;
}

export interface FitnessClass {
  id: string;
  title: string;
  category: 'Dance' | 'Strength' | 'Yoga' | 'Boxing' | 'Cardio' | 'Pilates' | 'HIIT';
  coach: string;
  coachTitle: string;
  coachBio: string;
  coachAvatar?: string;
  image: string;
  price: number;
  duration: number; // in minutes
  capacity: number;
  availableSeats: number;
  timeSlots: string[];
  intensity: 'Low' | 'Moderate' | 'High' | 'Extreme';
  description: string;
  location: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  benefits: string[];
  equipment: string[];
}

export interface Booking {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  classId: string;
  classTitle: string;
  classCategory: string;
  coach: string;
  image: string;
  date: string;
  timeSlot: string;
  price: number;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  paymentId: string;
  paymentStatus: 'Paid' | 'Refunded' | 'Pending';
  qrPassCode: string;
  createdAt: string;
}

export interface PaymentIntent {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  clientSecret: string;
  classTitle: string;
  date: string;
  timeSlot: string;
  convenienceFee: number;
  gstAmount: number;
  totalAmount: number;
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'Card' | 'UPI' | 'NetBanking' | 'Wallet';
  status: 'Success' | 'Failed' | 'Pending';
  transactionId: string;
  createdAt: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'auth' | 'booking' | 'payment' | 'workout' | 'ai' | 'settings';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface LiveTickerEvent {
  id: string;
  type: 'booking' | 'seat_alert' | 'completion' | 'announcement';
  text: string;
  timestamp: string;
}

export interface AIRecommendation {
  classId: string;
  title: string;
  reason: string;
  matchScore: number;
  intensityMatch: string;
}
*/