import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLService } from '../../../../services/PostgreSQLService';
import { 
  validateEmail, 
  createAuthResponse, 
  checkAuthRateLimit,
  clearAuthRateLimit
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

    // Initialize database service
    const db = getDBService();
    await db.initialize();

    try {
      // Attempt login
      const result = await db.loginUser(
        email.toLowerCase().trim(),
        password
      );

      // Clear rate limit on successful login
      clearAuthRateLimit(`login_${clientIP}`);

      // Log successful login
      console.log(`User logged in: ${email}`);

      // Record login interaction
      await db.recordInteraction(result.user.id, 'login', {
        email: email.toLowerCase().trim(),
        timestamp: new Date().toISOString(),
        ip: clientIP
      });

      // Return success response with auth token
      return createAuthResponse(
        {
          message: 'Login successful',
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.first_name,
            lastName: result.user.last_name,
            isVerified: result.user.is_verified,
            createdAt: result.user.created_at
          }
        },
        result.token
      );

    } catch (error) {
      console.error('Login error:', error);

      if (error instanceof Error) {
        if (error.message === 'Invalid credentials') {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { 
              status: 401,
              headers: getCorsHeaders(request.headers.get('origin') || undefined)
            }
          );
        }
      }

      return NextResponse.json(
        { error: 'Login failed. Please try again.' },
        { 
          status: 500,
          headers: getCorsHeaders(request.headers.get('origin') || undefined)
        }
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