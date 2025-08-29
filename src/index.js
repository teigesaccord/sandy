import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Import our services
import { AIService } from './services/AIService.js';
import { IntakeFormService } from './services/IntakeFormService.js';
import { UserProfile } from './models/UserProfile.js';
import { DatabaseService } from './services/DatabaseService.js';

// Load environment variables
dotenv.config();

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize services
const aiService = new AIService(process.env.OPENAI_API_KEY, {
  modelName: process.env.AI_MODEL || 'gpt-3.5-turbo',
  temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
  maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 2000
});

const intakeService = new IntakeFormService();
const dbService = new DatabaseService(process.env.DATABASE_PATH || './data/users.db');

// Initialize Express app
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'chatbot_api',
  points: 50, // Number of requests
  duration: 60, // Per 60 seconds
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(join(__dirname, '../public')));

// Rate limiting middleware
const rateLimitMiddleware = async (req, res, next) => {
  try {
    const key = req.ip || 'unknown';
    await rateLimiter.consume(key);
    next();
  } catch (rejRes) {
    const totalHits = rejRes.totalHits || 0;
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 1000;
    
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.round(msBeforeNext / 1000),
      remaining: remainingPoints,
      total: totalHits
    });
  }
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// User profile endpoints
app.get('/api/users/:userId/profile', rateLimitMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await dbService.getUserProfile(userId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json({ profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.post('/api/users/:userId/profile', rateLimitMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const profileData = req.body;
    
    let profile = await dbService.getUserProfile(userId);
    if (profile) {
      profile.update(profileData);
    } else {
      profile = new UserProfile({ ...profileData, userId });
    }
    
    await dbService.saveUserProfile(userId, profile);
    res.json({ profile: profile.toJSON() });
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Intake form endpoints
app.get('/api/intake/sections', (req, res) => {
  try {
    const sections = intakeService.getAllSections().map(id => ({
      id,
      ...intakeService.getSection(id)
    }));
    res.json({ sections });
  } catch (error) {
    console.error('Error fetching intake sections:', error);
    res.status(500).json({ error: 'Failed to fetch intake sections' });
  }
});

app.get('/api/intake/sections/:sectionId', (req, res) => {
  try {
    const { sectionId } = req.params;
    const section = intakeService.getSection(sectionId);
    
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    res.json({ section });
  } catch (error) {
    console.error('Error fetching intake section:', error);
    res.status(500).json({ error: 'Failed to fetch intake section' });
  }
});

app.post('/api/users/:userId/intake/:sectionId', rateLimitMiddleware, async (req, res) => {
  try {
    const { userId, sectionId } = req.params;
    const answers = req.body;
    
    let profile = await dbService.getUserProfile(userId);
    if (!profile) {
      profile = new UserProfile({ userId });
    }
    
    const result = intakeService.processSection(sectionId, answers, profile);
    
    if (!result.success) {
      return res.status(400).json({ errors: result.errors });
    }
    
    await dbService.saveUserProfile(userId, result.userProfile);
    
    // Generate AI response for intake
    const aiResponse = await aiService.processIntakeResponse(
      userId, 
      JSON.stringify(answers), 
      sectionId, 
      result.userProfile
    );
    
    res.json({
      profile: result.userProfile.toJSON(),
      aiResponse: aiResponse.response,
      nextSection: intakeService.getNextSection(result.userProfile),
      completionStatus: intakeService.getCompletionStatus(result.userProfile)
    });
  } catch (error) {
    console.error('Error processing intake section:', error);
    res.status(500).json({ error: 'Failed to process intake section' });
  }
});

// Chat endpoints
app.post('/api/users/:userId/chat', rateLimitMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { message, context } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }
    
    let profile = await dbService.getUserProfile(userId);
    if (!profile) {
      profile = new UserProfile({ userId });
      await dbService.saveUserProfile(userId, profile);
    }
    
    const response = await aiService.chat(userId, message, profile, context);
    
    // Save updated profile if modified
    await dbService.saveUserProfile(userId, profile);
    
    res.json(response);
  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      response: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment."
    });
  }
});

// Recommendations endpoint
app.get('/api/users/:userId/recommendations', rateLimitMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { area } = req.query;
    
    const profile = await dbService.getUserProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const recommendations = await aiService.generateRecommendations(profile, area);
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Conversation history endpoint
app.get('/api/users/:userId/conversation-summary', rateLimitMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const summary = await aiService.getConversationSummary(userId);
    res.json({ summary });
  } catch (error) {
    console.error('Error getting conversation summary:', error);
    res.status(500).json({ error: 'Failed to get conversation summary' });
  }
});

// Clear conversation history
app.delete('/api/users/:userId/conversation', rateLimitMiddleware, (req, res) => {
  try {
    const { userId } = req.params;
    aiService.clearUserHistory(userId);
    res.json({ message: 'Conversation history cleared' });
  } catch (error) {
    console.error('Error clearing conversation:', error);
    res.status(500).json({ error: 'Failed to clear conversation' });
  }
});

// WebSocket for real-time chat
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'chat') {
        const { userId, text, context } = message;
        
        // Rate limiting for WebSocket
        const key = `ws_${userId || req.socket.remoteAddress}`;
        try {
          await rateLimiter.consume(key);
        } catch (rejRes) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Rate limit exceeded',
            retryAfter: Math.round(rejRes.msBeforeNext / 1000)
          }));
          return;
        }
        
        let profile = await dbService.getUserProfile(userId);
        if (!profile) {
          profile = new UserProfile({ userId });
          await dbService.saveUserProfile(userId, profile);
        }
        
        const response = await aiService.chat(userId, text, profile, context);
        await dbService.saveUserProfile(userId, profile);
        
        ws.send(JSON.stringify({
          type: 'chat_response',
          ...response,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process message'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Heartbeat for WebSocket connections
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeat);
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await dbService.initialize();
    console.log('Database initialized successfully');
    
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`🚀 Sandy Chatbot Server running on port ${port}`);
      console.log(`📱 Web interface: http://localhost:${port}`);
      console.log(`🔌 WebSocket: ws://localhost:${port}`);
      console.log(`📊 API: http://localhost:${port}/api/health`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('\n🛠️  Development mode enabled');
        console.log('🔑 Make sure to set OPENAI_API_KEY in your .env file');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();