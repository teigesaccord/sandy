import type { UserProfile as IUserProfile, ConversationMessage } from '../types';

export class UserProfile implements IUserProfile {
  public userId: string = '';
  
  // Physical needs and accessibility
  public physical_needs: string[] = [];
  public energy_level: string = '';
  
  // Device and adaptation preferences
  public main_device: string = '';
  public accessibility_adaptations: string[] = [];
  
  // Daily challenges
  public daily_task_challenges: string[] = [];
  
  // Additional information
  public send_photos: string = '';
  public condition_name?: string;
  public help_needed?: string;
  public share_experiences: string = '';
  public other_needs_soon?: string;
  
  // Basic profile info
  public bio?: string;
  public avatar?: string;
  public location?: string;
  
  // System fields
  public conversationHistory?: ConversationMessage[];
  public intakeStatus?: {
    isCompleted: boolean;
    completedSections: string[];
    lastUpdatedSection?: string;
    completionPercentage: number;
  };
  public interactionHistory?: {
    totalInteractions: number;
    lastInteraction?: Date;
    preferredTopics?: string[];
    successfulRecommendations?: string[];
    declinedRecommendations?: string[];
  };
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(data?: Partial<IUserProfile>) {
    if (data) {
      Object.assign(this, data);
    }
  }

  toJSON(): IUserProfile {
    return {
      userId: this.userId,
      physical_needs: this.physical_needs,
      energy_level: this.energy_level,
      main_device: this.main_device,
      accessibility_adaptations: this.accessibility_adaptations,
      daily_task_challenges: this.daily_task_challenges,
      send_photos: this.send_photos,
      condition_name: this.condition_name,
      help_needed: this.help_needed,
      share_experiences: this.share_experiences,
      other_needs_soon: this.other_needs_soon,
      bio: this.bio,
      avatar: this.avatar,
      location: this.location,
      conversationHistory: this.conversationHistory,
      intakeStatus: this.intakeStatus,
      interactionHistory: this.interactionHistory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
