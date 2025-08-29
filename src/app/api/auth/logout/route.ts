import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLService } from '../../../../services/PostgreSQLService';
import { 
  extractTokenFromRequest,
  createLogoutResponse
} from '../../../../lib/auth';
import { getCorsHeaders } from '../../../../lib/services';

let dbService: PostgreSQLService | null = null;

function getDBService(): PostgreSQLService {
  if (!dbService) {
    dbService = new PostgreSQLService();
  }
  return dbService;
}

export async function POST(request: NextRequest) {
  try {
    // Extract token from request
    const token = extractTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { 
          status: 401,
          headers: getCorsHeaders(request.headers.get('origin') || undefined)
        }
      );
    }

    // Initialize database service
    const db = getDBService();
    await db.initialize();

    try {
      // Logout user (remove session from database)
      await db.logout(token);

      console.log('User logged out successfully');

      // Return success response and clear cookie
      return createLogoutResponse();

    } catch (error) {
      console.error('Logout error:', error);

      // Even if there's an error removing the session, clear the cookie
      return createLogoutResponse();
    }

  } catch (error) {
    console.error('Logout endpoint error:', error);
    
    // Clear cookie even on error
    return createLogoutResponse();
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        ...getCorsHeaders(request.headers.get('origin') || undefined),
        'Access-Control-Max-Age': '86400' // 24 hours
      }
    }
  );
}