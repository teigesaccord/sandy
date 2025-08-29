import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { ConversationSummaryBufferMemory } from 'langchain/memory';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

export class AIService {
  constructor(apiKey, options = {}) {
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: options.modelName || 'gpt-3.5-turbo',
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2000,
    });

    this.memory = new ConversationSummaryBufferMemory({
      llm: this.model,
      maxTokenLimit: 2000,
      returnMessages: true,
    });

    this.systemPrompts = this.initializeSystemPrompts();
    this.conversationHistory = new Map(); // Store per-user conversation history
  }

  initializeSystemPrompts() {
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

  // Main chat function with personalized context
  async chat(userId, message, userProfile, context = {}) {
    try {
      // Get or create conversation memory for this user
      let userMemory = this.conversationHistory.get(userId);
      if (!userMemory) {
        userMemory = new ConversationSummaryBufferMemory({
          llm: this.model,
          maxTokenLimit: 2000,
          returnMessages: true,
        });
        this.conversationHistory.set(userId, userMemory);
      }

      // Build personalized system message
      const systemMessage = this.buildSystemMessage(userProfile, context);
      
      // Create the prompt with user context
      const prompt = PromptTemplate.fromTemplate(`
{system_message}

USER PROFILE CONTEXT:
{profile_context}

CONVERSATION CONTEXT:
{conversation_context}

USER MESSAGE: {user_message}

Respond as Sandy, keeping your response helpful, personalized, and appropriate to this user's needs and preferences.`);

      const chain = new LLMChain({
        llm: this.model,
        prompt: prompt,
        memory: userMemory,
      });

      const response = await chain.call({
        system_message: systemMessage,
        profile_context: this.formatProfileContext(userProfile),
        conversation_context: context.conversationContext || "New conversation",
        user_message: message,
      });

      // Store interaction in user's history
      await this.recordInteraction(userId, message, response.text, userProfile);

      return {
        response: response.text,
        confidence: this.assessResponseConfidence(userProfile, message),
        suggestions: await this.generateFollowUpSuggestions(userProfile, message, response.text),
        recommendedActions: await this.extractRecommendedActions(response.text)
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        response: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment, or contact support if the issue persists.",
        error: true,
        fallback: true
      };
    }
  }

  // Generate personalized recommendations
  async generateRecommendations(userProfile, specificArea = null) {
    try {
      const context = userProfile.getRecommendationContext();
      
      const prompt = PromptTemplate.fromTemplate(`
${this.systemPrompts.recommendation}

USER PROFILE:
{profile_summary}

SPECIFIC FOCUS AREA: {focus_area}

Generate 3-5 personalized recommendations that are:
1. Specific to their capabilities and limitations
2. Aligned with their goals and preferences  
3. Actionable and realistic
4. Considerate of their energy levels and support network

Format as a structured response with clear categories and explanations.`);

      const chain = new LLMChain({
        llm: this.model,
        prompt: prompt,
      });

      const response = await chain.call({
        profile_summary: this.formatRecommendationContext(context),
        focus_area: specificArea || "overall wellness and daily living support"
      });

      return {
        recommendations: this.parseRecommendations(response.text),
        personalizedFor: userProfile.personalInfo.name || "User",
        generatedAt: new Date().toISOString(),
        focusArea: specificArea
      };

    } catch (error) {
      console.error('Recommendation generation error:', error);
      return {
        error: "Unable to generate recommendations at this time",
        fallbackRecommendations: this.getFallbackRecommendations(userProfile)
      };
    }
  }

  // Handle intake form conversations
  async processIntakeResponse(userId, response, currentSection, userProfile) {
    try {
      const prompt = PromptTemplate.fromTemplate(`
${this.systemPrompts.intake}

CURRENT SECTION: {section_name}
USER RESPONSE: {user_response}
PROFILE PROGRESS: {profile_status}

Respond with empathy and understanding. If the response reveals important information:
1. Acknowledge their sharing
2. Validate any challenges mentioned
3. Ask any relevant follow-up questions
4. Explain how this information helps provide better support
5. Transition naturally to the next topic if appropriate

Keep the tone conversational and supportive.`);

      const chain = new LLMChain({
        llm: this.model,
        prompt: prompt,
      });

      const aiResponse = await chain.call({
        section_name: currentSection || "intake process",
        user_response: response,
        profile_status: `${userProfile.intakeStatus.completionPercentage}% complete`
      });

      return {
        response: aiResponse.text,
        empathyLevel: this.detectEmpathyNeeds(response),
        followUpQuestions: await this.generateAdaptiveFollowUps(response, currentSection, userProfile)
      };

    } catch (error) {
      console.error('Intake processing error:', error);
      return {
        response: "Thank you for sharing that with me. Your information helps me understand how to better support you.",
        error: true
      };
    }
  }

  // Build personalized system message based on user profile
  buildSystemMessage(userProfile, context = {}) {
    let systemMessage = this.systemPrompts.main;

    if (userProfile) {
      const prefs = userProfile.preferences;
      
      // Adapt communication style
      switch (prefs.communicationStyle) {
        case 'direct':
          systemMessage += "\n\nCOMMUNICATION STYLE: Be direct, concise, and to-the-point. Avoid excessive emotional language.";
          break;
        case 'gentle':
          systemMessage += "\n\nCOMMUNICATION STYLE: Be especially gentle, encouraging, and emotionally supportive. Use soft language.";
          break;
        case 'detailed':
          systemMessage += "\n\nCOMMUNICATION STYLE: Provide detailed explanations, context, and comprehensive information.";
          break;
        default:
          systemMessage += "\n\nCOMMUNICATION STYLE: Use a balanced approach - supportive but practical.";
      }

      // Add support type preferences
      if (prefs.supportType.length > 0) {
        systemMessage += `\n\nPREFERRED SUPPORT TYPES: Focus on ${prefs.supportType.join(', ')} support.`;
      }

      // Add physical capability awareness
      if (userProfile.physicalNeeds.mobilityLevel) {
        systemMessage += `\n\nPHYSICAL AWARENESS: User has ${userProfile.physicalNeeds.mobilityLevel} mobility. Adapt all suggestions accordingly.`;
      }

      // Add energy consideration
      if (userProfile.energyLevels.peakEnergyTime) {
        systemMessage += `\n\nENERGY PATTERNS: User's peak energy is ${userProfile.energyLevels.peakEnergyTime}. Consider this for activity timing.`;
      }

      // Add goal focus
      if (userProfile.preferences.goalPriority) {
        systemMessage += `\n\nCURRENT FOCUS: User's main priority is ${userProfile.preferences.goalPriority}.`;
      }
    }

    // Add context-specific instructions
    if (context.type === 'crisis') {
      systemMessage += `\n\n${this.systemPrompts.crisis}`;
    }

    return systemMessage;
  }

  // Format user profile for AI context
  formatProfileContext(userProfile) {
    if (!userProfile) return "No profile information available";

    const context = userProfile.getPersonalizationContext();
    
    return `
Physical Status: ${context.physicalCapabilities.mobility} mobility, ${context.physicalCapabilities.exercise} exercise capability
Current Pain Level: ${context.physicalCapabilities.pain?.current || 'Not specified'}/10
Energy Patterns: Peak energy ${context.energyProfile.peakTime}, Morning: ${context.energyProfile.patterns?.morningEnergy || 'Unknown'}/10
Communication Preference: ${context.communicationPrefs.style}
Support Types: ${context.communicationPrefs.supportType?.join(', ') || 'Not specified'}
Main Priority: ${context.currentGoals.priority}
Current Goals: ${context.currentGoals.shortTerm?.join(', ') || 'None specified'}
Support Network: Family support is ${context.supportLevel.family}, Professional support: ${context.supportLevel.professional ? 'Yes' : 'No'}
Profile Completeness: ${userProfile.intakeStatus.completionPercentage}%`;
  }

  // Format context for recommendations
  formatRecommendationContext(context) {
    return `
PHYSICAL CAPABILITIES:
- Mobility: ${context.physicalCapabilities.mobility}
- Exercise Level: ${context.physicalCapabilities.exercise}
- Pain Level: ${context.physicalCapabilities.pain?.current}/10
- Chronic Conditions: ${context.physicalCapabilities.conditions?.join(', ') || 'None listed'}

ENERGY PROFILE:
- Peak Energy Time: ${context.energyProfile.peakTime}
- Morning Energy: ${context.energyProfile.patterns?.morningEnergy}/10
- Fatigue Triggers: ${context.energyProfile.fatigueTriggers?.join(', ') || 'Not specified'}

PREFERENCES:
- Communication Style: ${context.communicationPrefs.style}
- Support Types: ${context.communicationPrefs.supportType?.join(', ')}
- Reminder Frequency: ${context.communicationPrefs.reminderFreq}

GOALS & PRIORITIES:
- Main Priority: ${context.currentGoals.priority}
- Short-term Goals: ${context.currentGoals.shortTerm?.join(', ')}
- Daily Goals: ${context.currentGoals.daily?.join(', ')}

SUPPORT NETWORK:
- Family Support: ${context.supportLevel.family}
- Professional Support Available: ${context.supportLevel.professional ? 'Yes' : 'No'}`;
  }

  // Record user interactions for learning
  async recordInteraction(userId, userMessage, aiResponse, userProfile) {
    try {
      // Update interaction history in user profile
      userProfile.interactionHistory.totalInteractions += 1;
      userProfile.interactionHistory.lastInteraction = new Date().toISOString();

      // You could also store this in a database for analytics
      // await this.storeInteractionInDB(userId, userMessage, aiResponse);
    } catch (error) {
      console.error('Failed to record interaction:', error);
    }
  }

  // Assess response confidence based on profile completeness
  assessResponseConfidence(userProfile, message) {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on profile completeness
    const completeness = userProfile.intakeStatus.completionPercentage || 0;
    confidence += (completeness / 100) * 0.3;

    // Increase confidence based on interaction history
    const interactions = userProfile.interactionHistory.totalInteractions || 0;
    confidence += Math.min(interactions / 50, 0.2);

    // Adjust based on message complexity
    const wordCount = message.split(' ').length;
    if (wordCount > 20) confidence += 0.1; // More context = higher confidence

    return Math.min(confidence, 1.0);
  }

  // Generate follow-up suggestions
  async generateFollowUpSuggestions(userProfile, userMessage, aiResponse) {
    const suggestions = [];
    const context = userProfile.getPersonalizationContext();

    // Suggest profile completion if low
    if (userProfile.intakeStatus.completionPercentage < 70) {
      suggestions.push({
        type: "profile_completion",
        text: "Would you like to complete more of your profile for more personalized support?",
        priority: "medium"
      });
    }

    // Suggest goal setting if no goals
    if (context.currentGoals.shortTerm?.length === 0) {
      suggestions.push({
        type: "goal_setting",
        text: "Would you like help setting some achievable goals?",
        priority: "medium"
      });
    }

    // Suggest specific support based on high pain
    if (context.physicalCapabilities.pain?.current > 6) {
      suggestions.push({
        type: "pain_support",
        text: "I notice you're experiencing significant pain. Would you like some gentle pain management strategies?",
        priority: "high"
      });
    }

    // Suggest energy management for low energy
    if (context.energyProfile.patterns?.morningEnergy < 4) {
      suggestions.push({
        type: "energy_support",
        text: "Would you like some tips for managing low energy levels?",
        priority: "medium"
      });
    }

    return suggestions.slice(0, 3); // Limit to top 3 suggestions
  }

  // Extract recommended actions from AI response
  async extractRecommendedActions(responseText) {
    // Simple pattern matching for now - could be enhanced with NLP
    const actions = [];
    const actionPatterns = [
      /try\s+(\w+ing\s+[^.]+)/gi,
      /consider\s+(\w+ing\s+[^.]+)/gi,
      /start\s+with\s+([^.]+)/gi,
      /you\s+might\s+(\w+\s+[^.]+)/gi
    ];

    actionPatterns.forEach(pattern => {
      const matches = responseText.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          actions.push({
            action: match[1].trim(),
            type: "suggested",
            source: "ai_response"
          });
        }
      }
    });

    return actions.slice(0, 5); // Limit to 5 actions
  }

  // Parse structured recommendations
  parseRecommendations(responseText) {
    // Split by numbered lists or bullet points
    const sections = responseText.split(/\n\s*\d+\.\s+|\n\s*[-•]\s+/);
    
    return sections
      .filter(section => section.trim().length > 20)
      .map((rec, index) => ({
        id: index + 1,
        text: rec.trim(),
        category: this.categorizeRecommendation(rec),
        priority: this.assessRecommendationPriority(rec)
      }));
  }

  // Categorize recommendations
  categorizeRecommendation(text) {
    const categories = {
      physical: ['exercise', 'movement', 'stretching', 'activity', 'physical'],
      energy: ['energy', 'rest', 'sleep', 'fatigue', 'pacing'],
      pain: ['pain', 'comfort', 'relief', 'manage'],
      social: ['social', 'connect', 'family', 'friends', 'support'],
      routine: ['routine', 'schedule', 'daily', 'habit'],
      medical: ['doctor', 'medical', 'professional', 'appointment'],
      mental: ['stress', 'anxiety', 'mood', 'mental', 'emotional']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        return category;
      }
    }
    return 'general';
  }

  // Assess recommendation priority
  assessRecommendationPriority(text) {
    const highPriorityWords = ['important', 'essential', 'urgent', 'immediately'];
    const mediumPriorityWords = ['should', 'recommend', 'suggest'];
    
    const lowerText = text.toLowerCase();
    
    if (highPriorityWords.some(word => lowerText.includes(word))) {
      return 'high';
    }
    if (mediumPriorityWords.some(word => lowerText.includes(word))) {
      return 'medium';
    }
    return 'low';
  }

  // Detect empathy needs from user input
  detectEmpathyNeeds(userInput) {
    const emotionalIndicators = [
      'struggling', 'difficult', 'hard', 'painful', 'frustrated', 'overwhelmed',
      'tired', 'exhausted', 'worried', 'scared', 'anxious', 'depressed',
      'hopeless', 'alone', 'isolated', 'can\'t', 'unable', 'impossible'
    ];

    const inputLower = userInput.toLowerCase();
    const emotionalWordCount = emotionalIndicators.filter(word => 
      inputLower.includes(word)
    ).length;

    if (emotionalWordCount >= 3) return 'high';
    if (emotionalWordCount >= 1) return 'medium';
    return 'low';
  }

  // Generate adaptive follow-up questions
  async generateAdaptiveFollowUps(response, section, userProfile) {
    const followUps = [];

    // Based on emotional indicators
    const empathyLevel = this.detectEmpathyNeeds(response);
    if (empathyLevel === 'high') {
      followUps.push({
        question: "It sounds like you're going through a challenging time. Would you like to talk about what's making things particularly difficult right now?",
        type: "emotional_support",
        priority: "high"
      });
    }

    // Based on section-specific responses
    if (section === 'physical' && response.toLowerCase().includes('pain')) {
      followUps.push({
        question: "Can you tell me more about what helps when your pain is at its worst?",
        type: "pain_management",
        priority: "medium"
      });
    }

    if (section === 'energy' && response.toLowerCase().includes('tired')) {
      followUps.push({
        question: "What time of day do you feel most alert and energetic?",
        type: "energy_patterns",
        priority: "medium"
      });
    }

    return followUps;
  }

  // Fallback recommendations when AI fails
  getFallbackRecommendations(userProfile) {
    const fallbacks = [
      {
        id: 1,
        text: "Take time for gentle self-care activities that bring you comfort",
        category: "general",
        priority: "medium"
      },
      {
        id: 2,
        text: "Consider reaching out to a friend or family member for support",
        category: "social",
        priority: "low"
      },
      {
        id: 3,
        text: "Try to maintain a regular sleep schedule that works for your needs",
        category: "routine",
        priority: "medium"
      }
    ];

    return fallbacks;
  }

  // Clear conversation history for a user
  clearUserHistory(userId) {
    this.conversationHistory.delete(userId);
  }

  // Get conversation summary for a user
  async getConversationSummary(userId) {
    const userMemory = this.conversationHistory.get(userId);
    if (!userMemory) return "No conversation history available";

    try {
      return await userMemory.predictNewSummary(
        userMemory.movingSummary,
        userMemory.chatMemory.messages
      );
    } catch (error) {
      console.error('Failed to generate conversation summary:', error);
      return "Unable to generate conversation summary";
    }
  }
}