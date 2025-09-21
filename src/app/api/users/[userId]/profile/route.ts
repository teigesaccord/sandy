import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, handleApiError, getCorsHeaders } from '../../../../../lib/services';
import { UserProfile } from '../../../../../models/UserProfile';
import { requireAuth, type AuthenticatedRequest, extractTokenFromRequest } from '../../../../../lib/auth';

// Use frontend HTTP proxy to talk to Django backend

export const GET = requireAuth(async (request: NextRequest, { params }: { params: { userId: string } }) => {
  try {
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.user!;
    const { userId } = params;

    // Users can only access their own profile
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(`profile_get_${userId}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            ...getCorsHeaders(request.headers.get('origin') || undefined),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      );
    }

    // Get JWT token for Django API call
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token missing' },
        { status: 401, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Call Django backend directly
    try {
      const apiHost = (process.env.API_HOST || process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8000').replace(/\/$/, '');
      const djangoUrl = `${apiHost}/api/users/${userId}/profile/`;
      
      const djangoResponse = await fetch(djangoUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!djangoResponse.ok) {
        if (djangoResponse.status === 404) {
          return NextResponse.json(
            { error: 'Profile not found' },
            { status: 404, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
          );
        }
        return NextResponse.json(
          { error: 'Failed to fetch profile from backend' },
          { status: djangoResponse.status, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
        );
      }

      const profileData = await djangoResponse.json();
      return NextResponse.json(
        { profile: profileData },
        { headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    } catch (error) {
      console.error('Error calling Django backend:', error);
      return NextResponse.json(
        { error: 'Backend service unavailable' },
        { status: 503, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json(
      { error: message },
      { status, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
    );
  }
});

export const POST = requireAuth(async (request: NextRequest, { params }: { params: { userId: string } }) => {
  try {
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.user!;
    const { userId } = params;

    // Users can only update their own profile
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(`profile_post_${userId}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            ...getCorsHeaders(request.headers.get('origin') || undefined),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      );
    }

    // Parse request body
    let profileData;
    try {
      profileData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Get JWT token for Django API call
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token missing' },
        { status: 401, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Validate profile data
    const profile = new UserProfile({ ...profileData, userId });
    const validation = profile.validate();
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Save profile via Django backend
    try {
      const apiHost = (process.env.API_HOST || process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8000').replace(/\/$/, '');
      const djangoUrl = `${apiHost}/api/users/${userId}/profile/`;
      
      const djangoResponse = await fetch(djangoUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!djangoResponse.ok) {
        const errorText = await djangoResponse.text();
        console.error('Django profile save failed:', djangoResponse.status, errorText);
        return NextResponse.json(
          { error: 'Failed to save profile to backend' },
          { status: djangoResponse.status, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
        );
      }

      const savedProfile = await djangoResponse.json();
      return NextResponse.json(
        { profile: savedProfile },
        { headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    } catch (error) {
      console.error('Error calling Django backend for profile save:', error);
      return NextResponse.json(
        { error: 'Backend service unavailable' },
        { status: 503, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json(
      { error: message },
      { status, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
    );
  }
});

export const PUT = POST; // PUT has the same logic as POST for profile updates

export const DELETE = requireAuth(async (request: NextRequest, { params }: { params: { userId: string } }) => {
  try {
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.user!;
    const { userId } = params;

    // Users can only delete their own profile
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(`profile_delete_${userId}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            ...getCorsHeaders(request.headers.get('origin') || undefined),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      );
    }

    // Get JWT token for Django API call
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token missing' },
        { status: 401, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Delete profile via Django backend
    try {
      const apiHost = (process.env.API_HOST || process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8000').replace(/\/$/, '');
      const djangoUrl = `${apiHost}/api/users/${userId}/profile/`;
      
      const djangoResponse = await fetch(djangoUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!djangoResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to delete profile from backend' },
          { status: djangoResponse.status, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
        );
      }

      return NextResponse.json(
        { message: 'Profile deleted successfully' },
        { headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    } catch (error) {
      console.error('Error calling Django backend for profile delete:', error);
      return NextResponse.json(
        { error: 'Backend service unavailable' },
        { status: 503, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json(
      { error: message },
      { status, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
    );
  }
});

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