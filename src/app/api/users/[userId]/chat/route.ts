import { NextRequest, NextResponse } from 'next/server';
import { getAIService, getDBService, checkRateLimit, handleApiError, getCorsHeaders, validateUserId, validateMessage } from '../../../../../lib/services';
import { UserProfile } from '../../../../../models/UserProfile';

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
    const dbService = await getDBService();

    // Get or create user profile
    let profile = await dbService.getUserProfile(userId);
    if (!profile) {
      profile = new UserProfile({ userId });
      await dbService.saveUserProfile(userId, profile);
    }

    // Process chat message with AI
    const response = await aiService.chat(userId, message, profile, context || {});

    // Save the conversation to the database
    await dbService.saveConversation(userId, 'user', message, context);
    await dbService.saveConversation(userId, 'assistant', response.response);

    // Record interaction for analytics
    await dbService.recordInteraction(userId, 'chat', { 
      message: message.substring(0, 100), // First 100 chars for privacy
      responseLength: response.response.length,
      intent: response.intent
    }, true);

    // Update user profile with conversation history
    profile.addConversationMessage({
      id: `${Date.now()}_user`,
      userId,
      role: 'user',
      content: message,
      timestamp: new Date(),
      metadata: { context: JSON.stringify(context) }
    });

    profile.addConversationMessage({
      id: `${Date.now()}_assistant`,
      userId,
      role: 'assistant',
      content: response.response,
      timestamp: new Date()
    });

    // Save updated profile
    await dbService.saveUserProfile(userId, profile);

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
}

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

    const dbService = await getDBService();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const conversationHistory = await dbService.getConversationHistory(userId, limit, offset);

    return NextResponse.json(
      {
        conversations: conversationHistory,
        pagination: {
          limit,
          offset,
          hasMore: conversationHistory.length === limit
        }
      },
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
    const rateLimitResult = checkRateLimit(`chat_delete_${userId}`);
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
    const dbService = await getDBService();

    // Clear conversation history in AI service
    aiService.clearUserHistory(userId);

    // Clear conversation history in database
    await dbService.clearConversationHistory(userId);

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