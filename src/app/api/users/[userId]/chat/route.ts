import { NextRequest, NextResponse } from 'next/server';
import { getAIService, checkRateLimit, handleApiError, getCorsHeaders, validateMessage } from '../../../../../lib/services';
import { UserProfile } from '../../../../../models/UserProfile';
import PostgreSQLService from '../../../../../services/PostgreSQLService';
import { requireAuth, type AuthenticatedRequest, extractTokenFromRequest } from '../../../../../lib/auth';


export const POST = requireAuth(async (
  request: NextRequest,
  { params }: { params: { userId: string } }
) => {
  try {
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.user!;
    const { userId } = params;

    // Users can only chat as themselves
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(`chat_${userId}`);
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
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    const { message, context } = requestData;

    // Validate message
    if (!validateMessage(message)) {
      return NextResponse.json(
        { error: 'Message is required and must be between 1 and 2000 characters' },
        { status: 400, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Get services
    const aiService = await getAIService();

    // Extract token for PostgreSQL service calls
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token missing' },
        { status: 401, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Get or create user profile via backend API
    let profile = await PostgreSQLService.getUserProfile(userId, token);
    if (!profile) {
      profile = new UserProfile({ userId });
      await PostgreSQLService.saveUserProfile(userId, profile, token);
    }

    // Process chat message with AI
    const response = await aiService.chat(userId, message, profile, context || {});

    // Save the conversation to the backend
    await PostgreSQLService.saveConversation(userId, 'user', message, context, token);
    await PostgreSQLService.saveConversation(userId, 'assistant', response.response, undefined, token);

    // TODO: Record interaction for analytics (endpoint not implemented yet)
    // await PostgreSQLService.recordInteraction(userId, 'chat', {
    //   message: message.substring(0, 100),
    //   responseLength: response.response.length,
    //   intent: response.intent
    // }, token);

    // Save updated profile
    await PostgreSQLService.saveUserProfile(userId, profile, token);

    return NextResponse.json(
      {
        response: response.response,
        suggestions: response.suggestions,
        intent: response.intent,
        followUp: response.followUp,
        timestamp: new Date().toISOString(),
        metadata: {
          confidence: response.metadata?.confidence,
          tokens: response.metadata?.tokens
        }
      },
      { headers: getCorsHeaders(request.headers.get('origin') || undefined) }
    );

  } catch (error) {
    console.error('Chat API Error:', error);
    
    // Always return a helpful fallback response for chat errors
    const fallbackResponse = {
      response: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment, or let me know if you need immediate assistance.",
      suggestions: [
        "Try rephrasing your message",
        "Ask me about something else",
        "Let me know if this is urgent"
      ],
      intent: 'error_fallback',
      timestamp: new Date().toISOString(),
      error: true
    };

    const { message: errorMessage, status } = handleApiError(error);
    
    return NextResponse.json(
      fallbackResponse,
      { 
        status: status >= 500 ? 200 : status, // Return 200 for server errors to show fallback
        headers: getCorsHeaders(request.headers.get('origin') || undefined) 
      }
    );
  }
});

export const GET = requireAuth(async (
  request: NextRequest,
  { params }: { params: { userId: string } }
) => {
  try {
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.user!;
    const { userId } = params;

    // Users can only access their own chat history
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(`chat_history_${userId}`);
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

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    // Get conversation history from Django backend directly with authentication
    try {
      const token = extractTokenFromRequest(request);
      if (!token) {
        console.error('No authentication token found in request');
        return NextResponse.json(
          { error: 'Authentication token missing' },
          { status: 401, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
        );
      }

      const apiHost = (process.env.API_HOST || process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8000').replace(/\/$/, '');
      const djangoUrl = `${apiHost}/api/users/${userId}/chat/?limit=${limit}`;
      console.log('🔍 CHAT API DEBUG: Calling Django:', djangoUrl);
      
      const djangoResponse = await fetch(djangoUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 CHAT API DEBUG: Django response status:', djangoResponse.status);

      if (!djangoResponse.ok) {
        const errorText = await djangoResponse.text();
        console.error('🔍 CHAT API DEBUG: Django error:', djangoResponse.status, errorText);
        return NextResponse.json(
          { error: 'Failed to fetch chat history from backend' },
          { status: djangoResponse.status, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
        );
      }

      const djangoData = await djangoResponse.json();
      console.log('🔍 CHAT API DEBUG: Django data structure:', typeof djangoData, Object.keys(djangoData));
      
      // Django ViewSet returns paginated results in 'results' field, or direct array
      const conversations = djangoData.results || djangoData;
      
      return NextResponse.json(
        { history: conversations },
        { headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    } catch (error) {
      console.error('🔍 CHAT API DEBUG: Error fetching conversation history:', error);
      return NextResponse.json(
        { error: 'Internal server error while fetching chat history' },
        { status: 500, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
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

export const DELETE = requireAuth(async (
  request: NextRequest,
  { params }: { params: { userId: string } }
) => {
  try {
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.user!;
    const { userId } = params;

    // Users can only clear their own chat history
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(`chat_clear_${userId}`);
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

    // Extract token for PostgreSQL service calls
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token missing' },
        { status: 401, headers: getCorsHeaders(request.headers.get('origin') || undefined) }
      );
    }

    const aiService = await getAIService();

    // Clear conversation history in AI service
    aiService.clearUserHistory(userId);

    // Clear conversation history in backend via proxy
    await PostgreSQLService.clearConversationHistory(userId, token);

    return NextResponse.json(
      { message: 'Conversation history cleared successfully' },
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