import { NextRequest, NextResponse } from 'next/server';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Initialize default metrics collection
collectDefaultMetrics();

// Custom metrics for the application
const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const activeUsers = new Gauge({
  name: 'active_users_total',
  help: 'Number of currently active users',
});

const databaseConnections = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
});

const dbConnectionFailures = new Counter({
  name: 'db_connections_failed_total',
  help: 'Total number of failed database connections',
});

// Business metrics
const userRegistrations = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['user_type'],
});

const classBookings = new Counter({
  name: 'class_bookings_total',
  help: 'Total number of class bookings',
  labelNames: ['class_type'],
});

const paymentFailures = new Counter({
  name: 'payment_failures_total',
  help: 'Total number of payment failures',
  labelNames: ['payment_method', 'error_type'],
});

// Export metrics for use in other parts of the application
export const metrics = {
  httpRequestCounter,
  httpRequestDuration,
  activeUsers,
  databaseConnections,
  dbConnectionFailures,
  userRegistrations,
  classBookings,
  paymentFailures,
};

export async function GET(request: NextRequest) {
  try {
    // Update some metrics before returning
    const now = Date.now();
    
    // Simulate some business metrics (in production, these would come from your actual data)
    if (process.env.NODE_ENV === 'development') {
      // Simulate active users
      activeUsers.set(Math.floor(Math.random() * 100) + 50);
      
      // Simulate database connections
      databaseConnections.set(Math.floor(Math.random() * 20) + 5);
    }

    const metricsOutput = await register.metrics();
    
    return new NextResponse(metricsOutput, {
      status: 200,
      headers: {
        'Content-Type': register.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    return new NextResponse('Error generating metrics', { status: 500 });
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}