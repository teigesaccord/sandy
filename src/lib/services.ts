import { AIService } from '../services/AIService';
import PostgreSQLService from '../services/PostgreSQLService';
import { IntakeFormService } from '../services/IntakeFormService';
import type { AppConfig } from '../types';

// Global service instances
let aiService: AIService | null = null;
let dbService: PostgreSQLService | null = null;
let intakeService: IntakeFormService | null = null;

// Configuration
const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  databasePath: process.env.DATABASE_URL || 'postgresql://sandy:sandy@localhost:5432/sandy_db',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://127.0.0.1:3000'],
  aiConfig: {
    modelName: process.env.AI_MODEL || 'gpt-3.5-turbo',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000')
  },
  rateLimiting: {
    points: parseInt(process.env.RATE_LIMIT_POINTS || '50'),
    duration: parseInt(process.env.RATE_LIMIT_DURATION || '60')
  }
};

// Initialize services
export async function initializeServices(): Promise<{
  aiService: AIService;
  dbService: PostgreSQLService;
  intakeService: IntakeFormService;
}> {
  try {
    // Initialize AI Service
    if (!aiService) {
      if (!config.openaiApiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      aiService = new AIService(config.openaiApiKey, config.aiConfig);
    }

    // Initialize Database Service (frontend proxy) — no DB connections from frontend
    if (!dbService) {
      // PostgreSQLService here is a thin HTTP client that forwards requests to the Django backend
      // It does not perform any direct DB initialization.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      dbService = PostgreSQLService;
    }

    // Initialize Intake Form Service
    if (!intakeService) {
      intakeService = new IntakeFormService();
    }

    return {
      aiService,
      dbService,
      intakeService
    };
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

// Get service instances (lazy initialization)
export async function getAIService(): Promise<AIService> {
  if (!aiService) {
    const services = await initializeServices();
    return services.aiService;
  }
  return aiService;
}

export async function getDBService(): Promise<PostgreSQLService> {
  if (!dbService) {
    const services = await initializeServices();
    return services.dbService;
  }
  return dbService;
}

export async function getIntakeService(): Promise<IntakeFormService> {
  if (!intakeService) {
    const services = await initializeServices();
    return services.intakeService;
  }
  return intakeService;
}

// Rate limiting utility
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const rateLimitMap = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(key: string, limit: number = config.rateLimiting.points, windowMs: number = config.rateLimiting.duration * 1000): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean up expired entries
  const entries = Array.from(rateLimitMap.entries());
  for (const [k, v] of entries) {
    if (v.reset < now) {
      rateLimitMap.delete(k);
    }
  }

  const current = rateLimitMap.get(key);
  
  if (!current) {
    // First request
    rateLimitMap.set(key, { count: 1, reset: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs
    };
  }

  if (current.reset < now) {
    // Window has expired, reset
    rateLimitMap.set(key, { count: 1, reset: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs
    };
  }

  if (current.count >= limit) {
    // Rate limit exceeded
    return {
      success: false,
      limit,
      remaining: 0,
      reset: current.reset
    };
  }

  // Increment counter
  current.count++;
  return {
    success: true,
    limit,
    remaining: limit - current.count,
    reset: current.reset
  };
}

// Error handling utilities
export function handleApiError(error: unknown): { message: string; status: number } {
  console.error('API Error:', error);

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('API key')) {
      return { message: 'Invalid API configuration', status: 500 };
    }
    if (error.message.includes('Database')) {
      return { message: 'Database error', status: 500 };
    }
    if (error.message.includes('Rate limit')) {
      return { message: 'Rate limit exceeded', status: 429 };
    }
    
    return { message: error.message, status: 400 };
  }

  return { message: 'Internal server error', status: 500 };
}

// Request validation utilities
export function validateUserId(userId: string | null): boolean {
  return !!(userId && userId.trim().length > 0 && userId.length <= 255);
}

export function validateMessage(message: string | null): boolean {
  return !!(message && message.trim().length > 0 && message.length <= 2000);
}

export function getUserIdFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const userIndex = pathSegments.indexOf('users');
  
  if (userIndex !== -1 && userIndex + 1 < pathSegments.length) {
    return pathSegments[userIndex + 1];
  }
  
  return null;
}

// CORS headers
export function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = config.allowedOrigins;
  const requestOrigin = origin || '';
  
  const corsOrigin = config.nodeEnv === 'development' 
    ? '*' 
    : allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };
}

// Generate unique user ID
export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Environment validation
export function validateEnvironment(): void {
  const required = ['OPENAI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export { config };