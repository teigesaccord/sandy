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
      // Physical needs and accessibility
      physical: {
        id: 'physical',
        title: "Physical Needs & Accessibility",
        description: "Help us understand your physical needs to provide better suggestions",
        required: true,
        order: 1,
        questions: [
          {
            id: "physical_needs",
            type: "multiselect",
            label: "What physical needs should the Assistant consider when suggesting tools, routines, or products?",
            question: "What physical needs should the Assistant consider?",
            path: "physical_needs",
            required: true,
            options: [
              { value: "fine_motor_control", label: "Fine motor control challenges" },
              { value: "hand_strength", label: "Hand strength limitations" },
              { value: "hand_tremors", label: "Hand tremors" },
              { value: "one_handed", label: "One-handed or limited use of one arm" },
              { value: "one_legged", label: "One-legged or limited use of one leg" },
              { value: "coordination", label: "Coordination challenges" },
              { value: "balance", label: "Balance difficulties" },
              { value: "swallowing", label: "Swallowing support needs" },
              { value: "hearing", label: "Hearing support needs" },
              { value: "vision", label: "Vision support needs" },
              { value: "upper_body_movement", label: "Limited upper body movement or reach" },
              { value: "lower_body_movement", label: "Limited lower body movement or reach" },
              { value: "upper_body_strength", label: "Limited upper body strength" },
              { value: "lower_body_strength", label: "Limited lower body strength" },
              { value: "wheelchair", label: "Manual wheelchair use" },
              { value: "powerchair", label: "Powerchair use" },
              { value: "cane", label: "Cane use" },
              { value: "walker", label: "Walker or rollator use" },
              { value: "trekking_poles", label: "Trekking pole use" }
            ]
          },
          {
            id: "energy_level",
            type: "select",
            label: "How much energy do you usually have in a day?",
            question: "How much energy do you usually have in a day?",
            path: "energy_level",
            required: true,
            options: [
              { value: "very_low", label: "Very low (only enough for essentials)" },
              { value: "moderate", label: "Moderate (a few tasks per day)" },
              { value: "high", label: "High (I like a full schedule when possible)" }
            ]
          }
        ]
      },

      // Device and adaptation preferences
      devices: {
        id: 'devices',
        title: "Devices & Adaptations",
        description: "Tell us about the devices and adaptations you use",
        required: true,
        order: 2,
        questions: [
          {
            id: "main_device",
            type: "select",
            label: "What device do you mainly use to interact with tools and services?",
            question: "What device do you mainly use?",
            path: "main_device",
            required: true,
            options: [
              { value: "mobile", label: "Smartphone or tablet" },
              { value: "computer", label: "Laptop or desktop computer" },
              { value: "voice", label: "Voice-controlled devices (like Alexa, Siri, etc.)" },
              { value: "other", label: "Other" }
            ]
          },
          {
            id: "accessibility_adaptations",
            type: "multiselect",
            label: "Do you currently use any of the following accessibility adaptations at home?",
            question: "What accessibility adaptations do you use?",
            path: "accessibility_adaptations",
            required: true,
            options: [
              { value: "smart_home", label: "Smart home devices (lights, locks, etc.)" },
              { value: "robot_vacuum", label: "Robotic vacuum cleaner" },
              { value: "kitchen_tools", label: "Adaptive kitchen tools" },
              { value: "computer_tech", label: "Adaptive computer technology (keyboards, screen readers)" },
              { value: "modified_vehicle", label: "Modified vehicles or transport" }
            ]
          }
        ]
      },

      // Daily challenges
      challenges: {
        id: 'challenges',
        title: "Daily Challenges",
        description: "Help us understand your daily challenges",
        required: true,
        order: 3,
        questions: [
          {
            id: "daily_task_challenges",
            type: "multiselect",
            label: "What daily tasks do you find most challenging?",
            question: "What daily tasks do you find most challenging?",
            path: "daily_task_challenges",
            required: true,
            options: [
              { value: "cooking", label: "Cooking or meal prep" },
              { value: "cleaning", label: "Cleaning or tidying" },
              { value: "personal_care", label: "Personal care (bathing, dressing, etc.)" },
              { value: "medications", label: "Managing medications" },
              { value: "bathroom", label: "Using the bathroom" },
              { value: "laundry", label: "Laundry" },
              { value: "mobility", label: "Getting in/out of bed or chairs" },
              { value: "shopping", label: "Grocery shopping or errands" },
              { value: "communication", label: "Communicating with others" },
              { value: "organization", label: "Organizing tasks or remembering steps" }
            ]
          }
        ]
      },

      // Additional information
      additional: {
        id: 'additional',
        title: "Additional Information",
        description: "Help us provide better support",
        required: true,
        order: 4,
        questions: [
          {
            id: "send_photos",
            type: "select",
            label: "Would you be interested in sending photos of spaces or products for the Assistant to analyze?",
            question: "Would you be interested in sending photos for analysis?",
            path: "send_photos",
            required: true,
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "maybe", label: "Maybe" }
            ]
          },
          {
            id: "condition_name",
            type: "text",
            label: "Would you like to share your disability/condition name? (Optional)",
            question: "What is your disability/condition name?",
            path: "condition_name",
            placeholder: "This helps us provide more tailored support",
            required: false
          },
          {
            id: "help_needed",
            type: "textarea",
            label: "Is there anything you'd like help with today? (Optional)",
            question: "What would you like help with today?",
            path: "help_needed",
            placeholder: "Example: Find a lightweight vacuum cleaner, or organize my top 5 tasks into an easy plan",
            required: false
          },
          {
            id: "share_experiences",
            type: "select",
            label: "Would you like to anonymously share product experiences to help other users with similar needs?",
            question: "Would you like to share product experiences?",
            path: "share_experiences",
            required: true,
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "maybe", label: "Maybe" }
            ]
          },
          {
            id: "other_needs_soon",
            type: "textarea",
            label: "Is there anything else going on that might affect your needs soon? (Optional)",
            question: "What might affect your needs soon?",
            path: "other_needs_soon",
            placeholder: "Examples: Upcoming surgery, temporary injury, flare-ups, moving, caregiving changes",
            required: false
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