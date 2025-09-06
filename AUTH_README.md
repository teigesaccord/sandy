# Sandy Chatbot - Authentication System

This document describes the authentication system implemented for the Sandy Chatbot application.

For full local development setup (Postgres, Redis, venv, run commands) see `DEVELOPMENT.md`.

## Overview

The authentication system has been upgraded from a simple localStorage-based user identification to a full PostgreSQL-backed authentication system with JWT tokens and secure password hashing.

## Key Changes

### Database Migration
- **From**: SQLite with simple user IDs
- **To**: PostgreSQL with proper user authentication tables
- **Benefits**: Real database persistence, better security, scalable user management

### Authentication Features
- ✅ User registration with email/password
- ✅ Secure password hashing (bcrypt)
- ✅ JWT token-based authentication  
- ✅ HTTP-only cookie storage for tokens
- ✅ Session management in database
- ✅ Password strength validation
- ✅ Rate limiting on auth endpoints
- ✅ User profile association with authenticated users

## Database Schema

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Sessions Table
```sql
user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### User Profiles Table (Updated)
```sql
user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id),
  profile_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST `/api/auth/login`
Authenticate user and create session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET `/api/auth/me`
Get current authenticated user information.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "profile": {...},
  "hasProfile": true
}
```

#### POST `/api/auth/logout`
Logout user and invalidate session.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### Protected Endpoints

All user-specific endpoints now require authentication:

- `GET/POST/PUT/DELETE /api/users/[userId]/profile` - User can only access their own profile
- `POST /api/users/[userId]/chat` - User can only chat as themselves

## Frontend Components

### AuthContext
Provides authentication state management across the application.

**Usage:**
```jsx
import { useAuth } from '../components/auth/AuthContext';

function MyComponent() {
  const { user, login, logout, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please login</div>;
  
  return <div>Welcome, {user.firstName}!</div>;
}
```

### AuthForm
Handles user registration and login with validation.

**Features:**
- Email format validation
- Password strength requirements
- Real-time error display
- Loading states
- Mode switching (login/register)

### ProtectedRoute
Wrapper component that ensures authentication before rendering protected content.

**Usage:**
```jsx
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

function App() {
  return (
    <ProtectedRoute>
      <MyProtectedComponent />
    </ProtectedRoute>
  );
}
```

## Environment Variables

Add these to your `.env` file:

```env
# Database Configuration
DATABASE_URL=postgresql://sandy_user:sandy_password@localhost:5432/sandy_chatbot

# Authentication & Security
JWT_SECRET=your_very_secure_jwt_secret_here_change_in_production
SESSION_SECRET=your_very_secure_session_secret_here_change_in_production
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Session Configuration
SESSION_MAX_AGE=604800000
SESSION_SECURE=false
SESSION_SAME_SITE=lax
```

## Docker Setup

The `docker-compose.yml` has been updated to include PostgreSQL:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=sandy_chatbot
      - POSTGRES_USER=sandy_user
      - POSTGRES_PASSWORD=sandy_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  sandy-chatbot:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://sandy_user:sandy_password@postgres:5432/sandy_chatbot
      - JWT_SECRET=${JWT_SECRET}
      # ... other env vars
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character

### Rate Limiting
- Registration: 3 attempts per 15 minutes per IP
- Login: 5 attempts per 15 minutes per IP
- Failed attempts are tracked and blocked

### Token Security
- JWT tokens stored in HTTP-only cookies
- Tokens expire after 7 days (configurable)
- Sessions tracked in database for revocation
- Automatic cleanup of expired sessions

### Data Protection
- Passwords hashed with bcrypt (12 rounds)
- UUIDs used for user identification
- SQL injection protection with parameterized queries
- CORS configured for production origins

## Migration from Old System

### For Existing Users
The old localStorage-based user IDs are no longer valid. Users will need to:
1. Create a new account with their email
2. Complete their profile again (profile data was user-ID based)

### Development Migration
1. Update your `.env` file with PostgreSQL settings
2. Run `npm install` to install new dependencies
3. Start PostgreSQL (via Docker or local installation)
4. Run `npm run setup` to initialize the database
5. The application will now require authentication

## Testing

### Manual Testing
1. Visit the application - should show login/register form
2. Register a new account
3. Login with the account
4. Access chat and profile features
5. Logout and verify session is cleared

### API Testing
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test"}'

# Login user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Get current user (requires cookie from login)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Cookie: auth-token=<token-from-login>"
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in environment
   - Verify database credentials

2. **JWT Token Errors**
   - Check JWT_SECRET is set
   - Verify token hasn't expired
   - Clear browser cookies and login again

3. **CORS Issues**
   - Check ALLOWED_ORIGINS environment variable
   - Ensure frontend and backend ports match

4. **Registration Fails**
   - Check password meets requirements
   - Verify email format is valid
   - Check for duplicate email addresses

### Logs
Check application logs for authentication errors:
- Registration attempts and failures
- Login attempts and token generation
- Database connection issues
- Session creation and validation

## Future Enhancements

Potential improvements for the authentication system:

- [ ] Email verification for new accounts
- [ ] Password reset functionality
- [ ] OAuth integration (Google, GitHub, etc.)
- [ ] Two-factor authentication (2FA)
- [ ] Account deletion and data export
- [ ] Admin user management interface
- [ ] Audit logging for security events
- [ ] Account lockout after failed attempts
- [ ] Session management UI for users