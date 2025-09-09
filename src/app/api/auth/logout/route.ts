import { NextRequest, NextResponse } from 'next/server';
import PostgreSQLService from '../../../../services/PostgreSQLService';
import { 
  extractTokenFromRequest,
  createLogoutResponse
} from '../../../../lib/auth';
import { getCorsHeaders } from '../../../../lib/services';

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

    try {
      // Call backend logout endpoint via proxy (best-effort)
      try {
        await PostgreSQLService.logout();
      } catch (le) {
        console.warn('Backend logout failed, clearing cookie anyway', le);
      }

      return createLogoutResponse();

    } catch (error) {
      console.error('Logout error:', error);
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