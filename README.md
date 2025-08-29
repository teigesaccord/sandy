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

- **Node.js** (version 18.0.0 or higher)
- **npm** or **yarn** package manager
- **OpenAI API Key** (for AI functionality)

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
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` to start using Sandy!

### Production Deployment

1. **Build for production**
   ```bash
   npm run start
   ```

2. **Set production environment**
   ```env
   NODE_ENV=production
   OPENAI_API_KEY=your_production_api_key
   DATABASE_PATH=./data/production.db
   ```

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

### Troubleshooting

**Common Issues:**

1. **"Failed to connect" error**
   - Check your internet connection
   - Verify OPENAI_API_KEY is set correctly
   - Ensure port 3000 is available

2. **AI responses not working**
   - Verify your OpenAI API key has credits
   - Check the AI_MODEL setting in .env
   - Review server logs for error messages

3. **Database errors**
   - Ensure the data/ directory exists and is writable
   - Check DATABASE_PATH in your .env file
   - Verify SQLite3 is properly installed

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

### Long Term (6+ months)
- [ ] Machine learning insights
- [ ] Community features
- [ ] Healthcare provider portal
- [ ] Advanced personalization AI
- [ ] Telehealth integrations

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