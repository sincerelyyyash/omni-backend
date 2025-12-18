# Everything Backend

A comprehensive backend system for ingesting, storing, and intelligently processing data from multiple sources using AI-powered agents. Built as a monorepo with microservices architecture, this system provides semantic memory storage, intelligent data enrichment, and automated notifications.

## Overview

Everything Backend is a distributed system that:
- **Ingests** data from multiple external sources (Gmail, GitHub, Calendar, Twitter)
- **Stores** memories with semantic search capabilities using vector embeddings
- **Enriches** data using AI agents for action items, deadlines, finance tracking, and suggestions
- **Notifies** users about important events and actionable items

## Architecture

The system is built as a Turborepo monorepo with four main services:

```
everything-backend/
├── apps/
│   ├── server/              # Main API server (Auth, Users, Notifications)
│   ├── ingestion-service/  # Data ingestion from external sources
│   ├── memory-engine/       # Semantic memory storage and retrieval
│   └── ai-service/          # AI-powered data enrichment agents
└── packages/
    ├── database/            # Prisma ORM and database schema
    ├── redis/               # Redis client and queue utilities
    └── types/               # Shared TypeScript types
```

### Services

#### Server (`apps/server`)
Main API server providing:
- Authentication and authorization (Better Auth)
- User management
- Notification endpoints
- RESTful API with Express

#### Ingestion Service (`apps/ingestion-service`)
Fetches and syncs data from external sources:
- **Gmail**: Email ingestion via Google OAuth
- **GitHub**: Repository and activity tracking
- **Calendar**: Event synchronization
- **Twitter**: Social media data ingestion
- Scheduled sync jobs using cron
- Redis Streams for job queueing

#### Memory Engine (`apps/memory-engine`)
Semantic memory storage and retrieval:
- Fact-first storage architecture
- Vector embeddings using OpenAI
- Semantic search via Qdrant
- RAG (Retrieval-Augmented Generation) capabilities
- Content deduplication
- PostgreSQL for structured data

#### AI Service (`apps/ai-service`)
AI-powered data enrichment:
- **Action Item Agent**: Extracts actionable tasks
- **Deadline Agent**: Identifies and tracks deadlines
- **Finance Agent**: Financial data extraction and tracking
- **Notification Agent**: Generates intelligent notifications
- **Suggestion Agent**: Provides contextual suggestions

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) (v1.2.22+)
- **Monorepo**: [Turborepo](https://turborepo.org)
- **Language**: TypeScript
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io)
- **Vector DB**: [Qdrant](https://qdrant.tech)
- **Cache/Queue**: Redis
- **AI/ML**: 
  - OpenAI (embeddings, fact extraction, RAG)
  - Google Gemini (agent processing)
  - LangChain
- **Auth**: Better Auth
- **API Framework**: Express.js

## Prerequisites

- **Bun** >= 1.2.22 ([Installation Guide](https://bun.sh/docs/installation))
- **PostgreSQL** >= 14
- **Redis** >= 6
- **Qdrant** (local or cloud instance)
- **Node.js** >= 18 (for some tooling)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sincerelyyyash/everything-backend
   cd everything-backend
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Using Docker Compose (if available)
   docker-compose up -d postgres
   
   # Or use your existing PostgreSQL instance
   ```

4. **Set up Redis**
   ```bash
   # Using Docker Compose (if available)
   docker-compose up -d redis
   
   # Or use your existing Redis instance
   ```

5. **Set up Qdrant**
   ```bash
   # Using Docker
   docker run -p 6333:6333 qdrant/qdrant
   
   # Or use Qdrant Cloud
   ```

## Configuration

### Environment Variables

Each service requires its own `.env` file. Copy the example files and configure:

#### Root `.env`
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/everything_db"

# Redis
REDIS_URL="redis://localhost:6379"
```

#### Server (`apps/server/.env`)
```bash
PORT=8000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/everything_db"
REDIS_URL="redis://localhost:6379"

# Auth
AUTH_SECRET="your-secret-key"
AUTH_URL="http://localhost:8000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

#### Memory Engine (`apps/memory-engine/.env`)
```bash
PORT=8001
DATABASE_URL="postgresql://user:password@localhost:5432/everything_db"
REDIS_URL="redis://localhost:6379"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIMENSION=1536
ANSWER_MODEL="gpt-4o-mini"
RERANK_MODEL="gpt-4o-mini"
FACT_MODEL="gpt-4o-mini"
RERANK_ENABLED="true"
RERANK_TOP_K=5

# Qdrant
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""  # Optional
QDRANT_COLLECTION_NAME="memories"
```

#### Ingestion Service (`apps/ingestion-service/.env`)
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/everything_db"
REDIS_URL="redis://localhost:6379"
MEMORY_ENGINE_URL="http://localhost:8001"

# OAuth (same as server)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

#### AI Service (`apps/ai-service/.env`)
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/everything_db"
REDIS_URL="redis://localhost:6379"
MEMORY_ENGINE_URL="http://localhost:8001"

# Google Gemini
GEMINI_API_KEY="your-gemini-api-key"
```

### Database Setup

1. **Generate Prisma Client**
   ```bash
   bun run generate
   ```

2. **Run migrations**
   ```bash
   bun run db:migrate:dev
   ```

3. **Seed database (optional)**
   ```bash
   bun run db:seed
   ```

## Running the Project

### Development Mode

Run all services in development mode:
```bash
bun run dev
```

This starts all services concurrently using Turborepo.

### Individual Services

Run services individually:

```bash
# Server
cd apps/server
bun run dev

# Memory Engine
cd apps/memory-engine
bun run dev

# Ingestion Service
cd apps/ingestion-service
bun run dev

# AI Service
cd apps/ai-service
bun run dev
```

### Production Build

Build all services:
```bash
bun run build
```

## Project Structure

```
everything-backend/
├── apps/
│   ├── server/                    # Main API server
│   │   ├── src/
│   │   │   ├── controllers/      # Request handlers
│   │   │   ├── routes/            # API routes
│   │   │   ├── middleware/        # Express middleware
│   │   │   ├── services/          # Business logic
│   │   │   └── auth.ts            # Better Auth configuration
│   │   └── package.json
│   │
│   ├── ingestion-service/         # Data ingestion
│   │   ├── src/
│   │   │   ├── providers/         # External source providers
│   │   │   │   ├── gmail/
│   │   │   │   ├── github/
│   │   │   │   ├── calendar/
│   │   │   │   └── twitter/
│   │   │   ├── scheduler/         # Cron jobs
│   │   │   └── worker.ts          # Queue worker
│   │   └── package.json
│   │
│   ├── memory-engine/              # Memory storage
│   │   ├── src/
│   │   │   ├── controllers/       # API controllers
│   │   │   ├── routes/            # API routes
│   │   │   ├── services/
│   │   │   │   ├── memory/        # Core memory logic
│   │   │   │   ├── embedding/     # Embedding generation
│   │   │   │   ├── extraction/    # Fact extraction
│   │   │   │   └── vector/        # Qdrant integration
│   │   │   └── config/            # Prompts and config
│   │   └── package.json
│   │
│   └── ai-service/                 # AI agents
│       ├── src/
│       │   ├── agents/             # AI agent implementations
│       │   ├── services/           # Agent services
│       │   └── worker.ts           # Queue worker
│       └── package.json
│
├── packages/
│   ├── database/                   # Prisma schema and client
│   │   ├── prisma/
│   │   │   └── schema.prisma       # Database schema
│   │   └── src/
│   │       └── client.ts           # Prisma client export
│   │
│   ├── redis/                      # Redis utilities
│   │   └── src/
│   │       ├── client.ts           # Redis client
│   │       └── queue.ts            # Queue implementation
│   │
│   ├── types/                      # Shared TypeScript types
│   │   ├── memory/
│   │   ├── notification/
│   │   └── user/
│   │
│   ├── config-eslint/              # ESLint configuration
│   └── config-typescript/          # TypeScript configuration
│
├── package.json                    # Root package.json
├── turbo.json                      # Turborepo configuration
└── README.md                       # This file
```

## Key Features

### Data Ingestion
- Multi-source data synchronization (Gmail, GitHub, Calendar, Twitter)
- OAuth token management with automatic refresh
- Incremental sync to avoid duplicate processing
- Scheduled background jobs

### Semantic Memory
- Fact-first storage architecture
- Vector embeddings for semantic search
- Content deduplication
- RAG (Retrieval-Augmented Generation) for Q&A
- Configurable embedding and reranking models

### AI Enrichment
- Automated action item extraction
- Deadline detection and tracking
- Financial data extraction
- Intelligent notification generation
- Contextual suggestions

### Notifications
- Priority-based notification system
- Actionable notifications with URLs
- Rich metadata and enrichment data
- Status tracking (read/unread)

## API Endpoints

### Server API (`http://localhost:8000`)
- `GET /health` - Health check
- `POST /api/auth/*` - Authentication endpoints (Better Auth)
- `GET /api/v1/users/*` - User management
- `GET /api/v1/notifications/*` - Notification endpoints

### Memory Engine API (`http://localhost:8001`)
- `POST /api/memory` - Create a memory
- `PUT /api/memory` - Update memory
- `DELETE /api/memory` - Delete memory
- `GET /api/memory` - Get memory by ID
- `GET /api/memory/user` - List user memories
- `POST /api/memories` - Batch ingest
- `POST /api/memories/search` - Semantic search
- `POST /api/memories/answer` - RAG Q&A
- `POST /api/memories/ask` - Ask with query

## Database Schema

The system uses PostgreSQL with the following main models:
- **User**: User accounts and authentication
- **Account**: OAuth account connections
- **Session**: User sessions
- **Memory**: Stored memories with metadata
- **Notification**: User notifications

See `packages/database/prisma/schema.prisma` for the complete schema.

## Support

For issues, questions, or contributions, please open an issue on the [repository](https://github.com/sincerelyyyash/everything-backend).
