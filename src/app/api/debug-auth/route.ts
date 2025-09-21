import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromRequest, authenticate } from '../../../lib/auth';
import { getCorsHeaders } from '../../../lib/services';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG AUTH: Starting authentication debug...');
    
    // Check what cookies are present
    const allCookies = request.cookies.getAll();
    console.log('🔍 DEBUG AUTH: All cookies:', allCookies);
    
    // Check for auth-token cookie specifically
    const authTokenCookie = request.cookies.get('auth-token');
    console.log('🔍 DEBUG AUTH: auth-token cookie:', authTokenCookie ? 'present' : 'not found');
    
    // Check Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('🔍 DEBUG AUTH: Authorization header:', authHeader ? 'present' : 'not found');
    
    // Try to extract token
    const token = extractTokenFromRequest(request);
    console.log('🔍 DEBUG AUTH: Extracted token:', token ? token.substring(0, 50) + '...' : 'none');
    
    // Try to authenticate
    const user = await authenticate(request);
    console.log('🔍 DEBUG AUTH: Authentication result:', user ? `success for user ${user.id}` : 'failed');
    
    // Build debug response
    const debugInfo = {
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method,
      cookies: {
        total: allCookies.length,
        authToken: authTokenCookie ? {
          present: true,
          value: authTokenCookie.value.substring(0, 50) + '...'
        } : {
          present: false
        },
        all: allCookies.map(c => ({
          name: c.name,
          value: c.value.substring(0, 20) + '...'
        }))
      },
      headers: {
        authorization: authHeader ? authHeader.substring(0, 50) + '...' : null,
        origin: request.headers.get('origin'),
        userAgent: request.headers.get('user-agent')
      },
      authentication: {
        tokenFound: !!token,
        tokenSource: token ? (authTokenCookie ? 'cookie' : 'header') : null,
        userAuthenticated: !!user,
        userId: user?.id || null,
        userEmail: user?.email || null
      }
    };

    return NextResponse.json(
      {
        message: 'Authentication debug information',
        debug: debugInfo,
        authenticated: !!user,
        user: user ? {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        } : null
      },
      { 
        status: 200,
        headers: getCorsHeaders(request.headers.get('origin') || undefined) 
      }
    );

  } catch (error) {
    console.error('🔍 DEBUG AUTH: Error during debug:', error);
    
    return NextResponse.json(
      {
        message: 'Debug authentication endpoint error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: getCorsHeaders(request.headers.get('origin') || undefined) 
      }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        ...getCorsHeaders(request.headers.get('origin') || undefined),
        'Access-Control-Max-Age': '86400'
      }
    }
  );
}