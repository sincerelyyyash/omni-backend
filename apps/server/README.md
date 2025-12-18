# Server

Main API server providing authentication, user management, and notification endpoints for the Everything Backend system.

## Overview

The server service is the primary entry point for client applications. It handles user authentication via Better Auth, manages user data, and provides comprehensive notification APIs with filtering, suggestions, and action items.

## Features

- **Authentication**: OAuth-based authentication using Better Auth
  - Google OAuth integration
  - GitHub OAuth integration
  - Session management
  - JWT token handling

- **User Management**: User profile and account management endpoints

- **Notifications**: Comprehensive notification system
  - Get notifications with filtering and pagination
  - Unread count tracking
  - Mark notifications as read
  - Get notification suggestions
  - Execute suggestion actions
  - Filter by action items, finance, and upcoming events

- **RESTful API**: Express-based API with proper error handling and CORS support

## Architecture

```
server/
├── src/
│   ├── auth.ts                    # Better Auth configuration
│   ├── index.ts                   # Express app bootstrap
│   ├── config/
│   │   └── env.ts                 # Environment validation
│   ├── controllers/
│   │   ├── auth.controller.ts    # Authentication handlers
│   │   ├── user.controller.ts    # User management handlers
│   │   └── notification.controller.ts  # Notification handlers
│   ├── middleware/
│   │   └── auth.middleware.ts     # Authentication middleware
│   ├── routes/
│   │   ├── auth.routes.ts         # Auth routes
│   │   ├── user.routes.ts         # User routes
│   │   └── notification.routes.ts # Notification routes
│   └── services/
│       └── notification.service.ts # Notification business logic
```

## API Endpoints

### Authentication
- `GET /api/v1/auth/me` - Get current authenticated user session
- `POST /api/auth/*` - Better Auth endpoints (handled by Better Auth)

### Users
- `GET /api/v1/user` - Get user profile (requires authentication)

### Notifications
- `GET /api/v1/notifications` - Get user notifications with filtering
- `GET /api/v1/notifications/unread-count` - Get unread notification count
- `POST /api/v1/notifications/:id/read` - Mark notification as read
- `GET /api/v1/notifications/:id/suggestions` - Get suggestions for a notification
- `POST /api/v1/notifications/:id/suggestions/:suggestionId/execute` - Execute a suggestion
- `GET /api/v1/action-items` - Get action items
- `GET /api/v1/finance/notifications` - Get finance-related notifications
- `GET /api/v1/upcoming` - Get upcoming events/deadlines

### Health Check
- `GET /health` - Service health check

## Environment Variables

```bash
PORT=8000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/everything_db"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
AUTH_SECRET="your-secret-key-min-32-chars"
AUTH_URL="http://localhost:8000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

## Setup

1. **Install dependencies** (from root):
   ```bash
   bun install
   ```

2. **Configure environment variables**:
   Create `.env` file in `apps/server/` with required variables (see above).

3. **Ensure dependencies are running**:
   - PostgreSQL database (shared with other services)
   - Redis (for session storage and caching)

## Running

### Development
```bash
# From root directory
bun run dev

# Or from service directory
cd apps/server
bun run dev
```

The server will start on `http://localhost:8000` (or the port specified in `PORT`).

### Production
```bash
# Build first
bun run build

# Then run the built application
bun run apps/server/dist/index.js
```

## Authentication Flow

1. Client initiates OAuth flow via Better Auth endpoints (`/api/auth/*`)
2. User authenticates with provider (Google/GitHub)
3. Better Auth handles OAuth callback and creates session
4. Client receives session token
5. Subsequent requests include token in `Authorization` header
6. `auth.middleware.ts` validates token and attaches user to request

## Notification System

The notification system provides:
- **Filtering**: By status, priority, source, requires action
- **Suggestions**: AI-generated actionable suggestions per notification
- **Categories**: Action items, finance notifications, upcoming events
- **Status Tracking**: Read/unread status with timestamps

Notifications are enriched by the AI service and stored in the database with metadata including:
- Priority levels
- Action types and URLs
- Due dates
- Enriched data (JSON)
- Suggestions array

## Error Handling

The server includes comprehensive error handling:
- Validation errors return 400 with details
- Authentication errors return 401
- Not found errors return 404
- Server errors return 500 (with details in development mode)
- CORS errors are handled automatically

## Dependencies

- **Express**: Web framework
- **Better Auth**: Authentication library
- **Prisma**: Database ORM (via `@repo/database`)
- **Redis**: Caching and session storage (via `@repo/redis`)
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token handling

## Related Services

- **Memory Engine**: Stores and retrieves memories
- **AI Service**: Enriches memories and generates notifications
- **Ingestion Service**: Fetches data from external sources
