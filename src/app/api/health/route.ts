import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  try {
    // Query backend health endpoint via proxy
    const dbHealth = await (await import('../../../services/PostgreSQLService')).default.health();

    // Normalize/defensive parsing: different backends may return different shapes
    const dbStatus = (dbHealth && (dbHealth.status || dbHealth.state || dbHealth.statusText)) || 'unknown';
    const details = (dbHealth && (dbHealth.details || dbHealth.data || null)) || null;
    const responseTime = details && (details.responseTime || details.responseTimeMs || details.responseTimeMs === 0 ? (details.responseTime || details.responseTimeMs) : undefined);

    const healthStatus = {
      status: dbStatus === 'healthy' || dbStatus === 'ok' ? 'healthy' : 'degraded',
  timestamp: new Date().toString(),
      version: '1.0.0',
      service: 'Sandy Chatbot API',
      checks: {
        database: {
          status: dbStatus,
          responseTime: responseTime,
          details: details
        },
        api: {
          status: 'healthy'
        }
      }
    };

    const responseStatus = dbStatus === 'healthy' || dbStatus === 'ok' ? 200 : 503;

    return NextResponse.json(healthStatus, { status: responseStatus });
    
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
  timestamp: new Date().toString(),
        error: 'Health check failed',
        checks: {
          database: {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          api: {
            status: 'degraded'
          }
        }
      },
      { status: 500 }
    );
  }
}