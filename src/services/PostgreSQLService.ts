import { Pool, Client, QueryResult } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserProfile } from '../models/UserProfile';
import type {
  UserProfile as IUserProfile,
  ConversationMessage,
  DatabaseConfig,
  UserProfileData
} from '../types';

interface AuthUser {
  id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

interface DatabaseMethods {
  query: (text: string, params?: any[]) => Promise<QueryResult>;
}

export class PostgreSQLService implements DatabaseMethods {
  private pool: Pool;
  private jwtSecret: string;
  private bcryptRounds: number;

  constructor(connectionString?: string) {
    const dbUrl = connectionString || process.env.DATABASE_URL || 'postgresql://sandy_user:sandy_password@localhost:5432/sandy_chatbot';
    
    this.pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_here';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      await this.query('SELECT NOW()');
      
      // Create tables
      await this.createTables();
      
      console.log('PostgreSQL database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    // Enable UUID extension
    await this.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Users table for authentication
    await this.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        is_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions table
    await this.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User profiles table (updated to reference users table)
    await this.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        profile_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Conversation history table
    await this.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant')),
        message_text TEXT NOT NULL,
        context_data JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User interactions table (for analytics)
    await this.query(`
      CREATE TABLE IF NOT EXISTS user_interactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        interaction_type VARCHAR(50) NOT NULL,
        interaction_data JSONB,
        success BOOLEAN DEFAULT TRUE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Recommendations history table
    await this.query(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recommendation_type VARCHAR(100),
        recommendation_data JSONB NOT NULL,
        was_helpful BOOLEAN,
        feedback TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await this.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)');
    await this.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions (user_id)');
    await this.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions (token)');
    await this.query('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions (expires_at)');
    await this.query('CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON user_profiles (user_id)');
    await this.query('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id)');
    await this.query('CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations (timestamp)');
    await this.query('CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON user_interactions (user_id)');
    await this.query('CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations (user_id)');
  }

  // Authentication methods
  async registerUser(email: string, password: string, firstName?: string, lastName?: string): Promise<{ user: Omit<AuthUser, 'password_hash'>, token: string }> {
    // Check if user already exists
    const existingUser = await this.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);

    // Create user
    const result = await this.query(`
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, first_name, last_name, is_verified, created_at, updated_at
    `, [email, passwordHash, firstName, lastName]);

    const user = result.rows[0];

    // Generate JWT token
    const token = this.generateJWT(user.id);

    // Create session
    await this.createSession(user.id, token);

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_verified: user.is_verified,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  }

  async loginUser(email: string, password: string): Promise<{ user: Omit<AuthUser, 'password_hash'>, token: string }> {
    // Find user
    const result = await this.query(`
      SELECT id, email, password_hash, first_name, last_name, is_verified, created_at, updated_at
      FROM users WHERE email = $1
    `, [email]);

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateJWT(user.id);

    // Clean up old sessions and create new one
    await this.cleanupExpiredSessions();
    await this.createSession(user.id, token);

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_verified: user.is_verified,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  }

  async verifyToken(token: string): Promise<Omit<AuthUser, 'password_hash'> | null> {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };

      // Check session exists and is not expired
      const sessionResult = await this.query(`
        SELECT s.*, u.id, u.email, u.first_name, u.last_name, u.is_verified, u.created_at, u.updated_at
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = $1 AND s.expires_at > NOW()
      `, [token]);

      if (sessionResult.rows.length === 0) {
        return null;
      }

      const session = sessionResult.rows[0];

      // Update last accessed
      await this.query('UPDATE user_sessions SET last_accessed = NOW() WHERE id = $1', [session.id]);

      return {
        id: session.user_id,
        email: session.email,
        first_name: session.first_name,
        last_name: session.last_name,
        is_verified: session.is_verified,
        created_at: session.created_at,
        updated_at: session.updated_at
      };
    } catch (error) {
      return null;
    }
  }

  async logout(token: string): Promise<void> {
    await this.query('DELETE FROM user_sessions WHERE token = $1', [token]);
  }

  private generateJWT(userId: string): string {
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn } as jwt.SignOptions);
  }

  private async createSession(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.query(`
      INSERT INTO user_sessions (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [userId, token, expiresAt]);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    await this.query('DELETE FROM user_sessions WHERE expires_at < NOW()');
  }

  // Profile methods (updated for UUID)
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const result = await this.query('SELECT profile_data FROM user_profiles WHERE user_id = $1', [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const profileData = result.rows[0].profile_data;
      return new UserProfile({ ...profileData, userId });
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
      const profileData = profile.toJSON();
      
      await this.query(`
        INSERT INTO user_profiles (user_id, profile_data, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET profile_data = $2, updated_at = CURRENT_TIMESTAMP
      `, [userId, JSON.stringify(profileData)]);

    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    try {
      const result = await this.query('SELECT user_id, profile_data FROM user_profiles ORDER BY created_at DESC');
      
      return result.rows.map(row => {
        const profileData = row.profile_data;
        return new UserProfile({ ...profileData, userId: row.user_id });
      });
    } catch (error) {
      console.error('Error getting all user profiles:', error);
      return [];
    }
  }

  async deleteUserProfile(userId: string): Promise<boolean> {
    try {
      const result = await this.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting user profile:', error);
      return false;
    }
  }

  // Conversation methods
  async saveConversation(userId: string, messageType: 'user' | 'assistant', messageText: string, contextData?: any): Promise<void> {
    try {
      await this.query(`
        INSERT INTO conversations (user_id, message_type, message_text, context_data)
        VALUES ($1, $2, $3, $4)
      `, [userId, messageType, messageText, contextData ? JSON.stringify(contextData) : null]);
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  async getConversationHistory(userId: string, limit: number = 50): Promise<ConversationMessage[]> {
    try {
      const result = await this.query(`
        SELECT message_type, message_text, context_data, timestamp
        FROM conversations
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows.map(row => ({
        id: row.id || `msg_${Date.now()}_${Math.random()}`,
        userId: userId,
        role: row.message_type as 'user' | 'assistant',
        type: row.message_type as 'user' | 'assistant',
        content: row.message_text,
        context: row.context_data || {},
        timestamp: row.timestamp
      })).reverse();
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  async clearConversationHistory(userId: string): Promise<void> {
    try {
      await this.query('DELETE FROM conversations WHERE user_id = $1', [userId]);
    } catch (error) {
      console.error('Error clearing conversation history:', error);
      throw error;
    }
  }

  // Analytics and interactions
  async recordInteraction(userId: string, interactionType: string, interactionData?: any): Promise<void> {
    try {
      await this.query(`
        INSERT INTO user_interactions (user_id, interaction_type, interaction_data)
        VALUES ($1, $2, $3)
      `, [userId, interactionType, interactionData ? JSON.stringify(interactionData) : null]);
    } catch (error) {
      console.error('Error recording interaction:', error);
      throw error;
    }
  }

  async getInteractionStats(userId: string, days: number = 30): Promise<any> {
    try {
      const result = await this.query(`
        SELECT 
          interaction_type,
          COUNT(*) as count,
          COUNT(CASE WHEN success THEN 1 END) as successful_count
        FROM user_interactions
        WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '${days} days'
        GROUP BY interaction_type
      `, [userId]);

      return result.rows.reduce((stats, row) => {
        stats[row.interaction_type] = {
          count: parseInt(row.count),
          successful: parseInt(row.successful_count),
          success_rate: row.count > 0 ? (parseInt(row.successful_count) / parseInt(row.count)) * 100 : 0
        };
        return stats;
      }, {});
    } catch (error) {
      console.error('Error getting interaction stats:', error);
      return {};
    }
  }

  // Recommendations
  async saveRecommendation(userId: string, recommendationType: string, recommendationData: any): Promise<void> {
    try {
      await this.query(`
        INSERT INTO recommendations (user_id, recommendation_type, recommendation_data)
        VALUES ($1, $2, $3)
      `, [userId, recommendationType, JSON.stringify(recommendationData)]);
    } catch (error) {
      console.error('Error saving recommendation:', error);
      throw error;
    }
  }

  async updateRecommendationFeedback(userId: string, recommendationId: string, wasHelpful: boolean, feedback?: string): Promise<void> {
    try {
      await this.query(`
        UPDATE recommendations
        SET was_helpful = $3, feedback = $4
        WHERE id = $1 AND user_id = $2
      `, [recommendationId, userId, wasHelpful, feedback]);
    } catch (error) {
      console.error('Error updating recommendation feedback:', error);
      throw error;
    }
  }

  async getRecommendationHistory(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const result = await this.query(`
        SELECT id, recommendation_type, recommendation_data, was_helpful, feedback, timestamp
        FROM recommendations
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows.map(row => ({
        id: row.id,
        type: row.recommendation_type,
        data: row.recommendation_data,
        wasHelpful: row.was_helpful,
        feedback: row.feedback,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error('Error getting recommendation history:', error);
      return [];
    }
  }

  // System analytics
  async getUserAnalytics(userId: string): Promise<any> {
    try {
      const [conversationsResult, interactionsResult, recommendationsResult] = await Promise.all([
        this.query('SELECT COUNT(*) as count FROM conversations WHERE user_id = $1', [userId]),
        this.query('SELECT COUNT(*) as count FROM user_interactions WHERE user_id = $1', [userId]),
        this.query('SELECT COUNT(*) as count FROM recommendations WHERE user_id = $1', [userId])
      ]);

      return {
        totalConversations: parseInt(conversationsResult.rows[0].count),
        totalInteractions: parseInt(interactionsResult.rows[0].count),
        totalRecommendations: parseInt(recommendationsResult.rows[0].count)
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return {};
    }
  }

  async getSystemAnalytics(): Promise<any> {
    try {
      const [usersResult, conversationsResult, interactionsResult] = await Promise.all([
        this.query('SELECT COUNT(*) as count FROM users'),
        this.query('SELECT COUNT(*) as count FROM conversations WHERE timestamp > NOW() - INTERVAL \'30 days\''),
        this.query('SELECT COUNT(*) as count FROM user_interactions WHERE timestamp > NOW() - INTERVAL \'30 days\'')
      ]);

      return {
        totalUsers: parseInt(usersResult.rows[0].count),
        conversationsLast30Days: parseInt(conversationsResult.rows[0].count),
        interactionsLast30Days: parseInt(interactionsResult.rows[0].count)
      };
    } catch (error) {
      console.error('Error getting system analytics:', error);
      return {};
    }
  }

  // Maintenance
  async cleanupOldData(): Promise<void> {
    try {
      const retentionDays = parseInt(process.env.CONVERSATION_RETENTION_DAYS || '90');
      const analyticsRetentionDays = parseInt(process.env.ANALYTICS_RETENTION_DAYS || '365');

      await Promise.all([
        this.query(`DELETE FROM conversations WHERE timestamp < NOW() - INTERVAL '${retentionDays} days'`),
        this.query(`DELETE FROM user_interactions WHERE timestamp < NOW() - INTERVAL '${analyticsRetentionDays} days'`),
        this.query('DELETE FROM user_sessions WHERE expires_at < NOW()')
      ]);

      console.log('Old data cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('Database connection pool closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const start = Date.now();
      await this.query('SELECT 1');
      const responseTime = Date.now() - start;

      const poolInfo = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };

      return {
        status: 'healthy',
        details: {
          responseTime,
          pool: poolInfo
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}