import { UserProfile } from '../models/UserProfile';
import type { 
  IntakeSection, 
  IntakeQuestion, 
  IntakeProcessResult,
  UserProfile as IUserProfile 
} from '../types';

interface QuestionOption {
  value: string;
  label: string;
}

interface ValidationRule {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

interface DependencyRule {
  field: string;
  condition: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains';
  value: any;
}

interface DetailedIntakeQuestion {
  id: string;
  type: 'text' | 'select' | 'multiselect' | 'textarea' | 'number' | 'boolean' | 'scale';
  label: string;
  placeholder?: string;
  required: boolean;
  path: string;
  options?: QuestionOption[];
  dependsOn?: DependencyRule;
  validation?: ValidationRule;
  question?: string;
}

interface DetailedIntakeSection extends Omit<IntakeSection, 'questions'> {
  questions: DetailedIntakeQuestion[];
  description: string;
}

export class IntakeFormService {
  private questionSets: Record<string, DetailedIntakeSection>;

  constructor() {
    this.questionSets = this.initializeQuestionSets();
  }

  private initializeQuestionSets(): Record<string, DetailedIntakeSection> {
    return {
      // Basic personal information
      personal: {
        id: 'personal',
        title: "Personal Information",
        description: "Help us get to know you better",
        required: true,
        order: 1,
        questions: [
          {
            id: "name",
            type: "text",
            label: "What would you like us to call you?",
            question: "What would you like us to call you?",
            path: "personalInfo.name",
            placeholder: "Your preferred name",
            required: true,
            validation: { minLength: 2, maxLength: 50 }
          },
          {
            id: "age",
            type: "number",
            label: "What is your age?",
            question: "What is your age?",
            path: "personalInfo.age",
            placeholder: "Your age",
            required: false,
            validation: { min: 13, max: 120 }
          },
          {
            id: "email",
            type: "text",
            label: "Email address (optional)",
            question: "What is your email address?",
            path: "personalInfo.email",
            placeholder: "your.email@example.com",
            required: false,
            validation: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }
          },
          {
            id: "location",
            type: "text",
            label: "Location (optional)",
            question: "What city or region are you in?",
            path: "personalInfo.location",
            placeholder: "City, State/Country",
            required: false,
            validation: { maxLength: 100 }
          }
        ]
      },

      // Goals and priorities
      goals: {
        id: 'goals',
        title: "Goals & Priorities",
        description: "Tell us about what you'd like to achieve",
        required: true,
        order: 2,
        questions: [
          {
            id: "primary_goal",
            type: "textarea",
            label: "What is your main goal or priority right now?",
            question: "What is your main goal or priority right now?",
            path: "goals.primary",
            placeholder: "Describe your primary objective...",
            required: true,
            validation: { minLength: 10, maxLength: 500 }
          },
          {
            id: "secondary_goals",
            type: "textarea",
            label: "What other goals would you like to work towards?",
            question: "What other goals would you like to work towards?",
            path: "goals.secondary",
            placeholder: "List any additional goals or objectives...",
            required: false,
            validation: { maxLength: 1000 }
          },
          {
            id: "timeline",
            type: "select",
            label: "What's your preferred timeline for achieving your main goal?",
            question: "What's your preferred timeline for achieving your main goal?",
            path: "goals.timeline",
            required: false,
            options: [
              { value: "1-3 months", label: "1-3 months" },
              { value: "3-6 months", label: "3-6 months" },
              { value: "6-12 months", label: "6-12 months" },
              { value: "1-2 years", label: "1-2 years" },
              { value: "ongoing", label: "This is an ongoing goal" },
              { value: "flexible", label: "I'm flexible with timing" }
            ]
          }
        ]
      },

      // Context and background
      context: {
        id: 'context',
        title: "Background & Context",
        description: "Help us understand your situation better",
        required: true,
        order: 3,
        questions: [
          {
            id: "industry",
            type: "text",
            label: "What industry do you work in? (optional)",
            question: "What industry do you work in?",
            path: "context.industry",
            placeholder: "e.g., Healthcare, Technology, Education",
            required: false,
            validation: { maxLength: 100 }
          },
          {
            id: "role",
            type: "text",
            label: "What is your role or profession? (optional)",
            question: "What is your role or profession?",
            path: "context.role",
            placeholder: "e.g., Manager, Developer, Teacher",
            required: false,
            validation: { maxLength: 100 }
          },
          {
            id: "experience",
            type: "select",
            label: "How much experience do you have in your field?",
            question: "How much experience do you have in your field?",
            path: "context.experience",
            required: false,
            options: [
              { value: "entry-level", label: "Entry level (0-2 years)" },
              { value: "junior", label: "Junior (2-5 years)" },
              { value: "mid-level", label: "Mid-level (5-10 years)" },
              { value: "senior", label: "Senior (10+ years)" },
              { value: "executive", label: "Executive/Leadership" },
              { value: "not-applicable", label: "Not applicable" }
            ]
          },
          {
            id: "challenges",
            type: "textarea",
            label: "What are your biggest challenges right now?",
            question: "What are your biggest challenges right now?",
            path: "context.challenges",
            placeholder: "Describe the main obstacles you're facing...",
            required: true,
            validation: { minLength: 10, maxLength: 1000 }
          }
        ]
      },

      // Communication preferences
      preferences: {
        id: 'preferences',
        title: "Communication Preferences",
        description: "Let us know how you prefer to receive support and information",
        required: true,
        order: 4,
        questions: [
          {
            id: "communication_style",
            type: "select",
            label: "How do you prefer to receive information and support?",
            question: "How do you prefer to receive information and support?",
            path: "preferences.communicationStyle",
            required: true,
            options: [
              { value: "professional", label: "Professional and structured" },
              { value: "friendly", label: "Friendly and encouraging" },
              { value: "casual", label: "Casual and conversational" }
            ]
          },
          {
            id: "response_length",
            type: "select",
            label: "What length of responses do you prefer?",
            question: "What length of responses do you prefer?",
            path: "preferences.responseLength",
            required: true,
            options: [
              { value: "brief", label: "Brief and to the point" },
              { value: "detailed", label: "Detailed with explanations" },
              { value: "comprehensive", label: "Comprehensive with examples and context" }
            ]
          },
          {
            id: "topics_of_interest",
            type: "textarea",
            label: "What topics are you most interested in?",
            question: "What topics are you most interested in?",
            path: "preferences.topics",
            placeholder: "List topics, skills, or areas you'd like to focus on...",
            required: false,
            validation: { maxLength: 500 }
          },
          {
            id: "languages",
            type: "select",
            label: "What is your preferred language?",
            question: "What is your preferred language?",
            path: "preferences.languages",
            required: false,
            options: [
              { value: "en", label: "English" },
              { value: "es", label: "Spanish" },
              { value: "fr", label: "French" },
              { value: "de", label: "German" },
              { value: "it", label: "Italian" },
              { value: "pt", label: "Portuguese" },
              { value: "zh", label: "Chinese" },
              { value: "ja", label: "Japanese" },
              { value: "other", label: "Other" }
            ]
          }
        ]
      }
    };
  }

  getSection(sectionId: string): DetailedIntakeSection | undefined {
    return this.questionSets[sectionId];
  }

  getAllSections(): string[] {
    return Object.keys(this.questionSets).sort((a, b) => {
      const orderA = this.questionSets[a].order;
      const orderB = this.questionSets[b].order;
      return orderA - orderB;
    });
  }

  getNextSection(userProfile: UserProfile): string | undefined {
    const allSections = this.getAllSections();
    const completedSections = userProfile.intakeStatus?.completedSections || [];
    
    // Find the first section that hasn't been completed
    for (const sectionId of allSections) {
      if (!completedSections.includes(sectionId)) {
        return sectionId;
      }
    }
    
    return undefined; // All sections completed
  }

  getAdaptiveQuestions(sectionId: string, previousAnswers: Record<string, any>): DetailedIntakeQuestion[] {
    const section = this.getSection(sectionId);
    if (!section) return [];

    return section.questions.filter(question => {
      // Check if this question should be shown based on dependencies
      if (!question.dependsOn) return true;

      const dependentValue = previousAnswers[question.dependsOn.field];
      if (dependentValue === undefined) return false;

      switch (question.dependsOn.condition) {
        case 'equals':
          return dependentValue === question.dependsOn.value;
        case 'notEquals':
          return dependentValue !== question.dependsOn.value;
        case 'greaterThan':
          return Number(dependentValue) > Number(question.dependsOn.value);
        case 'lessThan':
          return Number(dependentValue) < Number(question.dependsOn.value);
        case 'contains':
          return Array.isArray(dependentValue) && dependentValue.includes(question.dependsOn.value);
        default:
          return true;
      }
    });
  }

  processSection(
    sectionId: string, 
    answers: Record<string, any>, 
    userProfile: UserProfile
  ): IntakeProcessResult {
    try {
      const section = this.getSection(sectionId);
      if (!section) {
        return {
          success: false,
          userProfile,
          errors: [`Section '${sectionId}' not found`]
        };
      }

      // Validate the section
      const validation = this.validateSection(sectionId, answers);
      if (!validation.isValid) {
        return {
          success: false,
          userProfile,
          errors: validation.errors
        };
      }

      // Apply answers to user profile
      const updatedProfile = this.applyAnswersToProfile(userProfile, section.questions, answers);

      // Mark section as completed
      if (!updatedProfile.intakeStatus) {
        updatedProfile.intakeStatus = {
          isCompleted: false,
          completedSections: [],
          completionPercentage: 0
        };
      }

      if (!updatedProfile.intakeStatus.completedSections.includes(sectionId)) {
        updatedProfile.intakeStatus.completedSections.push(sectionId);
      }
      updatedProfile.intakeStatus.lastUpdatedSection = sectionId;

      // Update completion percentage
      const totalSections = this.getAllSections().length;
      const completedSections = updatedProfile.intakeStatus.completedSections.length;
      updatedProfile.intakeStatus.completionPercentage = Math.round((completedSections / totalSections) * 100);
      updatedProfile.intakeStatus.isCompleted = completedSections === totalSections;

      // Update timestamps
      updatedProfile.updatedAt = new Date();

      return {
        success: true,
        userProfile: updatedProfile,
        nextSection: this.getNextSection(updatedProfile),
        completionPercentage: updatedProfile.intakeStatus.completionPercentage
      };

    } catch (error) {
      console.error('Error processing section:', error);
      return {
        success: false,
        userProfile,
        errors: ['An error occurred while processing your responses']
      };
    }
  }

  private applyAnswersToProfile(
    userProfile: UserProfile, 
    questions: DetailedIntakeQuestion[], 
    answers: Record<string, any>
  ): UserProfile {
    // Create a new UserProfile instance with current data
    const updatedProfile = new UserProfile(userProfile.toJSON());

    for (const question of questions) {
      const answer = answers[question.id];
      if (answer !== undefined && answer !== null && answer !== '') {
        // Convert string arrays for topics and challenges
        let processedAnswer = answer;
        if (question.id === 'topics_of_interest' && typeof answer === 'string') {
          processedAnswer = answer.split(',').map((topic: string) => topic.trim()).filter(Boolean);
        }
        if (question.id === 'challenges' && typeof answer === 'string') {
          processedAnswer = answer.split(',').map((challenge: string) => challenge.trim()).filter(Boolean);
        }
        if (question.id === 'secondary_goals' && typeof answer === 'string') {
          processedAnswer = answer.split(',').map((goal: string) => goal.trim()).filter(Boolean);
        }

        this.setNestedProperty(updatedProfile, question.path, processedAnswer);
      }
    }

    return updatedProfile;
  }

  private validateSection(sectionId: string, answers: Record<string, any>): { isValid: boolean; errors: string[] } {
    const section = this.getSection(sectionId);
    if (!section) {
      return { isValid: false, errors: [`Section '${sectionId}' not found`] };
    }

    const errors: string[] = [];

    for (const question of section.questions) {
      const answer = answers[question.id];

      // Check required fields
      if (question.required && (answer === undefined || answer === null || answer === '')) {
        errors.push(`${question.label || question.id} is required`);
        continue;
      }

      // Skip validation if no answer provided for optional fields
      if (!answer) continue;

      // Validate based on question type and validation rules
      if (question.validation) {
        const validation = question.validation;

        // String length validation
        if (typeof answer === 'string') {
          if (validation.minLength && answer.length < validation.minLength) {
            errors.push(`${question.label || question.id} must be at least ${validation.minLength} characters`);
          }
          if (validation.maxLength && answer.length > validation.maxLength) {
            errors.push(`${question.label || question.id} must be no more than ${validation.maxLength} characters`);
          }
          if (validation.pattern && !new RegExp(validation.pattern).test(answer)) {
            errors.push(`${question.label || question.id} format is invalid`);
          }
        }

        // Numeric validation
        if (question.type === 'number' || question.type === 'scale') {
          const numValue = Number(answer);
          if (isNaN(numValue)) {
            errors.push(`${question.label || question.id} must be a valid number`);
          } else {
            if (validation.min !== undefined && numValue < validation.min) {
              errors.push(`${question.label || question.id} must be at least ${validation.min}`);
            }
            if (validation.max !== undefined && numValue > validation.max) {
              errors.push(`${question.label || question.id} must be no more than ${validation.max}`);
            }
          }
        }
      }

      // Validate select options
      if (question.type === 'select' && question.options) {
        const validValues = question.options.map(opt => opt.value);
        if (!validValues.includes(answer)) {
          errors.push(`${question.label || question.id} contains an invalid selection`);
        }
      }

      // Validate multiselect options
      if (question.type === 'multiselect' && question.options && Array.isArray(answer)) {
        const validValues = question.options.map(opt => opt.value);
        const invalidValues = answer.filter(val => !validValues.includes(val));
        if (invalidValues.length > 0) {
          errors.push(`${question.label || question.id} contains invalid selections: ${invalidValues.join(', ')}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  getCompletionStatus(userProfile: UserProfile): {
    totalSections: number;
    completedSections: number;
    completionPercentage: number;
    isCompleted: boolean;
    nextSection?: string;
  } {
    const totalSections = this.getAllSections().length;
    const completedSections = userProfile.intakeStatus?.completedSections?.length || 0;
    const completionPercentage = Math.round((completedSections / totalSections) * 100);
    const isCompleted = completedSections === totalSections;
    const nextSection = isCompleted ? undefined : this.getNextSection(userProfile);

    return {
      totalSections,
      completedSections,
      completionPercentage,
      isCompleted,
      nextSection: nextSection || undefined
    };
  }

  generateFollowUpQuestions(sectionId: string, answers: Record<string, any>): string[] {
    const followUps: string[] = [];

    // Generate contextual follow-up questions based on answers
    if (sectionId === 'goals' && answers.primary_goal) {
      followUps.push("What specific steps have you already taken towards this goal?");
      followUps.push("What obstacles do you anticipate in achieving this goal?");
    }

    if (sectionId === 'context' && answers.challenges) {
      followUps.push("Which of these challenges affects you most on a daily basis?");
      followUps.push("Have you found any strategies that help with these challenges?");
    }

    if (sectionId === 'preferences' && answers.topics_of_interest) {
      followUps.push("What would you like to learn or improve in these areas?");
    }

    return followUps;
  }

  // Convert section to the format expected by the frontend
  getSectionForFrontend(sectionId: string): IntakeSection | undefined {
    const section = this.getSection(sectionId);
    if (!section) return undefined;

    return {
      id: section.id,
      title: section.title,
      description: section.description,
      order: section.order,
      required: section.required,
      questions: section.questions.map(q => ({
        id: q.id,
        type: q.type,
        label: q.label,
        placeholder: q.placeholder,
        required: q.required,
        options: q.options?.map(opt => opt.value),
        validation: q.validation ? {
          min: q.validation.min,
          max: q.validation.max,
          pattern: q.validation.pattern,
          message: `Please provide a valid ${q.label?.toLowerCase() || q.id}`
        } : undefined
      }))
    };
  }
}