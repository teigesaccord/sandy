import { UserProfile } from '../models/UserProfile.js';

export class IntakeFormService {
  constructor() {
    this.questionSets = this.initializeQuestionSets();
  }

  initializeQuestionSets() {
    return {
      // Basic personal information
      personal: {
        title: "Personal Information",
        description: "Help us get to know you better",
        required: true,
        questions: [
          {
            id: "name",
            type: "text",
            question: "What would you like us to call you?",
            path: "personalInfo.name",
            required: true,
            validation: { minLength: 2, maxLength: 50 }
          },
          {
            id: "age",
            type: "number",
            question: "What is your age?",
            path: "personalInfo.age",
            required: false,
            validation: { min: 13, max: 120 }
          },
          {
            id: "timezone",
            type: "select",
            question: "What timezone are you in?",
            path: "personalInfo.timezone",
            required: false,
            options: [
              { value: "UTC", label: "UTC" },
              { value: "America/New_York", label: "Eastern Time" },
              { value: "America/Chicago", label: "Central Time" },
              { value: "America/Denver", label: "Mountain Time" },
              { value: "America/Los_Angeles", label: "Pacific Time" },
              { value: "Europe/London", label: "London" },
              { value: "Europe/Paris", label: "Central Europe" },
              { value: "Asia/Tokyo", label: "Tokyo" },
              { value: "Australia/Sydney", label: "Sydney" }
            ]
          }
        ]
      },

      // Physical health and mobility
      physical: {
        title: "Physical Health & Mobility",
        description: "Understanding your physical needs helps us provide better support",
        required: true,
        questions: [
          {
            id: "mobility_level",
            type: "radio",
            question: "How would you describe your current mobility level?",
            path: "physicalNeeds.mobilityLevel",
            required: true,
            options: [
              { value: "high", label: "High - I can move around easily without assistance" },
              { value: "moderate", label: "Moderate - I can get around but sometimes need help" },
              { value: "limited", label: "Limited - I have difficulty moving around" },
              { value: "assisted", label: "Assisted - I need help or equipment to move around" }
            ]
          },
          {
            id: "exercise_capability",
            type: "radio",
            question: "What level of physical activity can you comfortably do?",
            path: "physicalNeeds.exerciseCapability",
            required: true,
            options: [
              { value: "high", label: "High intensity exercise (running, sports)" },
              { value: "moderate", label: "Moderate exercise (brisk walking, light jogging)" },
              { value: "light", label: "Light exercise (gentle walking, stretching)" },
              { value: "none", label: "Unable to exercise due to physical limitations" }
            ]
          },
          {
            id: "chronic_conditions",
            type: "checkbox",
            question: "Do you have any of these chronic conditions? (Select all that apply)",
            path: "physicalNeeds.chronicConditions",
            required: false,
            options: [
              { value: "arthritis", label: "Arthritis" },
              { value: "diabetes", label: "Diabetes" },
              { value: "heart_disease", label: "Heart disease" },
              { value: "chronic_pain", label: "Chronic pain" },
              { value: "fibromyalgia", label: "Fibromyalgia" },
              { value: "autoimmune", label: "Autoimmune condition" },
              { value: "respiratory", label: "Respiratory condition" },
              { value: "neurological", label: "Neurological condition" },
              { value: "other", label: "Other chronic condition" },
              { value: "none", label: "None of the above" }
            ]
          },
          {
            id: "current_pain",
            type: "scale",
            question: "On a scale of 0-10, what is your current pain level? (0 = no pain, 10 = severe pain)",
            path: "physicalNeeds.painLevels.current",
            required: false,
            validation: { min: 0, max: 10 }
          },
          {
            id: "pain_areas",
            type: "checkbox",
            question: "If you experience pain, where is it located? (Select all that apply)",
            path: "physicalNeeds.painLevels.areas",
            required: false,
            dependsOn: { field: "current_pain", condition: "greaterThan", value: 0 },
            options: [
              { value: "head", label: "Head/Headaches" },
              { value: "neck", label: "Neck" },
              { value: "back", label: "Back" },
              { value: "shoulders", label: "Shoulders" },
              { value: "arms", label: "Arms" },
              { value: "hands", label: "Hands/Wrists" },
              { value: "chest", label: "Chest" },
              { value: "abdomen", label: "Abdomen" },
              { value: "hips", label: "Hips" },
              { value: "legs", label: "Legs" },
              { value: "feet", label: "Feet" },
              { value: "widespread", label: "Widespread/All over" }
            ]
          }
        ]
      },

      // Energy levels and patterns
      energy: {
        title: "Energy Levels & Daily Patterns",
        description: "Help us understand your energy patterns throughout the day",
        required: true,
        questions: [
          {
            id: "morning_energy",
            type: "scale",
            question: "On average, how is your energy level in the morning? (1 = very low, 10 = very high)",
            path: "energyLevels.morningEnergy",
            required: true,
            validation: { min: 1, max: 10 }
          },
          {
            id: "afternoon_energy",
            type: "scale",
            question: "How about in the afternoon?",
            path: "energyLevels.afternoonEnergy",
            required: true,
            validation: { min: 1, max: 10 }
          },
          {
            id: "evening_energy",
            type: "scale",
            question: "And in the evening?",
            path: "energyLevels.eveningEnergy",
            required: true,
            validation: { min: 1, max: 10 }
          },
          {
            id: "peak_energy_time",
            type: "radio",
            question: "When do you typically feel most energetic?",
            path: "energyLevels.peakEnergyTime",
            required: true,
            options: [
              { value: "early_morning", label: "Early morning (5-8 AM)" },
              { value: "morning", label: "Morning (8-11 AM)" },
              { value: "midday", label: "Midday (11 AM-2 PM)" },
              { value: "afternoon", label: "Afternoon (2-5 PM)" },
              { value: "evening", label: "Evening (5-8 PM)" },
              { value: "night", label: "Night (8 PM or later)" },
              { value: "varies", label: "It varies day to day" }
            ]
          },
          {
            id: "fatigue_factors",
            type: "checkbox",
            question: "What factors tend to drain your energy? (Select all that apply)",
            path: "energyLevels.fatigueFactors",
            required: false,
            options: [
              { value: "physical_activity", label: "Physical activity" },
              { value: "mental_tasks", label: "Mental concentration/tasks" },
              { value: "social_interaction", label: "Social interactions" },
              { value: "stress", label: "Stress or anxiety" },
              { value: "weather", label: "Weather changes" },
              { value: "poor_sleep", label: "Poor sleep quality" },
              { value: "medications", label: "Medications" },
              { value: "pain", label: "Pain flare-ups" },
              { value: "emotional_strain", label: "Emotional challenges" },
              { value: "overstimulation", label: "Too much sensory input" }
            ]
          },
          {
            id: "sleep_hours",
            type: "number",
            question: "On average, how many hours of sleep do you get per night?",
            path: "physicalNeeds.sleepPatterns.averageHours",
            required: false,
            validation: { min: 1, max: 24 }
          },
          {
            id: "sleep_quality",
            type: "radio",
            question: "How would you rate your sleep quality?",
            path: "physicalNeeds.sleepPatterns.quality",
            required: false,
            options: [
              { value: "excellent", label: "Excellent - I sleep deeply and wake refreshed" },
              { value: "good", label: "Good - Generally sleep well" },
              { value: "fair", label: "Fair - Sometimes have trouble sleeping" },
              { value: "poor", label: "Poor - Often have sleep problems" }
            ]
          }
        ]
      },

      // Communication and support preferences
      preferences: {
        title: "Communication & Support Preferences",
        description: "Let us know how you prefer to receive support and information",
        required: true,
        questions: [
          {
            id: "communication_style",
            type: "radio",
            question: "How do you prefer to receive information and support?",
            path: "preferences.communicationStyle",
            required: true,
            options: [
              { value: "direct", label: "Direct and to-the-point" },
              { value: "gentle", label: "Gentle and encouraging" },
              { value: "balanced", label: "A balance of both" },
              { value: "detailed", label: "Detailed explanations and context" }
            ]
          },
          {
            id: "support_type",
            type: "checkbox",
            question: "What types of support are most helpful to you? (Select all that apply)",
            path: "preferences.supportType",
            required: true,
            options: [
              { value: "emotional", label: "Emotional support and encouragement" },
              { value: "practical", label: "Practical tips and solutions" },
              { value: "informational", label: "Educational information" },
              { value: "motivational", label: "Motivation and goal-setting" },
              { value: "social", label: "Social connection and community" }
            ]
          },
          {
            id: "reminder_frequency",
            type: "radio",
            question: "How often would you like reminders and check-ins?",
            path: "preferences.reminderFrequency",
            required: true,
            options: [
              { value: "minimal", label: "Minimal - Only when I ask" },
              { value: "moderate", label: "Moderate - A few times per week" },
              { value: "frequent", label: "Frequent - Daily reminders" },
              { value: "custom", label: "Let me customize based on my needs" }
            ]
          },
          {
            id: "goal_priority",
            type: "radio",
            question: "What's your main priority right now?",
            path: "preferences.goalPriority",
            required: true,
            options: [
              { value: "health", label: "Improving my health and managing symptoms" },
              { value: "comfort", label: "Increasing comfort and reducing pain" },
              { value: "independence", label: "Maintaining/increasing independence" },
              { value: "social", label: "Staying socially connected" },
              { value: "balanced", label: "A balance of all areas" }
            ]
          },
          {
            id: "technology_comfort",
            type: "radio",
            question: "How comfortable are you with technology?",
            path: "preferences.technology_comfort",
            required: false,
            options: [
              { value: "low", label: "Not very comfortable - keep it simple" },
              { value: "moderate", label: "Moderately comfortable - some features are fine" },
              { value: "high", label: "Very comfortable - I enjoy using technology" }
            ]
          }
        ]
      },

      // Goals and priorities
      goals: {
        title: "Goals & Priorities",
        description: "What would you like to work on or achieve?",
        required: false,
        questions: [
          {
            id: "short_term_goals",
            type: "checkbox",
            question: "What are your goals for the next 1-3 months? (Select all that apply)",
            path: "goals.shortTerm",
            required: false,
            options: [
              { value: "pain_management", label: "Better pain management" },
              { value: "energy_improvement", label: "Increase energy levels" },
              { value: "sleep_improvement", label: "Improve sleep quality" },
              { value: "exercise_routine", label: "Establish exercise routine" },
              { value: "social_connections", label: "Build social connections" },
              { value: "stress_reduction", label: "Reduce stress and anxiety" },
              { value: "independence", label: "Increase independence" },
              { value: "medication_management", label: "Better medication management" },
              { value: "nutrition", label: "Improve nutrition" },
              { value: "daily_routine", label: "Establish better daily routines" }
            ]
          },
          {
            id: "daily_routine_goals",
            type: "checkbox",
            question: "Which daily activities would you like support with? (Select all that apply)",
            path: "goals.dailyRoutineGoals",
            required: false,
            options: [
              { value: "morning_routine", label: "Morning routine" },
              { value: "medication_reminders", label: "Taking medications on time" },
              { value: "meal_planning", label: "Meal planning and preparation" },
              { value: "exercise", label: "Regular physical activity" },
              { value: "self_care", label: "Self-care activities" },
              { value: "household_tasks", label: "Household management" },
              { value: "appointments", label: "Keeping track of appointments" },
              { value: "social_activities", label: "Social activities and connections" }
            ]
          }
        ]
      },

      // Support network
      support: {
        title: "Support Network",
        description: "Tell us about the support you have available",
        required: false,
        questions: [
          {
            id: "family_support",
            type: "radio",
            question: "How would you describe your family support?",
            path: "supportNetwork.familySupport",
            required: false,
            options: [
              { value: "strong", label: "Strong - Very supportive family" },
              { value: "moderate", label: "Moderate - Some family support" },
              { value: "limited", label: "Limited - Little family support" },
              { value: "none", label: "None - No family support available" },
              { value: "complicated", label: "Complicated relationship with family" }
            ]
          },
          {
            id: "friend_support",
            type: "radio",
            question: "How about support from friends?",
            path: "supportNetwork.friendSupport",
            required: false,
            options: [
              { value: "strong", label: "Strong - Great friend network" },
              { value: "moderate", label: "Moderate - Some close friends" },
              { value: "limited", label: "Limited - Few close friends" },
              { value: "none", label: "None - Feel isolated from friends" }
            ]
          },
          {
            id: "professional_support",
            type: "checkbox",
            question: "What professional support do you currently have? (Select all that apply)",
            path: "supportNetwork.professionalSupport",
            required: false,
            options: [
              { value: "primary_doctor", label: "Primary care physician" },
              { value: "specialists", label: "Medical specialists" },
              { value: "therapist", label: "Therapist/Counselor" },
              { value: "physical_therapist", label: "Physical therapist" },
              { value: "occupational_therapist", label: "Occupational therapist" },
              { value: "social_worker", label: "Social worker" },
              { value: "home_health", label: "Home health aide" },
              { value: "support_groups", label: "Support groups" },
              { value: "none", label: "No professional support" }
            ]
          }
        ]
      }
    };
  }

  // Get questions for a specific section
  getSection(sectionId) {
    return this.questionSets[sectionId];
  }

  // Get all section IDs
  getAllSections() {
    return Object.keys(this.questionSets);
  }

  // Get next recommended section based on current profile
  getNextSection(userProfile) {
    const completedSections = userProfile.intakeStatus.completedSections || [];
    const allSections = this.getAllSections();
    
    // Find first incomplete required section
    for (const sectionId of allSections) {
      const section = this.questionSets[sectionId];
      if (section.required && !completedSections.includes(sectionId)) {
        return sectionId;
      }
    }
    
    // Find first incomplete optional section
    for (const sectionId of allSections) {
      const section = this.questionSets[sectionId];
      if (!section.required && !completedSections.includes(sectionId)) {
        return sectionId;
      }
    }
    
    return null; // All sections completed
  }

  // Get adaptive questions based on previous answers
  getAdaptiveQuestions(sectionId, currentAnswers = {}, userProfile = null) {
    const section = this.getSection(sectionId);
    if (!section) return null;

    const adaptedQuestions = section.questions.filter(question => {
      // Check if question has dependencies
      if (question.dependsOn) {
        const dependentField = question.dependsOn.field;
        const condition = question.dependsOn.condition;
        const value = question.dependsOn.value;
        const currentValue = currentAnswers[dependentField];

        switch (condition) {
          case 'greaterThan':
            return currentValue > value;
          case 'equals':
            return currentValue === value;
          case 'includes':
            return Array.isArray(currentValue) && currentValue.includes(value);
          case 'notEmpty':
            return currentValue && (Array.isArray(currentValue) ? currentValue.length > 0 : true);
          default:
            return true;
        }
      }
      return true;
    });

    return {
      ...section,
      questions: adaptedQuestions
    };
  }

  // Process form submission for a section
  processSection(sectionId, answers, userProfile) {
    const section = this.getSection(sectionId);
    if (!section) {
      throw new Error(`Section ${sectionId} not found`);
    }

    // Validate required fields
    const errors = this.validateSection(sectionId, answers);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Update user profile with answers
    const updates = {};
    section.questions.forEach(question => {
      if (answers[question.id] !== undefined) {
        this.setNestedProperty(updates, question.path, answers[question.id]);
      }
    });

    userProfile.update(updates);

    // Mark section as completed
    if (!userProfile.intakeStatus.completedSections.includes(sectionId)) {
      userProfile.intakeStatus.completedSections.push(sectionId);
    }
    userProfile.intakeStatus.lastUpdatedSection = sectionId;

    // Update completion status
    const allRequired = this.getAllSections().filter(id => this.questionSets[id].required);
    const completedRequired = userProfile.intakeStatus.completedSections.filter(id => 
      this.questionSets[id].required
    );
    userProfile.intakeStatus.isCompleted = completedRequired.length === allRequired.length;

    userProfile.calculateCompletionPercentage();

    return { success: true, userProfile };
  }

  // Validate section answers
  validateSection(sectionId, answers) {
    const section = this.getSection(sectionId);
    const errors = [];

    section.questions.forEach(question => {
      const answer = answers[question.id];

      // Check required fields
      if (question.required && (answer === undefined || answer === null || answer === '')) {
        errors.push(`${question.question} is required`);
        return;
      }

      // Skip validation if no answer provided for optional field
      if (answer === undefined || answer === null || answer === '') {
        return;
      }

      // Type-specific validation
      switch (question.type) {
        case 'number':
        case 'scale':
          const num = Number(answer);
          if (isNaN(num)) {
            errors.push(`${question.question} must be a number`);
          } else if (question.validation) {
            if (question.validation.min !== undefined && num < question.validation.min) {
              errors.push(`${question.question} must be at least ${question.validation.min}`);
            }
            if (question.validation.max !== undefined && num > question.validation.max) {
              errors.push(`${question.question} must be at most ${question.validation.max}`);
            }
          }
          break;

        case 'text':
          if (question.validation) {
            if (question.validation.minLength && answer.length < question.validation.minLength) {
              errors.push(`${question.question} must be at least ${question.validation.minLength} characters`);
            }
            if (question.validation.maxLength && answer.length > question.validation.maxLength) {
              errors.push(`${question.question} must be at most ${question.validation.maxLength} characters`);
            }
          }
          break;

        case 'checkbox':
          if (!Array.isArray(answer)) {
            errors.push(`${question.question} must be an array`);
          }
          break;
      }
    });

    return errors;
  }

  // Helper to set nested properties
  setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  // Get completion status
  getCompletionStatus(userProfile) {
    const allSections = this.getAllSections();
    const requiredSections = allSections.filter(id => this.questionSets[id].required);
    const completedSections = userProfile.intakeStatus.completedSections || [];
    
    return {
      totalSections: allSections.length,
      requiredSections: requiredSections.length,
      completedSections: completedSections.length,
      completedRequired: completedSections.filter(id => this.questionSets[id].required).length,
      isComplete: userProfile.intakeStatus.isCompleted,
      percentage: userProfile.intakeStatus.completionPercentage,
      nextSection: this.getNextSection(userProfile)
    };
  }

  // Generate personalized follow-up questions based on answers
  generateFollowUpQuestions(userProfile) {
    const followUps = [];
    const context = userProfile.getPersonalizationContext();

    // Pain-specific follow-ups
    if (context.physicalCapabilities.pain?.current > 5) {
      followUps.push({
        type: "pain_management",
        question: "What pain management strategies have you tried, and what works best for you?",
        priority: "high"
      });
    }

    // Energy-specific follow-ups
    if (context.energyProfile.patterns?.morningEnergy < 4) {
      followUps.push({
        type: "morning_routine",
        question: "Would you like suggestions for gentle morning routines that might help boost your energy?",
        priority: "medium"
      });
    }

    // Goal-specific follow-ups
    if (context.currentGoals.shortTerm?.includes('exercise_routine')) {
      followUps.push({
        type: "exercise_preferences",
        question: "What types of physical activities have you enjoyed in the past, or would you like to try?",
        priority: "medium"
      });
    }

    return followUps;
  }
}