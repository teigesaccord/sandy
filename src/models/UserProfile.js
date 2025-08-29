import { v4 as uuidv4 } from 'uuid';

export class UserProfile {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.userId = data.userId || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    
    // Personal Information
    this.personalInfo = {
      name: data.personalInfo?.name || '',
      age: data.personalInfo?.age || null,
      email: data.personalInfo?.email || '',
      timezone: data.personalInfo?.timezone || 'UTC'
    };

    // Physical Needs
    this.physicalNeeds = {
      mobilityLevel: data.physicalNeeds?.mobilityLevel || null, // 'high', 'moderate', 'limited', 'assisted'
      chronicConditions: data.physicalNeeds?.chronicConditions || [],
      medications: data.physicalNeeds?.medications || [],
      allergies: data.physicalNeeds?.allergies || [],
      dietaryRestrictions: data.physicalNeeds?.dietaryRestrictions || [],
      exerciseCapability: data.physicalNeeds?.exerciseCapability || null, // 'high', 'moderate', 'light', 'none'
      painLevels: data.physicalNeeds?.painLevels || {
        current: null, // 1-10 scale
        chronic: null,
        areas: [] // body areas with pain
      },
      sleepPatterns: data.physicalNeeds?.sleepPatterns || {
        averageHours: null,
        quality: null, // 'excellent', 'good', 'fair', 'poor'
        issues: [] // 'insomnia', 'sleep_apnea', 'restless_legs', etc.
      }
    };

    // Energy Levels
    this.energyLevels = {
      morningEnergy: data.energyLevels?.morningEnergy || null, // 1-10 scale
      afternoonEnergy: data.energyLevels?.afternoonEnergy || null,
      eveningEnergy: data.energyLevels?.eveningEnergy || null,
      peakEnergyTime: data.energyLevels?.peakEnergyTime || null, // 'morning', 'afternoon', 'evening'
      fatigueFactors: data.energyLevels?.fatigueFactors || [], // triggers that cause fatigue
      energyManagementStrategies: data.energyLevels?.energyManagementStrategies || []
    };

    // Preferences
    this.preferences = {
      communicationStyle: data.preferences?.communicationStyle || 'balanced', // 'direct', 'gentle', 'balanced', 'detailed'
      supportType: data.preferences?.supportType || [], // 'emotional', 'practical', 'informational', 'motivational'
      reminderFrequency: data.preferences?.reminderFrequency || 'moderate', // 'minimal', 'moderate', 'frequent'
      goalPriority: data.preferences?.goalPriority || 'balanced', // 'health', 'comfort', 'independence', 'social', 'balanced'
      activityPreferences: data.preferences?.activityPreferences || {
        indoor: [],
        outdoor: [],
        social: [],
        solo: []
      },
      learningStyle: data.preferences?.learningStyle || 'mixed', // 'visual', 'auditory', 'kinesthetic', 'reading', 'mixed'
      technology_comfort: data.preferences?.technology_comfort || 'moderate' // 'low', 'moderate', 'high'
    };

    // Goals and Priorities
    this.goals = {
      shortTerm: data.goals?.shortTerm || [], // goals for next 1-3 months
      longTerm: data.goals?.longTerm || [], // goals for 6+ months
      dailyRoutineGoals: data.goals?.dailyRoutineGoals || [],
      healthGoals: data.goals?.healthGoals || [],
      wellnessGoals: data.goals?.wellnessGoals || []
    };

    // Support Network
    this.supportNetwork = {
      familySupport: data.supportNetwork?.familySupport || 'unknown', // 'strong', 'moderate', 'limited', 'none'
      friendSupport: data.supportNetwork?.friendSupport || 'unknown',
      professionalSupport: data.supportNetwork?.professionalSupport || [], // doctors, therapists, etc.
      caregivers: data.supportNetwork?.caregivers || [],
      emergencyContacts: data.supportNetwork?.emergencyContacts || []
    };

    // Interaction History
    this.interactionHistory = {
      totalInteractions: data.interactionHistory?.totalInteractions || 0,
      lastInteraction: data.interactionHistory?.lastInteraction || null,
      preferredTopics: data.interactionHistory?.preferredTopics || [],
      successfulRecommendations: data.interactionHistory?.successfulRecommendations || [],
      declinedRecommendations: data.interactionHistory?.declinedRecommendations || []
    };

    // Intake Form Completion
    this.intakeStatus = {
      isCompleted: data.intakeStatus?.isCompleted || false,
      completedSections: data.intakeStatus?.completedSections || [],
      lastUpdatedSection: data.intakeStatus?.lastUpdatedSection || null,
      completionPercentage: data.intakeStatus?.completionPercentage || 0
    };
  }

  // Update profile data
  update(updates) {
    const allowedUpdates = [
      'personalInfo', 'physicalNeeds', 'energyLevels', 'preferences', 
      'goals', 'supportNetwork', 'interactionHistory', 'intakeStatus'
    ];

    allowedUpdates.forEach(key => {
      if (updates[key]) {
        this[key] = { ...this[key], ...updates[key] };
      }
    });

    this.updatedAt = new Date().toISOString();
  }

  // Calculate profile completion percentage
  calculateCompletionPercentage() {
    const sections = [
      this.personalInfo,
      this.physicalNeeds,
      this.energyLevels,
      this.preferences,
      this.goals,
      this.supportNetwork
    ];

    let completedFields = 0;
    let totalFields = 0;

    sections.forEach(section => {
      Object.values(section).forEach(value => {
        totalFields++;
        if (value !== null && value !== '' && 
            (Array.isArray(value) ? value.length > 0 : true)) {
          completedFields++;
        }
      });
    });

    const percentage = Math.round((completedFields / totalFields) * 100);
    this.intakeStatus.completionPercentage = percentage;
    return percentage;
  }

  // Get personalization context for AI
  getPersonalizationContext() {
    return {
      physicalCapabilities: {
        mobility: this.physicalNeeds.mobilityLevel,
        exercise: this.physicalNeeds.exerciseCapability,
        pain: this.physicalNeeds.painLevels,
        conditions: this.physicalNeeds.chronicConditions
      },
      energyProfile: {
        patterns: this.energyLevels,
        peakTime: this.energyLevels.peakEnergyTime,
        fatigueTriggers: this.energyLevels.fatigueFactors
      },
      communicationPrefs: {
        style: this.preferences.communicationStyle,
        supportType: this.preferences.supportType,
        reminderFreq: this.preferences.reminderFrequency
      },
      currentGoals: {
        priority: this.preferences.goalPriority,
        shortTerm: this.goals.shortTerm,
        daily: this.goals.dailyRoutineGoals
      },
      supportLevel: {
        family: this.supportNetwork.familySupport,
        professional: this.supportNetwork.professionalSupport.length > 0
      }
    };
  }

  // Convert to JSON for storage
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      personalInfo: this.personalInfo,
      physicalNeeds: this.physicalNeeds,
      energyLevels: this.energyLevels,
      preferences: this.preferences,
      goals: this.goals,
      supportNetwork: this.supportNetwork,
      interactionHistory: this.interactionHistory,
      intakeStatus: this.intakeStatus
    };
  }

  // Create from JSON
  static fromJSON(json) {
    return new UserProfile(json);
  }

  // Validate profile data
  validate() {
    const errors = [];

    if (!this.personalInfo.name || this.personalInfo.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (this.personalInfo.age && (this.personalInfo.age < 0 || this.personalInfo.age > 150)) {
      errors.push('Age must be between 0 and 150');
    }

    if (this.personalInfo.email && !this.isValidEmail(this.personalInfo.email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Helper method to validate email
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Get recommendations based on current profile state
  getRecommendationContext() {
    const context = this.getPersonalizationContext();
    const completionPercentage = this.calculateCompletionPercentage();
    
    return {
      ...context,
      profileCompleteness: completionPercentage,
      needsMoreInfo: completionPercentage < 70,
      recentInteractions: this.interactionHistory.totalInteractions,
      successfulPatterns: this.interactionHistory.successfulRecommendations.slice(-5)
    };
  }
}