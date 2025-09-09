import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, handleApiError, getCorsHeaders } from '../../../../../lib/services';
import { UserProfile } from '../../../../../models/UserProfile';
import PostgreSQLService from '../../../../../services/PostgreSQLService';
import { requireAuth, type AuthenticatedRequest } from '../../../../../lib/auth';

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

  const profile = await PostgreSQLService.getUserProfile(userId);

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    return NextResponse.json(
      { profile: profile.toJSON() },
      { headers: getCorsHeaders(request.headers.get('origin') || undefined) }
    );

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

  // Get existing profile or create new one via backend
  let profile = await PostgreSQLService.getUserProfile(userId);
    if (profile) {
      profile.update(profileData);
    } else {
      profile = new UserProfile({ ...profileData, userId });
    }

    // Validate profile
    const validation = profile.validate();
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

  // Save profile and record interaction via backend
  await PostgreSQLService.saveUserProfile(userId, profile);
  await PostgreSQLService.recordInteraction(userId, 'profile_update', { timestamp: (new Date()).toISOString() });

    return NextResponse.json(
      { profile: profile.toJSON() },
      { headers: getCorsHeaders(request.headers.get('origin') || undefined) }
    );

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

  const success = await PostgreSQLService.deleteUserProfile(userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete profile' },
        { status: 500, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    return NextResponse.json(
      { message: 'Profile deleted successfully' },
      { headers: getCorsHeaders(request.headers.get('origin') || undefined) }
    );

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