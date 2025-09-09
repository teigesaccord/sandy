import { NextRequest, NextResponse } from 'next/server';
import { getAIService, checkRateLimit, handleApiError, getCorsHeaders, validateMessage } from '../../../../../lib/services';
import { UserProfile } from '../../../../../models/UserProfile';
import PostgreSQLService from '../../../../../services/PostgreSQLService';
import { requireAuth, type AuthenticatedRequest } from '../../../../../lib/auth';


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

    // Get or create user profile via backend API
    let profile = await PostgreSQLService.getUserProfile(userId);
    if (!profile) {
      profile = new UserProfile({ userId });
      await PostgreSQLService.saveUserProfile(userId, profile);
    }

    // Process chat message with AI
    const response = await aiService.chat(userId, message, profile, context || {});

    // Save the conversation to the backend
    await PostgreSQLService.saveConversation(userId, 'user', message, context);
    await PostgreSQLService.saveConversation(userId, 'assistant', response.response);

    // Record interaction for analytics
    await PostgreSQLService.recordInteraction(userId, 'chat', {
      message: message.substring(0, 100),
      responseLength: response.response.length,
      intent: response.intent
    });

    // Save updated profile
    await PostgreSQLService.saveUserProfile(userId, profile);

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
    
    // Get conversation history
  const history = await PostgreSQLService.getConversationHistory(userId, limit);

    return NextResponse.json(
      { history },
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

  const aiService = await getAIService();

  // Clear conversation history in AI service
  aiService.clearUserHistory(userId);

  // Clear conversation history in backend via proxy
  await PostgreSQLService.clearConversationHistory(userId);

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