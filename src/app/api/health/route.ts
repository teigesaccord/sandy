import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  try {
  // Query backend health endpoint via proxy
  const dbHealth = await (await import('../../../services/PostgreSQLService')).default.health();
    
    const healthStatus = {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
  timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'Sandy Chatbot API',
      checks: {
        database: {
          status: dbHealth.status,
          responseTime: dbHealth.details.responseTime,
          details: dbHealth.details
        },
        api: {
          status: 'healthy'
        }
      }
    };

    const responseStatus = dbHealth.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(healthStatus, { status: responseStatus });
    
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
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