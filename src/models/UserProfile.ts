import { v4 as uuidv4 } from 'uuid';
import type { UserProfile as IUserProfile, ConversationMessage } from '../types';

export class UserProfile implements IUserProfile {
  public id: string;
  public userId: string;
  public createdAt: Date;
  public updatedAt: Date;
  public personalInfo?: {
    name?: string;
    email?: string;
    age?: number;
    location?: string;
  };
  public preferences?: {
    communicationStyle?: 'casual' | 'professional' | 'friendly';
    responseLength?: 'brief' | 'detailed' | 'comprehensive';
    topics?: string[];
    languages?: string[];
  };
  public goals?: {
    primary?: string;
    secondary?: string[];
    timeline?: string;
  };
  public context?: {
    industry?: string;
    role?: string;
    experience?: string;
    challenges?: string[];
  };
  public conversationHistory?: ConversationMessage[];

  // Extended properties for comprehensive profile management
  public physicalNeeds?: {
    mobilityLevel?: 'high' | 'moderate' | 'limited' | 'assisted';
    chronicConditions?: string[];
    medications?: string[];
    allergies?: string[];
    dietaryRestrictions?: string[];
    exerciseCapability?: 'high' | 'moderate' | 'light' | 'none';
    painLevels?: {
      current?: number; // 1-10 scale
      chronic?: number;
      areas?: string[]; // body areas with pain
    };
    sleepPatterns?: {
      averageHours?: number;
      quality?: 'excellent' | 'good' | 'fair' | 'poor';
      issues?: string[]; // 'insomnia', 'sleep_apnea', 'restless_legs', etc.
    };
  };

  public energyLevels?: {
    morningEnergy?: number; // 1-10 scale
    afternoonEnergy?: number;
    eveningEnergy?: number;
    peakEnergyTime?: 'morning' | 'afternoon' | 'evening';
    fatigueFactors?: string[]; // triggers that cause fatigue
    energyManagementStrategies?: string[];
  };

  public supportNetwork?: {
    familySupport?: 'strong' | 'moderate' | 'limited' | 'none' | 'unknown';
    friendSupport?: 'strong' | 'moderate' | 'limited' | 'none' | 'unknown';
    professionalSupport?: string[]; // doctors, therapists, etc.
    caregivers?: string[];
    emergencyContacts?: Array<{
      name: string;
      relationship: string;
      phone: string;
      email?: string;
    }>;
  };

  public interactionHistory?: {
    totalInteractions: number;
    lastInteraction?: Date;
    preferredTopics?: string[];
    successfulRecommendations?: string[];
    declinedRecommendations?: string[];
  };

  public intakeStatus?: {
    isCompleted: boolean;
    completedSections: string[];
    lastUpdatedSection?: string;
    completionPercentage: number;
  };

  constructor(data: Partial<IUserProfile> = {}) {
    this.id = data.userId || uuidv4();
    this.userId = data.userId || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    // Personal Information
    this.personalInfo = {
      name: data.personalInfo?.name || '',
      age: data.personalInfo?.age || undefined,
      email: data.personalInfo?.email || '',
      location: data.personalInfo?.location || ''
    };

    // Physical Needs
    this.physicalNeeds = {
      mobilityLevel: undefined,
      chronicConditions: [],
      medications: [],
      allergies: [],
      dietaryRestrictions: [],
      exerciseCapability: undefined,
      painLevels: {
        current: undefined,
        chronic: undefined,
        areas: []
      },
      sleepPatterns: {
        averageHours: undefined,
        quality: undefined,
        issues: []
      }
    };

    // Energy Levels
    this.energyLevels = {
      morningEnergy: undefined,
      afternoonEnergy: undefined,
      eveningEnergy: undefined,
      peakEnergyTime: undefined,
      fatigueFactors: [],
      energyManagementStrategies: []
    };

    // Preferences
    this.preferences = {
      communicationStyle: data.preferences?.communicationStyle || 'friendly',
      responseLength: data.preferences?.responseLength || 'detailed',
      topics: data.preferences?.topics || [],
      languages: data.preferences?.languages || ['en']
    };

    // Goals and Priorities
    this.goals = {
      primary: data.goals?.primary || '',
      secondary: data.goals?.secondary || [],
      timeline: data.goals?.timeline || ''
    };

    // Context
    this.context = {
      industry: data.context?.industry || '',
      role: data.context?.role || '',
      experience: data.context?.experience || '',
      challenges: data.context?.challenges || []
    };

    // Support Network
    this.supportNetwork = {
      familySupport: 'unknown',
      friendSupport: 'unknown',
      professionalSupport: [],
      caregivers: [],
      emergencyContacts: []
    };

    // Interaction History
    this.interactionHistory = {
      totalInteractions: 0,
      lastInteraction: undefined,
      preferredTopics: [],
      successfulRecommendations: [],
      declinedRecommendations: []
    };

    // Conversation History
    this.conversationHistory = data.conversationHistory || [];

    // Intake Form Completion
    this.intakeStatus = {
      isCompleted: false,
      completedSections: [],
      lastUpdatedSection: undefined,
      completionPercentage: 0
    };
  }

  // Update profile data
  update(updates: any): void {
    const allowedUpdates = [
      'personalInfo', 'physicalNeeds', 'energyLevels', 'preferences', 
      'goals', 'context', 'supportNetwork', 'interactionHistory', 'intakeStatus'
    ];

    allowedUpdates.forEach(key => {
      if (updates[key]) {
        (this as any)[key] = { ...(this as any)[key], ...updates[key] };
      }
    });

    this.updatedAt = new Date();
  }

  // Calculate profile completion percentage
  calculateCompletionPercentage(): number {
    const sections = [
      this.personalInfo,
      this.physicalNeeds,
      this.energyLevels,
      this.preferences,
      this.goals,
      this.context,
      this.supportNetwork
    ];

    let completedFields = 0;
    let totalFields = 0;

    sections.forEach(section => {
      if (section) {
        Object.values(section).forEach(value => {
          totalFields++;
          if (value !== null && value !== undefined && value !== '' && 
              (Array.isArray(value) ? value.length > 0 : true)) {
            completedFields++;
          }
        });
      }
    });

    const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
    if (this.intakeStatus) {
      this.intakeStatus.completionPercentage = percentage;
    }
    return percentage;
  }

  // Get personalization context for AI
  getPersonalizationContext(): Record<string, any> {
    return {
      physicalCapabilities: {
        mobility: this.physicalNeeds?.mobilityLevel,
        exercise: this.physicalNeeds?.exerciseCapability,
        pain: this.physicalNeeds?.painLevels,
        conditions: this.physicalNeeds?.chronicConditions
      },
      energyProfile: {
        patterns: this.energyLevels,
        peakTime: this.energyLevels?.peakEnergyTime,
        fatigueTriggers: this.energyLevels?.fatigueFactors
      },
      communicationPrefs: {
        style: this.preferences?.communicationStyle,
        responseLength: this.preferences?.responseLength,
        topics: this.preferences?.topics
      },
      currentGoals: {
        priority: this.goals?.primary,
        shortTerm: this.goals?.secondary,
        timeline: this.goals?.timeline
      },
      supportLevel: {
        family: this.supportNetwork?.familySupport,
        professional: (this.supportNetwork?.professionalSupport?.length || 0) > 0
      },
      context: {
        industry: this.context?.industry,
        role: this.context?.role,
        experience: this.context?.experience,
        challenges: this.context?.challenges
      }
    };
  }

  // Convert to JSON for storage
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      userId: this.userId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      personalInfo: this.personalInfo,
      physicalNeeds: this.physicalNeeds,
      energyLevels: this.energyLevels,
      preferences: this.preferences,
      goals: this.goals,
      context: this.context,
      supportNetwork: this.supportNetwork,
      interactionHistory: this.interactionHistory,
      conversationHistory: this.conversationHistory?.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
      })),
      intakeStatus: this.intakeStatus
    };
  }

  // Create from JSON
  static fromJSON(json: any): UserProfile {
    const data = {
      ...json,
      createdAt: json.createdAt ? new Date(json.createdAt) : new Date(),
      updatedAt: json.updatedAt ? new Date(json.updatedAt) : new Date(),
      conversationHistory: json.conversationHistory?.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })) || []
    };
    return new UserProfile(data);
  }

  // Validate profile data
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.personalInfo?.name || this.personalInfo.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (this.personalInfo?.age && (this.personalInfo.age < 0 || this.personalInfo.age > 150)) {
      errors.push('Age must be between 0 and 150');
    }

    if (this.personalInfo?.email && !this.isValidEmail(this.personalInfo.email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Helper method to validate email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Get recommendations based on current profile state
  getRecommendationContext(): Record<string, any> {
    const context = this.getPersonalizationContext();
    const completionPercentage = this.calculateCompletionPercentage();
    
    return {
      ...context,
      profileCompleteness: completionPercentage,
      needsMoreInfo: completionPercentage < 70,
      recentInteractions: this.interactionHistory?.totalInteractions || 0,
      successfulPatterns: this.interactionHistory?.successfulRecommendations?.slice(-5) || []
    };
  }

  // Add a conversation message
  addConversationMessage(message: ConversationMessage): void {
    if (!this.conversationHistory) {
      this.conversationHistory = [];
    }
    
    this.conversationHistory.push(message);
    
    // Keep conversation history manageable (last 100 messages)
    if (this.conversationHistory.length > 100) {
      this.conversationHistory.splice(0, this.conversationHistory.length - 100);
    }
    
    // Update interaction history
    if (!this.interactionHistory) {
      this.interactionHistory = {
        totalInteractions: 0,
        preferredTopics: [],
        successfulRecommendations: [],
        declinedRecommendations: []
      };
    }
    
    if (message.role === 'user') {
      this.interactionHistory.totalInteractions++;
      this.interactionHistory.lastInteraction = new Date();
    }
    
    this.updatedAt = new Date();
  }

  // Get recent conversation messages
  getRecentMessages(count: number = 10): ConversationMessage[] {
    if (!this.conversationHistory) {
      return [];
    }
    return this.conversationHistory.slice(-count);
  }
}