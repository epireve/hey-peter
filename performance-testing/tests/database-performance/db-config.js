// Database performance testing configuration
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
  // Database connection configuration
  connection: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 5432,
    database: process.env.DATABASE_NAME || 'postgres',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  
  // Connection pool configuration
  pool: {
    min: 5,
    max: parseInt(process.env.DATABASE_CONNECTIONS) || 100,
    idle: 10000,
    acquire: 30000,
    evict: 1000,
  },
  
  // Performance test configuration
  performance: {
    // Test duration
    testDuration: parseInt(process.env.DB_TEST_DURATION) || 300000, // 5 minutes
    warmupDuration: 30000, // 30 seconds
    cooldownDuration: 10000, // 10 seconds
    
    // Load configuration
    concurrentConnections: [10, 25, 50, 100, 200],
    queriesPerSecond: [10, 50, 100, 200, 500],
    
    // Thresholds
    thresholds: {
      maxResponseTime: 1000, // 1 second
      maxConnectionTime: 100, // 100ms
      maxLockWaitTime: 50, // 50ms
      errorRateThreshold: 0.01, // 1%
      memoryLeakThreshold: 100 * 1024 * 1024, // 100MB
    },
    
    // Test scenarios
    scenarios: {
      read_heavy: {
        readQueries: 80,
        writeQueries: 20,
        complexQueries: 10,
      },
      write_heavy: {
        readQueries: 30,
        writeQueries: 60,
        complexQueries: 10,
      },
      mixed_workload: {
        readQueries: 50,
        writeQueries: 40,
        complexQueries: 10,
      },
      analytics_heavy: {
        readQueries: 20,
        writeQueries: 10,
        complexQueries: 70,
      },
    },
  },
  
  // Test queries for different scenarios
  queries: {
    // Simple read queries
    reads: [
      'SELECT * FROM users WHERE id = $1',
      'SELECT * FROM students WHERE user_id = $1',
      'SELECT * FROM teachers WHERE user_id = $1',
      'SELECT * FROM classes WHERE teacher_id = $1 AND date >= CURRENT_DATE',
      'SELECT * FROM bookings WHERE student_id = $1 AND status = $2',
      'SELECT balance FROM student_hours WHERE student_id = $1',
      'SELECT * FROM attendance WHERE class_id = $1',
    ],
    
    // Write queries
    writes: [
      'INSERT INTO bookings (student_id, class_id, booking_date, status) VALUES ($1, $2, $3, $4)',
      'UPDATE student_hours SET balance = balance - $1 WHERE student_id = $2',
      'INSERT INTO attendance (class_id, student_id, status, notes) VALUES ($1, $2, $3, $4)',
      'UPDATE classes SET status = $1 WHERE id = $2',
      'INSERT INTO audit_logs (table_name, operation, user_id, changes) VALUES ($1, $2, $3, $4)',
      'UPDATE teacher_availability SET is_available = $1 WHERE teacher_id = $2 AND time_slot = $3',
    ],
    
    // Complex analytical queries
    complex: [
      `SELECT 
         t.id, 
         t.first_name, 
         t.last_name,
         COUNT(c.id) as total_classes,
         AVG(f.rating) as avg_rating,
         SUM(c.duration_minutes) as total_hours
       FROM teachers t
       LEFT JOIN classes c ON t.id = c.teacher_id
       LEFT JOIN feedback f ON c.id = f.class_id
       WHERE c.date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY t.id, t.first_name, t.last_name
       ORDER BY total_classes DESC
       LIMIT 20`,
       
      `SELECT 
         s.id,
         s.first_name,
         s.last_name,
         sh.balance as current_hours,
         COUNT(b.id) as total_bookings,
         COUNT(a.id) as attended_classes,
         ROUND(COUNT(a.id)::numeric / NULLIF(COUNT(b.id), 0) * 100, 2) as attendance_rate
       FROM students s
       LEFT JOIN student_hours sh ON s.id = sh.student_id
       LEFT JOIN bookings b ON s.id = b.student_id
       LEFT JOIN attendance a ON b.class_id = a.class_id AND s.id = a.student_id AND a.status = 'present'
       WHERE b.booking_date >= CURRENT_DATE - INTERVAL '60 days'
       GROUP BY s.id, s.first_name, s.last_name, sh.balance
       ORDER BY attendance_rate DESC
       LIMIT 50`,
       
      `SELECT 
         DATE_TRUNC('day', c.date) as class_date,
         COUNT(*) as total_classes,
         COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_classes,
         COUNT(CASE WHEN c.status = 'cancelled' THEN 1 END) as cancelled_classes,
         AVG(f.rating) as avg_rating
       FROM classes c
       LEFT JOIN feedback f ON c.id = f.class_id
       WHERE c.date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE_TRUNC('day', c.date)
       ORDER BY class_date DESC`,
       
      `WITH monthly_stats AS (
         SELECT 
           DATE_TRUNC('month', booking_date) as month,
           COUNT(*) as bookings,
           COUNT(DISTINCT student_id) as unique_students
         FROM bookings
         WHERE booking_date >= CURRENT_DATE - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', booking_date)
       )
       SELECT 
         month,
         bookings,
         unique_students,
         LAG(bookings) OVER (ORDER BY month) as prev_bookings,
         ROUND((bookings - LAG(bookings) OVER (ORDER BY month))::numeric / 
               NULLIF(LAG(bookings) OVER (ORDER BY month), 0) * 100, 2) as growth_rate
       FROM monthly_stats
       ORDER BY month DESC`,
    ],
  },
  
  // Sample data generators for testing
  sampleData: {
    users: {
      count: 1000,
      roles: ['student', 'teacher', 'admin'],
    },
    classes: {
      count: 500,
      types: ['one_on_one', 'group', 'basic', 'business'],
    },
    bookings: {
      count: 2000,
      statuses: ['confirmed', 'pending', 'cancelled', 'completed'],
    },
  },
};

module.exports = dbConfig;