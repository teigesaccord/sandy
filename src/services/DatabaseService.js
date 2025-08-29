import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { UserProfile } from '../models/UserProfile.js';
import fs from 'fs/promises';
import path from 'path';

export class DatabaseService {
  constructor(dbPath = './data/users.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  async initialize() {
    try {
      // Ensure data directory exists
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });

      // Initialize SQLite database
      this.db = new sqlite3.Database(this.dbPath);
      
      // Promisify database methods
      this.run = promisify(this.db.run.bind(this.db));
      this.get = promisify(this.db.get.bind(this.db));
      this.all = promisify(this.db.all.bind(this.db));

      // Create tables
      await this.createTables();
      
      console.log(`Database initialized at ${this.dbPath}`);
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    // User profiles table
    await this.run(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        profile_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Conversation history table
    await this.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        message_type TEXT NOT NULL, -- 'user' or 'bot'
        message_text TEXT NOT NULL,
        context_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user_profiles (user_id)
      )
    `);

    // User interactions table (for analytics)
    await this.run(`
      CREATE TABLE IF NOT EXISTS user_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        interaction_type TEXT NOT NULL, -- 'chat', 'intake', 'recommendation'
        interaction_data TEXT,
        success BOOLEAN DEFAULT TRUE,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user_profiles (user_id)
      )
    `);

    // Recommendations history table
    await this.run(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        recommendation_type TEXT,
        recommendation_data TEXT NOT NULL,
        was_helpful BOOLEAN,
        feedback TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user_profiles (user_id)
      )
    `);

    // Create indexes for better performance
    await this.run(`CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations (timestamp)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON user_interactions (user_id)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations (user_id)`);
  }

  // User Profile Operations
  async getUserProfile(userId) {
    try {
      const row = await this.get(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userId]
      );

      if (!row) {
        return null;
      }

      const profileData = JSON.parse(row.profile_data);
      return UserProfile.fromJSON(profileData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async saveUserProfile(userId, userProfile) {
    try {
      const profileJson = JSON.stringify(userProfile.toJSON());
      const now = new Date().toISOString();

      // Try to update first
      const result = await this.run(`
        UPDATE user_profiles 
        SET profile_data = ?, updated_at = ? 
        WHERE user_id = ?
      `, [profileJson, now, userId]);

      // If no rows were affected, insert new record
      if (result.changes === 0) {
        await this.run(`
          INSERT INTO user_profiles (id, user_id, profile_data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `, [userProfile.id, userId, profileJson, now, now]);
      }

      return userProfile;
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }

  async getAllUserProfiles(limit = 100, offset = 0) {
    try {
      const rows = await this.all(
        'SELECT * FROM user_profiles ORDER BY updated_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );

      return rows.map(row => ({
        userId: row.user_id,
        profile: UserProfile.fromJSON(JSON.parse(row.profile_data)),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error fetching user profiles:', error);
      throw error;
    }
  }

  async deleteUserProfile(userId) {
    try {
      await this.run('DELETE FROM user_profiles WHERE user_id = ?', [userId]);
      // Also delete related data
      await this.run('DELETE FROM conversations WHERE user_id = ?', [userId]);
      await this.run('DELETE FROM user_interactions WHERE user_id = ?', [userId]);
      await this.run('DELETE FROM recommendations WHERE user_id = ?', [userId]);
      return true;
    } catch (error) {
      console.error('Error deleting user profile:', error);
      throw error;
    }
  }

  // Conversation Operations
  async saveConversation(userId, messageType, messageText, contextData = null) {
    try {
      await this.run(`
        INSERT INTO conversations (user_id, message_type, message_text, context_data)
        VALUES (?, ?, ?, ?)
      `, [userId, messageType, messageText, contextData ? JSON.stringify(contextData) : null]);
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  async getConversationHistory(userId, limit = 50, offset = 0) {
    try {
      const rows = await this.all(`
        SELECT * FROM conversations 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
      `, [userId, limit, offset]);

      return rows.map(row => ({
        id: row.id,
        messageType: row.message_type,
        messageText: row.message_text,
        contextData: row.context_data ? JSON.parse(row.context_data) : null,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      throw error;
    }
  }

  async clearConversationHistory(userId) {
    try {
      await this.run('DELETE FROM conversations WHERE user_id = ?', [userId]);
      return true;
    } catch (error) {
      console.error('Error clearing conversation history:', error);
      throw error;
    }
  }

  // User Interaction Tracking
  async recordInteraction(userId, interactionType, interactionData = null, success = true) {
    try {
      await this.run(`
        INSERT INTO user_interactions (user_id, interaction_type, interaction_data, success)
        VALUES (?, ?, ?, ?)
      `, [userId, interactionType, interactionData ? JSON.stringify(interactionData) : null, success]);
    } catch (error) {
      console.error('Error recording interaction:', error);
      // Don't throw here as this is for analytics only
    }
  }

  async getInteractionStats(userId, days = 30) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      const stats = await this.all(`
        SELECT 
          interaction_type,
          COUNT(*) as total_count,
          COUNT(CASE WHEN success = 1 THEN 1 END) as success_count,
          DATE(timestamp) as date
        FROM user_interactions 
        WHERE user_id = ? AND timestamp >= ?
        GROUP BY interaction_type, DATE(timestamp)
        ORDER BY date DESC
      `, [userId, since]);

      return stats;
    } catch (error) {
      console.error('Error fetching interaction stats:', error);
      throw error;
    }
  }

  // Recommendations Operations
  async saveRecommendation(userId, recommendationType, recommendationData) {
    try {
      const result = await this.run(`
        INSERT INTO recommendations (user_id, recommendation_type, recommendation_data)
        VALUES (?, ?, ?)
      `, [userId, recommendationType, JSON.stringify(recommendationData)]);

      return result.lastID;
    } catch (error) {
      console.error('Error saving recommendation:', error);
      throw error;
    }
  }

  async updateRecommendationFeedback(recommendationId, wasHelpful, feedback = null) {
    try {
      await this.run(`
        UPDATE recommendations 
        SET was_helpful = ?, feedback = ?
        WHERE id = ?
      `, [wasHelpful, feedback, recommendationId]);
    } catch (error) {
      console.error('Error updating recommendation feedback:', error);
      throw error;
    }
  }

  async getRecommendationHistory(userId, limit = 20) {
    try {
      const rows = await this.all(`
        SELECT * FROM recommendations 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `, [userId, limit]);

      return rows.map(row => ({
        id: row.id,
        type: row.recommendation_type,
        data: JSON.parse(row.recommendation_data),
        wasHelpful: row.was_helpful,
        feedback: row.feedback,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error('Error fetching recommendation history:', error);
      throw error;
    }
  }

  // Analytics and Reporting
  async getUserAnalytics(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return null;
      }

      // Get interaction stats
      const interactions = await this.getInteractionStats(userId);
      
      // Get conversation count
      const conversationCount = await this.get(
        'SELECT COUNT(*) as count FROM conversations WHERE user_id = ?',
        [userId]
      );

      // Get recommendation stats
      const recommendationStats = await this.get(`
        SELECT 
          COUNT(*) as total_recommendations,
          COUNT(CASE WHEN was_helpful = 1 THEN 1 END) as helpful_recommendations,
          COUNT(CASE WHEN was_helpful = 0 THEN 1 END) as unhelpful_recommendations
        FROM recommendations 
        WHERE user_id = ?
      `, [userId]);

      return {
        userId,
        profileCompleteness: profile.intakeStatus.completionPercentage,
        totalInteractions: profile.interactionHistory.totalInteractions,
        conversationMessages: conversationCount.count,
        interactions: interactions,
        recommendations: recommendationStats,
        lastActivity: profile.interactionHistory.lastInteraction,
        memberSince: profile.createdAt
      };
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      throw error;
    }
  }

  async getSystemAnalytics() {
    try {
      // Total users
      const totalUsers = await this.get('SELECT COUNT(*) as count FROM user_profiles');
      
      // Active users (interacted in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const activeUsers = await this.get(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM user_interactions 
        WHERE timestamp >= ?
      `, [sevenDaysAgo]);

      // Profile completion stats
      const completionStats = await this.all(`
        SELECT 
          CASE 
            WHEN JSON_EXTRACT(profile_data, '$.intakeStatus.completionPercentage') >= 90 THEN 'Complete (90-100%)'
            WHEN JSON_EXTRACT(profile_data, '$.intakeStatus.completionPercentage') >= 70 THEN 'Mostly Complete (70-89%)'
            WHEN JSON_EXTRACT(profile_data, '$.intakeStatus.completionPercentage') >= 30 THEN 'Partially Complete (30-69%)'
            ELSE 'Just Started (0-29%)'
          END as completion_level,
          COUNT(*) as count
        FROM user_profiles
        GROUP BY completion_level
      `);

      // Most common interaction types
      const interactionTypes = await this.all(`
        SELECT interaction_type, COUNT(*) as count
        FROM user_interactions
        WHERE timestamp >= ?
        GROUP BY interaction_type
        ORDER BY count DESC
      `, [sevenDaysAgo]);

      return {
        totalUsers: totalUsers.count,
        activeUsers: activeUsers.count,
        completionStats,
        interactionTypes,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching system analytics:', error);
      throw error;
    }
  }

  // Database maintenance
  async vacuum() {
    try {
      await this.run('VACUUM');
      console.log('Database vacuumed successfully');
    } catch (error) {
      console.error('Error vacuuming database:', error);
      throw error;
    }
  }

  async backup(backupPath) {
    try {
      const backupDb = new sqlite3.Database(backupPath);
      
      return new Promise((resolve, reject) => {
        this.db.backup(backupDb, (err) => {
          backupDb.close();
          if (err) {
            reject(err);
          } else {
            console.log(`Database backed up to ${backupPath}`);
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('Error backing up database:', error);
      throw error;
    }
  }

  // Clean up old data
  async cleanupOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
      
      // Delete old conversations
      const conversationsDeleted = await this.run(
        'DELETE FROM conversations WHERE timestamp < ?',
        [cutoffDate]
      );

      // Delete old interactions
      const interactionsDeleted = await this.run(
        'DELETE FROM user_interactions WHERE timestamp < ?',
        [cutoffDate]
      );

      console.log(`Cleanup completed: ${conversationsDeleted.changes} conversations, ${interactionsDeleted.changes} interactions deleted`);
      
      return {
        conversationsDeleted: conversationsDeleted.changes,
        interactionsDeleted: interactionsDeleted.changes
      };
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      throw error;
    }
  }

  // Close database connection
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}