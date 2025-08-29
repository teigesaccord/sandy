# Sandy - Personal Support Chatbot

Sandy is a compassionate AI-powered chatbot designed to provide personalized support and recommendations for people with chronic conditions, disabilities, and unique health challenges. Built with LangChain and powered by advanced AI, Sandy creates individualized support profiles and delivers tailored guidance in plain language.

## 🌟 Features

### 🎯 Personalized Support Profiles
- **Physical Needs Assessment**: Captures mobility levels, exercise capabilities, pain management needs, and chronic conditions
- **Energy Pattern Analysis**: Understands daily energy fluctuations and fatigue triggers
- **Preference Mapping**: Adapts communication style and support types to individual preferences
- **Goal Tracking**: Helps set and monitor achievable short-term and long-term goals

### 🧠 Intelligent Conversations
- **Empathetic AI**: Uses advanced natural language processing with emotional intelligence
- **Context Awareness**: Remembers previous conversations and adapts responses accordingly
- **Multiple Communication Styles**: Direct, gentle, balanced, or detailed responses based on user preference
- **Crisis Detection**: Recognizes signs of distress and provides appropriate resources

### 📋 Dynamic Intake System
- **Adaptive Questionnaires**: Questions adjust based on previous answers
- **Progressive Profiling**: Builds comprehensive profiles over time without overwhelming users
- **Smart Follow-ups**: Generates relevant follow-up questions based on responses
- **Completion Tracking**: Visual progress indicators and completion status

### 💡 Actionable Recommendations
- **Personalized Suggestions**: Tailored to physical capabilities, energy levels, and goals
- **Categorized Advice**: Organized by health, comfort, independence, social, and practical areas
- **Implementation Guidance**: Step-by-step instructions for recommended actions
- **Resource Links**: Connections to relevant support services and information

## 🚀 Getting Started

### Prerequisites

- **Docker** (version 20.0.0 or higher)
- **Docker Compose** (version 2.0.0 or higher)
- **OpenAI API Key** (for AI functionality)

### Quick Start with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sandy-test
   ```

2. **Set up Docker environment**
   ```bash
   ./scripts/docker-dev.sh setup
   ```
   
   This will:
   - Create the `.env` file from template
   - Generate secure session secrets
   - Create necessary directories
   - Check Docker installation

3. **Add your OpenAI API key**
   ```bash
   # Edit .env file
   nano .env
   
   # Add your API key:
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Build and start Sandy**
   ```bash
   ./scripts/docker-dev.sh start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` to start using Sandy!

### Alternative: Local Installation

If you prefer to run without Docker:

1. **Prerequisites**
   - **Node.js** (version 18.0.0 or higher)
   - **npm** or **yarn** package manager

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Production Deployment

#### Docker Production (Recommended)

1. **Configure production environment**
   ```bash
   # Create production environment file
   cp .env.example .env.production
   
   # Edit with production values
   nano .env.production
   ```

2. **Deploy with Docker Compose**
   ```bash
   # Switch to production mode
   ./scripts/docker-dev.sh prod
   
   # Start production stack
   docker-compose -f docker-compose.prod.yml up -d
   ```

   This includes:
   - Sandy chatbot application
   - Nginx reverse proxy with SSL
   - Redis for session storage
   - Prometheus + Grafana monitoring
   - Automated backups

#### Traditional Production

1. **Build for production**
   ```bash
   NODE_ENV=production npm start
   ```

2. **Set production environment**
   ```env
   NODE_ENV=production
   OPENAI_API_KEY=your_production_api_key
   DATABASE_PATH=./data/production.db
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

## 🐳 Docker Usage

### Development Commands

Sandy includes a comprehensive Docker development script that makes container management easy:

```bash
# Setup and check environment
./scripts/docker-dev.sh setup

# Build the Docker image
./scripts/docker-dev.sh build

# Start development environment
./scripts/docker-dev.sh start

# Start in background (detached mode)
./scripts/docker-dev.sh start --detach

# View logs
./scripts/docker-dev.sh logs

# Follow logs in real-time
./scripts/docker-dev.sh logs -f

# Open shell in running container
./scripts/docker-dev.sh shell

# Check service status
./scripts/docker-dev.sh status

# Stop all services
./scripts/docker-dev.sh stop

# Restart services
./scripts/docker-dev.sh restart

# Clean up containers and volumes
./scripts/docker-dev.sh clean

# Create data backup
./scripts/docker-dev.sh backup

# Run tests in container
./scripts/docker-dev.sh test
```

### NPM Docker Scripts

For convenience, Docker commands are also available as npm scripts:

```bash
npm run docker:setup     # Setup environment
npm run docker:build     # Build image
npm run docker:start     # Start services
npm run docker:stop      # Stop services
npm run docker:logs      # View logs
npm run docker:shell     # Open container shell
npm run docker:status    # Check status
npm run docker:clean     # Clean up
npm run docker:backup    # Backup data
```

### Container Structure

The Docker setup includes:

- **sandy-chatbot**: Main Node.js application
- **redis** (optional): Session storage and caching
- **nginx** (production): Reverse proxy with SSL termination
- **prometheus** (production): Metrics collection
- **grafana** (production): Monitoring dashboards
- **fluentd** (production): Log aggregation

### Volume Management

Data persistence is handled through Docker volumes:

- `sandy_data`: User profiles and database
- `sandy_logs`: Application logs
- `redis_data`: Redis cache data (if enabled)

### Environment Variables

Docker containers use these key environment variables:

```env
# Core Settings
NODE_ENV=development
PORT=3000
OPENAI_API_KEY=your_api_key_here

# Database
DATABASE_PATH=/app/data/users.db

# AI Configuration
AI_MODEL=gpt-3.5-turbo
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=2000

# Security
ALLOWED_ORIGINS=http://localhost:3000
SESSION_SECRET=auto_generated

# Rate Limiting
RATE_LIMIT_POINTS=50
RATE_LIMIT_DURATION=60
```

### Production Docker Stack

The production setup includes additional services for enterprise deployment:

```yaml
# docker-compose.prod.yml includes:
services:
  sandy-chatbot:     # Main application
  redis:             # Session storage
  nginx:             # Reverse proxy + SSL
  prometheus:        # Metrics collection
  grafana:           # Monitoring dashboard
  fluentd:           # Log aggregation
  backup:            # Automated backups
```

Access monitoring at:
- **Application**: `https://yourdomain.com`
- **Monitoring**: `https://yourdomain.com:3001` (Grafana)
- **Metrics**: `https://yourdomain.com:9090` (Prometheus)

## 🏗️ Architecture

### Backend Components

- **Express.js Server**: RESTful API and WebSocket support
- **LangChain Integration**: AI conversation management and memory
- **SQLite Database**: User profiles and conversation storage
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **WebSocket Support**: Real-time chat functionality

### Frontend Components

- **Responsive Chat Interface**: Mobile-friendly design
- **Progressive Web App**: Installable and offline-capable
- **Voice Input Support**: Speech-to-text functionality
- **Accessibility Features**: Screen reader and keyboard navigation support

### Key Services

- **AIService**: Manages LangChain integration and AI responses
- **IntakeFormService**: Handles dynamic questionnaire logic
- **DatabaseService**: Manages data persistence and user profiles
- **UserProfile**: Comprehensive user data model

## 📊 API Documentation

### User Profile Endpoints

```http
GET    /api/users/:userId/profile           # Get user profile
POST   /api/users/:userId/profile           # Create/update profile
DELETE /api/users/:userId/profile           # Delete profile
```

### Chat Endpoints

```http
POST /api/users/:userId/chat                # Send chat message
GET  /api/users/:userId/conversation-summary # Get conversation summary
DELETE /api/users/:userId/conversation      # Clear chat history
```

### Intake Form Endpoints

```http
GET  /api/intake/sections                   # Get all intake sections
GET  /api/intake/sections/:sectionId        # Get specific section
POST /api/users/:userId/intake/:sectionId   # Submit section responses
```

### Recommendations Endpoints

```http
GET /api/users/:userId/recommendations      # Get personalized recommendations
```

### WebSocket Events

```javascript
// Client to Server
{
  type: 'chat',
  userId: 'user_id',
  text: 'message text',
  context: { /* additional context */ }
}

// Server to Client
{
  type: 'chat_response',
  response: 'AI response text',
  suggestions: ['suggestion1', 'suggestion2'],
  confidence: 0.85,
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

## 🎨 Customization

### Theming

Sandy supports light and dark themes. Customize colors in the CSS variables:

```css
:root {
  --primary-color: #667eea;
  --accent-color: #28a745;
  --background-color: #f8f9fa;
  /* ... other variables */
}
```

### AI Model Configuration

Adjust AI behavior in your environment variables:

```env
AI_MODEL=gpt-3.5-turbo          # or gpt-4
AI_TEMPERATURE=0.7              # 0.0 to 1.0 (creativity level)
AI_MAX_TOKENS=2000              # Maximum response length
```

### Intake Form Customization

Add new sections or questions in `src/services/IntakeFormService.js`:

```javascript
// Example: Adding a new section
newSection: {
  title: "Custom Section",
  description: "Description here",
  required: false,
  questions: [
    {
      id: "custom_question",
      type: "text",
      question: "Your custom question?",
      path: "customData.field",
      required: true
    }
  ]
}
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for AI functionality | Required |
| `PORT` | Server port number | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `DATABASE_PATH` | SQLite database file path | ./data/users.db |
| `AI_MODEL` | OpenAI model to use | gpt-3.5-turbo |
| `AI_TEMPERATURE` | AI creativity level (0.0-1.0) | 0.7 |
| `RATE_LIMIT_POINTS` | Requests per minute limit | 50 |

### Feature Flags

Enable or disable features:

```env
ENABLE_ANALYTICS=true
ENABLE_VOICE_INPUT=true
ENABLE_WEBSOCKET=true
```

## 🧪 Development

### Project Structure

```
sandy-test/
├── src/
│   ├── components/          # Reusable components
│   ├── models/             # Data models
│   │   └── UserProfile.js  # User profile model
│   ├── services/           # Business logic services
│   │   ├── AIService.js    # LangChain integration
│   │   ├── IntakeFormService.js  # Form logic
│   │   └── DatabaseService.js    # Data persistence
│   └── index.js           # Main server file
├── public/                # Static files
│   ├── index.html        # Main HTML page
│   └── chatbot.js        # Client-side chatbot
├── data/                 # Database files
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

### Available Scripts

```bash
npm start           # Start production server
npm run dev         # Start development server with auto-reload
npm test            # Run tests
npm run lint        # Check code style
npm run format      # Format code with Prettier
```

### Adding New Features

1. **Create a new service** in `src/services/`
2. **Add API endpoints** in `src/index.js`
3. **Update the user interface** in `public/`
4. **Add tests** for new functionality
5. **Update documentation**

## 🔒 Security & Privacy

### Data Protection
- **Local Storage**: User data stored locally by default
- **Encryption**: Sensitive data encrypted at rest
- **No External Tracking**: No third-party analytics or tracking
- **Data Retention**: Configurable data retention policies

### Security Features
- **Rate Limiting**: Prevents abuse and ensures availability
- **Input Validation**: All user inputs validated and sanitized
- **CORS Protection**: Configurable cross-origin request policies
- **Content Security Policy**: Prevents XSS attacks

### Privacy Considerations
- **Minimal Data Collection**: Only collects necessary information
- **User Control**: Users can export or delete their data
- **Transparent AI**: Clear indication of AI-generated responses
- **Crisis Resources**: Appropriate escalation for mental health concerns

## 🚨 Crisis Support

Sandy includes built-in crisis detection and resource provision:

### Crisis Resources
- **National Suicide Prevention Lifeline**: 988
- **Crisis Text Line**: Text HOME to 741741
- **Emergency Services**: 911
- **Additional Local Resources**: Configurable by deployment

### Crisis Detection
- Monitors for keywords indicating distress
- Escalates appropriately while maintaining empathy
- Provides immediate resources and professional referrals
- Logs incidents for quality improvement (anonymized)

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests**
5. **Update documentation**
6. **Submit a pull request**

### Code Style
- Use ESLint and Prettier for consistent formatting
- Follow semantic commit message conventions
- Write comprehensive tests for new features
- Document all public APIs

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and request features via GitHub issues
- **Community**: Join our community discussions
- **Docker Issues**: Use `./scripts/docker-dev.sh logs` for debugging

### Troubleshooting

**Docker Issues:**

1. **Container won't start**
   ```bash
   # Check Docker daemon
   docker info
   
   # Check logs
   ./scripts/docker-dev.sh logs
   
   # Rebuild image
   ./scripts/docker-dev.sh build --no-cache
   ```

2. **Port already in use**
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   
   # Or change port in .env
   PORT=3001
   ```

3. **Permission errors**
   ```bash
   # Fix volume permissions
   sudo chown -R $USER:$USER data/
   
   # Or clean and restart
   ./scripts/docker-dev.sh clean
   ./scripts/docker-dev.sh start
   ```

**Application Issues:**

1. **"Failed to connect" error**
   - Check container status: `./scripts/docker-dev.sh status`
   - Verify OPENAI_API_KEY is set in .env
   - Check container logs: `./scripts/docker-dev.sh logs`

2. **AI responses not working**
   - Verify your OpenAI API key has credits
   - Check the AI_MODEL setting in .env
   - Review container logs for API errors

3. **Database errors**
   - Check if volume is mounted: `docker volume ls`
   - Verify container permissions
   - Restore from backup: `./scripts/docker-dev.sh restore`

**Development Issues:**

1. **Changes not reflected**
   ```bash
   # For development, use volume mounts
   docker-compose -f docker-compose.yml up -d
   
   # Or rebuild if needed
   ./scripts/docker-dev.sh restart --rebuild
   ```

2. **Memory issues**
   ```bash
   # Check container resource usage
   docker stats
   
   # Increase memory limits in docker-compose.yml
   ```

### Performance Optimization
- Use production builds for deployment
- Configure appropriate rate limits
- Monitor database size and clean up old data
- Consider using a CDN for static assets

## 🎯 Roadmap

### Short Term (Next 3 months)
- [ ] Mobile app development
- [ ] Additional AI model support
- [ ] Enhanced analytics dashboard
- [ ] Integration with health APIs
- [ ] Multi-language support
- [ ] Kubernetes deployment support
- [ ] Advanced monitoring and alerting

### Long Term (6+ months)
- [ ] Machine learning insights
- [ ] Community features
- [ ] Healthcare provider portal
- [ ] Advanced personalization AI
- [ ] Telehealth integrations
- [ ] Multi-cloud deployment options
- [ ] Auto-scaling and load balancing

---

## 💝 Acknowledgments

Sandy was built with care for people who need personalized support in managing their health and daily challenges. Special thanks to:

- The disability and chronic illness communities for their input
- Healthcare professionals who provided guidance
- Open source contributors and the LangChain community
- OpenAI for making advanced AI accessible

**Remember**: Sandy is a support tool and should not replace professional medical advice. Always consult healthcare providers for medical decisions.

---

*Made with ❤️ for better accessibility and support*