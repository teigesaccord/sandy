import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import PostgreSQLService from '../services/PostgreSQLService';

export interface AuthenticatedUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthenticatedUser;
}

export async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    console.log('🔍 AUTH DEBUG: verifyToken called with token:', token.substring(0, 50) + '...');
    // Call Django backend directly with token to validate
    // For server-side calls, prioritize API_HOST (Docker: backend:8000), then fall back to NEXT_PUBLIC_API_HOST (browser: localhost:8000)
    const apiHost = (process.env.API_HOST || process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8000').replace(/\/$/, '');
    const url = `${apiHost}/api/auth/simple-me/?token=${encodeURIComponent(token)}`;
    console.log('🔍 AUTH DEBUG: Using API host:', apiHost);
    console.log('🔍 AUTH DEBUG: Making request to Django:', url);
    const response = await fetch(url, { method: 'GET' });
    
    console.log('🔍 AUTH DEBUG: Django response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 AUTH DEBUG: Token verification failed:', response.status, errorText);
      return null;
    }
    
    const userData = await response.json();
    console.log('🔍 AUTH DEBUG: Django user data:', userData);
    if (!userData || !userData.id) {
      console.error('🔍 AUTH DEBUG: Invalid user data received from Django');
      return null;
    }
    console.log('🔍 AUTH DEBUG: Token verification successful for user:', userData.id);
    return userData as AuthenticatedUser;
  } catch (error) {
    console.error('🔍 AUTH DEBUG: Token verification error:', error);
    return null;
  }
}

export function extractTokenFromRequest(request: NextRequest): string | null {
  console.log('🔍 AUTH DEBUG: extractTokenFromRequest called for path:', request.url);
  
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization');
  console.log('🔍 AUTH DEBUG: Authorization header:', authHeader ? authHeader.substring(0, 50) + '...' : 'not found');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('🔍 AUTH DEBUG: Found token in Authorization header:', token.substring(0, 50) + '...');
    return token;
  }

  // Try cookie as fallback
  const cookie = request.cookies.get('auth-token');
  console.log('🔍 AUTH DEBUG: auth-token cookie:', cookie ? cookie.value.substring(0, 50) + '...' : 'not found');
  console.log('🔍 AUTH DEBUG: All cookies:', request.cookies.getAll().map(c => c.name));
  if (cookie) {
    console.log('🔍 AUTH DEBUG: Found token in cookie:', cookie.value.substring(0, 50) + '...');
    return cookie.value;
  }

  console.log('🔍 AUTH DEBUG: No token found in headers or cookies');
  return null;
}

export async function authenticate(request: NextRequest): Promise<AuthenticatedUser | null> {
  console.log('🔍 AUTH DEBUG: authenticate called for path:', request.url);
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    console.log('🔍 AUTH DEBUG: No token found, authentication failed');
    return null;
  }

  console.log('🔍 AUTH DEBUG: Token found, verifying...');
  const user = await verifyToken(token);
  console.log('🔍 AUTH DEBUG: Token verification result:', user ? `user ${user.id}` : 'failed');
  return user;
}

export function requireAuth(handler: (request: NextRequest, context?: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    console.log('🔍 AUTH DEBUG: requireAuth called for path:', request.url);
    const user = await authenticate(request);

    if (!user) {
      console.log('🔍 AUTH DEBUG: Authentication failed, returning 401');
      return NextResponse.json(
        { error: 'Authentication required' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true'
          }
        }
      );
    }

    console.log('🔍 AUTH DEBUG: Authentication successful for user:', user.id);
    // Add user to request object
    (request as AuthenticatedRequest).user = user;

    return handler(request, context);
  };
}

export function optionalAuth(handler: (request: NextRequest, context?: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const user = await authenticate(request);

    // Add user to request object (can be null)
    (request as AuthenticatedRequest).user = user || undefined;

    return handler(request, context);
  };
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateSecureToken(): string {
  return jwt.sign(
    { 
      type: 'verification',
      timestamp: Date.now()
    },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '24h' }
  );
}

export function createAuthResponse(data: any, token: string): NextResponse {
  const response = NextResponse.json(data);
  
  // Set HTTP-only cookie
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });

  return response;
}

export function createLogoutResponse(): NextResponse {
  const response = NextResponse.json({ message: 'Logged out successfully' });
  
  // Clear the auth cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });

  return response;
}

// Rate limiting for authentication endpoints
const authAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkAuthRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const attempts = authAttempts.get(identifier);

  if (!attempts) {
    authAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  if (now - attempts.lastAttempt > windowMs) {
    // Reset window
    authAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  if (attempts.count >= maxAttempts) {
    return false;
  }

  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

export function clearAuthRateLimit(identifier: string): void {
  authAttempts.delete(identifier);
}