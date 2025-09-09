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
      // Call backend auth endpoint via proxy
      const result = await PostgreSQLService.login(email.toLowerCase().trim(), password);

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

      // Return response and set auth cookie using token from backend
      return createAuthResponse(
        {
          message: 'Login successful',
          user: result.user
        },
        result.token
      );

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