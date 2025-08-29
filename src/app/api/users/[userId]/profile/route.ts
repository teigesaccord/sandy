import { NextRequest, NextResponse } from 'next/server';
import { getDBService, checkRateLimit, handleApiError, getCorsHeaders, validateUserId } from '../../../../../lib/services';
import { UserProfile } from '../../../../../models/UserProfile';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // Validate user ID
    if (!validateUserId(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
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

    const dbService = await getDBService();
    const profile = await dbService.getUserProfile(userId);

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
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // Validate user ID
    if (!validateUserId(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
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

    const dbService = await getDBService();
    
    // Get existing profile or create new one
    let profile = await dbService.getUserProfile(userId);
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

    // Save profile
    await dbService.saveUserProfile(userId, profile);

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
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // PUT has the same logic as POST for profile updates
  return POST(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // Validate user ID
    if (!validateUserId(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
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

    const dbService = await getDBService();
    const success = await dbService.deleteUserProfile(userId);

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