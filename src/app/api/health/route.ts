import { NextRequest, NextResponse } from 'next/server';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Initialize Supabase client
    const supabase = createClientComponentClient();
    
    // Check database connectivity
    const { data: dbHealth, error: dbError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    const dbLatency = Date.now() - startTime;
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      checks: {
        database: {
          status: dbError ? 'unhealthy' : 'healthy',
          latency: dbLatency,
          error: dbError?.message || null,
        },
        memory: {
          status: 'healthy',
          usage: process.memoryUsage(),
        },
        // Add more health checks as needed
      },
      metrics: {
        responseTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        cpuUsage: process.cpuUsage(),
      },
    };

    // Determine overall status
    const isHealthy = Object.values(healthStatus.checks).every(
      check => check.status === 'healthy'
    );
    
    if (!isHealthy) {
      healthStatus.status = 'unhealthy';
    }

    const statusCode = isHealthy ? 200 : 503;

    return NextResponse.json(healthStatus, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          responseTime: Date.now() - startTime,
        },
      },
      { status: 503 }
    );
  }
}

// Support HEAD requests for simple uptime checks
export async function HEAD(request: NextRequest) {
  try {
    const supabase = createClientComponentClient();
    const { error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    return new NextResponse(null, { 
      status: error ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}