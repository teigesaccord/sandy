# Sandy - Personalized Support Chatbot

A compassionate AI assistant providing personalized support for daily challenges, built with Next.js, TypeScript, and OpenAI.

## 🌟 Features

- **Personalized AI Chat**: Contextual conversations that adapt to your profile and preferences
- **Comprehensive Intake System**: Multi-step form to build your personalized profile
- **Smart Recommendations**: AI-generated suggestions based on your goals and challenges
- **Real-time Interface**: Responsive chat interface with typing indicators and suggestions
- **Profile Management**: Track your progress and completion status
- **Accessible Design**: Built with accessibility and mobile-first responsive design
- **Rate Limiting**: Built-in protection against abuse with intelligent rate limiting
- **Data Persistence**: SQLite database for reliable data storage

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sandy-test
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   DATABASE_PATH=./data/users.db
   ALLOWED_ORIGINS=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
sandy-test/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── health/        # Health check endpoint
│   │   │   ├── users/         # User management
│   │   │   │   └── [userId]/  # User-specific endpoints
│   │   │   │       ├── profile/    # Profile management
│   │   │   │       ├── chat/       # Chat functionality
│   │   │   │       └── recommendations/ # AI recommendations
│   │   │   └── intake/        # Intake form endpoints
│   │   ├── globals.css        # Global styles and design system
│   │   ├── layout.tsx         # Root layout component
│   │   └── page.tsx           # Main application page
│   ├── components/            # React components
│   │   ├── ChatComponent.tsx       # Real-time chat interface
│   │   ├── IntakeForm.tsx         # Multi-step intake form
│   │   ├── RecommendationsList.tsx # AI recommendations display
│   │   ├── UserProfileCard.tsx    # Profile status and info
│   │   └── StatusIndicator.tsx    # Connection status
│   ├── lib/                   # Utilities and configurations
│   │   └── services.ts        # Service initialization and utilities
│   ├── models/                # Data models
│   │   └── UserProfile.ts     # User profile class
│   ├── services/              # Business logic services
│   │   ├── AIService.ts       # OpenAI integration
│   │   ├── DatabaseService.ts # SQLite database operations
│   │   └── IntakeFormService.ts # Form management
│   └── types/                 # TypeScript type definitions
│       └── index.ts           # Shared type definitions
├── data/                      # Database and data files
├── logs/                      # Application logs
├── public/                    # Static assets
└── scripts/                   # Utility scripts
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI functionality | - | ✅ |
| `DATABASE_PATH` | Path to SQLite database file | `./data/users.db` | ❌ |
| `AI_MODEL` | OpenAI model to use | `gpt-3.5-turbo` | ❌ |
| `AI_TEMPERATURE` | AI response creativity (0-1) | `0.7` | ❌ |
| `AI_MAX_TOKENS` | Maximum tokens per AI response | `2000` | ❌ |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `http://localhost:3000` | ❌ |
| `RATE_LIMIT_POINTS` | Rate limit requests per window | `50` | ❌ |
| `RATE_LIMIT_DURATION` | Rate limit window in seconds | `60` | ❌ |

### Database

The application uses SQLite for data persistence. The database is automatically initialized on first run and includes:

- **user_profiles** - User profile data and preferences
- **conversations** - Chat message history
- **user_interactions** - Analytics and usage tracking
- **recommendations** - Generated recommendation history

## 📱 Usage

### Getting Started

1. **Welcome Screen**: Choose to start chatting, complete your profile, or view recommendations
2. **Profile Setup**: Complete the intake form to personalize your experience
3. **Chat Interface**: Engage with Sandy for support, guidance, and recommendations
4. **Recommendations**: View AI-generated suggestions tailored to your profile

### Chat Features

- **Contextual Conversations**: Sandy remembers your profile and previous conversations
- **Smart Suggestions**: Get follow-up questions and conversation starters
- **Typing Indicators**: Visual feedback during AI processing
- **Message History**: Access previous conversations and clear history as needed
- **Error Handling**: Graceful fallbacks when AI services are unavailable

### Profile Management

- **Multi-step Intake**: Comprehensive form covering personal info, goals, context, and preferences
- **Progress Tracking**: Visual progress indicators and completion percentages
- **Data Validation**: Real-time validation with helpful error messages
- **Profile Updates**: Modify your information at any time

## 🚀 Deployment

### Production Build

```bash
npm run build
npm run start
```

### Environment Setup

For production deployment:

1. Set `NODE_ENV=production`
2. Configure proper `ALLOWED_ORIGINS`
3. Use a secure OpenAI API key
4. Set up database backups
5. Configure logging and monitoring

### Docker Support

The existing Docker configuration from the original project can be adapted for Next.js:

```bash
# Build the container
npm run docker:build

# Start in production mode
npm run docker:prod
```

## 🔒 Security

- **Rate Limiting**: Prevents API abuse with configurable limits
- **CORS Protection**: Restricts cross-origin requests
- **Input Validation**: Sanitizes and validates all user inputs
- **API Key Security**: OpenAI keys are server-side only
- **Data Privacy**: User data is stored locally in SQLite

## 🧪 Testing

```bash
# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📚 API Documentation

### Health Check
```
GET /api/health
```

### User Profile
```
GET    /api/users/{userId}/profile      # Get user profile
POST   /api/users/{userId}/profile      # Create/update profile
DELETE /api/users/{userId}/profile      # Delete profile
```

### Chat
```
POST   /api/users/{userId}/chat         # Send chat message
GET    /api/users/{userId}/chat         # Get conversation history
DELETE /api/users/{userId}/chat         # Clear conversation history
```

### Recommendations
```
GET    /api/users/{userId}/recommendations?area={area}  # Get recommendations
```

### Intake Forms
```
GET    /api/intake/sections              # Get available form sections
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs or request features via GitHub Issues
- **Health Check**: Visit `/api/health` to verify service status

## 🔄 Migration from Express

This project has been migrated from Express.js to Next.js with the following improvements:

- **Modern React**: Server-side rendering and App Router
- **TypeScript**: Full type safety throughout the application
- **Better Performance**: Optimized bundling and caching
- **Improved DX**: Hot reloading and better error messages
- **Production Ready**: Built-in optimizations and best practices

The core functionality remains the same while providing a better user experience and developer experience.