import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLService } from '../../../../services/PostgreSQLService';
import { 
  validateEmail, 
  validatePassword, 
  createAuthResponse, 
  checkAuthRateLimit
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

    // Rate limiting - 3 registration attempts per 15 minutes per IP
    if (!checkAuthRateLimit(`register_${clientIP}`, 3, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
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

    const { email, password, firstName, lastName } = body;

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

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'Password does not meet requirements',
          details: passwordValidation.errors 
        },
        { 
          status: 400,
          headers: getCorsHeaders(request.headers.get('origin') || undefined)
        }
      );
    }

    // Validate name fields if provided
    if (firstName && (typeof firstName !== 'string' || firstName.trim().length === 0)) {
      return NextResponse.json(
        { error: 'First name must be a non-empty string' },
        { 
          status: 400,
          headers: getCorsHeaders(request.headers.get('origin') || undefined)
        }
      );
    }

    if (lastName && (typeof lastName !== 'string' || lastName.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Last name must be a non-empty string' },
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
      // Register user
      const result = await db.registerUser(
        email.toLowerCase().trim(),
        password,
        firstName?.trim(),
        lastName?.trim()
      );

      // Log successful registration
      console.log(`New user registered: ${email}`);

      // Record registration interaction
      await db.recordInteraction(result.user.id, 'registration', {
        email: email.toLowerCase().trim(),
        hasFirstName: !!firstName,
        hasLastName: !!lastName,
        timestamp: new Date().toISOString()
      });

      // Return success response with auth token
      return createAuthResponse(
        {
          message: 'Registration successful',
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
      console.error('Registration error:', error);

      if (error instanceof Error) {
        if (error.message === 'User already exists') {
          return NextResponse.json(
            { error: 'An account with this email already exists' },
            { 
              status: 409,
              headers: getCorsHeaders(request.headers.get('origin') || undefined)
            }
          );
        }
      }

      return NextResponse.json(
        { error: 'Registration failed. Please try again.' },
        { 
          status: 500,
          headers: getCorsHeaders(request.headers.get('origin') || undefined)
        }
      );
    }

  } catch (error) {
    console.error('Registration endpoint error:', error);
    
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