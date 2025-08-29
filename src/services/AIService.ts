import OpenAI from 'openai';
import type { 
  UserProfile, 
  ChatResponse, 
  AIServiceConfig, 
  AIResponse,
  Recommendation,
  ConversationMessage 
} from '../types';

export class AIService {
  private openai: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private conversationHistory: Map<string, ConversationMessage[]>;
  private systemPrompts: Record<string, string>;

  constructor(apiKey: string, options: Partial<AIServiceConfig> = {}) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
    
    this.model = options.modelName || 'gpt-3.5-turbo';
    this.temperature = options.temperature || 0.7;
    this.maxTokens = options.maxTokens || 2000;
    
    this.conversationHistory = new Map();
    this.systemPrompts = this.initializeSystemPrompts();
  }

  private initializeSystemPrompts(): Record<string, string> {
    return {
      main: `You are Sandy, a compassionate and knowledgeable personal support assistant specializing in helping people with chronic conditions, disabilities, and health challenges. Your role is to provide personalized, practical support while being encouraging and understanding.

CORE PRINCIPLES:
- Always prioritize user safety and well-being
- Provide personalized recommendations based on the user's specific profile
- Use clear, accessible language appropriate to their communication preferences
- Be empathetic and non-judgmental
- Encourage but never pressure
- Recognize limitations and suggest professional help when appropriate

RESPONSE GUIDELINES:
- Keep responses concise but comprehensive
- Use bullet points or numbered lists for clarity when appropriate
- Acknowledge the user's challenges and validate their experiences
- Offer multiple options when possible to give users choice
- Include gentle reminders about self-care and pacing
- End with an encouraging note or question to continue engagement`,

      recommendation: `Based on the user's profile, provide personalized recommendations that consider:
- Their physical capabilities and limitations
- Current energy levels and patterns
- Communication and support preferences
- Personal goals and priorities
- Available support network
- Previous successful strategies

Structure your recommendations as:
1. Immediate actionable steps (what they can do today)
2. Short-term strategies (next week or two)
3. Longer-term considerations
4. Resources or support options

Always explain WHY a recommendation fits their specific situation.`,

      intake: `You are helping gather information to build a comprehensive support profile. Be conversational and encouraging while asking necessary questions.

APPROACH:
- Ask one question at a time to avoid overwhelming
- Show genuine interest in their responses
- Validate their experiences and challenges
- Explain why certain information is helpful
- Adapt follow-up questions based on their answers
- Make the process feel like a caring conversation, not an interrogation`,

      crisis: `IMPORTANT: If you detect signs of crisis, emergency, or immediate safety concerns:
- Acknowledge their feelings with compassion
- Provide immediate crisis resources
- Encourage contacting emergency services if appropriate
- Follow up with gentle support resources
- Do not attempt to provide therapy or medical advice

Crisis indicators include: expressions of self-harm, severe depression, acute medical emergencies, safety threats.`
    };
  }

  async chat(userId: string, message: string, userProfile: UserProfile, context: Record<string, any> = {}): Promise<ChatResponse> {
    try {
      // Get or create conversation memory for this user
      let userHistory = this.conversationHistory.get(userId);
      if (!userHistory) {
        userHistory = [];
        this.conversationHistory.set(userId, userHistory);
      }

      // Build personalized system message
      const systemMessage = this.buildSystemMessage(userProfile, context);
      
      // Prepare messages for OpenAI
      const messages = [
        { role: 'system' as const, content: systemMessage },
        ...userHistory.slice(-10).map(msg => ({ 
          role: msg.role as 'user' | 'assistant', 
          content: msg.content 
        })),
        { role: 'user' as const, content: message }
      ];

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      const response = completion.choices[0].message.content || '';

      // Store interaction in user's history
      const userMsg: ConversationMessage = {
        id: `${Date.now()}_user`,
        userId,
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      
      const assistantMsg: ConversationMessage = {
        id: `${Date.now()}_assistant`,
        userId,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      userHistory.push(userMsg, assistantMsg);

      // Keep history manageable (last 20 messages)
      if (userHistory.length > 20) {
        userHistory.splice(0, userHistory.length - 20);
      }

      // Update user profile interaction stats
      await this.recordInteraction(userId, message, response, userProfile);

      return {
        response: response,
        suggestions: await this.generateFollowUpSuggestions(userProfile, message, response),
        intent: this.detectIntent(message),
        metadata: {
          model: this.model,
          tokens: completion.usage?.total_tokens,
          confidence: this.assessResponseConfidence(userProfile, message)
        }
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        response: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment, or contact support if the issue persists.",
        metadata: {
          model: this.model,
          confidence: 0
        }
      };
    }
  }

  async generateRecommendations(userProfile: UserProfile, specificArea?: string): Promise<{ recommendations: Recommendation[]; error?: string }> {
    try {
      const prompt = `${this.systemPrompts.recommendation}

USER PROFILE:
${this.formatRecommendationContext(userProfile)}

SPECIFIC FOCUS AREA: ${specificArea || "overall wellness and daily living support"}

Generate 3-5 personalized recommendations that are:
1. Specific to their capabilities and limitations
2. Aligned with their goals and preferences  
3. Actionable and realistic
4. Considerate of their energy levels and support network

Format as a structured response with clear categories and explanations.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      const response = completion.choices[0].message.content || '';

      return {
        recommendations: this.parseRecommendations(response)
      };

    } catch (error) {
      console.error('Recommendation generation error:', error);
      return {
        recommendations: this.getFallbackRecommendations(userProfile),
        error: "Unable to generate recommendations at this time"
      };
    }
  }

  async processIntakeResponse(userId: string, response: string, currentSection: string, userProfile: UserProfile): Promise<AIResponse> {
    try {
      const prompt = `${this.systemPrompts.intake}

CURRENT SECTION: ${currentSection}
USER RESPONSE: ${response}
PROFILE PROGRESS: ${userProfile.conversationHistory?.length || 0} interactions

Respond with empathy and understanding. If the response reveals important information:
1. Acknowledge their sharing
2. Validate any challenges mentioned
3. Ask any relevant follow-up questions
4. Explain how this information helps provide better support
5. Transition naturally to the next topic if appropriate

Keep the tone conversational and supportive.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      const aiResponse = completion.choices[0].message.content || '';

      return {
        response: aiResponse,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        },
        model: this.model,
        created: completion.created
      };

    } catch (error) {
      console.error('Intake processing error:', error);
      return {
        response: "Thank you for sharing that with me. Your information helps me understand how to better support you.",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: this.model
      };
    }
  }

  private buildSystemMessage(userProfile: UserProfile, context: Record<string, any> = {}): string {
    let systemMessage = this.systemPrompts.main;

    if (userProfile?.preferences) {
      const prefs = userProfile.preferences;
      
      // Adapt communication style
      switch (prefs.communicationStyle) {
        case 'professional':
          systemMessage += "\n\nCOMMUNICATION STYLE: Be professional, structured, and informative. Use formal language.";
          break;
        case 'casual':
          systemMessage += "\n\nCOMMUNICATION STYLE: Be friendly, approachable, and conversational. Use casual language.";
          break;
        case 'friendly':
          systemMessage += "\n\nCOMMUNICATION STYLE: Be warm, encouraging, and emotionally supportive. Use gentle language.";
          break;
        default:
          systemMessage += "\n\nCOMMUNICATION STYLE: Use a balanced approach - supportive but practical.";
      }

      // Add response length preference
      if (prefs.responseLength) {
        systemMessage += `\n\nRESPONSE LENGTH: Keep responses ${prefs.responseLength}. `;
        switch (prefs.responseLength) {
          case 'brief':
            systemMessage += "Be concise and to the point.";
            break;
          case 'detailed':
            systemMessage += "Provide comprehensive explanations and context.";
            break;
          case 'comprehensive':
            systemMessage += "Give thorough, in-depth responses with examples.";
            break;
        }
      }

      // Add topic preferences
      if (prefs.topics && prefs.topics.length > 0) {
        systemMessage += `\n\nUSER INTERESTS: User is particularly interested in ${prefs.topics.join(', ')}.`;
      }
    }

    // Add goal focus
    if (userProfile?.goals?.primary) {
      systemMessage += `\n\nCURRENT FOCUS: User's main goal is ${userProfile.goals.primary}.`;
    }

    // Add context-specific instructions
    if (context.type === 'crisis') {
      systemMessage += `\n\n${this.systemPrompts.crisis}`;
    }

    return systemMessage;
  }

  private formatRecommendationContext(userProfile: UserProfile): string {
    const context = userProfile.context;
    const goals = userProfile.goals;
    const prefs = userProfile.preferences;

    return `
PERSONAL CONTEXT:
- Industry/Role: ${context?.industry || 'Unknown'} / ${context?.role || 'Unknown'}
- Experience Level: ${context?.experience || 'Unknown'}
- Current Challenges: ${context?.challenges?.join(', ') || 'Not specified'}

GOALS:
- Primary Goal: ${goals?.primary || 'Unknown'}
- Secondary Goals: ${goals?.secondary?.join(', ') || 'None specified'}
- Timeline: ${goals?.timeline || 'Not specified'}

COMMUNICATION PREFERENCES:
- Style: ${prefs?.communicationStyle || 'Unknown'}
- Response Length: ${prefs?.responseLength || 'Unknown'}
- Topics of Interest: ${prefs?.topics?.join(', ') || 'Not specified'}`;
  }

  private async recordInteraction(userId: string, message: string, response: string, userProfile: UserProfile): Promise<void> {
    try {
      // Add interaction to conversation history in profile
      const interaction: ConversationMessage = {
        id: `${Date.now()}_interaction`,
        userId,
        role: 'user',
        content: message,
        timestamp: new Date(),
        metadata: {
          context: 'chat',
          intent: this.detectIntent(message)
        }
      };

      if (!userProfile.conversationHistory) {
        userProfile.conversationHistory = [];
      }

      userProfile.conversationHistory.push(interaction);

      const responseMsg: ConversationMessage = {
        id: `${Date.now()}_response`,
        userId,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      userProfile.conversationHistory.push(responseMsg);

      // Keep conversation history manageable
      if (userProfile.conversationHistory.length > 50) {
        userProfile.conversationHistory.splice(0, userProfile.conversationHistory.length - 50);
      }

      // Update profile timestamps
      userProfile.updatedAt = new Date();

    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  }

  private assessResponseConfidence(userProfile: UserProfile, message: string): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence if we have more profile information
    if (userProfile.personalInfo) confidence += 0.1;
    if (userProfile.preferences) confidence += 0.1;
    if (userProfile.goals) confidence += 0.05;
    if (userProfile.context) confidence += 0.05;

    // Lower confidence for complex or crisis-related messages
    const complexityIndicators = ['help', 'emergency', 'crisis', 'urgent', 'don\'t know'];
    if (complexityIndicators.some(indicator => message.toLowerCase().includes(indicator))) {
      confidence -= 0.2;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private async generateFollowUpSuggestions(userProfile: UserProfile, message: string, response: string): Promise<string[]> {
    try {
      const suggestions: string[] = [];

      // Based on user goals
      if (userProfile.goals?.primary) {
        suggestions.push(`Tell me more about your progress with ${userProfile.goals.primary}`);
      }

      // Based on message content
      if (message.toLowerCase().includes('help')) {
        suggestions.push("What specific area would you like help with?");
      }

      if (message.toLowerCase().includes('tired') || message.toLowerCase().includes('energy')) {
        suggestions.push("Would you like tips for managing your energy levels?");
      }

      // Default suggestions
      suggestions.push(
        "How are you feeling about this approach?",
        "What questions do you have?",
        "Is there anything else I can help with?"
      );

      return suggestions.slice(0, 3); // Return max 3 suggestions

    } catch (error) {
      console.error('Error generating follow-up suggestions:', error);
      return ["How can I help you further?", "What would you like to explore next?"];
    }
  }

  private parseRecommendations(response: string): Recommendation[] {
    try {
      // Simple parsing - in a real implementation, you might use more sophisticated NLP
      const recommendations: Recommendation[] = [];
      const lines = response.split('\n').filter(line => line.trim());
      
      let currentRec: Partial<Recommendation> = {};
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.match(/^\d+\./)) {
          // New recommendation
          if (currentRec.title) {
            recommendations.push(this.completeRecommendation(currentRec));
          }
          currentRec = {
            id: `rec_${Date.now()}_${i}`,
            title: line.replace(/^\d+\.\s*/, ''),
            category: 'general',
            priority: 'medium',
            actionable: true
          };
        } else if (currentRec.title && line) {
          // Description or additional info
          currentRec.description = currentRec.description 
            ? `${currentRec.description} ${line}`
            : line;
        }
      }
      
      // Add the last recommendation
      if (currentRec.title) {
        recommendations.push(this.completeRecommendation(currentRec));
      }

      return recommendations.slice(0, 5); // Max 5 recommendations

    } catch (error) {
      console.error('Error parsing recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }

  private completeRecommendation(partial: Partial<Recommendation>): Recommendation {
    return {
      id: partial.id || `rec_${Date.now()}`,
      title: partial.title || 'Recommendation',
      description: partial.description || 'No description available',
      category: partial.category || 'general',
      priority: partial.priority || 'medium',
      actionable: partial.actionable ?? true,
      difficulty: 'beginner',
      estimatedTimeToComplete: '15-30 minutes'
    };
  }

  private getFallbackRecommendations(userProfile?: UserProfile): Recommendation[] {
    return [
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
        title: 'Stay Hydrated',
        description: 'Keep a water bottle nearby and aim to drink water regularly throughout the day.',
        category: 'health',
        priority: 'medium',
        actionable: true,
        difficulty: 'beginner',
        estimatedTimeToComplete: 'Ongoing'
      },
      {
        id: 'fallback_3',
        title: 'Practice Deep Breathing',
        description: 'Try a simple breathing exercise: inhale for 4 counts, hold for 4, exhale for 4.',
        category: 'wellness',
        priority: 'medium',
        actionable: true,
        difficulty: 'beginner',
        estimatedTimeToComplete: '2-5 minutes'
      }
    ];
  }

  private detectIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
      return 'help_request';
    }
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
      return 'recommendation_request';
    }
    if (lowerMessage.includes('tired') || lowerMessage.includes('energy') || lowerMessage.includes('fatigue')) {
      return 'energy_concern';
    }
    if (lowerMessage.includes('pain') || lowerMessage.includes('hurt')) {
      return 'pain_concern';
    }
    if (lowerMessage.includes('goal') || lowerMessage.includes('achieve')) {
      return 'goal_discussion';
    }
    
    return 'general_conversation';
  }

  clearUserHistory(userId: string): void {
    this.conversationHistory.delete(userId);
  }

  async getConversationSummary(userId: string): Promise<string> {
    try {
      const history = this.conversationHistory.get(userId);
      if (!history || history.length === 0) {
        return "No conversation history available.";
      }

      const recentMessages = history.slice(-10);
      const conversationText = recentMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const prompt = `Please provide a brief summary of this conversation focusing on:
1. Main topics discussed
2. User's primary concerns or goals
3. Key recommendations or advice given
4. Next steps or follow-up items

Conversation:
${conversationText}`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      });

      return completion.choices[0].message.content || "Unable to generate summary.";

    } catch (error) {
      console.error('Error generating conversation summary:', error);
      return "Unable to generate conversation summary at this time.";
    }
  }
}