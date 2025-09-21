import { NextRequest, NextResponse } from 'next/server';
import PostgreSQLService from '../../../../services/PostgreSQLService';
import { 
  validateEmail, 
  createAuthResponse, 
  checkAuthRateLimit,
  clearAuthRateLimit
} from '../../../../lib/auth';
import { getCorsHeaders } from '../../../../lib/services';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Rate limiting - 5 login attempts per 15 minutes per IP
    if (!checkAuthRateLimit(`login_${clientIP}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { 
          status: 429,
          headers: getCorsHeaders(request.headers.get('origin') || undefined)
        }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { 
          status: 400,
          headers: getCorsHeaders(request.headers.get('origin') || undefined)
        }
      );
    }

    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { 
          status: 400,
          headers: getCorsHeaders(request.headers.get('origin') || undefined)
        }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { 
          status: 400,
          headers: getCorsHeaders(request.headers.get('origin') || undefined)
        }
      );
    }

    try {
      console.log('🔍 LOGIN DEBUG: Attempting login for email:', email.toLowerCase().trim());
      // Call backend auth endpoint via proxy
      const result = await PostgreSQLService.login(email.toLowerCase().trim(), password);
      console.log('🔍 LOGIN DEBUG: Backend login result:', result ? 'success' : 'failed');
      console.log('🔍 LOGIN DEBUG: Result has token:', !!result?.token);
      console.log('🔍 LOGIN DEBUG: Result has access:', !!result?.access);
      console.log('🔍 LOGIN DEBUG: Full result structure:', result);

      // Clear rate limit on successful login
      clearAuthRateLimit(`login_${clientIP}`);

      // Record login interaction (best-effort, don't block on failure)
      try {
        await PostgreSQLService.recordInteraction(result.user.id, 'login', {
          email: email.toLowerCase().trim(),
          timestamp: (new Date()).toISOString(),
          ip: clientIP
        });
      } catch (ie) {
        console.warn('Failed to record login interaction', ie);
      }

      // Use the access token from Django response (Django returns 'access' field)
      const token = result.access || result.token;
      console.log('🔍 LOGIN DEBUG: Using token for cookie:', token ? token.substring(0, 50) + '...' : 'none');
      
      if (!token) {
        console.error('🔍 LOGIN DEBUG: No token found in Django response');
        return NextResponse.json(
          { error: 'Login failed - no token received' },
          { 
            status: 500,
            headers: getCorsHeaders(request.headers.get('origin') || undefined)
          }
        );
      }

      // Return response and set auth cookie using token from backend
      const response = createAuthResponse(
        {
          message: 'Login successful',
          user: result.user
        },
        token
      );
      
      console.log('🔍 LOGIN DEBUG: Auth cookie set successfully');
      return response;

    } catch (error) {
      console.error('Login error:', error);

      // Proxy returns structured error messages; surface them where applicable
      const errMsg = (error as any)?.message || 'Login failed. Please try again.';
      const status = /401|403/.test(errMsg) ? 401 : 500;

      return NextResponse.json(
        { error: errMsg },
        { status, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

  } catch (error) {
    console.error('Login endpoint error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
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
        'Access-Control-Max-Age': '86400' // 24 hours
      }
    }
  );
}