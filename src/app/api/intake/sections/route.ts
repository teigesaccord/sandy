import { NextRequest, NextResponse } from 'next/server';
import { getIntakeService, checkRateLimit, handleApiError, getCorsHeaders } from '../../../../lib/services';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(`intake_sections`);
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

    const intakeService = await getIntakeService();
    const sectionIds = intakeService.getAllSections();
    
    const sections = sectionIds.map(sectionId => {
      const section = intakeService.getSectionForFrontend(sectionId);
      return section ? section : null;
    }).filter(Boolean);

    return NextResponse.json(
      { sections },
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