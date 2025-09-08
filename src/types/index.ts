// User Profile Types
export interface UserProfile {
  userId: string;
  // Survey fields
  physical_needs: string[];
  energy_level: string;
  main_device: string;
  accessibility_adaptations: string[];
  daily_task_challenges: string[];
  send_photos: string;
  condition_name?: string;
  help_needed?: string;
  share_experiences: string;
  other_needs_soon?: string;
  
  // Profile fields
  bio?: string;
  avatar?: string;
  location?: string;
  
  // System fields
  conversationHistory?: ConversationMessage[];
  intakeStatus?: {
    isCompleted: boolean;
    completedSections: string[];
    lastUpdatedSection?: string;
    completionPercentage: number;
  };
  interactionHistory?: {
    totalInteractions: number;
    lastInteraction?: Date;
    preferredTopics?: string[];
    successfulRecommendations?: string[];
    declinedRecommendations?: string[];
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// Chat and Conversation Types
export interface ConversationMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    context?: string;
    intent?: string;
    sentiment?: string;
  };
}

export interface ChatRequest {
  message: string;
  context?: string;
  userId: string;
}

export interface ChatResponse {
  response: string;
  suggestions?: string[];
  intent?: string;
  followUp?: string;
  metadata?: {
    model?: string;
    tokens?: number;
    confidence?: number;
  };
}

// Intake Form Types
export interface IntakeSection {
  id: string;
  title: string;
  description?: string;
  questions: IntakeQuestion[];
  order: number;
  required: boolean;
}

export interface IntakeQuestion {
  id: string;
  type: 'text' | 'select' | 'multiselect' | 'textarea' | 'number' | 'boolean' | 'scale';
  label: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface IntakeResponse {
  sectionId: string;
  questionId: string;
  answer: string | number | boolean | string[];
}

export interface IntakeProcessResult {
  success: boolean;
  userProfile: UserProfile;
  errors?: string[];
  nextSection?: string;
  completionPercentage?: number;
}

// AI Service Types
export interface AIServiceConfig {
  modelName: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
}

export interface AIResponse {
  response: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  created?: number;
}

// Recommendation Types
export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  completed?: boolean;
  resources?: {
    type: 'link' | 'document' | 'video' | 'article';
    title: string;
    url: string;
  }[];
  estimatedTimeToComplete?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface RecommendationRequest {
  userId: string;
  area?: string;
  context?: string;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'chat' | 'error' | 'chat_response' | 'status' | 'ping' | 'pong';
  userId?: string;
  text?: string;
  context?: string;
  data?: any;
  timestamp?: string;
  error?: string;
  retryAfter?: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Database Types
export interface DatabaseConfig {
  path: string;
  timeout?: number;
  verbose?: boolean;
}

export interface UserProfileData {
  user_id: string;
  profile_data: string; // JSON string
  created_at: string;
  updated_at: string;
}

// Rate Limiting Types
export interface RateLimitInfo {
  totalHits: number;
  remainingPoints: number;
  msBeforeNext: number;
}

// Error Types
export interface AppError extends Error {
  code?: string;
  status?: number;
  details?: any;
}

// Configuration Types
export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  databasePath: string;
  openaiApiKey: string;
  allowedOrigins: string[];
  aiConfig: AIServiceConfig;
  rateLimiting: {
    points: number;
    duration: number;
  };
}

// Component Props Types
export interface ChatComponentProps {
  userId: string;
  initialMessages?: ConversationMessage[];
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: ChatResponse) => void;
  className?: string;
}

export interface IntakeFormProps {
  userId: string;
  sections: IntakeSection[];
  currentSectionId?: string;
  onSectionComplete?: (sectionId: string, responses: IntakeResponse[]) => void;
  onFormComplete?: (profile: UserProfile) => void;
  className?: string;
}

export interface RecommendationCardProps {
  recommendation: Recommendation;
  onActionClick?: (recommendationId: string) => void;
  className?: string;
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Event Types
export type ChatEvent = 'message_sent' | 'message_received' | 'typing_start' | 'typing_stop' | 'connection_status';

export interface ChatEventData {
  userId: string;
  type: ChatEvent;
  data?: any;
  timestamp: Date;
}