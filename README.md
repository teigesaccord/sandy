# Sandy - Accessibility Help Chatbot

A compassionate AI assistant providing personalized accessibility support based on individual user profiles, built with Next.js, TypeScript, Django, and OpenAI.

## 🌟 Mission

Sandy helps people with disabilities and accessibility needs get personalized assistance, recommendations, and support for daily challenges. The system learns from user interactions to provide increasingly tailored accessibility guidance.

## 🎯 Features

- **Personalized Accessibility Profiles** - Comprehensive assessment of physical, cognitive, and sensory needs
- **AI-Powered Support Chat** - Context-aware conversations adapted to individual accessibility requirements
- **Smart Recommendations** - Tailored suggestions for assistive technologies, strategies, and resources
- **Learning System** - Continuously improves suggestions based on user feedback and successful outcomes
- **Accessible Design** - Built with accessibility-first principles (WCAG 2.1 AA compliant)
- **Multi-Modal Support** - Text, voice, and alternative input methods

## 🏗️ Architecture

**Full-stack application with accessibility at its core:**

- **Frontend**: Next.js 14 + TypeScript (in `src/`)
- **Backend**: Django 5 + Django REST Framework (in `backend/`)
- **Database**: PostgreSQL with accessibility-focused schema
- **Caching/Real-time**: Redis + Django Channels for WebSocket support
- **Background Tasks**: Celery for AI processing
- **Authentication**: JWT (djangorestframework-simplejwt)
- **AI Integration**: OpenAI API with accessibility-specialized prompts

## 📁 Repository Structure

```
sandy/
├── src/                     # Next.js frontend application
│   ├── components/          # Accessible React components
│   ├── app/                # Next.js app router pages
│   ├── services/           # API integration services
│   └── types/              # TypeScript definitions
├── backend/                # Django backend project
│   ├── users/              # User authentication & management
│   ├── profiles/           # Accessibility profiles & preferences
│   ├── chat/               # AI chat system with context awareness
│   ├── recommendations/    # Personalized accessibility recommendations
│   ├── intake/             # Initial accessibility assessment
│   └── core/               # Shared utilities & middleware
├── public/                 # Static assets
├── data/                   # Runtime data storage
└── logs/                   # Application logs
```

## 🚀 Quick Start (Local Development)

### 1. Start Infrastructure Services

```bash
# Start PostgreSQL and Redis
docker compose up -d db redis
```

### 2. Backend Setup (Django)

```bash
# Create and activate virtual environment
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Start development server
python manage.py runserver 0.0.0.0:8000
```

### 3. Frontend Setup (Next.js)

```bash
# From repository root
npm install

# Start development server
npm run dev
```

### 4. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://sandy:sandy@localhost:5432/sandy_db

# OpenAI (Required for AI features)
OPENAI_API_KEY=your_openai_api_key_here

# Django
SECRET_KEY=your_django_secret_key
DEBUG=True

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Frontend API endpoints
NEXT_PUBLIC_API_HOST=http://localhost:8000
API_HOST=http://localhost:8000
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - Authentication
- `GET /api/auth/me/` - Current user info

### Accessibility Profiles
- `GET/PUT /api/users/{id}/profile/` - Accessibility profile management
- `POST /api/accessibility/assess/` - Initial accessibility assessment

### Chat & Support
- `POST /api/users/{id}/chat/` - Send chat message with accessibility context
- `GET /api/users/{id}/chat/` - Conversation history
- `WebSocket /ws/chat/{id}/` - Real-time chat support

### Recommendations
- `GET /api/users/{id}/recommendations/` - Personalized accessibility recommendations
- `POST /api/feedback/` - User feedback on suggestions
- `GET /api/resources/` - Accessibility resource library

## 🧪 Health Check & Verification

```bash
# Backend health check
curl -sS http://localhost:8000/api/health/ | jq .

# Test accessibility profile endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8000/api/users/1/profile/ | jq .
```

## 🎨 Accessibility Features

### Built-in Accessibility Support
- **Screen Reader Optimized** - Semantic HTML, ARIA labels, proper focus management
- **Keyboard Navigation** - Full keyboard accessibility with skip links
- **High Contrast Mode** - User-configurable contrast themes
- **Text Scaling** - Support for 200%+ text zoom
- **Voice Input/Output** - Speech-to-text and text-to-speech integration
- **Reduced Motion** - Respects user's motion preferences
- **Multiple Input Methods** - Mouse, keyboard, touch, voice, and switch access

### Accessibility Profile System
The system tracks comprehensive accessibility information:
- **Physical Needs** - Mobility, dexterity, and motor function requirements
- **Sensory Needs** - Vision, hearing, and sensory processing preferences
- **Cognitive Support** - Memory aids, attention management, processing time needs
- **Communication Preferences** - Text, audio, visual, or multimodal communication
- **Assistive Technology** - Current tools and compatibility requirements
- **Environmental Factors** - Lighting, noise, and workspace considerations

## 🤖 AI & Personalization

### Context-Aware AI
- **Profile Integration** - AI responses adapted to user's specific accessibility needs
- **Learning System** - Improves recommendations based on user feedback
- **Safety First** - Built-in safeguards for appropriate accessibility guidance
- **Resource Integration** - Connects users with verified accessibility resources

### Recommendation Engine
- **Assistive Technology** - Personalized tool and software recommendations
- **Strategies & Techniques** - Daily living and productivity strategies
- **Community Resources** - Local accessibility services and support groups
- **Product Reviews** - Accessibility-focused product evaluations

## 🛠️ Development Workflows

### Running Background Workers (Optional)
```bash
# Start Celery worker for AI processing
cd backend
celery -A sandy worker -l info
```

### Frontend Build & Deployment
```bash
# Production build
npm run build && npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Docker Development
```bash
# Full stack with Docker
docker compose up

# Individual services
docker compose up backend frontend
```

## 🔒 Security & Privacy

### Data Protection
- **Accessibility Data Encryption** - Sensitive accessibility information encrypted at rest
- **GDPR Compliance** - Full data portability and deletion capabilities
- **Minimal Data Collection** - Only collect what's necessary for personalization
- **User Control** - Users control what information is shared and used

### API Security
- **JWT Authentication** - Secure token-based authentication
- **Rate Limiting** - Prevent abuse and ensure fair access
- **CORS Configuration** - Secure cross-origin requests
- **Input Validation** - Comprehensive input sanitization

## 📊 Monitoring & Analytics

### Accessibility Metrics
- **Feature Usage** - Track which accessibility features are most helpful
- **Recommendation Success** - Monitor suggestion acceptance and effectiveness
- **User Satisfaction** - Collect feedback on chat interactions and recommendations
- **Accessibility Compliance** - Automated accessibility testing and monitoring

## 🌍 Accessibility Standards Compliance

- **WCAG 2.1 AA** - Full compliance with Web Content Accessibility Guidelines
- **Section 508** - US federal accessibility requirements
- **EN 301 549** - European accessibility standard
- **Platform Guidelines** - iOS, Android, and desktop accessibility guidelines

## 🤝 Contributing

### Accessibility-First Development
- All contributions must maintain or improve accessibility
- Manual testing with assistive technologies required
- Automated accessibility testing in CI/CD pipeline
- User testing with disabled community members

### Code Quality
- **Accessibility Review** - All PRs reviewed for accessibility impact
- **Semantic HTML** - Proper markup and ARIA usage required
- **Keyboard Testing** - Full keyboard navigation must work
- **Screen Reader Testing** - Components tested with screen readers

## 📚 Resources & Documentation

### Getting Started
- `PROJECT_OVERVIEW.md` - Comprehensive project architecture and roadmap
- `DEVELOPMENT.md` - Detailed development and contribution guidelines
- `MIGRATION_SUMMARY.md` - Database schema and migration history

### Accessibility Resources
- [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [Inclusive Design Principles](https://inclusivedesignprinciples.org/)
- [Accessibility Developer Guide](https://www.accessibility-developer-guide.com/)

## 🐛 Troubleshooting

### Common Issues

**Frontend Build Fails with SSL Error**
```bash
# Ensure API_HOST uses http:// for local development
export API_HOST=http://localhost:8000
npm run build
```

**Django Import Errors**
```bash
# Ensure virtual environment is activated
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

**WebSocket Connection Issues**
```bash
# Check Redis is running
docker compose up -d redis
# Verify channels configuration in Django settings
```

## 📄 License

MIT License - See LICENSE file for details

## 🎯 Vision

Sandy represents our commitment to making technology more accessible and empowering for everyone. By combining AI intelligence with deep accessibility expertise, we're building a platform that truly understands and supports the diverse needs of the disability community.

**"Nothing about us, without us"** - This project is built with and for the disability community, ensuring authentic representation and meaningful impact.

---

For detailed development information, architecture decisions, and contribution guidelines, see `PROJECT_OVERVIEW.md`.