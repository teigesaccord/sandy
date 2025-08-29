import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLService } from '../../../../services/PostgreSQLService';
import { requireAuth } from '../../../../lib/auth';
import { getCorsHeaders } from '../../../../lib/services';
import type { AuthenticatedRequest } from '../../../../lib/auth';

let dbService: PostgreSQLService | null = null;

function getDBService(): PostgreSQLService {
  if (!dbService) {
    dbService = new PostgreSQLService();
  }
  return dbService;
}

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.user!;

    // Initialize database service
    const db = getDBService();
    await db.initialize();

    try {
      // Get user's profile if it exists
      const profile = await db.getUserProfile(user.id);

      // Return user info with profile data
      return NextResponse.json(
        {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            isVerified: user.is_verified,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          },
          profile: profile ? profile.toJSON() : null,
          hasProfile: !!profile
        },
        { 
          headers: getCorsHeaders(request.headers.get('origin') || undefined)
        }
      );

    } catch (error) {
      console.error('Error fetching user data:', error);

      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { 
          status: 500,
          headers: getCorsHeaders(request.headers.get('origin') || undefined)
        }
      );
    }

  } catch (error) {
    console.error('Me endpoint error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: getCorsHeaders(request.headers.get('origin') || undefined)
      }
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