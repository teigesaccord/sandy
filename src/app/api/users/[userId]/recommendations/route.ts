import { NextRequest, NextResponse } from 'next/server';
import { getAIService, getDBService, checkRateLimit, handleApiError, getCorsHeaders, validateUserId } from '../../../../../lib/services';

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
    const rateLimitResult = checkRateLimit(`recommendations_${userId}`);
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

    // Get query parameters
    const url = new URL(request.url);
    const area = url.searchParams.get('area');

    // Get services
    const aiService = await getAIService();
    const dbService = await getDBService();

    // Get user profile
    const profile = await dbService.getUserProfile(userId);
    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Generate recommendations
    const result = await aiService.generateRecommendations(profile, area || undefined);

    if (result.error) {
      return NextResponse.json(
        { 
          error: result.error,
          recommendations: result.recommendations || [] // Fallback recommendations
        },
        { 
          status: 200, // Still return 200 since we have fallback recommendations
          headers: getCorsHeaders(request.headers.get('origin') || undefined) 
        }
      );
    }

    // Save recommendations to database for analytics
    try {
      await dbService.saveRecommendation(
        userId,
        area || 'general',
        {
          recommendations: result.recommendations,
          generatedAt: new Date().toISOString(),
          profileCompleteness: profile.intakeStatus?.completionPercentage || 0
        }
      );
    } catch (dbError) {
      console.error('Failed to save recommendations to database:', dbError);
      // Don't fail the request if we can't save to DB
    }

    // Record interaction
    await dbService.recordInteraction(userId, 'recommendation', {
      area: area || 'general',
      recommendationCount: result.recommendations.length
    }, true);

    return NextResponse.json(
      {
        recommendations: result.recommendations,
        personalizedFor: profile.personalInfo?.name || 'User',
        generatedAt: new Date().toISOString(),
        focusArea: area || 'general',
        profileCompleteness: profile.intakeStatus?.completionPercentage || 0
      },
      { headers: getCorsHeaders(request.headers.get('origin') || undefined) }
    );

  } catch (error) {
    console.error('Recommendations API Error:', error);
    
    // Always try to return some recommendations even if there's an error
    const fallbackRecommendations = [
      {
        id: 'fallback_1',
        title: 'Take Regular Breaks',
        description: 'Schedule short 5-10 minute breaks throughout your day to rest and recharge.',
        category: 'wellness',
        priority: 'high',
        actionable: true,
        difficulty: 'beginner',
        estimatedTimeToComplete: '5-10 minutes'
      },
      {
        id: 'fallback_2',
        title: 'Practice Deep Breathing',
        description: 'Try a simple breathing exercise: inhale for 4 counts, hold for 4, exhale for 4.',
        category: 'wellness',
        priority: 'medium',
        actionable: true,
        difficulty: 'beginner',
        estimatedTimeToComplete: '2-5 minutes'
      },
      {
        id: 'fallback_3',
        title: 'Stay Hydrated',
        description: 'Keep a water bottle nearby and aim to drink water regularly throughout the day.',
        category: 'health',
        priority: 'medium',
        actionable: true,
        difficulty: 'beginner',
        estimatedTimeToComplete: 'Ongoing'
      }
    ];

    const { message, status } = handleApiError(error);
    
    return NextResponse.json(
      {
        recommendations: fallbackRecommendations,
        error: message,
        fallback: true,
        generatedAt: new Date().toISOString(),
        focusArea: 'general'
      },
      { 
        status: status >= 500 ? 200 : status, // Return 200 for server errors to show fallback
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